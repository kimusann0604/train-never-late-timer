import type { AlertConfig, Coordinates } from "../types/location";
import { getCurrentPosition } from "./geolocation";
import { getRoute } from "./api";

type AlertCallbacks = {
  onAlert: () => void;
  onUpdate?: (info: {
    durationSeconds: number;
    alertFiresInMs: number;
  }) => void;
  onError?: (error: Error) => void;
};

const DEFAULT_RECHECK_INTERVAL_MS = 300_000; // 5分

let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
let recheckIntervalId: ReturnType<typeof setInterval> | null = null;
let stopped = false;

/**
 * 到着アラートを開始する
 *
 * 1. getCurrentPosition() で現在地取得
 * 2. getRoute(currentPos, destination) で所要時間取得
 * 3. 到着予定時刻 = 現在時刻 + 所要時間
 * 4. アラート発火時刻 = 到着予定時刻 - alertMinutesBefore分
 * 5. setTimeout でアラート発火をスケジュール
 * 6. 一定間隔で所要時間を再取得し、タイマーを補正
 */
export async function startAlert(
  config: AlertConfig,
  callbacks: AlertCallbacks
): Promise<void> {
  const {
    destination,
    alertMinutesBefore,
    recheckIntervalMs = DEFAULT_RECHECK_INTERVAL_MS,
  } = config;
  const { onAlert, onUpdate, onError } = callbacks;

  stopped = false;

  // 初回のタイマー設定
  await scheduleAlert(destination, alertMinutesBefore, onAlert, onUpdate);

  // 定期的に所要時間を再取得してタイマー補正
  recheckIntervalId = setInterval(async () => {
    if (stopped) return;
    try {
      await scheduleAlert(destination, alertMinutesBefore, onAlert, onUpdate);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, recheckIntervalMs);
}

/**
 * アラートを停止する
 */
export function stopAlert(): void {
  stopped = true;
  if (alertTimeoutId !== null) {
    clearTimeout(alertTimeoutId);
    alertTimeoutId = null;
  }
  if (recheckIntervalId !== null) {
    clearInterval(recheckIntervalId);
    recheckIntervalId = null;
  }
}

/**
 * 現在地から目的地までの所要時間を取得し、アラートタイマーをセットする
 */
async function scheduleAlert(
  destination: Coordinates,
  alertMinutesBefore: number,
  onAlert: () => void,
  onUpdate?: (info: {
    durationSeconds: number;
    alertFiresInMs: number;
  }) => void
): Promise<void> {
  // 既存タイマーをクリア
  if (alertTimeoutId !== null) {
    clearTimeout(alertTimeoutId);
    alertTimeoutId = null;
  }

  const currentPos = await getCurrentPosition();
  const route = await getRoute(
    { lat: currentPos.lat, lng: currentPos.lng },
    destination
  );

  const now = Date.now();
  const arrivalTime = now + route.durationSeconds * 1000;
  const alertTime = arrivalTime - alertMinutesBefore * 60 * 1000;
  const alertFiresInMs = alertTime - now;

  // 既にアラート時刻を過ぎている場合は即時発火
  if (alertFiresInMs <= 0) {
    onAlert();
    stopAlert();
    return;
  }

  onUpdate?.({
    durationSeconds: route.durationSeconds,
    alertFiresInMs,
  });

  alertTimeoutId = setTimeout(() => {
    onAlert();
    stopAlert();
  }, alertFiresInMs);
}
