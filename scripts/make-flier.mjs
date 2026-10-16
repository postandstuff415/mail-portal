// Builds the print flier: docs/flier/flier.html (4x6 in + 1/16 in bleed).
// Then render with Chrome (see docs/flier/README.md). Run: node scripts/make-flier.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

const SIGNUP_URL = "https://postandstuff.com/signup";
const qr = await QRCode.toString(SIGNUP_URL, { type: "svg", errorCorrectionLevel: "H", margin: 1, color: { dark: "#111111", light: "#ffffff" } });

const teal = "#7fe3d4", pink = "#f48fb1", yellow = "#ffd166", ink = "#eef8f5";

// Simple neon line icons (stroke only).
const icon = (paths, color) =>
  `<svg viewBox="0 0 48 48" width="0.42in" height="0.42in" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 3px ${color})">${paths}</svg>`;
const icons = {
  home: icon('<path d="M8 22 24 9l16 13"/><path d="M12 19v20h24V19"/><path d="M20 39V28h8v11"/>', pink),
  phone: icon('<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 37h6"/><rect x="18" y="12" width="12" height="9" rx="1.5"/><path d="M18 14l6 4 6-4"/>', teal),
  bell: icon('<path d="M14 33V22a10 10 0 0 1 20 0v11l3 4H11z"/><path d="M21 41a3 3 0 0 0 6 0"/>', yellow),
  box: icon('<path d="M8 15 24 8l16 7v18l-16 7-16-7z"/><path d="M8 15l16 7 16-7"/><path d="M24 22v18"/><path d="M16 11.5l16 7"/>', yellow),
};

// Neon rocket in the spirit of the original logo.
const rocket = `<svg viewBox="0 0 260 120" width="1.3in" height="0.6in" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="${teal}" stroke-width="3" style="filter:drop-shadow(0 0 4px ${teal})">
    <path d="M30 96 Q90 40 150 34"/><path d="M48 104 Q100 62 152 52"/>
  </g>
  <g stroke="${pink}" stroke-width="3.2" style="filter:drop-shadow(0 0 5px ${pink})">
    <path d="M150 62 Q178 20 232 14 Q226 68 184 96 Z"/>
    <circle cx="196" cy="48" r="9"/>
    <path d="M160 70 140 72 154 54"/><path d="M176 86 174 106 192 92"/>
  </g>
  <g stroke="${yellow}" stroke-width="3" style="filter:drop-shadow(0 0 4px ${yellow})">
    <path d="M150 84 128 100"/><path d="M142 78 118 88"/><path d="M158 92 140 112"/>
  </g>
  <g fill="${ink}" stroke="none" style="filter:drop-shadow(0 0 3px ${teal})">
    <path d="M70 18l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M118 8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
    <path d="M246 46l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><path d="M92 50l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"/>
  </g>
</svg>`;

const feature = (ic, title, line) => `
  <div class="feat">${ic}<div><div class="ft">${title}</div><div class="fl">${line}</div></div></div>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Post and Stuff flier</title>
<style>
  @page { size: 4.125in 6.125in; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #141215; }
  html, body { width: 4.125in; height: 6.125in; }
  body { position: relative; overflow: hidden; }
  body { background: radial-gradient(ellipse at 50% 30%, #2a2530 0%, #1c1a1d 60%, #141215 100%);
         color: ${ink}; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Everything important stays 0.19 in inside the trim line. */
  .safe { position: absolute; inset: 0.25in 0.25in 0.25in 0.25in; display: flex; flex-direction: column; align-items: center; }
  .safe > * { flex-shrink: 0; }
  .logo { text-align: center; line-height: 0.9; margin-top: -0.02in; }
  .post { font-size: 0.52in; font-weight: 900; letter-spacing: 0.02in; color: transparent;
          -webkit-text-stroke: 0.022in ${ink}; text-shadow: 0 0 6px ${teal}, 0 0 14px ${teal}; }
  .stuff { font-size: 0.4in; font-weight: 900; letter-spacing: 0.02in; color: transparent;
           -webkit-text-stroke: 0.02in ${pink}; text-shadow: 0 0 6px ${pink}, 0 0 14px ${pink}; }
  .amp { -webkit-text-stroke: 0.016in ${yellow}; text-shadow: 0 0 6px ${yellow}; }
  .badge { margin-top: 0.08in; width: 100%; border: 0.025in solid ${teal}; border-radius: 0.12in; padding: 0.07in 0.1in;
           text-align: center; box-shadow: 0 0 8px ${teal}, inset 0 0 8px rgba(127,227,212,0.35); }
  .badge .big { font-size: 0.27in; font-weight: 900; color: #e9fffb; text-shadow: 0 0 8px ${teal}; letter-spacing: 0.01in; }
  .badge .small { font-size: 0.105in; font-weight: 700; letter-spacing: 0.005in; }
  .feats { margin-top: 0.09in; width: 100%; display: flex; flex-direction: column; gap: 0.05in; }
  .feat > div { flex: 1; min-width: 0; }
  .feat { display: flex; gap: 0.1in; align-items: center; }
  .feat > svg { flex-shrink: 0; }
  .ft { font-size: 0.13in; font-weight: 800; letter-spacing: 0.004in; }
  .fl { font-size: 0.105in; opacity: 0.92; line-height: 1.25; }
  .bottom { margin-top: auto; width: 100%; display: flex; gap: 0.1in; align-items: center; }
  .info { flex: 1; min-width: 0; border: 0.02in solid ${teal}; border-radius: 0.1in; padding: 0.08in 0.1in; font-size: 0.105in;
          line-height: 1.45; box-shadow: 0 0 6px rgba(127,227,212,0.6); }
  .info b { color: ${teal}; }
  .owner { color: ${pink}; font-weight: 700; }
  .qrbox { width: 1.08in; text-align: center; }
  .qr { background: #fff; border-radius: 0.06in; padding: 0.04in; }
  .qr svg { width: 100%; height: auto; display: block; }
  .scan { margin-top: 0.04in; font-size: 0.115in; font-weight: 900; color: ${yellow}; text-shadow: 0 0 5px ${yellow}; }
  .url { font-size: 0.082in; opacity: 0.9; }
  .partners { margin-top: 0.07in; width: 100%; text-align: center; font-size: 0.09in; opacity: 0.85; }
</style></head>
<body><div class="safe">
  ${rocket}
  <div class="logo"><div class="post">POST</div><div class="stuff"><span class="amp">&amp;</span> STUFF</div></div>
  <div class="badge">
    <div class="big">FREE MAILBOX</div>
    <div class="small">for clients of partner nonprofits &middot; the nonprofit pays</div>
  </div>
  <div class="feats">
    ${feature(icons.home, "A REAL STREET ADDRESS", "For benefits, court, jobs, banks, and the DMV")}
    ${feature(icons.phone, "SEE YOUR MAIL ON YOUR PHONE", "A photo of every envelope the day it arrives. We only open mail if you ask.")}
    ${feature(icons.bell, "TEXT WHEN MAIL ARRIVES", "Optional. Never says who it's from.")}
    ${feature(icons.box, "PACKAGES ACCEPTED", "&ldquo;If it will fit through our door.&rdquo; Mail held 90 days.")}
  </div>
  <div class="bottom">
    <div class="info">
      <b>ADDRESS</b> 4051 Foothill Blvd<br>Oakland, CA 94601<br>
      <b>PHONE</b> (415) 725-1603<br>
      <b>WEB</b> postandstuff.com<br>
      <b>THEN</b> bring 2 IDs (1 with photo)<br>
      <span class="owner">Michael Thompson, Owner</span>
    </div>
    <div class="qrbox">
      <div class="qr">${qr}</div>
      <div class="scan">SCAN TO SIGN UP</div>
      <div class="url">postandstuff.com/signup</div>
    </div>
  </div>
  <div class="partners">Case managers &amp; nonprofits: $15 per client per month (90-day minimum). Call to partner.</div>
</div></body></html>`;

mkdirSync("docs/flier", { recursive: true });
writeFileSync("docs/flier/flier.html", html);
console.log("wrote docs/flier/flier.html");
