export type Coordinates = {
  lat: number;
  lng: number;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
};

export type AlertConfig = {
  destination: Coordinates;
  alertMinutesBefore: number;
  recheckIntervalMs: number; // デフォルト: 300000 (5分)
};

export type GeolocationResult = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};
