import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Settings, Users, Bell, Receipt, Info, Lock,
  Loader2, UserPlus, Plus, Trash2, Send, ShieldAlert, Search,
} from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { TravelRatesEditor } from "@/components/settings/TravelRatesEditor";
import {
  MEAL_RATES_BY_YEAR, FOREIGN_MEAL_RATES_BY_YEAR,
  FUEL_PRICE_BY_YEAR, FUEL_PRICE_DETAIL_BY_YEAR, KM_RATE_BY_YEAR, LATEST_YEAR,
} from "@/lib/travel/calc";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ---------------- Cestovní sazby (mobil) ---------------- */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b last:border-b-0 min-w-0">
      <span className="text-xs text-muted-foreground min-w-0 break-words">{label}</span>
      <span className="text-sm font-semibold shrink-0">{value}</span>
    </div>
  );
}

function MobileRatesView() {
  const years = Object.keys(MEAL_RATES_BY_YEAR).map(Number).sort((a, b) => b - a);
  const { data: ov } = useCompanySettings();
  const [countrySearch, setCountrySearch] = useState("");

  const foreign = Object.entries(FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR] || {}).filter(
    ([c]) => c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="space-y-4 min-w-0">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm">Roční sazebník</AlertTitle>
        <AlertDescription className="text-xs break-words">
          Sazby se vybírají automaticky podle data cesty. Firemní override je označen štítkem.
        </AlertDescription>
      </Alert>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tuzemské stravné (Kč)</h2>
        {years.map((y) => {
          const r = ov?.meal_rates_override?.[String(y)] || MEAL_RATES_BY_YEAR[y];
          const isOv = !!ov?.meal_rates_override?.[String(y)];
          return (
            <Card key={y} className="p-3 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold">{y}</span>
                {y === LATEST_YEAR && <Badge variant="secondary">aktuální</Badge>}
                {isOv && <Badge>Firemní override</Badge>}
              </div>
              <Row label="5–12 h" value={`${r["5_12"]} Kč`} />
              <Row label="12–18 h" value={`${r["12_18"]} Kč`} />
              <Row label="nad 18 h" value={`${r["18_plus"]} Kč`} />
            </Card>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Vlastní vozidlo</h2>
        {years.map((y) => {
          const d = FUEL_PRICE_DETAIL_BY_YEAR[y];
          const kmOv = ov?.km_rate_override?.[String(y)];
          const fuOv = ov?.fuel_price_override?.[String(y)];
          const kmVal = kmOv ?? KM_RATE_BY_YEAR[y];
          const n95Val = fuOv ?? d?.n95 ?? FUEL_PRICE_BY_YEAR[y];
          return (
            <Card key={y} className="p-3 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold">{y}</span>
                {(kmOv != null || fuOv != null) && <Badge>Override</Badge>}
              </div>
              <Row label="Sazba Kč/km" value={kmVal?.toFixed(2) ?? "—"} />
              <Row label="N95 Kč/l" value={n95Val?.toFixed(2) ?? "—"} />
              <Row label="N98 Kč/l" value={d?.n98?.toFixed(2) ?? "—"} />
              <Row label="Nafta Kč/l" value={d?.diesel?.toFixed(2) ?? "—"} />
              <Row label="Elektřina Kč/kWh" value={d?.electricity?.toFixed(2) ?? "—"} />
            </Card>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Zahraniční stravné ({LATEST_YEAR})</h2>
        <p className="text-xs text-muted-foreground break-words">
          Pásma: 1–12 h = 1/3, 12–18 h = 2/3, nad 18 h = plná sazba.
        </p>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Hledat zemi…"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
          />
        </div>
        {foreign.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Žádná země nenalezena.</p>
        ) : (
          foreign.map(([c, r]) => {
            const o = ov?.foreign_meal_rates_override?.[String(LATEST_YEAR)]?.[c];
            const eff = o || r;
            return (
              <Card key={c} className="p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{c}</div>
                    <div className="text-xs text-muted-foreground">{eff.currency}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">{eff.full} {eff.currency}</div>
                    {o && <Badge className="mt-1">Override</Badge>}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

function MobileTravelRates() {
  const { isAdmin } = useAuth();
  return (
    <Tabs defaultValue="view" className="space-y-3 min-w-0">
      <TabsList className="w-full">
        <TabsTrigger value="view" className="flex-1">Přehled</TabsTrigger>
        <TabsTrigger value="edit" className="flex-1" disabled={!isAdmin}>
          {!isAdmin && <Lock className="h-3 w-3 mr-1" />}Editace
        </TabsTrigger>
      </TabsList>
      <TabsContent value="view"><MobileRatesView /></TabsContent>
      <TabsContent value="edit">
        {isAdmin ? (
          <div className="overflow-x-auto">
            <TravelRatesEditor />
          </div>
        ) : (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle className="text-sm">Pouze pro administrátory</AlertTitle>
            <AlertDescription className="text-xs">
              Editace sazeb je dostupná uživatelům s rolí admin.
            </AlertDescription>
          </Alert>
        )}
      </TabsContent>
    </Tabs>
  );
}

/* ---------------- Uživatelé (mobil) ---------------- */

type AppRole = "admin" | "dispatcer" | "ridic";

interface UserWithRoles {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
  last_sign_in_at: string | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  dispatcer: "Dispečer",
  ridic: "Řidič",
};

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  dispatcer: "secondary",
  ridic: "outline",
};

const emptyInvite = { email: "", first_name: "", last_name: "", role: "ridic" as AppRole };

function MobileUsers() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [addRoleUserId, setAddRoleUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("ridic");

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_users_admin");
    if (error) {
      toast.error("Nepodařilo se načíst uživatele: " + error.message);
      setUsers([]);
    } else {
      setUsers(((data || []) as any[]).map((u) => ({
        user_id: u.user_id,
        email: u.email || "",
        first_name: u.first_name,
        last_name: u.last_name,
        roles: (u.roles || []) as AppRole[],
        last_sign_in_at: u.last_sign_in_at,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
    else setLoading(false);
  }, [isAdmin]);

  const redirectTo = `${window.location.origin}/nastaveni-hesla`;

  const handleAddRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error("Nepodařilo se přidat roli: " + error.message);
    else { toast.success("Role přidána"); fetchUsers(); }
    setAddRoleUserId(null);
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (userId === user?.id && role === "admin") {
      toast.error("Nemůžete odebrat svou vlastní roli Admin");
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) toast.error("Nepodařilo se odebrat roli: " + error.message);
    else { toast.success("Role odebrána"); fetchUsers(); }
  };

  const handleInvite = async () => {
    if (!invite.email.trim()) { toast.error("Zadejte e-mail"); return; }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: { action: "invite", ...invite, redirectTo },
    });
    setInviting(false);
    if (error || (data as any)?.error) {
      toast.error("Pozvánku se nepodařilo odeslat: " + (((data as any)?.error) || error?.message));
      return;
    }
    toast.success("Pozvánka odeslána na " + invite.email);
    setInvite(emptyInvite);
    setInviteOpen(false);
    fetchUsers();
  };

  const handleResend = async (u: UserWithRoles) => {
    setResendingId(u.user_id);
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: { action: "resend", email: u.email, redirectTo },
    });
    setResendingId(null);
    if (error || (data as any)?.error) {
      toast.error("Odeslání selhalo: " + (((data as any)?.error) || error?.message));
      return;
    }
    toast.success("Pozvánka znovu odeslána");
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> Uživatelé a role
          </CardTitle>
          <CardDescription>Správa účtů a oprávnění</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 bg-muted/30">
            <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Vyžaduje oprávnění Admin</p>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                Správa uživatelů a rolí je dostupná pouze uživatelům s rolí Admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Uživatelé a role</h2>
          <p className="text-xs text-muted-foreground break-words">
            Registrace je vypnutá — účty zakládá admin pozvánkou.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Pozvat
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Žádní registrovaní uživatelé.</p>
      ) : (
        users.map((u) => {
          const pending = !u.last_sign_in_at;
          return (
            <Card key={u.user_id} className="p-3 min-w-0 space-y-2">
              <div className="min-w-0">
                <div className="font-medium text-sm break-words">
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                </div>
                <div className="text-xs text-muted-foreground break-all">{u.email}</div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {pending ? (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    Čeká na pozvánku
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                    Aktivní · {new Date(u.last_sign_in_at as string).toLocaleDateString("cs-CZ")}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {u.roles.length === 0 && <span className="text-xs text-muted-foreground">Bez role</span>}
                {u.roles.map((role) => (
                  <Badge
                    key={role}
                    variant={roleBadgeVariant[role]}
                    className="gap-1 cursor-pointer"
                    onClick={() => handleRemoveRole(u.user_id, role)}
                  >
                    {roleLabels[role]}
                    <Trash2 className="h-3 w-3" />
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setSelectedRole("ridic"); setAddRoleUserId(u.user_id); }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Role
                </Button>
                {pending && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={resendingId === u.user_id}
                    onClick={() => handleResend(u)}
                  >
                    {resendingId === u.user_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Send className="h-4 w-4 mr-1" /> Znovu</>}
                  </Button>
                )}
              </div>

              <Dialog
                open={addRoleUserId === u.user_id}
                onOpenChange={(open) => setAddRoleUserId(open ? u.user_id : null)}
              >
                <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg">
                  <DialogHeader>
                    <DialogTitle className="break-all text-base">Přidat roli — {u.email}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(roleLabels) as AppRole[])
                            .filter((r) => !u.roles.includes(r))
                            .map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => handleAddRole(u.user_id, selectedRole)}>
                      Přidat roli
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          );
        })
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg">
          <DialogHeader><DialogTitle>Pozvat uživatele</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label>Jméno</Label>
              <Input value={invite.first_name} onChange={(e) => setInvite({ ...invite, first_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Příjmení</Label>
              <Input value={invite.last_name} onChange={(e) => setInvite({ ...invite, last_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" inputMode="email" placeholder="jmeno@cmanagement.cz"
                value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground break-words">
              Uživateli přijde e-mail s odkazem, kde si nastaví vlastní heslo.
            </p>
            <Button className="w-full" onClick={handleInvite} disabled={inviting}>
              {inviting ? "Odesílám..." : "Odeslat pozvánku"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Stránka ---------------- */

export default function MobileSettings() {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4">
      <div className="min-w-0">
        <h1 className="text-lg font-bold">Nastavení</h1>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">
          Údaje firmy, cestovní sazby, notifikace a uživatelé.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full min-w-0">
        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
          <TabsList className="w-max">
            <TabsTrigger value="company" className="gap-1.5 text-xs">
              <Building2 className="h-4 w-4" /> Firma
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5 text-xs">
              <Settings className="h-4 w-4" /> Obecné
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs">
              <Users className="h-4 w-4" /> Uživatelé
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs">
              <Bell className="h-4 w-4" /> Notifikace
            </TabsTrigger>
            <TabsTrigger value="travel-rates" className="gap-1.5 text-xs">
              <Receipt className="h-4 w-4" /> Sazby
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="company" className="min-w-0"><CompanySettings /></TabsContent>
        <TabsContent value="general" className="min-w-0"><GeneralSettings /></TabsContent>
        <TabsContent value="users" className="min-w-0"><MobileUsers /></TabsContent>
        <TabsContent value="notifications" className="min-w-0"><NotificationSettings /></TabsContent>
        <TabsContent value="travel-rates" className="min-w-0"><MobileTravelRates /></TabsContent>
      </Tabs>
    </div>
  );
}
