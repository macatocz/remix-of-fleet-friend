import HubTabs from "@/components/HubTabs";
import Costs from "@/pages/Costs";
import FleetReport from "@/pages/FleetReport";
import FuelCards from "@/pages/FuelCards";
import TravelOrders from "@/pages/TravelOrders";
import MonthlyClosingButton from "@/components/finance/MonthlyClosingButton";

export default function FinanceHub() {
  return (
    <HubTabs title="Finance a reporty" actions={<MonthlyClosingButton />} tabs={[
      { value: "naklady", label: "Náklady", content: <Costs /> },
      { value: "report", label: "Report a tankování", content: <FleetReport /> },
      { value: "karty", label: "Tankovací karty", content: <FuelCards /> },
      { value: "cestovni-prikazy", label: "Cestovní příkazy", content: <TravelOrders /> },
    ]} />
  );
}
