import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import Drivers from "@/pages/Drivers";
import Reservations from "@/pages/Reservations";
import Service from "@/pages/Service";
import Costs from "@/pages/Costs";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vozidla" element={<Vehicles />} />
            <Route path="/ridici" element={<Drivers />} />
            <Route path="/rezervace" element={<Reservations />} />
            <Route path="/servis" element={<Service />} />
            <Route path="/naklady" element={<Costs />} />
            <Route path="/nastaveni" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
