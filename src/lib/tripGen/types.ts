export type FuelStop = {
  date: string;    // YYYY-MM-DD
  place: string;
  liters: number;
  price: number;   // CZK
};

export type GeneratorInput = {
  vehicleId: string;
  driverId?: string | null;
  month: string;         // YYYY-MM
  kmStart: number;
  kmEnd: number;
  base: string;          // domácí základna
  workingDaysOnly: boolean;
  purposes: string[];
  destinations: string[];
  fuelStops: FuelStop[];
  timeOut: string;       // "07:30"
  timeBack: string;      // "16:30"
};

export type GeneratedTrip = {
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  time: string;
  route_from: string;
  route_to: string;
  purpose: string;
  km_start: number;
  km_end: number;
  km_total: number;
  fuel_quantity: number | null;
  fuel_price: number | null;
};