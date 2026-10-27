// Shared visual tokens — mirrors the hospital web app's periwinkle accent,
// deepened for more contrast headroom, plus a second "vital sign" accent
// (coral) used only for real body data: the live pulse strip, bpm figures,
// and anything that comes from the patient's own heart, as opposed to
// device/system data which stays periwinkle. That color split is the one
// piece of visual grammar every screen in the app follows.
export const theme = {
  bg: "#0F0F14",
  bg2: "#16161C",
  surface: "rgba(255,255,255,0.045)",
  surfaceRaised: "rgba(255,255,255,0.07)",
  surfaceSolid: "#1C1C22",
  border: "rgba(255,255,255,0.09)",
  borderAccent: "rgba(195,200,252,0.22)",

  text: "#F5F5F7",
  textLo: "#93939C",
  textFaint: "#5C5C64",

  accent: "#C3C8FC", // device / system data (voltage, sync, connection)
  accent2: "#7C82E8",
  pulse: "#FF6E6E", // body data (heart rate, ECG motif)
  pulseDim: "rgba(255,110,110,0.16)",

  warn: "#F5B950",
  alert: "#F0778A",
  ok: "#6EE7A8",

  radius: 18,
  radiusSm: 12,
};

// Type scale — system fonts, but with a deliberate rhythm: big tabular
// numerals for vitals, wide-tracked uppercase for labels/eyebrows, and a
// restrained body size everywhere else.
export const type = {
  display: { fontSize: 52, fontWeight: "700", letterSpacing: -1.5 },
  h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 12.5, lineHeight: 17 },
};
