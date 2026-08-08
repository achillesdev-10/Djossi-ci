/**
 *  TravaillerEnCi — scripts/generate-icons.mjs
 *  Génère les icônes du site (convention Next.js App Router + PWA) :
 *
 *    • src/app/favicon.ico    — ICO multi-résolution (16 / 32 / 48, PNG embarqués)
 *    • src/app/icon.png       — 512×512 (PWA / Android / Chrome)
 *    • src/app/apple-icon.png — 180×180 (iOS / Apple Touch)
 *    • public/icon-192.png        — 192×192 (manifest PWA — taille requise)
 *    • public/icon-maskable-512.png — 512×512 safe-zone (icône adaptative Android)
 *
 *  Le dessin reprend la marque existante (public/favicon.svg) : carré arrondi
 *  vert + carré blanc + tricolore ivoirien (orange / blanc / vert).
 *
 *  USAGE :  node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const APP_DIR = resolve(ROOT, 'src', 'app');
const PUBLIC_DIR = resolve(ROOT, 'public');

// Identique à public/favicon.svg — la marque de la plateforme.
const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00a83f"/>
      <stop offset="1" stop-color="#007a2e"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <rect x="12" y="12" width="40" height="40" rx="10" fill="#ffffff"/>
  <!-- Tricolore ivoirien : orange / blanc / vert -->
  <rect x="18" y="19" width="11" height="26" rx="2.5" fill="#F77F00"/>
  <rect x="35" y="19" width="11" height="26" rx="2.5" fill="#009639"/>
</svg>`;

// Variante « maskable » : fond vert PLEIN (pas d'arrondi découpé) + contenu
// réduit dans la safe-zone (≈40 % du rayon au centre) exigée par Android pour
// les icônes adaptatives. Le SVG lui-même peut être fourni (Android le
// rasterise), mais on rasterise ici pour garantir un rendu identique partout.
const BRAND_MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bgm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00a83f"/>
      <stop offset="1" stop-color="#007a2e"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#bgm)"/>
  <rect x="19" y="19" width="26" height="26" rx="6" fill="#ffffff"/>
  <!-- Tricolore ivoirien recentré dans la safe-zone -->
  <rect x="23.5" y="23.5" width="7" height="17" rx="1.6" fill="#F77F00"/>
  <rect x="33.5" y="23.5" width="7" height="17" rx="1.6" fill="#009639"/>
</svg>`;

/** Rasterise la marque à une taille donnée (rendu SVG vectoriel → net). */
async function renderPng(size) {
  return sharp(Buffer.from(BRAND_SVG), { density: 300 })
    .resize(size, size)
    .png()
    .toBuffer();
}

/**
 * Construit un fichier .ico contenant des PNG embarqués (supporté par tous
 * les navigateurs modernes). Format : ICONDIR (6 octets) + ICONDIRENTRY
 * (16 octets par image) + blobs PNG.
 *
 * @param {Array<{size: number, buf: Buffer}>} images  taille en pixels + PNG
 */
function buildIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const entries = images.map((img, i) => ({
    size: img.size,
    buf: img.buf,
    offset:
      headerSize +
      entrySize * images.length +
      images.slice(0, i).reduce((s, b) => s + b.buf.length, 0),
  }));

  const total =
    headerSize + entrySize * images.length + images.reduce((s, b) => s + b.buf.length, 0);
  const out = Buffer.alloc(total);
  let o = 0;

  // ICONDIR
  out.writeUInt16LE(0, o); o += 2; // réservé
  out.writeUInt16LE(1, o); o += 2; // type = icône
  out.writeUInt16LE(images.length, o); o += 2; // nombre d'images

  // ICONDIRENTRY × N
  for (const e of entries) {
    const dim = e.size > 255 ? 0 : e.size; // 0 = 256
    out.writeUInt8(dim, o); o += 1; // largeur
    out.writeUInt8(dim, o); o += 1; // hauteur
    out.writeUInt8(0, o); o += 1; // palette
    out.writeUInt8(0, o); o += 1; // réservé
    out.writeUInt16LE(1, o); o += 2; // plans
    out.writeUInt16LE(32, o); o += 2; // bits par pixel
    out.writeUInt32LE(e.buf.length, o); o += 4; // taille
    out.writeUInt32LE(e.offset, o); o += 4; // offset
  }

  // Blobs PNG
  for (const e of entries) {
    e.buf.copy(out, e.offset);
  }
  return out;
}

async function main() {
  mkdirSync(APP_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const [icon512, icon192, apple180, maskable512, ico16, ico32, ico48] = await Promise.all([
    renderPng(512),
    renderPng(192),
    renderPng(180),
    // Maskable : fond plein + safe-zone (SVG dédié, rasterisé net).
    sharp(Buffer.from(BRAND_MASKABLE_SVG), { density: 300 })
      .resize(512, 512)
      .png()
      .toBuffer(),
    renderPng(16),
    renderPng(32),
    renderPng(48),
  ]);

  writeFileSync(resolve(APP_DIR, 'icon.png'), icon512);
  writeFileSync(resolve(APP_DIR, 'apple-icon.png'), apple180);
  writeFileSync(resolve(PUBLIC_DIR, 'icon-192.png'), icon192);
  writeFileSync(resolve(PUBLIC_DIR, 'icon-maskable-512.png'), maskable512);
  writeFileSync(
    resolve(APP_DIR, 'favicon.ico'),
    buildIco([
      { size: 16, buf: ico16 },
      { size: 32, buf: ico32 },
      { size: 48, buf: ico48 },
    ]),
  );

  console.log('✅ Icônes générées :');
  console.log(`   • src/app/icon.png            (${icon512.length} octets, 512×512)`);
  console.log(`   • public/icon-192.png         (${icon192.length} octets, 192×192)`);
  console.log(`   • public/icon-maskable-512.png (${maskable512.length} octets, 512×512)`);
  console.log(`   • src/app/apple-icon.png      (${apple180.length} octets, 180×180)`);
  console.log(`   • src/app/favicon.ico         (${ico16.length + ico32.length + ico48.length} octets PNG embarqués, 16/32/48)`);
}

main().catch((err) => {
  console.error('❌ Génération des icônes échouée :', err);
  process.exit(1);
});
