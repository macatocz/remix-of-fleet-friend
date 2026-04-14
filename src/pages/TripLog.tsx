import VehicleTripLog from "@/components/VehicleTripLog";

export default function TripLog() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kniha jízd</h1>
      <VehicleTripLog />
    </div>
  );
}
