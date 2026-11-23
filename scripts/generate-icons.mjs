/**
 * Draws the logo mark and writes every icon the app uses:
 *
 *   public/logo.svg           the mark, used by the site header and the social card
 *   app/icon.svg              SVG favicon for modern browsers
 *   app/favicon.ico           16, 32 and 48 px favicon for older browsers
 *   app/apple-icon.png        180 px iOS home-screen icon
 *   public/icons/*.png        PWA icons, referenced by app/manifest.js
 *
 * Run it after changing the mark:  node scripts/generate-icons.mjs
 * It uses sharp, which Next.js already installs for image optimization.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// The ember gradient: --ember-1, --ember-2 and --ember-3 in app/globals.css.
const EMBER = ["#ffcd94", "#ff813d", "#f45273"];
const INK = "#0b0b0e";

// Four rounded bars of a voice waveform, centred in a 32 x 32 tile.
const BARS = [
  { x: 6.25, height: 8 },
  { x: 11.75, height: 15 },
  { x: 17.25, height: 19 },
  { x: 22.75, height: 10 },
];

/**
 * The mark as an SVG string. `radius` rounds the tile (0 for icons whose
 * corners the operating system masks), `scale` shrinks the bars (to keep them
 * in the safe zone of maskable icons) and `size` sets the pixel size.
 */
function markSvg({ radius = 9, scale = 1, size } = {}) {
  const bars = BARS.map(({ x, height }) => `<rect x="${x}" y="${16 - height / 2}" width="3" height="${height}" rx="1.5"/>`).join("");
  const transform = scale === 1 ? "" : ` transform="translate(16 16) scale(${scale}) translate(-16 -16)"`;
  const dimensions = size ? ` width="${size}" height="${size}"` : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${dimensions} fill="none">`,
    `<defs><linearGradient id="ember" x1="2" y1="1" x2="30" y2="31" gradientUnits="userSpaceOnUse">`,
    `<stop stop-color="${EMBER[0]}"/><stop offset="0.5" stop-color="${EMBER[1]}"/><stop offset="1" stop-color="${EMBER[2]}"/>`,
    `</linearGradient></defs>`,
    `<rect width="32" height="32" rx="${radius}" fill="url(#ember)"/>`,
    `<g fill="${INK}"${transform}>${bars}</g>`,
    `</svg>`,
  ].join("") + "\n";
}

/** The mark as a PNG of `size` pixels. */
const png = (size, options) => sharp(Buffer.from(markSvg({ ...options, size }))).png().toBuffer();

/** Packs PNG images into one .ico file (PNG entries are valid since Windows Vista). */
function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width, where 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

await mkdir("public/icons", { recursive: true });

const svg = markSvg();
await writeFile("public/logo.svg", svg);
await writeFile("app/icon.svg", svg);

const favicons = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })));
await writeFile("app/favicon.ico", toIco(favicons));

// iOS and Android round the corners themselves, so those tiles are square.
await writeFile("app/apple-icon.png", await png(180, { radius: 0 }));
await writeFile("public/icons/icon-192.png", await png(192, { radius: 7 }));
await writeFile("public/icons/icon-512.png", await png(512, { radius: 7 }));
await writeFile("public/icons/maskable-512.png", await png(512, { radius: 0, scale: 0.78 }));

console.log("Wrote public/logo.svg, app/icon.svg, app/favicon.ico, app/apple-icon.png and public/icons/*.png");
