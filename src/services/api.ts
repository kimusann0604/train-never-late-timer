import type {
  Coordinates,
  GeocodeResult,
  RouteResult,
} from "../types/location";

const API_BASE = "/api";

/**
 * 住所 → 座標変換（サーバー経由で Geocoding API を呼ぶ）
 */
export async function geocode(address: string): Promise<GeocodeResult> {
  const res = await fetch(`${API_BASE}/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API error: ${res.status}`);
  }

  return res.json();
}

/**
 * 現在地+目的地 → 距離・所要時間（サーバー経由で Routes API を呼ぶ）
 */
export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  travelMode?: string
): Promise<RouteResult> {
  const res = await fetch(`${API_BASE}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, travelMode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API error: ${res.status}`);
  }

  return res.json();
}
