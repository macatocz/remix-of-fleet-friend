import HubTabs from "@/components/HubTabs";
import Service from "@/pages/Service";
import Incidents from "@/pages/Incidents";

export default function ServiceHub() {
  return <HubTabs title="Servis a škody" tabs={[
    { value: "servis", label: "Servis", content: <Service /> },
    { value: "skody", label: "Škody", content: <Incidents /> },
  ]} />;
}
