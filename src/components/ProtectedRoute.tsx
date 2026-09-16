import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobileResolved } from "@/hooks/use-mobile";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, roles } = useAuth();
  const location = useLocation();
  const resolvedMobile = useIsMobileResolved();
  const isMobile = !!resolvedMobile;

  if (loading || resolvedMobile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/prihlaseni" replace />;
  }

  const preferDesktop =
    typeof window !== "undefined" &&
    window.localStorage.getItem("preferDesktop") === "1";

  const isDriverOnly =
    roles.length > 0 &&
    roles.includes("ridic") &&
    !roles.includes("admin") &&
    !roles.includes("dispatcer");

  const onMobileRoute = location.pathname.startsWith("/m");

  // Zachovej konkrétní cestovní příkaz i tehdy, když některý starší odkaz
  // nebo uložená PWA otevře jeho desktopovou adresu na telefonu.
  const mobileTravelOrderPath = location.pathname.match(/^\/cestovni-prikazy\/([^/]+)$/);
  if (isMobile && !preferDesktop && mobileTravelOrderPath) {
    return <Navigate to={`/m/cestovni-prikazy/${mobileTravelOrderPath[1]}`} replace />;
  }

  // Detail vozidla na telefonu vždy otevřít v mobilní verzi
  const mobileVehiclePath = location.pathname.match(/^\/vozidla\/([^/]+)$/);
  if (isMobile && !preferDesktop && mobileVehiclePath) {
    return <Navigate to={`/m/vozidla/${mobileVehiclePath[1]}`} replace />;
  }

  // Driver-only: na mobilu mobilní UI, na desktopu jednoduchý řidičský pohled
  // (kromě detailu vozidla a samotného /ridic)
  if (
    isDriverOnly &&
    !onMobileRoute &&
    !location.pathname.startsWith("/vozidla/") &&
    location.pathname !== "/ridic"
  ) {
    return <Navigate to={isMobile ? "/m" : "/ridic"} replace />;
  }

  // /ridic je určen jen čistým řidičům – ostatní přesměrovat na dashboard
  if (!isDriverOnly && location.pathname === "/ridic") {
    return <Navigate to="/" replace />;
  }

  // Ostatní role na mobilním zařízení: redirect na /m, pokud nepreferují desktop
  if (!isDriverOnly && isMobile && !onMobileRoute && !preferDesktop) {
    return <Navigate to="/m" replace />;
  }

  // Naopak na desktopu nepouštět netřidiče do /m (pokud explicitně nechtějí)
  if (!isDriverOnly && !isMobile && onMobileRoute && !preferDesktop) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
