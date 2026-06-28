import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Settings, Users, Bell, Receipt } from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { UsersRolesSettings } from "@/components/settings/UsersRolesSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { TravelRatesSettings } from "@/components/settings/TravelRatesSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nastavení</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Údaje firmy, cestovní sazby, notifikace a uživatelé.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Firma
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Obecné
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Uživatelé
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifikace
          </TabsTrigger>
          <TabsTrigger value="travel-rates" className="gap-2">
            <Receipt className="h-4 w-4" />
            Cestovní sazby
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="users">
          <UsersRolesSettings />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="travel-rates">
          <TravelRatesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
