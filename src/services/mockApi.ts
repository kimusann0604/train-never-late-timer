import type { GeocodeResult, RouteResult } from "../types/location";

// デモ用候補データ
const MOCK_CANDIDATES = [
  {
    lat: 35.6812,
    lng: 139.7671,
    formattedAddress: "東京駅（東京都千代田区）",
  },
  {
    lat: 35.6595,
    lng: 139.7004,
    formattedAddress: "渋谷駅（東京都渋谷区）",
  },
  {
    lat: 35.6762,
    lng: 139.7505,
    formattedAddress: "浅草寺（東京都台東区）",
  },
  {
    lat: 35.6653,
    lng: 139.8298,
    formattedAddress: "スカイツリー（東京都墨田区）",
  },
  {
    lat: 34.6937,
    lng: 135.5023,
    formattedAddress: "京都駅（京都府京都市）",
  },
  {
    lat: 34.731892,
    lng: 135.734395,
    formattedAddress: "奈良先端科学技術大学院大学（奈良県生駒市）",
  },
  {
    lat: 34.65272,
    lng: 135.390306,
    formattedAddress: "夢洲駅（大阪府大阪市此花区）",
  },
];

// テスト用ユーザー位置（東京駅付近）
const MOCK_USER_LOCATION = {
  lat: 35.6812,
  lng: 139.7671,
};

/**
 * モック: 住所 → 座標変換
 */
export async function geocodeMock(address: string): Promise<GeocodeResult> {
  // シミュレーション遅延
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 入力キーワードで候補をフィルタリング
  const keyword = address.toLowerCase();
  const candidate = MOCK_CANDIDATES.find((c) =>
    c.formattedAddress.toLowerCase().includes(keyword)
  );

  if (!candidate) {
    throw new Error(`検索結果が見つかりません: "${address}"`);
  }

  return {
    lat: candidate.lat,
    lng: candidate.lng,
    formattedAddress: candidate.formattedAddress,
  };
}

/**
 * モック: 現在地+目的地 → 距離・所要時間
 */
export async function getRouteMock(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult> {
  // シミュレーション遅延
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Haversine公式で距離計算
  const distanceMeters = calculateDistance(origin, destination);

  // 距離に基づいて所要時間を推定（平均時速20km）
  const durationSeconds = Math.round(distanceMeters / (20 * 1000 / 3600));

  return {
    distanceMeters: Math.round(distanceMeters),
    durationSeconds,
  };
}

/**
 * Haversine公式で2点間の距離を計算（メートル）
 */
function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
    Math.cos((to.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * モック: ユーザーのテスト用位置情報を取得
 */
export function getMockUserLocation() {
  return MOCK_USER_LOCATION;
}

/**
 * モック: すべての候補を取得
 */
export function getAllMockCandidates(): GeocodeResult[] {
  return MOCK_CANDIDATES.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    formattedAddress: c.formattedAddress,
  }));
}
