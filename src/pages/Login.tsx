import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid login credentials")
          ? "Nesprávný e-mail nebo heslo."
          : "Přihlášení selhalo: " + error.message
      );
    } else {
      toast.success("Přihlášení úspěšné");
      navigate("/");
    }
  };

  const handleReset = async () => {
    if (!loginEmail) {
      toast.error("Zadejte nejdřív svůj e-mail.");
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/nastaveni-hesla`,
    });
    setResetting(false);
    if (error) {
      toast.error("Odeslání selhalo: " + error.message);
    } else {
      toast.success("Poslali jsme vám e-mail s odkazem pro nastavení nového hesla.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🚗 Vozový park</CardTitle>
          <CardDescription>Správa vozového parku</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                placeholder="vas@email.cz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Heslo</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Přihlašuji..." : "Přihlásit se"}
            </Button>
          </form>

          <Button
            type="button"
            variant="link"
            className="w-full mt-2 text-sm"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Odesílám…" : "Zapomenuté heslo?"}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
            Účty zakládá správce aplikace. Pokud nemáte přístup, obraťte se na svého administrátora.
          </p>
          <p className="text-xs text-center mt-3">
            <a href="/instalace" className="text-primary underline underline-offset-4">
              Jak si aplikaci dát do mobilu
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
