import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vyris — AI Chief of Staff for solo operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#f5f2ed",
          color: "#1e1a15",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid #6e2f3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#6e2f3a",
              }}
            />
          </div>
          <div style={{ fontSize: 32, letterSpacing: 2 }}>VYRIS</div>
        </div>
        <div style={{ fontSize: 56, lineHeight: 1.15, maxWidth: 900, display: "flex" }}>
          The AI Chief of Staff for solo operators
        </div>
        <div style={{ fontSize: 28, color: "#6e2f3a", marginTop: 24, display: "flex" }}>
          Strategic planning and decision support in one place
        </div>
      </div>
    ),
    { ...size }
  );
}
