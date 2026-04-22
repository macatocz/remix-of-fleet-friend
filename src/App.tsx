import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { MobileLayout } from "@/components/MobileLayout";
import DriverHome from "@/pages/mobile/DriverHome";
import MyVehicle from "@/pages/mobile/MyVehicle";
import MyReservations from "@/pages/mobile/MyReservations";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import VehicleDetail from "@/pages/VehicleDetail";
import Drivers from "@/pages/Drivers";
import Reservations from "@/pages/Reservations";
import Service from "@/pages/Service";
import Costs from "@/pages/Costs";
import TripLog from "@/pages/TripLog";
import FuelCards from "@/pages/FuelCards";
import MobileFuelCards from "@/pages/mobile/MobileFuelCards";
import MobileVehicles from "@/pages/mobile/MobileVehicles";
import TravelOrders from "@/pages/TravelOrders";
import TravelOrderDetail from "@/pages/TravelOrderDetail";
import MobileTravelOrders from "@/pages/mobile/MobileTravelOrders";
import Incidents from "@/pages/Incidents";
import SettingsPage from "@/pages/SettingsPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/prihlaseni" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/vozidla" element={<Vehicles />} />
              <Route path="/vozidla/:id" element={<VehicleDetail />} />
              <Route path="/ridici" element={<Drivers />} />
              <Route path="/rezervace" element={<Reservations />} />
              <Route path="/servis" element={<Service />} />
              <Route path="/skody" element={<Incidents />} />
              <Route path="/kniha-jizd" element={<TripLog />} />
              <Route path="/naklady" element={<Costs />} />
              <Route path="/tankovaci-karty" element={<FuelCards />} />
              <Route path="/cestovni-prikazy" element={<TravelOrders />} />
              <Route path="/cestovni-prikazy/:id" element={<TravelOrderDetail />} />
              <Route path="/nastaveni" element={<SettingsPage />} />
            </Route>
            <Route
              path="/m"
              element={
                <ProtectedRoute>
                  <MobileLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DriverHome />} />
              <Route path="vozidlo" element={<MyVehicle />} />
              <Route path="rezervace" element={<MyReservations />} />
              {/* Admin/dispečer mobilní routy – znovupoužívají desktop stránky */}
              <Route path="vozidla" element={<MobileVehicles />} />
              <Route path="vozidla/:id" element={<VehicleDetail />} />
              <Route path="servis" element={<Service />} />
              <Route path="kniha-jizd" element={<TripLog />} />
              <Route path="skody" element={<Incidents />} />
              <Route path="naklady" element={<Costs />} />
              <Route path="tankovaci-karty" element={<MobileFuelCards />} />
              <Route path="cestovni-prikazy" element={<MobileTravelOrders />} />
              <Route path="cestovni-prikazy/:id" element={<TravelOrderDetail />} />
              <Route path="nastaveni" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
