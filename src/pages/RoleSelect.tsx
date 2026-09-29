import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, Headset, Car } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roleLabels, roleDescriptions, homeForRole } from "@/lib/roleSwitch";

const icons: Record<string, typeof Car> = { admin: ShieldCheck, dispatcer: Headset, ridic: Car };
const order: AppRole[] = ["admin", "dispatcer", "ridic"];

export default function RoleSelect() {
  const { session, loading, availableRoles, activeRole, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (loading) return null;
  if (!session) return <Navigate to="/prihlaseni" replace />;
  if (availableRoles.length <= 1) return <Navigate to="/" replace />;

  const choose = (r: AppRole) => {
    setActiveRole(r);
    navigate(homeForRole(r, isMobile), { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Pokračovat jako</CardTitle>
          <CardDescription>Máte více rolí. Vyberte, z jakého pohledu chcete aplikaci používat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.filter((r) => availableRoles.includes(r)).map((r) => {
            const Icon = icons[r];
            return (
              <button
                key={r}
                onClick={() => choose(r)}
                className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 ${activeRole === r ? "border-primary" : "border-border"}`}
              >
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{roleLabels[r]}</p>
                  <p className="text-sm text-muted-foreground">{roleDescriptions[r]}</p>
                </div>
              </button>
            );
          })}
          <Button variant="link" className="w-full text-sm" onClick={signOut}>Odhlásit se</Button>
        </CardContent>
      </Card>
    </div>
  );
}
