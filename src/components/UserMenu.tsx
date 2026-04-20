import { LogOut, User } from "lucide-react";
import { useContext } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarContext } from "@/components/ui/sidebar";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  dispatcer: "Dispečer",
  ridic: "Řidič",
};

export function UserMenu() {
  const { user, roles, signOut } = useAuth();
  // Optional sidebar context – when used outside SidebarProvider (e.g. mobile layout)
  const sidebarCtx = useContext(SidebarContext);
  const collapsed = sidebarCtx?.state === "collapsed";

  if (!user) return null;

  return (
    <div className="border-t border-sidebar-border p-3">
      {!collapsed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {roleLabels[r] || r}
                </Badge>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit se
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" onClick={signOut} title="Odhlásit se">
          <LogOut className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
