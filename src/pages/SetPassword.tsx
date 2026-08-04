import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Heslo musí mít alespoň 8 znaků");
      return;
    }
    if (password !== confirm) {
      toast.error("Hesla se neshodují");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Nastavení hesla selhalo: " + error.message);
    } else {
      toast.success("Heslo nastaveno, jste přihlášeni");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nastavení hesla</CardTitle>
          <CardDescription>Zvolte si heslo pro přístup do aplikace</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Odkaz z pozvánky je neplatný nebo už vypršel. Požádejte administrátora o zaslání
                nové pozvánky.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/prihlaseni")}>
                Zpět na přihlášení
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nové heslo</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Alespoň 8 znaků"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Heslo znovu</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ukládám..." : "Nastavit heslo a pokračovat"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
