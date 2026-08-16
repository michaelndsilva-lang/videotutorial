import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Seja Consultora(or) Atlântica Natural — comece com R$79,96";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f0b07 0%, #241a10 100%)",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            color: "#e8c477",
            fontWeight: 600,
            marginBottom: 28,
          }}
        >
          ATLÂNTICA NATURAL
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Comece seu negócio investindo apenas R$ 79,96
        </div>
        <div
          style={{
            fontSize: 34,
            color: "#f6e3a8",
            marginTop: 28,
            fontWeight: 600,
          }}
        >
          4 perfumes · 100% de lucro na venda direta
        </div>
      </div>
    ),
    { ...size }
  );
}
