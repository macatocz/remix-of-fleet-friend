import { LogOut, User as UserIcon, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  dispatcer: "Dispečer",
  ridic: "Řidič",
};

export function MobileUserMenu() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isDriverOnly =
    roles.length > 0 &&
    roles.includes("ridic") &&
    !roles.includes("admin") &&
    !roles.includes("dispatcer");

  const switchToDesktop = () => {
    window.localStorage.setItem("preferDesktop", "1");
    navigate("/");
  };

  const initial = (user.email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          aria-label="Účet"
        >
          <span className="text-sm font-semibold">{initial}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 z-50">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-2">
            <UserIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.email}</p>
              {roles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px] py-0">
                      {roleLabels[r] || r}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isDriverOnly && (
          <DropdownMenuItem onClick={switchToDesktop} className="py-3">
            <Monitor className="mr-2 h-4 w-4" />
            Přepnout na desktop
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={signOut} className="py-3 text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}