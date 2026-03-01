import { watchPosition, clearWatch } from "./geolocation";
import { getRoute } from "./api";
import type { Coordinates, GeolocationResult } from "../types/location";

export type LocationWatcherConfig = {
  destination: Coordinates;
  alertThresholdMeters: number; // 3000 (3km)
  onArrival: () => void;
  onLocationUpdate?: (location: GeolocationResult) => void;
  onError?: (error: Error) => void;
};

/**
 * 最適化されたポーリング戦略
 * 1. 初回: Routes APIで所要時間を計算
 * 2. 所要時間の80%は位置情報チェックをスキップ
 * 3. 残り20%の時間を20秒サイクルでポーリング
 */
export class LocationWatcher {
  private config: LocationWatcherConfig;
  private watchId: number | null = null;
  // テスト用に無効化: private _skipStartTime: number | null = null;
  // テスト用に無効化: private _skipDurationMs: number = 0;
  private pollingStartTime: number | null = null;
  private isInitialized = false;
  private startTime: number = 0;
  private static readonly GRACE_PERIOD_MS = 30000; // 30秒の猶予期間

  constructor(config: LocationWatcherConfig) {
    this.config = config;
  }

  async start(userLocation: Coordinates): Promise<void> {
    try {
      // 初回: Routes APIで所要時間を計算
      const routeInfo = await getRoute(userLocation, this.config.destination);
      const durationSeconds = routeInfo.durationSeconds;

      // 80%スキップ + 20%ポーリング（テスト用に無効化）
      // this._skipDurationMs = Math.round(durationSeconds * 0.8 * 1000);
      // this._skipStartTime = Date.now();
      this.pollingStartTime = null;
      this.isInitialized = true;

      console.log(
        `[LocationWatcher] Duration: ${durationSeconds}s (skip disabled for testing)`
      );

      // watchPosition開始（ただし、スキップ期間中は無視）
      this.watchId = watchPosition(
        (location) => this.handlePositionUpdate(location),
        (error) => this.config.onError?.(error)
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err);
      throw err;
    }
  }

  private handlePositionUpdate(location: GeolocationResult): void {
    const now = Date.now();

    // スキップ期間中（テスト用に無効化）
    // if (this.skipStartTime && now - this.skipStartTime < this.skipDurationMs) {
    //   return;
    // }

    // ポーリング期間開始
    if (!this.pollingStartTime) {
      this.pollingStartTime = now;
      console.log("[LocationWatcher] Polling started");
    }

    // 距離チェック（Haversine公式で概算）
    const distance = this.calculateDistance(location, this.config.destination);

    // ポーリングコール通知
    console.log(`[LocationWatcher] Polling - Distance: ${distance}m`);
    this.config.onLocationUpdate?.(location);

    if (distance <= this.config.alertThresholdMeters) {
      this.stop();
      this.config.onArrival();
    }
  }

  /**
   * Haversine公式で2点間の距離を計算（メートル）
   */
  private calculateDistance(
    from: Coordinates,
    to: Coordinates
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

  stop(): void {
    if (this.watchId !== null) {
      clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
