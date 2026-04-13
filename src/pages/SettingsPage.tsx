import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Users, Building2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nastavení</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Firma
            </CardTitle>
            <CardDescription>Nastavení společnosti a kontaktní údaje</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upravte název společnosti, adresu a další firemní údaje.
            </p>
            <Button variant="outline">Upravit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Uživatelé a role
            </CardTitle>
            <CardDescription>Správa uživatelských účtů a oprávnění</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Přidejte uživatele a přiřaďte jim role (Admin, Dispečer, Řidič).
            </p>
            <Button variant="outline">Spravovat</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Obecné
            </CardTitle>
            <CardDescription>Obecná nastavení aplikace</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Nastavení notifikací, formátů dat a dalších preferencí.
            </p>
            <Button variant="outline">Upravit</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
