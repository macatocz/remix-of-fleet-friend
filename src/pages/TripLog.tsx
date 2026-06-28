import VehicleTripLog from "@/components/VehicleTripLog";

export default function TripLog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kniha jízd</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Globální přehled jízd všech vozidel. Pro zápis nebo úpravu otevřete detail konkrétního vozidla nebo použijte mobilní aplikaci.
        </p>
      </div>
      <VehicleTripLog readOnly />
    </div>
  );
}
