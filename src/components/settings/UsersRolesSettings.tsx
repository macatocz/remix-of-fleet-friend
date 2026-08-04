import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShieldAlert, Plus, Trash2, Loader2, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AppRole = "admin" | "dispatcer" | "ridic";

interface UserWithRoles {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
  last_sign_in_at: string | null;
  confirmed: boolean;
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

export function UsersRolesSettings() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRoleUserId, setAddRoleUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("ridic");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_users_admin");
    if (error) {
      toast.error("Nepodařilo se načíst uživatele: " + error.message);
      setUsers([]);
    } else {
      setUsers(
        ((data || []) as any[]).map((u) => ({
          user_id: u.user_id,
          email: u.email || "",
          first_name: u.first_name,
          last_name: u.last_name,
          roles: (u.roles || []) as AppRole[],
          last_sign_in_at: u.last_sign_in_at,
          confirmed: !!u.confirmed,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleAddRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error("Nepodařilo se přidat roli: " + error.message);
    } else {
      toast.success("Role přidána");
      fetchUsers();
    }
    setAddRoleUserId(null);
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (userId === user?.id && role === "admin") {
      toast.error("Nemůžete odebrat svou vlastní roli Admin");
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) {
      toast.error("Nepodařilo se odebrat roli: " + error.message);
    } else {
      toast.success("Role odebrána");
      fetchUsers();
    }
  };

  const redirectTo = `${window.location.origin}/nastaveni-hesla`;

  const handleInvite = async () => {
    if (!invite.email.trim()) {
      toast.error("Zadejte e-mail");
      return;
    }
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
              <p className="text-sm font-medium">Vyžaduje oprávnění Admin</p>
              <p className="text-sm text-muted-foreground mt-1">
                Správa uživatelů a rolí je dostupná pouze uživatelům s rolí Admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Uživatelé a role
          </CardTitle>
          <CardDescription>
            Veřejná registrace je vypnutá — nové účty zakládá admin pozvánkou.
          </CardDescription>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              Pozvat uživatele
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pozvat uživatele</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jméno</Label>
                  <Input
                    value={invite.first_name}
                    onChange={(e) => setInvite({ ...invite, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Příjmení</Label>
                  <Input
                    value={invite.last_name}
                    onChange={(e) => setInvite({ ...invite, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="jmeno@cmanagement.cz"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={invite.role}
                  onValueChange={(v) => setInvite({ ...invite, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Uživateli přijde e-mail s odkazem, kde si nastaví vlastní heslo.
              </p>
              <Button className="w-full" onClick={handleInvite} disabled={inviting}>
                {inviting ? "Odesílám..." : "Odeslat pozvánku"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádní registrovaní uživatelé.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Jméno</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[120px]">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const pending = !u.last_sign_in_at;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      {pending ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          Čeká na přijetí pozvánky
                        </Badge>
                      ) : (
                        <div>
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                            Aktivní
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(u.last_sign_in_at as string).toLocaleDateString("cs-CZ")}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && (
                          <span className="text-sm text-muted-foreground">Bez role</span>
                        )}
                        {u.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={roleBadgeVariant[role]}
                            className="gap-1 cursor-pointer"
                            onClick={() => handleRemoveRole(u.user_id, role)}
                            title="Kliknutím odeberete roli"
                          >
                            {roleLabels[role]}
                            <Trash2 className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog
                          open={addRoleUserId === u.user_id}
                          onOpenChange={(open) => setAddRoleUserId(open ? u.user_id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Přidat roli">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Přidat roli — {u.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={selectedRole}
                                  onValueChange={(v) => setSelectedRole(v as AppRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(roleLabels) as AppRole[])
                                      .filter((r) => !u.roles.includes(r))
                                      .map((r) => (
                                        <SelectItem key={r} value={r}>
                                          {roleLabels[r]}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => handleAddRole(u.user_id, selectedRole)}
                              >
                                Přidat roli
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {pending && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Poslat pozvánku znovu"
                            disabled={resendingId === u.user_id}
                            onClick={() => handleResend(u)}
                          >
                            {resendingId === u.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
