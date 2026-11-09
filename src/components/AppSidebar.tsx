import {
  LayoutDashboard, Car, Users, Wrench, Settings, BookOpen, BarChart3
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Přehled", url: "/", icon: LayoutDashboard, description: "Upozornění a termíny", also: [] as string[] },
  { title: "Vozidla", url: "/vozidla", icon: Car, description: "Evidence vozového parku", also: [] },
  { title: "Kniha jízd", url: "/kniha-jizd", icon: BookOpen, description: "Zápis, import, kontrola, export", also: [] },
  { title: "Řidiči a rezervace", url: "/ridici-rezervace", icon: Users, description: "Zaměstnanci a plánování jízd", also: ["/ridici", "/rezervace"] },
  { title: "Servis a škody", url: "/servis-skody", icon: Wrench, description: "Servis, nehody a pojistky", also: ["/servis", "/skody"] },
  { title: "Finance a reporty", url: "/finance", icon: BarChart3, description: "Náklady, PHM, karty, cesťáky", also: ["/naklady", "/report", "/tankovaci-karty", "/cestovni-prikazy"] },
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
        <div className={collapsed ? "py-4 px-2" : "p-4"}>
          {!collapsed && (
            <h1 className="text-lg font-bold text-sidebar-foreground flex items-center gap-2">
              <img src="/logo-smart-car.png" alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
              Vozový park
            </h1>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <img src="/logo-smart-car.png" alt="Vozový park" className="h-7 w-7 shrink-0 rounded-md object-cover" />
            </div>
          )}
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
                      className={`${collapsed ? "justify-center" : "hover:bg-sidebar-accent/50 items-start"} ${item.also.some((p) => location.pathname.startsWith(p)) ? "bg-sidebar-accent text-sidebar-primary font-medium" : ""}`}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className={collapsed ? "h-4 w-4 shrink-0" : "mr-2 h-4 w-4 mt-0.5 shrink-0"} />
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
                      className={collapsed ? "justify-center" : "hover:bg-sidebar-accent/50 items-start"}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className={collapsed ? "h-4 w-4 shrink-0" : "mr-2 h-4 w-4 mt-0.5 shrink-0"} />
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
