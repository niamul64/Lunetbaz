/**
 * Generates illustrated product images (SVG) for the dummy catalog and points
 * dummy_data at them.
 *
 *   node scripts/generate-product-images.mjs
 *
 * Output: public/images/products/<slug>-<n>.svg  (600×600, "studio shot" style)
 * Rewrites: dummy_data/products.json images, plus order / review / inspection
 * images that reference those products.
 *
 * These are stand-ins until sellers upload real photos through the API.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "images", "products");
mkdirSync(outDir, { recursive: true });

/* ------------------------------------------------------------------ helpers */

const shade = (c, l) => `oklch(${l} ${c.c} ${c.h})`;
const col = (h, c = 0.12) => ({ h, c });

/** Wrap a drawing in the studio background, floor shadow and optional zoom. */
function scene({ bgHue, bgChroma = 0.035, body, shadow = { cx: 300, cy: 505, rx: 170, ry: 22 }, zoom }) {
  const t = zoom ? `translate(${300 - zoom.x * zoom.s} ${300 - zoom.y * zoom.s}) scale(${zoom.s})` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="oklch(0.995 0.008 ${bgHue})"/>
      <stop offset="0.6" stop-color="oklch(0.955 ${bgChroma} ${bgHue})"/>
      <stop offset="1" stop-color="oklch(0.9 ${bgChroma + 0.02} ${bgHue})"/>
    </radialGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.18"/></filter>
    <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <g transform="${t}">
    <ellipse cx="${shadow.cx}" cy="${shadow.cy}" rx="${shadow.rx}" ry="${shadow.ry}" fill="#000" opacity="0.18" filter="url(#blur)"/>
    ${body}
  </g>
</svg>`;
}

const lin = (id, a, b, x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

/* ------------------------------------------------------------------ drawings */

function phone({ body, wall = [270, 320] }) {
  const b = body;
  return `<defs>
    ${lin("pb", shade(b, 0.62), shade(b, 0.36))}
    ${lin("pb2", shade(b, 0.55), shade(b, 0.3))}
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="oklch(0.55 0.2 ${wall[0]})"/><stop offset="0.55" stop-color="oklch(0.42 0.2 ${wall[1]})"/><stop offset="1" stop-color="oklch(0.25 0.12 ${wall[1]})"/>
    </linearGradient>
  </defs>
  <!-- back of second phone -->
  <g transform="rotate(-12 230 300)" filter="url(#soft)">
    <rect x="140" y="110" width="190" height="380" rx="36" fill="url(#pb2)"/>
    <rect x="160" y="130" width="78" height="128" rx="26" fill="${shade(b, 0.25)}" opacity="0.9"/>
    <circle cx="199" cy="162" r="20" fill="#111"/><circle cx="199" cy="162" r="11" fill="#2a3550"/><circle cx="194" cy="157" r="4" fill="#fff" opacity="0.6"/>
    <circle cx="199" cy="222" r="20" fill="#111"/><circle cx="199" cy="222" r="11" fill="#2a3550"/><circle cx="194" cy="217" r="4" fill="#fff" opacity="0.6"/>
    <circle cx="258" cy="150" r="7" fill="#f6e7a6"/>
  </g>
  <!-- front phone -->
  <g filter="url(#soft)">
    <rect x="250" y="95" width="200" height="400" rx="38" fill="url(#pb)"/>
    <rect x="259" y="104" width="182" height="382" rx="31" fill="#0b0b10"/>
    <rect x="265" y="110" width="170" height="370" rx="26" fill="url(#scr)"/>
    <circle cx="380" cy="230" r="90" fill="oklch(0.75 0.17 ${wall[0] + 40})" opacity="0.35"/>
    <circle cx="300" cy="380" r="110" fill="oklch(0.6 0.2 ${wall[1] + 30})" opacity="0.35"/>
    <circle cx="350" cy="126" r="6" fill="#050505"/>
    <text x="350" y="190" font-family="Inter,Segoe UI,Arial" font-size="38" font-weight="300" fill="#fff" text-anchor="middle">10:09</text>
    <text x="350" y="212" font-family="Inter,Segoe UI,Arial" font-size="11" fill="#fff" opacity="0.8" text-anchor="middle">Friday, 10 October</text>
    <rect x="285" y="440" width="130" height="5" rx="2.5" fill="#fff" opacity="0.7"/>
    <rect x="450" y="190" width="4" height="46" rx="2" fill="${shade(b, 0.45)}"/>
    <rect x="265" y="110" width="170" height="370" rx="26" fill="url(#gloss)" opacity="0.6"/>
  </g>`;
}

function laptop({ body, wall = [250, 300], notch = false }) {
  const b = body;
  return `<defs>
    ${lin("lid", shade(b, 0.7), shade(b, 0.45))}
    ${lin("base", shade(b, 0.8), shade(b, 0.55), 0, 1)}
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.6 0.18 ${wall[0]})"/><stop offset="0.6" stop-color="oklch(0.42 0.2 ${wall[1]})"/><stop offset="1" stop-color="oklch(0.28 0.12 ${wall[1]})"/></linearGradient>
  </defs>
  <g filter="url(#soft)">
    <rect x="110" y="135" width="380" height="250" rx="16" fill="url(#lid)"/>
    <rect x="120" y="145" width="360" height="230" rx="9" fill="#08080c"/>
    <rect x="128" y="153" width="344" height="214" rx="5" fill="url(#scr)"/>
    <path d="M128 330 Q260 250 472 300 L472 367 L128 367Z" fill="oklch(0.7 0.16 ${wall[0] + 30})" opacity="0.4"/>
    <path d="M128 360 Q300 290 472 340 L472 367 L128 367Z" fill="oklch(0.5 0.2 ${wall[1] + 40})" opacity="0.45"/>
    ${notch ? `<rect x="282" y="145" width="36" height="9" rx="4" fill="#08080c"/>` : `<circle cx="300" cy="149" r="2.5" fill="#333"/>`}
    <rect x="128" y="153" width="344" height="214" rx="5" fill="url(#gloss)" opacity="0.5"/>
    <path d="M70 385 L530 385 L512 410 Q510 415 500 415 L100 415 Q90 415 88 410Z" fill="url(#base)"/>
    <rect x="70" y="383" width="460" height="6" rx="3" fill="${shade(b, 0.85)}"/>
    <rect x="262" y="383" width="76" height="9" rx="4" fill="${shade(b, 0.6)}"/>
  </g>`;
}

function headphones({ body, accent = body }) {
  const b = body;
  return `<defs>
    ${lin("cup", shade(b, 0.5), shade(b, 0.22))}
    ${lin("band", shade(b, 0.45), shade(b, 0.2), 1, 0)}
  </defs>
  <g filter="url(#soft)">
    <path d="M168 330 C150 150 450 150 432 330" fill="none" stroke="url(#band)" stroke-width="30" stroke-linecap="round"/>
    <path d="M178 320 C165 175 435 175 422 320" fill="none" stroke="${shade(b, 0.15)}" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
    <rect x="158" y="290" width="24" height="60" rx="10" fill="${shade(accent, 0.7)}"/>
    <rect x="418" y="290" width="24" height="60" rx="10" fill="${shade(accent, 0.7)}"/>
    <ellipse cx="170" cy="395" rx="62" ry="84" fill="url(#cup)"/>
    <ellipse cx="430" cy="395" rx="62" ry="84" fill="url(#cup)"/>
    <ellipse cx="150" cy="395" rx="30" ry="62" fill="${shade(b, 0.15)}"/>
    <ellipse cx="450" cy="395" rx="30" ry="62" fill="${shade(b, 0.15)}"/>
    <ellipse cx="185" cy="370" rx="22" ry="40" fill="#fff" opacity="0.12"/>
    <ellipse cx="445" cy="370" rx="22" ry="40" fill="#fff" opacity="0.12"/>
    <circle cx="430" cy="440" r="5" fill="${shade(accent, 0.75)}"/>
  </g>`;
}

function earbuds({ body }) {
  const b = body;
  return `<defs>
    ${lin("case", shade(b, 0.55), shade(b, 0.25))}
    ${lin("bud", shade(b, 0.6), shade(b, 0.3))}
  </defs>
  <g filter="url(#soft)">
    <path d="M150 300 Q150 240 220 240 L380 240 Q450 240 450 300 L450 380 Q450 450 380 450 L220 450 Q150 450 150 380Z" fill="url(#case)"/>
    <path d="M150 300 Q150 240 220 240 L380 240 Q450 240 450 300 L450 312 L150 312Z" fill="${shade(b, 0.18)}" opacity="0.5"/>
    <rect x="285" y="410" width="30" height="6" rx="3" fill="#7ee08a"/>
    <path d="M150 300 Q150 240 220 240 L380 240 Q450 240 450 300" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="3"/>
  </g>
  <g filter="url(#soft)">
    <g transform="rotate(-20 250 205)"><rect x="236" y="195" width="26" height="90" rx="13" fill="url(#bud)"/><ellipse cx="249" cy="190" rx="34" ry="30" fill="url(#bud)"/><ellipse cx="240" cy="180" rx="10" ry="7" fill="#fff" opacity="0.35"/></g>
    <g transform="rotate(20 350 205)"><rect x="338" y="195" width="26" height="90" rx="13" fill="url(#bud)"/><ellipse cx="351" cy="190" rx="34" ry="30" fill="url(#bud)"/><ellipse cx="342" cy="180" rx="10" ry="7" fill="#fff" opacity="0.35"/></g>
  </g>`;
}

function watch({ body, face = 190 }) {
  const b = body;
  return `<defs>
    ${lin("strap", shade(b, 0.4), shade(b, 0.2), 0, 1)}
    ${lin("case", shade(b, 0.7), shade(b, 0.35))}
    <radialGradient id="face" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#1b1f2e"/><stop offset="1" stop-color="#05060a"/></radialGradient>
  </defs>
  <g filter="url(#soft)">
    <rect x="235" y="70" width="130" height="170" rx="30" fill="url(#strap)"/>
    <rect x="235" y="360" width="130" height="170" rx="30" fill="url(#strap)"/>
    ${[110, 140, 400, 430, 460].map((y) => `<circle cx="300" cy="${y}" r="5" fill="${shade(b, 0.15)}"/>`).join("")}
    <rect x="200" y="175" width="200" height="250" rx="56" fill="url(#case)"/>
    <rect x="214" y="189" width="172" height="222" rx="44" fill="url(#face)"/>
    <circle cx="300" cy="300" r="66" fill="none" stroke="oklch(0.7 0.2 ${face})" stroke-width="9" stroke-dasharray="300 500" stroke-linecap="round" transform="rotate(-90 300 300)"/>
    <circle cx="300" cy="300" r="50" fill="none" stroke="oklch(0.75 0.18 ${face + 120})" stroke-width="9" stroke-dasharray="190 400" stroke-linecap="round" transform="rotate(-90 300 300)"/>
    <text x="300" y="308" font-family="Inter,Segoe UI,Arial" font-size="26" font-weight="600" fill="#fff" text-anchor="middle">10:09</text>
    <rect x="398" y="270" width="12" height="40" rx="5" fill="${shade(b, 0.5)}"/>
    <rect x="214" y="189" width="172" height="222" rx="44" fill="url(#gloss)" opacity="0.4"/>
  </g>`;
}

function powerbank({ body }) {
  const b = body;
  return `<defs>${lin("pbk", shade(b, 0.42), shade(b, 0.16))}</defs>
  <g filter="url(#soft)" transform="rotate(-8 300 300)">
    <rect x="200" y="110" width="200" height="370" rx="40" fill="url(#pbk)"/>
    <rect x="200" y="110" width="200" height="370" rx="40" fill="url(#gloss)" opacity="0.35"/>
    <text x="300" y="300" font-family="Inter,Segoe UI,Arial" font-size="34" font-weight="700" fill="#fff" opacity="0.85" text-anchor="middle">20000</text>
    <text x="300" y="326" font-family="Inter,Segoe UI,Arial" font-size="14" fill="#fff" opacity="0.6" text-anchor="middle">mAh · 30W</text>
    ${[0, 1, 2, 3].map((i) => `<circle cx="${270 + i * 20}" cy="430" r="5" fill="${i < 3 ? "#5fd0ff" : "#3a3f4a"}"/>`).join("")}
    <rect x="280" y="112" width="40" height="8" rx="4" fill="#0c0d10"/>
  </g>`;
}

function fabricStack({ main, border, pattern = "diamond", layers = 3 }) {
  const pat =
    pattern === "diamond"
      ? `<pattern id="pt" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M13 3 L23 13 L13 23 L3 13Z" fill="none" stroke="${border}" stroke-width="2" opacity="0.8"/><circle cx="13" cy="13" r="2.5" fill="${border}"/></pattern>`
      : `<pattern id="pt" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="6" fill="${border}" opacity="0.85"/><circle cx="12" cy="12" r="2.5" fill="#fff"/><path d="M28 26 q6 -10 10 0 q-4 8 -10 0" fill="#fff" opacity="0.7"/><circle cx="30" cy="34" r="3" fill="${border}" opacity="0.6"/></pattern>`;
  const rows = Array.from({ length: layers }, (_, i) => {
    const y = 360 - i * 62;
    const w = 330 - i * 14;
    const x = 300 - w / 2;
    return `<g filter="url(#soft)">
      <rect x="${x}" y="${y}" width="${w}" height="70" rx="14" fill="${main}"/>
      <rect x="${x}" y="${y}" width="${w}" height="70" rx="14" fill="url(#pt)" opacity="0.55"/>
      <rect x="${x}" y="${y + 52}" width="${w}" height="18" rx="6" fill="${border}"/>
      <rect x="${x}" y="${y + 56}" width="${w}" height="10" fill="url(#pt)" opacity="0.6"/>
      <rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="#fff" opacity="0.12"/>
    </g>`;
  }).join("");
  return `<defs>${pat}</defs>${rows}`;
}

function kurta({ cloth, trim }) {
  return `<defs>${lin("kc", cloth[0], cloth[1], 0.4, 1)}</defs>
  <g filter="url(#soft)">
    <path d="M240 95 Q300 120 360 95 L455 140 L500 300 L450 318 L420 225 L425 505 L175 505 L180 225 L150 318 L100 300 L145 140Z" fill="url(#kc)"/>
    <path d="M272 95 L300 104 L328 95 L328 112 Q300 124 272 112Z" fill="${trim}"/>
    <rect x="294" y="110" width="12" height="160" rx="4" fill="${trim}" opacity="0.9"/>
    ${[140, 175, 210, 245].map((y) => `<circle cx="300" cy="${y}" r="5" fill="#fff" stroke="${trim}" stroke-width="2"/>`).join("")}
    <path d="M270 112 Q250 200 280 270 M330 112 Q350 200 320 270" fill="none" stroke="${trim}" stroke-width="2" stroke-dasharray="4 5" opacity="0.8"/>
    <path d="M180 470 L420 470" stroke="${trim}" stroke-width="3" stroke-dasharray="6 6" opacity="0.6"/>
    <path d="M200 230 Q300 260 400 230" fill="none" stroke="#000" stroke-opacity="0.06" stroke-width="14"/>
  </g>`;
}

function loafer({ leather }) {
  const l = leather;
  return `<defs>${lin("lt", shade(l, 0.55), shade(l, 0.3))}</defs>
  <g filter="url(#soft)">
    <path d="M90 380 Q90 330 150 318 L300 300 Q360 240 430 250 Q520 262 520 340 L520 380 Q520 410 490 410 L120 410 Q90 410 90 380Z" fill="url(#lt)"/>
    <path d="M90 392 L520 392 L520 410 Q520 425 500 425 L110 425 Q90 425 90 410Z" fill="${shade(l, 0.2)}"/>
    <path d="M300 300 Q370 300 440 268" fill="none" stroke="${shade(l, 0.25)}" stroke-width="10" stroke-linecap="round"/>
    <path d="M320 318 Q390 312 470 286" fill="none" stroke="#f3e1c7" stroke-width="2" stroke-dasharray="5 5" opacity="0.7"/>
    <path d="M110 382 L505 382" fill="none" stroke="#f3e1c7" stroke-width="2" stroke-dasharray="6 6" opacity="0.55"/>
    <ellipse cx="420" cy="280" rx="60" ry="14" fill="#fff" opacity="0.15"/>
    <path d="M150 318 Q190 290 250 304" fill="none" stroke="${shade(l, 0.22)}" stroke-width="6" opacity="0.5"/>
  </g>`;
}

function bottle({ glass, liquid, cap, label, title, sub, shape = "essence" }) {
  const capEl =
    shape === "dropper"
      ? `<rect x="268" y="120" width="64" height="90" rx="10" fill="${cap}"/><rect x="284" y="70" width="32" height="56" rx="14" fill="${cap}" opacity="0.9"/>`
      : shape === "pump"
        ? `<rect x="275" y="140" width="50" height="60" rx="6" fill="${cap}"/><rect x="290" y="105" width="20" height="40" fill="${cap}"/><rect x="290" y="100" width="70" height="16" rx="6" fill="${cap}"/>`
        : `<rect x="262" y="125" width="76" height="80" rx="12" fill="${cap}"/>`;
  const [bx, bw] = shape === "dropper" ? [240, 120] : [215, 170];
  return `<defs>${lin("gl", glass[0], glass[1], 1, 0)}${lin("lq", liquid[0], liquid[1], 0, 1)}</defs>
  <g filter="url(#soft)">
    ${capEl}
    <rect x="${bx}" y="200" width="${bw}" height="290" rx="30" fill="url(#gl)"/>
    <rect x="${bx + 8}" y="260" width="${bw - 16}" height="222" rx="24" fill="url(#lq)" opacity="0.85"/>
    <rect x="${bx + 18}" y="290" width="${bw - 36}" height="130" rx="10" fill="${label}"/>
    <text x="300" y="345" font-family="Inter,Segoe UI,Arial" font-size="${shape === "dropper" ? 15 : 19}" font-weight="800" fill="#222" text-anchor="middle">${title}</text>
    <text x="300" y="372" font-family="Inter,Segoe UI,Arial" font-size="11" fill="#555" text-anchor="middle">${sub}</text>
    <rect x="${bx + 14}" y="210" width="16" height="260" rx="8" fill="#fff" opacity="0.35"/>
  </g>`;
}

function tube({ body, cap, title, sub }) {
  return `<defs>${lin("tb", body[0], body[1], 1, 0)}</defs>
  <g filter="url(#soft)" transform="rotate(-18 300 300)">
    <path d="M230 120 L370 120 L390 400 Q300 420 210 400Z" fill="url(#tb)"/>
    <rect x="225" y="100" width="150" height="26" rx="6" fill="${body[1]}"/>
    <rect x="255" y="400" width="90" height="80" rx="16" fill="${cap}"/>
    <text x="300" y="230" font-family="Inter,Segoe UI,Arial" font-size="24" font-weight="800" fill="#333" text-anchor="middle">${title}</text>
    <text x="300" y="258" font-family="Inter,Segoe UI,Arial" font-size="13" fill="#666" text-anchor="middle">${sub}</text>
    <circle cx="300" cy="320" r="26" fill="#f6c453" opacity="0.85"/>
    <rect x="240" y="130" width="14" height="250" rx="7" fill="#fff" opacity="0.4"/>
  </g>`;
}

function fryPan() {
  const speckles = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = 18 + ((i * 53) % 115);
    return `<circle cx="${(270 + Math.cos(a) * r * 1.3).toFixed(1)}" cy="${(355 + Math.sin(a) * r * 0.45).toFixed(1)}" r="${1 + (i % 3)}" fill="#fff" opacity="0.25"/>`;
  }).join("");
  return `<defs>${lin("pan", "#3b3f48", "#16181d")}${lin("lidg", "#ffffff", "#cfe3ef", 0, 1)}</defs>
  <g filter="url(#soft)">
    <ellipse cx="350" cy="230" rx="140" ry="130" fill="url(#lidg)" opacity="0.55" stroke="#9aa7b3" stroke-width="6"/>
    <ellipse cx="350" cy="230" rx="22" ry="14" fill="#2b2e35"/>
    <ellipse cx="270" cy="360" rx="190" ry="78" fill="url(#pan)"/>
    <ellipse cx="270" cy="352" rx="168" ry="62" fill="#2a2d34"/>
    ${speckles}
    <path d="M440 330 L560 290 Q575 286 578 300 Q580 312 566 318 L450 362Z" fill="#1d1f24"/>
    <ellipse cx="200" cy="330" rx="70" ry="16" fill="#fff" opacity="0.08"/>
  </g>`;
}

function riceCooker() {
  return `<defs>${lin("rc", "#ffffff", "#d9dde3", 1, 0)}${lin("rl", "#f4f6f8", "#c9ced6", 0, 1)}</defs>
  <g filter="url(#soft)">
    <path d="M160 260 L440 260 L425 460 Q300 490 175 460Z" fill="url(#rc)"/>
    <ellipse cx="300" cy="258" rx="150" ry="40" fill="url(#rl)"/>
    <path d="M150 258 Q300 120 450 258Z" fill="url(#rl)"/>
    <rect x="262" y="165" width="76" height="22" rx="11" fill="#9aa3ad"/>
    <rect x="245" y="320" width="110" height="70" rx="14" fill="#e5e8ec" stroke="#c4cad2"/>
    <circle cx="275" cy="345" r="7" fill="#ff6b4a"/><circle cx="325" cy="345" r="7" fill="#ffd166"/>
    <rect x="265" y="365" width="70" height="12" rx="6" fill="#4a5361"/>
    <text x="300" y="425" font-family="Inter,Segoe UI,Arial" font-size="13" font-weight="700" fill="#6b7480" text-anchor="middle">2.8L</text>
    <rect x="178" y="270" width="18" height="170" rx="9" fill="#fff" opacity="0.6"/>
  </g>`;
}

function cushion({ colors }) {
  const stitch = colors.map((c, i) => `<path d="M170 ${200 + i * 40} Q300 ${180 + i * 40} 430 ${200 + i * 40}" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="9 7"/>`).join("");
  return `<g filter="url(#soft)">
    <path d="M140 150 Q300 120 460 150 Q490 300 460 450 Q300 480 140 450 Q110 300 140 150Z" fill="#f6efe3"/>
    ${stitch}
    <circle cx="300" cy="300" r="46" fill="none" stroke="${colors[0]}" stroke-width="6" stroke-dasharray="8 6"/>
    <path d="M300 266 L320 300 L300 334 L280 300Z" fill="${colors[1]}"/>
    <path d="M140 150 Q300 120 460 150" fill="none" stroke="#000" stroke-opacity="0.06" stroke-width="10"/>
  </g>`;
}

function shelves() {
  const shelf = (y, items) => `<rect x="130" y="${y}" width="340" height="22" rx="4" fill="url(#wood)"/>${items}`;
  return `<defs>${lin("wood", "#8a5a3b", "#5b3a26", 0, 1)}</defs>
  <rect x="100" y="80" width="400" height="440" fill="#f4efe8" opacity="0.6"/>
  <g filter="url(#soft)">
    ${shelf(200, `<rect x="160" y="150" width="22" height="50" fill="#e76f51"/><rect x="184" y="160" width="18" height="40" fill="#2a9d8f"/><rect x="204" y="145" width="20" height="55" fill="#264653"/><path d="M380 200 L370 165 L410 165 L400 200Z" fill="#c97b4a"/><ellipse cx="390" cy="158" rx="32" ry="20" fill="#5aa469"/>`)}
    ${shelf(320, `<circle cx="210" cy="296" r="24" fill="#e9c46a"/><rect x="300" y="268" width="90" height="52" rx="6" fill="#d4a373"/>`)}
    ${shelf(440, `<path d="M190 440 L180 395 L230 395 L220 440Z" fill="#a8dadc"/><ellipse cx="205" cy="388" rx="34" ry="18" fill="#6a994e"/><rect x="330" y="400" width="60" height="40" rx="4" fill="#f4a261"/>`)}
  </g>`;
}

function riceBag() {
  return `<defs>${lin("bag", "#fff8e7", "#f0dfb4", 1, 0)}</defs>
  <g filter="url(#soft)">
    <path d="M190 140 Q300 110 410 140 L440 470 Q300 500 160 470Z" fill="url(#bag)"/>
    <path d="M190 140 Q300 110 410 140 L405 170 Q300 150 195 170Z" fill="#c9a24d"/>
    <rect x="215" y="230" width="170" height="150" rx="16" fill="#2f7d32"/>
    <text x="300" y="280" font-family="Inter,Segoe UI,Arial" font-size="24" font-weight="800" fill="#fff" text-anchor="middle">Chinigura</text>
    <text x="300" y="306" font-family="Inter,Segoe UI,Arial" font-size="12" fill="#e7f5e8" text-anchor="middle">Aromatic Rice</text>
    <text x="300" y="356" font-family="Inter,Segoe UI,Arial" font-size="34" font-weight="900" fill="#ffd166" text-anchor="middle">5 kg</text>
    ${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${210 + (i % 7) * 30}" cy="${415 + Math.floor(i / 7) * 18}" rx="7" ry="3.5" fill="#f2e6c9" stroke="#d4b97c" transform="rotate(${(i * 37) % 60 - 30} ${210 + (i % 7) * 30} ${415 + Math.floor(i / 7) * 18})"/>`).join("")}
  </g>`;
}

function yogaMat({ color }) {
  const c = color;
  return `<defs>${lin("mat", shade(c, 0.62), shade(c, 0.42), 0, 1)}</defs>
  <g filter="url(#soft)" transform="rotate(-10 300 300)">
    <rect x="140" y="240" width="300" height="140" fill="url(#mat)"/>
    <ellipse cx="140" cy="310" rx="38" ry="70" fill="${shade(c, 0.5)}"/>
    <ellipse cx="440" cy="310" rx="38" ry="70" fill="${shade(c, 0.58)}"/>
    <path d="M440 260 q-24 50 0 100 q20 -50 0 -100" fill="none" stroke="${shade(c, 0.4)}" stroke-width="4"/>
    <path d="M440 275 q-14 35 0 70" fill="none" stroke="${shade(c, 0.4)}" stroke-width="4"/>
    <rect x="230" y="236" width="18" height="148" fill="#2b2d33"/>
    <rect x="340" y="236" width="18" height="148" fill="#2b2d33"/>
    <path d="M239 236 Q295 150 349 236" fill="none" stroke="#2b2d33" stroke-width="10"/>
    <rect x="140" y="250" width="300" height="20" fill="#fff" opacity="0.15"/>
  </g>`;
}

function legoBox() {
  const brick = (x, y, c, w = 60) => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="4" fill="${c}"/>${Array.from({ length: w / 20 }, (_, i) => `<circle cx="${x + 10 + i * 20}" cy="${y - 2}" r="7" fill="${c}"/>`).join("")}`;
  return `<g filter="url(#soft)">
    <path d="M150 170 L420 170 L470 130 L200 130Z" fill="#ffd23f"/>
    <path d="M420 170 L470 130 L470 440 L420 480Z" fill="#e0a800"/>
    <rect x="150" y="170" width="270" height="310" fill="#ffcc00"/>
    <rect x="150" y="170" width="270" height="56" fill="#0055bf"/>
    <text x="285" y="207" font-family="Inter,Segoe UI,Arial" font-size="22" font-weight="900" fill="#fff" text-anchor="middle">CLASSIC</text>
    ${brick(175, 300, "#e3000b")}${brick(240, 300, "#0055bf", 80)}${brick(330, 300, "#00852b")}
    ${brick(200, 360, "#f58624", 80)}${brick(290, 360, "#ffffff")}${brick(355, 360, "#e3000b", 40)}
    ${brick(230, 420, "#00852b", 100)}
    <rect x="345" y="242" width="62" height="36" rx="6" fill="#e3000b"/>
    <text x="376" y="266" font-family="Inter,Segoe UI,Arial" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">4+</text>
  </g>`;
}

function book({ cover, title, author }) {
  return `<defs>${lin("bk", cover[0], cover[1])}</defs>
  <g filter="url(#soft)" transform="rotate(-6 300 300)">
    <rect x="200" y="110" width="250" height="360" rx="6" fill="#f2ead8"/>
    <rect x="190" y="105" width="250" height="360" rx="6" fill="url(#bk)"/>
    <rect x="190" y="105" width="26" height="360" fill="#000" opacity="0.2"/>
    <rect x="236" y="150" width="180" height="2" fill="#f3d27a"/>
    <text x="326" y="215" font-family="Hind Siliguri,Inter,Segoe UI,Arial" font-size="40" font-weight="800" fill="#f3d27a" text-anchor="middle">${title}</text>
    <circle cx="326" cy="300" r="46" fill="#f3d27a" opacity="0.9"/>
    <circle cx="326" cy="300" r="34" fill="${cover[1]}"/>
    <text x="326" y="410" font-family="Inter,Segoe UI,Arial" font-size="16" fill="#f8f1dc" text-anchor="middle">${author}</text>
    <rect x="236" y="430" width="180" height="2" fill="#f3d27a"/>
  </g>`;
}

/* ------------------------------------------------------------------ catalog */

const C = {
  graphite: col(260, 0.02),
  lilac: col(300, 0.08),
  black: col(270, 0.02),
  blue: col(240, 0.12),
  midnight: col(260, 0.04),
  sky: col(230, 0.07),
  grey: col(250, 0.01),
  silver: col(250, 0.008),
  sand: col(70, 0.03),
};

/** slug → list of [scene options] */
const art = {
  "samsung-galaxy-a56-5g": [
    { bgHue: 260, body: phone({ body: C.graphite, wall: [250, 290] }) },
    { bgHue: 300, body: phone({ body: C.lilac, wall: [310, 340] }) },
    { bgHue: 260, body: phone({ body: C.graphite, wall: [250, 290] }), zoom: { x: 220, y: 200, s: 1.8 } },
  ],
  "xiaomi-redmi-note-15-pro": [
    { bgHue: 240, body: phone({ body: C.black, wall: [200, 250] }) },
    { bgHue: 230, body: phone({ body: C.blue, wall: [190, 240] }) },
  ],
  "apple-macbook-air-m4-13": [
    { bgHue: 250, body: laptop({ body: C.midnight, wall: [230, 290], notch: true }) },
    { bgHue: 220, body: laptop({ body: C.sky, wall: [200, 260], notch: true }) },
    { bgHue: 250, body: laptop({ body: C.midnight, wall: [230, 290], notch: true }), zoom: { x: 300, y: 395, s: 1.9 } },
  ],
  "lenovo-ideapad-slim-5": [
    { bgHue: 240, body: laptop({ body: C.grey, wall: [180, 220] }) },
    { bgHue: 200, body: laptop({ body: C.grey, wall: [180, 220] }), zoom: { x: 300, y: 300, s: 1.5 } },
  ],
  "sony-wh-1000xm6": [
    { bgHue: 260, body: headphones({ body: C.black }) },
    { bgHue: 80, body: headphones({ body: C.sand, accent: C.sand }) },
    { bgHue: 260, body: headphones({ body: C.black }), zoom: { x: 430, y: 390, s: 1.8 } },
  ],
  "qcy-t13-anc-earbuds": [
    { bgHue: 200, body: earbuds({ body: C.black }) },
    { bgHue: 190, body: earbuds({ body: col(250, 0.004) }) },
  ],
  "amazfit-gts-5": [
    { bgHue: 200, body: watch({ body: C.black, face: 190 }) },
    { bgHue: 170, body: watch({ body: C.black, face: 150 }), zoom: { x: 300, y: 300, s: 1.6 } },
  ],
  "anker-powercore-20000": [
    { bgHue: 210, body: powerbank({ body: C.black }) },
    { bgHue: 190, body: powerbank({ body: C.black }), zoom: { x: 300, y: 380, s: 1.7 } },
  ],
  "jamdani-saree-handloom-red": [
    { bgHue: 30, body: fabricStack({ main: "oklch(0.5 0.19 25)", border: "oklch(0.82 0.13 85)" }) },
    { bgHue: 15, body: fabricStack({ main: "oklch(0.5 0.19 25)", border: "oklch(0.82 0.13 85)", layers: 2 }) },
    { bgHue: 30, body: fabricStack({ main: "oklch(0.5 0.19 25)", border: "oklch(0.82 0.13 85)" }), zoom: { x: 300, y: 400, s: 2 } },
  ],
  "cotton-panjabi-men-premium": [
    { bgHue: 80, body: kurta({ cloth: ["#fbf7ee", "#e7dfcd"], trim: "#c9a24d" }) },
    { bgHue: 250, body: kurta({ cloth: ["#2c3e66", "#1a2744"], trim: "#d8c690" }) },
    { bgHue: 80, body: kurta({ cloth: ["#fbf7ee", "#e7dfcd"], trim: "#c9a24d" }), zoom: { x: 300, y: 170, s: 2 } },
  ],
  "three-piece-lawn-printed": [
    { bgHue: 190, body: fabricStack({ main: "oklch(0.6 0.11 195)", border: "oklch(0.85 0.1 340)", pattern: "floral" }) },
    { bgHue: 180, body: fabricStack({ main: "oklch(0.6 0.11 195)", border: "oklch(0.85 0.1 340)", pattern: "floral" }), zoom: { x: 300, y: 330, s: 1.9 } },
  ],
  "leather-loafer-men": [
    { bgHue: 60, body: loafer({ leather: col(50, 0.08) }) },
    { bgHue: 40, body: loafer({ leather: col(50, 0.08) }), zoom: { x: 400, y: 300, s: 1.8 } },
  ],
  "cosrx-snail-mucin-essence": [
    { bgHue: 170, body: bottle({ glass: ["#f3efe6", "#d9d2c3"], liquid: ["#efe6d0", "#d6c49a"], cap: "#f4f4f4", label: "#ffffff", title: "SNAIL 96", sub: "Mucin Power Essence" }) },
    { bgHue: 150, body: bottle({ glass: ["#f3efe6", "#d9d2c3"], liquid: ["#efe6d0", "#d6c49a"], cap: "#f4f4f4", label: "#ffffff", title: "SNAIL 96", sub: "Mucin Power Essence" }), zoom: { x: 300, y: 350, s: 1.7 } },
  ],
  "the-ordinary-niacinamide-10": [
    { bgHue: 60, body: bottle({ glass: ["#e9eef2", "#c8d2da"], liquid: ["#f6f1e1", "#e8dcbd"], cap: "#1f1f1f", label: "#ffffff", title: "Niacinamide", sub: "10% + Zinc 1%", shape: "dropper" }) },
    { bgHue: 45, body: bottle({ glass: ["#e9eef2", "#c8d2da"], liquid: ["#f6f1e1", "#e8dcbd"], cap: "#1f1f1f", label: "#ffffff", title: "Niacinamide", sub: "10% + Zinc 1%", shape: "dropper" }), zoom: { x: 300, y: 340, s: 1.6 } },
  ],
  "maybelline-fit-me-foundation": [
    { bgHue: 30, body: bottle({ glass: ["#f6ede6", "#e2d2c6"], liquid: ["#e9c4a6", "#c99b7a"], cap: "#2a2a2a", label: "#fff6ef", title: "FIT ME", sub: "Matte + Poreless", shape: "pump" }) },
    { bgHue: 40, body: bottle({ glass: ["#f6ede6", "#e2d2c6"], liquid: ["#dcae8a", "#b4835f"], cap: "#2a2a2a", label: "#fff6ef", title: "FIT ME", sub: "220 Natural Beige", shape: "pump" }) },
  ],
  "beauty-of-joseon-sunscreen": [
    { bgHue: 85, body: tube({ body: ["#fffdf6", "#efe6cf"], cap: "#cbb98a", title: "Relief Sun", sub: "Rice + Probiotics · SPF50+" }) },
    { bgHue: 70, body: tube({ body: ["#fffdf6", "#efe6cf"], cap: "#cbb98a", title: "Relief Sun", sub: "Rice + Probiotics · SPF50+" }), zoom: { x: 300, y: 260, s: 1.6 } },
  ],
  "non-stick-fry-pan-28cm": [
    { bgHue: 20, body: fryPan() },
    { bgHue: 30, body: fryPan(), zoom: { x: 280, y: 350, s: 1.6 } },
  ],
  "miyako-rice-cooker-2-8l": [
    { bgHue: 0, body: riceCooker() },
    { bgHue: 350, body: riceCooker(), zoom: { x: 300, y: 350, s: 1.8 } },
  ],
  "nakshi-kantha-cushion-cover": [
    { bgHue: 45, body: cushion({ colors: ["#c1121f", "#264653", "#e9a03b", "#2a9d8f", "#7b2cbf", "#c1121f"] }) },
    { bgHue: 30, body: cushion({ colors: ["#2a9d8f", "#c1121f", "#264653", "#e9a03b", "#c1121f", "#7b2cbf"] }) },
  ],
  "wooden-wall-shelf-set": [{ bgHue: 40, body: shelves() }],
  "chinigura-aromatic-rice-5kg": [
    { bgHue: 110, body: riceBag() },
    { bgHue: 90, body: riceBag(), zoom: { x: 300, y: 300, s: 1.6 } },
  ],
  "yoga-mat-6mm": [
    { bgHue: 300, body: yogaMat({ color: col(300, 0.14) }) },
    { bgHue: 150, body: yogaMat({ color: col(150, 0.12) }) },
  ],
  "lego-classic-creative-box": [
    { bgHue: 60, body: legoBox() },
    { bgHue: 240, body: legoBox(), zoom: { x: 290, y: 370, s: 1.7 } },
  ],
  "humayun-ahmed-himu-collection": [
    { bgHue: 280, body: book({ cover: ["#7a1f2b", "#3f0d16"], title: "হিমু সমগ্র", author: "Humayun Ahmed" }) },
    { bgHue: 260, body: book({ cover: ["#7a1f2b", "#3f0d16"], title: "হিমু সমগ্র", author: "Humayun Ahmed" }), zoom: { x: 320, y: 260, s: 1.6 } },
  ],
  "oneplus-nord-5": [
    { bgHue: 80, body: phone({ body: C.sand, wall: [40, 20] }) },
    { bgHue: 70, body: phone({ body: C.sand, wall: [40, 20] }), zoom: { x: 220, y: 200, s: 1.8 } },
  ],
};

/** Framing for products that are drawn small: [scale, centre y]. Applied to shots without their own zoom. */
const framing = {
  "apple-macbook-air-m4-13": [1.18, 300],
  "lenovo-ideapad-slim-5": [1.18, 300],
  "qcy-t13-anc-earbuds": [1.12, 330],
  "jamdani-saree-handloom-red": [1.3, 330],
  "three-piece-lawn-printed": [1.3, 330],
  "cosrx-snail-mucin-essence": [1.22, 300],
  "the-ordinary-niacinamide-10": [1.3, 290],
  "maybelline-fit-me-foundation": [1.22, 300],
  "beauty-of-joseon-sunscreen": [1.12, 300],
  "miyako-rice-cooker-2-8l": [1.18, 320],
  "nakshi-kantha-cushion-cover": [1.12, 300],
  "lego-classic-creative-box": [1.1, 310],
  "yoga-mat-6mm": [1.18, 310],
  "chinigura-aromatic-rice-5kg": [1.08, 310],
};

/* ------------------------------------------------------------------ write files + data */

const imagesBySlug = {};
for (const [slug, shots] of Object.entries(art)) {
  imagesBySlug[slug] = shots.map((shot, i) => {
    const file = `${slug}-${i + 1}.svg`;
    const fit = framing[slug];
    if (fit && !shot.zoom) shot.zoom = { x: 300, y: fit[1], s: fit[0] };
    writeFileSync(join(outDir, file), scene(shot));
    return `/images/products/${file}`;
  });
}

/*
 * Point dummy_data at the new files. Edits are line-based so the hand-written
 * JSON formatting is preserved: we track the current product id while scanning
 * and only rewrite the image fields that follow it.
 */
const dataDir = join(root, "dummy_data");
const products = JSON.parse(readFileSync(join(dataDir, "products.json"), "utf8"));
const imagesById = {};
for (const p of products) {
  if (imagesBySlug[p.slug]) imagesById[p.id] = imagesBySlug[p.slug];
  else console.warn(`! no artwork for ${p.slug}, keeping placeholder`);
}

const list = (arr) => `[${arr.map((s) => JSON.stringify(s)).join(", ")}]`;

function rewrite(file) {
  const path = join(dataDir, file);
  let pid = null;
  let changed = 0;
  const out = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => {
      const m = line.match(/"(?:productId|id)": "(p_\d+)"/);
      if (m) pid = m[1];
      const imgs = pid && imagesById[pid];
      if (!imgs) return line;
      const next = line
        .replace(/"images": \[[^\]]*\]/, (s) => {
          if (file === "products.json") return `"images": ${list(imgs)}`;
          const n = (s.match(/"/g) ?? []).length / 2 - 1; // keep the same number of review photos
          return n > 0 ? `"images": ${list(Array(n).fill(imgs[0]))}` : s;
        })
        .replace(/"image": "[^"]*"/, `"image": ${JSON.stringify(imgs[0])}`)
        .replace(/"evidence": \[[^\]]*\]/, `"evidence": ${list([imgs[0]])}`);
      if (next !== line) changed++;
      return next;
    })
    .join("\n");
  JSON.parse(out); // fail loudly rather than write invalid JSON
  writeFileSync(path, out);
  console.log(`  ${file}: ${changed} line(s) updated`);
}

for (const f of ["products.json", "orders.json", "reviews.json", "verification.json"]) rewrite(f);

console.log(`Generated ${Object.values(imagesBySlug).flat().length} images for ${Object.keys(imagesBySlug).length} products → public/images/products`);
