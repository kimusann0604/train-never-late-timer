import { useState, useEffect, useRef } from "react";

const SCROLL_TEXT = "まもなく目的地につきます";

const SL_FRAMES = [
  [
    "      ====        ________                 ___________ ",
    "  _D _|  |_______/        \\__I_I_____===__|_________| ",
    "   |(_)---  |   H\\________/ |   |        =|___ ___|   ",
    "   /     |  |   H  |  |     |   |         ||_| |_||   ",
    "  |      |  |   H  |__--------------------| [___] |   ",
    "  | ________|___H__/__|_____/[][]~\\_______|       |   ",
    "  |/ |   |-----------I_____I [][] []  D   |=======|__ ",
    "__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ",
    " |/-=|___|=    ||    ||    ||    |_____/~\\___/        ",
    "  \\_/      \\O=====O=====O=====O_/      \\_/            ",
  ],
  [
    "      ====        ________                 ___________ ",
    "  _D _|  |_______/        \\__I_I_____===__|_________| ",
    "   |(_)---  |   H\\________/ |   |        =|___ ___|   ",
    "   /     |  |   H  |  |     |   |         ||_| |_||   ",
    "  |      |  |   H  |__--------------------| [___] |   ",
    "  | ________|___H__/__|_____/[][]~\\_______|       |   ",
    "  |/ |   |-----------I_____I [][] []  D   |=======|__ ",
    "__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ",
    " |/-=|___|=   O=====O=====O=====O |_____/~\\___/       ",
    "  \\_/      \\                       \\_/                 ",
  ],
];

type StationBoardProps = {
  onComplete?: () => void;
};

export default function StationBoard({ onComplete }: StationBoardProps) {
  const [phase, setPhase] = useState("sl");
  const [frame, setFrame] = useState(0);
  const [slPos, setSlPos] = useState(110);
  const [scrollCount, setScrollCount] = useState(0);
  const scrollDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "sl") return;
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, 150);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "sl") return;
    const interval = setInterval(() => {
      setSlPos((p) => {
        if (p < -60) {
          setPhase("text");
          return p;
        }
        return p - 0.8;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "text" || !scrollDivRef.current) return;

    const handleAnimationIteration = () => {
      setScrollCount((prev) => {
        const newCount = prev + 1;
        console.log(`Scroll animation iteration: ${newCount}`);

        // 3回完了したら初期画面に戻す
        if (newCount >= 3) {
          console.log("Animation complete - returning to initial screen");
          onComplete?.();
        }

        return newCount;
      });
    };

    const scrollDiv = scrollDivRef.current;
    scrollDiv.addEventListener("animationiteration", handleAnimationIteration);

    return () => {
      scrollDiv.removeEventListener("animationiteration", handleAnimationIteration);
    };
  }, [phase, onComplete]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');

        @keyframes scrollLeft {
          0% { transform: translateX(10%); }
          100% { transform: translateX(-50%); }
        }

        @keyframes scrollLeftStop {
          0% { transform: translateX(10%); }
          100% { transform: translateX(10%); }
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes smokeRise {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          100% { transform: translateY(-80px) scale(3); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          fontFamily: "'DotGothic16', monospace",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 6px)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {phase === "sl" && (
          <div
            style={{
              position: "absolute",
              left: `${slPos}%`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <div style={{ position: "relative" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "-30px",
                    left: `${80 + i * 30}px`,
                    color: "#666",
                    fontSize: "28px",
                    animation: `smokeRise ${1.5 + i * 0.3}s ease-out infinite`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  ☁
                </div>
              ))}
            </div>
            <pre
              style={{
                color: "#00dd00",
                fontSize: "clamp(6px, 1.4vw, 14px)",
                lineHeight: 1.15,
                textShadow:
                  "0 0 8px rgba(0,221,0,0.6), 0 0 20px rgba(0,221,0,0.3)",
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {SL_FRAMES[frame].join("\n")}
            </pre>
          </div>
        )}

        {phase === "text" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              animation: "fadeIn 0.8s ease-out",
            }}
          >
            <div
              ref={scrollDivRef}
              style={{
                display: "flex",
                whiteSpace: "nowrap",
                animation: `${scrollCount < 3 ? "scrollLeft" : "scrollLeftStop"} 10s linear ${scrollCount < 3 ? "infinite" : "none"}`,
              }}
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  style={{
                    color: "#ff2222",
                    fontSize: "18vw",
                    textShadow:
                      "0 0 20px rgba(255,34,34,0.7), 0 0 60px rgba(255,34,34,0.35), 0 0 120px rgba(255,34,34,0.15)",
                    letterSpacing: "0.15em",
                    paddingRight: "20vw",
                  }}
                >
                  {SCROLL_TEXT}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
