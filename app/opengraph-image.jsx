import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { SITE } from "@/utils/site";

// The preview card shown when a link to the site is shared (LinkedIn, Slack, X...).
export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE = ["Practice interviews", "Get instant AI feedback"];
const CHIPS = ["Tailored questions", "Voice or typed answers", "Scored feedback", "Progress tracking"];

/**
 * Fetches Plus Jakarta Sans as TTF from Google Fonts, subset to `text`.
 * Returns null on any failure so the image still renders with the default font.
 */
async function loadFont(weight, text) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const response = await fetch(fontUrl);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const logoSvg = await readFile(join(process.cwd(), "public/logo.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logoSvg.toString("base64")}`;

  const allText = [SITE.name, ...HEADLINE, ...CHIPS, SITE.tagline].join(" ");
  const [bold, medium] = await Promise.all([loadFont(800, allText), loadFont(500, allText)]);
  const fonts = [
    bold && { name: "Jakarta", data: bold, weight: 800, style: "normal" },
    medium && { name: "Jakarta", data: medium, weight: 500, style: "normal" },
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#05070d",
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(34,211,238,0.28), transparent 45%), radial-gradient(circle at 100% 10%, rgba(139,92,246,0.28), transparent 45%)",
          color: "#f8fafc",
          fontFamily: fonts.length ? "Jakarta" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
          <img src={logoSrc} width={64} height={61} alt="" />
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{SITE.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5 }}>{HEADLINE[0]}</div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2.5,
              backgroundImage: "linear-gradient(90deg, #67e8f9, #60a5fa 50%, #a78bfa)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {HEADLINE[1]}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {CHIPS.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                lineHeight: 1,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                backgroundColor: "rgba(255,255,255,0.05)",
                fontSize: 24,
                fontWeight: 500,
                color: "#cbd5e1",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
