import {
  LayoutDashboard, Car, Users, CalendarDays, Wrench, DollarSign, Settings, BookOpen, CreditCard, AlertTriangle, FileText, BarChart3
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, description: "Přehled a upozornění" },
  { title: "Vozidla", url: "/vozidla", icon: Car, description: "Evidence vozového parku" },
  { title: "Řidiči", url: "/ridici", icon: Users, description: "Zaměstnanci a oprávnění" },
  { title: "Rezervace", url: "/rezervace", icon: CalendarDays, description: "Plánování jízd a schvalování" },
  { title: "Servis", url: "/servis", icon: Wrench, description: "Servisní plány a záznamy" },
  { title: "Škody", url: "/skody", icon: AlertTriangle, description: "Nehody a pojistné události" },
  { title: "Náklady", url: "/naklady", icon: DollarSign, description: "Provozní a leasingové výdaje" },
  { title: "Tankovací karty", url: "/tankovaci-karty", icon: CreditCard, description: "Palivové karty a PINy" },
  { title: "Cestovní příkazy", url: "/cestovni-prikazy", icon: FileText, description: "Tuzemské i zahraniční CP" },
  { title: "Report", url: "/report", icon: BarChart3, description: "Kvartální souhrn nákladů a vytížení" },
];

const settingsItems = [
  { title: "Nastavení", url: "/nastaveni", icon: Settings, description: "Firma, sazby, notifikace" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h1 className="text-lg font-bold text-sidebar-foreground">
              🚗 Vozový park
            </h1>
          )}
          {collapsed && <span className="text-xl">🚗</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Hlavní menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto py-2">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 items-start"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Systém</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto py-2">
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50 items-start"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
