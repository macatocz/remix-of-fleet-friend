import { LogOut, User, Monitor, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  dispatcer: "Dispečer",
  ridic: "Řidič",
};

// Safely use sidebar state when available; fall back gracefully outside SidebarProvider.
function useOptionalSidebarState(): "expanded" | "collapsed" {
  try {
    return useSidebar().state;
  } catch {
    return "expanded";
  }
}

export function UserMenu() {
  const { user, roles, signOut } = useAuth();
  const state = useOptionalSidebarState();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isDriverOnly =
    roles.length > 0 &&
    roles.includes("ridic") &&
    !roles.includes("admin") &&
    !roles.includes("dispatcer");

  const onMobileRoute = location.pathname.startsWith("/m");
  const showToggle = !isDriverOnly;

  const toggleViewMode = () => {
    if (onMobileRoute) {
      window.localStorage.setItem("preferDesktop", "1");
      navigate("/");
    } else {
      window.localStorage.removeItem("preferDesktop");
      navigate("/m");
    }
  };

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
          {showToggle && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground"
              onClick={toggleViewMode}
            >
              {onMobileRoute ? (
                <><Monitor className="mr-2 h-4 w-4" />Přepnout na desktop</>
              ) : (
                <><Smartphone className="mr-2 h-4 w-4" />Přepnout na mobil</>
              )}
            </Button>
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
