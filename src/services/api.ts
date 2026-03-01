import type {
  Coordinates,
  GeocodeResult,
  RouteResult,
} from "../types/location";
import { geocodeMock, getRouteMock } from "./mockApi";

const API_BASE = "/api";
const USE_MOCK = import.meta.env.VITE_MOCK_MODE === "true";

/**
 * 住所 → 座標変換（モック or サーバー経由）
 */
export async function geocode(address: string): Promise<GeocodeResult> {
  if (USE_MOCK) {
    return geocodeMock(address);
  }

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
 * 現在地+目的地 → 距離・所要時間（モック or サーバー経由）
 */
export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  travelMode?: string
): Promise<RouteResult> {
  if (USE_MOCK) {
    return getRouteMock(origin, destination);
  }

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
