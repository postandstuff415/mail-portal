import { ImageResponse } from "next/og";

// App icon in the flier's colors, drawn at any size (no image files to maintain).
export function brandIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1a1d",
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        <div style={{ display: "flex", fontSize: size * 0.3, color: "#e8f4f0" }}>POST</div>
        <div style={{ display: "flex", fontSize: size * 0.22, color: "#f48fb1" }}>&amp;STUFF</div>
        <div
          style={{
            display: "flex",
            marginTop: size * 0.05,
            width: size * 0.5,
            height: size * 0.035,
            background: "#7fe3d4",
            borderRadius: size * 0.02,
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
