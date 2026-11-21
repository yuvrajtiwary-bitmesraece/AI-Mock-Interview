/**
 * Generates every app icon from public/logo.svg:
 *
 *   app/icon.svg              SVG favicon for modern browsers
 *   app/favicon.ico           16/32/48 px favicon for older browsers
 *   app/apple-icon.png        180 px iOS home-screen icon
 *   public/icons/icon-*.png   PWA icons referenced by app/manifest.js
 *
 * Run it after changing the logo:  node scripts/generate-icons.mjs
 * It uses `sharp`, which Next.js already installs for image optimization.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const LOGO = "public/logo.svg";
const BACKGROUND = "#05070d"; // matches --background in app/globals.css

/** The logo scaled to `size`, centered on a transparent square canvas. */
async function logoPng(size, scale = 1) {
  const inner = Math.round(size * scale);
  const logo = await sharp(LOGO, { density: 1200 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

/** The logo on the app's dark background. `radius` rounds the corners (0 = square). */
async function tilePng(size, { scale, radius }) {
  const r = Math.round(size * radius);
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${BACKGROUND}"/></svg>`
  );
  return sharp(tile)
    .composite([{ input: await logoPng(size, scale) }])
    .png()
    .toBuffer();
}

/** Packs PNG images into a .ico file (PNG-compressed entries are valid since Windows Vista). */
function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

await mkdir("public/icons", { recursive: true });

await copyFile(LOGO, "app/icon.svg");

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map(async (size) => ({ size, data: await logoPng(size, 0.94) })));
await writeFile("app/favicon.ico", toIco(icoImages));

await writeFile("app/apple-icon.png", await tilePng(180, { scale: 0.68, radius: 0 }));
await writeFile("public/icons/icon-192.png", await tilePng(192, { scale: 0.7, radius: 0.22 }));
await writeFile("public/icons/icon-512.png", await tilePng(512, { scale: 0.7, radius: 0.22 }));
// Maskable icons are cropped to a circle or squircle by the OS, so the logo
// stays inside the central safe zone and the background fills the square.
await writeFile("public/icons/maskable-512.png", await tilePng(512, { scale: 0.56, radius: 0 }));

console.log("Icons written to app/ and public/icons/");
