import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShieldAlert } from "lucide-react";

export function UsersRolesSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Uživatelé a role
        </CardTitle>
        <CardDescription>Správa uživatelských účtů a oprávnění</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 bg-muted/30">
          <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Vyžaduje autentizaci</p>
            <p className="text-sm text-muted-foreground mt-1">
              Správa uživatelů a rolí (Admin, Dispečer, Řidič) bude dostupná po implementaci
              přihlašovacího systému. Poté zde budete moci přidávat uživatele a přiřazovat jim role.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
