import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShieldAlert, Plus, Trash2, Loader2 } from "lucide-react";
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

export function UsersRolesSettings() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRoleUserId, setAddRoleUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("ridic");

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch profiles and roles
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const userMap: UserWithRoles[] = profiles.map((p) => ({
        user_id: p.user_id,
        email: p.email || "",
        first_name: p.first_name,
        last_name: p.last_name,
        roles: (roles || [])
          .filter((r) => r.user_id === p.user_id)
          .map((r) => r.role as AppRole),
      }));
      setUsers(userMap);
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
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (error) {
      toast.error("Nepodařilo se přidat roli: " + error.message);
    } else {
      toast.success("Role přidána");
      fetchUsers();
    }
    setAddRoleUserId(null);
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    // Prevent removing own admin role
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Uživatelé a role
        </CardTitle>
        <CardDescription>
          Správa registrovaných uživatelů a jejich oprávnění (Admin, Dispečer, Řidič)
        </CardDescription>
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
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
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
                    <Dialog
                      open={addRoleUserId === u.user_id}
                      onOpenChange={(open) => setAddRoleUserId(open ? u.user_id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
