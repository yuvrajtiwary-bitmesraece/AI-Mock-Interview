import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { SITE } from "@/utils/site";

// The preview card shown when a link to the site is shared (LinkedIn, Slack, X...).
export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHIPS = ["Tailored questions", "Voice or typed answers", "Scored feedback", "Progress tracking"];
const EMBER = "linear-gradient(100deg, #ffcd94, #ff813d 48%, #f45273)";

/**
 * Downloads a Google Font as TTF, subset to `text`, while the image is built.
 * Returns null on any failure, so the card still renders with a default font.
 */
async function loadFont(family, axes, text) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(text)}`;
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
  const logo = await readFile(join(process.cwd(), "public/logo.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  const sansText = [SITE.name, "Practice the interview", "the interview.", ...CHIPS].join(" ");
  const [semibold, regular, serif] = await Promise.all([
    loadFont("Geist", "wght@600", sansText),
    loadFont("Geist", "wght@400", sansText),
    loadFont("Instrument+Serif", "ital@1", "before Interview"),
  ]);
  const fonts = [
    semibold && { name: "Geist", data: semibold, weight: 600, style: "normal" },
    regular && { name: "Geist", data: regular, weight: 400, style: "normal" },
    serif && { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
  ].filter(Boolean);
  const serifFamily = serif ? "Instrument Serif" : "serif";

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
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(ellipse 80% 70% at 50% -20%, rgba(255,129,61,0.30), transparent 70%), radial-gradient(circle at 100% 0%, rgba(244,82,115,0.16), transparent 45%)",
          color: "#faf8f5",
          fontFamily: semibold ? "Geist" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={logoSrc} width={56} height={56} alt="" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 32, fontWeight: 600, letterSpacing: -0.6 }}>
            <span>AI Mock</span>
            <span style={{ fontFamily: serifFamily, fontStyle: "italic", fontWeight: 400, fontSize: 38, letterSpacing: 0 }}>Interview</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.02 }}>
          <div style={{ display: "flex", gap: 22 }}>
            {/* The renderer gives "Practice" a little extra width in this font; the margin evens out the gap. */}
            <span style={{ marginRight: -14 }}>Practice</span>
            <span>the interview</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <span
              style={{
                fontFamily: serifFamily,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 100,
                letterSpacing: 0,
                backgroundImage: EMBER,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              before
            </span>
            <span>the interview.</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {CHIPS.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                whiteSpace: "nowrap",
                padding: "12px 20px",
                lineHeight: 1,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
                fontSize: 21,
                fontWeight: 400,
                color: "#d4d4d8",
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
