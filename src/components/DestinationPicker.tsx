import { useState, useCallback, useRef } from "react";
import { geocode } from "../services/api";
import type { Coordinates, GeocodeResult } from "../types/location";
import "./DestinationPicker.css";

type Props = {
  onDestinationConfirmed: (destination: Coordinates, name: string) => void;
};

export function DestinationPicker({ onDestinationConfirmed }: Props) {
  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = useCallback(async (address: string) => {
    if (!address.trim()) {
      setCandidates([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await geocode(address);
      setCandidates([result]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "検索に失敗しました";
      setError(message);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchAddress(value);
    }, 500);
  };

  const handleSelectCandidate = (candidate: GeocodeResult) => {
    onDestinationConfirmed({ lat: candidate.lat, lng: candidate.lng }, candidate.formattedAddress);
    setInput("");
    setCandidates([]);
  };

  return (
    <div className="destination-picker">
      <h2>目的地を設定</h2>

      <div className="input-group">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="住所を入力してください..."
          className="address-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading">検索中...</div>}

      {candidates.length > 0 && (
        <div className="candidates-list">
          <h3>検索結果</h3>
          {candidates.map((candidate) => (
            <div key={`${candidate.lat}-${candidate.lng}`} className="candidate-item">
              <div className="candidate-address">{candidate.formattedAddress}</div>
              <div className="candidate-coordinates">
                ({candidate.lat.toFixed(6)}, {candidate.lng.toFixed(6)})
              </div>
              <button
                className="confirm-button"
                onClick={() => handleSelectCandidate(candidate)}
              >
                確定
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
