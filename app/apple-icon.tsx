import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícono para iOS "Añadir a pantalla de inicio"
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0e6e5c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "Georgia, serif",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 130,
            fontWeight: 700,
            letterSpacing: "-3px",
            lineHeight: 1,
            marginTop: -8,
          }}
        >
          P
        </span>
        <span
          style={{
            position: "absolute",
            right: 42,
            top: 92,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "#3bb197",
          }}
        />
      </div>
    ),
    size,
  );
}
