const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export type TravelMode =
  | "DRIVE"
  | "WALK"
  | "BICYCLE"
  | "TRANSIT"
  | "TWO_WHEELER";

type LatLng = { lat: number; lng: number };

type GeocodeResponse = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type RouteResponse = {
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Geocoding API: 住所 → 座標変換
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodeResponse> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding API error: ${res.status}`);
  }

  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

/**
 * Routes API: 現在地+目的地 → 距離・所要時間
 */
export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  travelMode: TravelMode = "TRANSIT"
): Promise<RouteResponse> {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const body = {
    origin: {
      location: {
        latLng: { latitude: origin.lat, longitude: origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Routes API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.routes?.length) {
    throw new Error("No routes found");
  }

  const route = data.routes[0];
  // duration is like "1234s"
  const durationStr: string = route.duration ?? "0s";
  const durationSeconds = parseInt(durationStr.replace("s", ""), 10);

  return {
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds,
  };
}
