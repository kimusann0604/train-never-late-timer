import "./ArrivalAlert.css";

type Props = {
  destination: string;
  onDismiss: () => void;
};

export function ArrivalAlert({ destination, onDismiss }: Props) {
  return (
    <div className="arrival-alert-overlay">
      <div className="arrival-alert-modal">
        <div className="alert-icon">🎉</div>
        <h1>目的地に到着しました！</h1>
        <p className="destination-name">{destination}</p>
        <p className="alert-message">
          あなたは目的地から 3km 圏内に入りました。
        </p>
        <button className="dismiss-button" onClick={onDismiss}>
          閉じる
        </button>
      </div>
    </div>
  );
}
