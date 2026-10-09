import { useState } from "react";
import { Car, Home, CalendarDays, Route as RouteIcon, AlertTriangle, FileText, Fuel } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter,
} from "@/components/ui/sidebar";

interface DriverSidebarProps {
  primaryVehicleId?: string | null;
  primaryVehicleLabel?: string | null;
  onIncident: () => void;
  onFuel?: () => void;
}

export function DriverSidebar({ primaryVehicleId, primaryVehicleLabel, onIncident, onFuel }: DriverSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [incidentClicked, setIncidentClicked] = useState(false);

  const items = [
    { title: "Domů", url: "/ridic", icon: Home, end: true },
    ...(primaryVehicleId
      ? [{ title: primaryVehicleLabel || "Můj vůz", url: `/ridic/vozidla/${primaryVehicleId}`, icon: Car, end: false }]
      : []),
    { title: "Rezervace", url: "/ridic/rezervace", icon: CalendarDays, end: false },
    { title: "Jízdy", url: "/ridic/jizdy", icon: RouteIcon, end: false },
    { title: "Cestovní příkazy", url: "/ridic/cestovni-prikazy", icon: FileText, end: false },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h1 className="text-lg font-bold text-sidebar-foreground flex items-center gap-2">
              <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-md object-cover" />
              Vozový park
            </h1>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <img src="/icon-192.png" alt="Vozový park" className="h-7 w-7 rounded-md object-cover" />
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className="h-auto py-2">
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={collapsed ? "justify-center" : "hover:bg-sidebar-accent/50"}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className={collapsed ? "h-4 w-4 shrink-0" : "mr-2 h-4 w-4 shrink-0"} />
                      {!collapsed && <span className="text-sm truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  className={
                    "h-auto py-2 " +
                    (collapsed ? "justify-center" : "") +
                    (incidentClicked ? " bg-sidebar-accent" : "")
                  }
                  onClick={() => {
                    setIncidentClicked(true);
                    onIncident();
                  }}
                  title="Nahlásit závadu"
                >
                  <AlertTriangle
                    className={
                      (collapsed ? "h-4 w-4 shrink-0" : "mr-2 h-4 w-4 shrink-0") +
                      " text-destructive"
                    }
                  />
                  {!collapsed && <span className="text-sm truncate">Nahlásit závadu</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {onFuel && (
                <SidebarMenuItem>
                  <SidebarMenuButton className={"h-auto py-2 " + (collapsed ? "justify-center" : "")} onClick={onFuel} title="Tankování">
                    <Fuel className={(collapsed ? "h-4 w-4 shrink-0" : "mr-2 h-4 w-4 shrink-0") + " text-primary"} />
                    {!collapsed && <span className="text-sm truncate">Tankování</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
