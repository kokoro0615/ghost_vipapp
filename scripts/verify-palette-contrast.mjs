/*
 * Proves the token palette against WCAG 2.2 AA, independently of where the
 * tokens happen to be used.
 *
 * The a11y harness already runs axe over 52 rendered states, which is the real
 * gate — it measures what the operator actually sees. This script answers a
 * different question that a rendered audit cannot: is every token in the ramp
 * *capable* of its job on every ground the surface owns? A token that only
 * passes because nothing currently paints it on the sunken band is a trap for
 * the next person who does.
 *
 * Floors, and why each token sits in the bucket it does:
 *
 *   text (4.5:1)      — anything that is ever a `color:` on this surface.
 *   non-text (3:1)    — WCAG 1.4.11: boundaries that identify a control, and
 *                       the focus indicator. `--rule-control` bounds every
 *                       input, select and button; `--accent-line` is the focus
 *                       ring and the calendar's open-night dot.
 *   separator (none)  — `--rule` and `--rule-strong` divide rows and panes.
 *                       1.4.11 does not govern decorative separators: the
 *                       content is understood from alignment and spacing, and
 *                       forcing them to 3:1 would draw a grid rather than
 *                       structure. Reported for information, never gated.
 *
 * Usage: node scripts/verify-palette-contrast.mjs
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";

import { chromium } from "playwright-core";

const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

function token(name) {
  const value = new RegExp(`${name}:\\s*(oklch\\([^)]*\\))`, "u").exec(css)?.[1];
  assert.ok(value, `${name} must be authored in OKLCH in globals.css`);
  return value;
}

const TEXT_TOKENS = [
  "--ink", "--ink-2", "--ink-3", "--accent", "--accent-ink",
  "--action", "--alert", "--warn", "--live",
];
const NON_TEXT_TOKENS = ["--rule-control", "--accent-line"];
const SEPARATOR_TOKENS = ["--rule", "--rule-strong"];
const GROUNDS = {
  "white pane": "oklch(1 0 0)",
  desk: token("--paper"),
  "sunken band": token("--surface-sunken"),
  "quiet row": token("--surface-quiet"),
};

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent("<body></body>");
  const rows = await page.evaluate(({ groups, grounds }) => {
    /* Chromium reports oklch() back as oklch(), so computed style cannot be
     * parsed as rgb. Paint the colour and read the real sRGB pixel. */
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const paint = (value) => {
      context.clearRect(0, 0, 4, 4);
      context.fillStyle = "#000";
      context.fillStyle = value;
      context.fillRect(0, 0, 4, 4);
      const data = context.getImageData(1, 1, 1, 1).data;
      return [data[0], data[1], data[2]];
    };
    const luminance = ([r, g, b]) => {
      const channel = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (a, b) => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
    };
    const hex = ([r, g, b]) =>
      `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

    return groups.flatMap(({ kind, floor, tokens }) =>
      tokens.map(([name, value]) => {
        const rgb = paint(value);
        const measured = Object.fromEntries(
          Object.entries(grounds).map(([ground, background]) => [ground, ratio(rgb, paint(background))]),
        );
        return { name, kind, floor, hex: hex(rgb), measured };
      }));
  }, {
    groups: [
      { kind: "text", floor: 4.5, tokens: TEXT_TOKENS.map((n) => [n, token(n)]) },
      { kind: "non-text", floor: 3, tokens: NON_TEXT_TOKENS.map((n) => [n, token(n)]) },
      { kind: "separator", floor: 0, tokens: SEPARATOR_TOKENS.map((n) => [n, token(n)]) },
    ],
    grounds: GROUNDS,
  });

  const groundNames = Object.keys(GROUNDS);
  const header = ["token".padEnd(15), "kind".padEnd(10), "sRGB".padEnd(9)]
    .concat(groundNames.map((g) => g.padStart(12)))
    .concat(["  floor", "  verdict"]);
  console.log(header.join(""));

  const failures = [];
  for (const row of rows) {
    const worst = Math.min(...groundNames.map((g) => row.measured[g]));
    const ok = row.floor === 0 || worst >= row.floor;
    if (!ok) failures.push(`${row.name} ${worst}:1 < ${row.floor}:1`);
    console.log([
      row.name.padEnd(15), row.kind.padEnd(10), row.hex.padEnd(9),
      ...groundNames.map((g) => String(row.measured[g]).padStart(12)),
      String(row.floor === 0 ? "—" : row.floor).padStart(7),
      (row.floor === 0 ? "  n/a" : ok ? "  PASS" : "  FAIL").padStart(9),
    ].join(""));
  }

  assert.deepEqual(failures, [], `palette tokens below their WCAG floor:\n${failures.join("\n")}`);
  console.log(`\nOK — ${rows.length} tokens measured on ${groundNames.length} grounds, 0 below floor`);
} finally {
  await browser.close();
}
