import HubTabs from "@/components/HubTabs";
import Drivers from "@/pages/Drivers";
import Reservations from "@/pages/Reservations";

export default function PeopleHub() {
  return <HubTabs title="Řidiči a rezervace" tabs={[
    { value: "ridici", label: "Řidiči", content: <Drivers /> },
    { value: "rezervace", label: "Rezervace", content: <Reservations /> },
  ]} />;
}
