/**
 * PaceLink - Academic Project Presentation Generator
 * Generates a 14-slide widescreen (16:9) presentation deck using pptxgenjs.
 * 
 * Execution requirement:
 * NODE_PATH=/usr/local/lib/node_modules_global/lib/node_modules node generate_deck.js
 */

const PptxGenJS = require("pptxgenjs");

const pres = new PptxGenJS();
pres.layout = "LAYOUT_169"; // 13.33 x 7.5 inches
pres.author = "PaceLink Team";
pres.title = "PaceLink: Smart Pacemaker Telemetry & Monitoring System";

// Color Palette Definition
const COLOR = {
  darkBg: "0F172A",      // Deep Navy / Midnight Slate
  darkCard: "1E293B",    // Slate Card Background
  lightBg: "F8FAFC",     // Clean Soft Blue-Gray
  lightCard: "FFFFFF",   // Pure White Card
  primary: "4F46E5",     // Indigo / Deep Periwinkle
  accent: "E11D48",      // Crimson / ECG Coral
  success: "10B981",     // Emerald Green
  warning: "F59E0B",     // Amber
  textDark: "0F172A",    // High-contrast dark text
  textMuted: "64748B",   // Medium gray body text
  textLight: "F8FAFC",   // Crisp white header text
  textLightMuted: "94A3B8", // Light gray subtitle text
  borderLight: "E2E8F0", // Card border
  borderDark: "334155"   // Dark card border
};

const FONT_HEADER = "Georgia";
const FONT_BODY = "Calibri";

// Helper: Add Standard Light Slide Header
function addSlideHeader(slide, category, title) {
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.45,
    w: 11.7,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 10,
    bold: true,
    color: COLOR.primary,
    charSpacing: 1.5
  });

  slide.addText(title, {
    x: 0.8,
    y: 0.75,
    w: 11.7,
    h: 0.5,
    fontFace: FONT_HEADER,
    fontSize: 22,
    bold: true,
    color: COLOR.textDark
  });
}

// Helper: Add Standard Dark Slide Header
function addDarkSlideHeader(slide, category, title) {
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.45,
    w: 11.7,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 10,
    bold: true,
    color: COLOR.accent,
    charSpacing: 1.5
  });

  slide.addText(title, {
    x: 0.8,
    y: 0.75,
    w: 11.7,
    h: 0.5,
    fontFace: FONT_HEADER,
    fontSize: 22,
    bold: true,
    color: COLOR.textLight
  });
}

// Helper: Add Footer Slide Numbers
function addFooter(slide, current, total = 14, isDark = false) {
  slide.addText(`PaceLink Telemetry System  |  Academic Evaluation Deck`, {
    x: 0.8,
    y: 7.0,
    w: 8.0,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 9,
    color: isDark ? COLOR.textLightMuted : COLOR.textMuted
  });

  slide.addText(`${current} / ${total}`, {
    x: 11.0,
    y: 7.0,
    w: 1.5,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 9,
    align: "right",
    color: isDark ? COLOR.textLightMuted : COLOR.textMuted
  });
}

// ==========================================
// SLIDE 1: Title Slide (Dark Theme)
// ==========================================
const s1 = pres.addSlide();
s1.background = { color: COLOR.darkBg };

// Background Accent Card
s1.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 1.0, w: 11.73, h: 5.3, rectRadius: 0.03,
  fill: { color: "1E293B" }, line: { color: COLOR.borderDark, width: 1 }
});

// ECG Waveform Line Decorative Graphic
s1.addShape(pres.ShapeType.lightningBolt, {
  x: 10.2, y: 1.8, w: 1.8, h: 3.5,
  fill: { color: COLOR.accent }, line: { color: COLOR.accent }
});

s1.addText("PACEMAKER CLINICAL TELEMETRY PLATFORM", {
  x: 1.2, y: 1.6, w: 8.5, h: 0.4,
  fontFace: FONT_BODY, fontSize: 11, bold: true, color: COLOR.accent, charSpacing: 2
});

s1.addText("PaceLink", {
  x: 1.2, y: 2.1, w: 8.5, h: 1.1,
  fontFace: FONT_HEADER, fontSize: 48, bold: true, color: COLOR.textLight
});

s1.addText("Secure Pacemaker Telemetry & Mitigation of Energy Depletion Attacks", {
  x: 1.2, y: 3.2, w: 8.2, h: 0.8,
  fontFace: FONT_BODY, fontSize: 16, color: COLOR.textLightMuted
});

// Tech Badges Row
const badges = ["Django Backend", "React Native Mobile App", "REST Telemetry API", "Copilot AI Assistant"];
badges.forEach((bg, idx) => {
  s1.addShape(pres.ShapeType.roundRect, {
    x: 1.2 + idx * 2.3, y: 4.3, w: 2.1, h: 0.4, rectRadius: 0.05,
    fill: { color: "334155" }, line: { color: COLOR.primary, width: 1 }
  });
  s1.addText(bg, {
    x: 1.2 + idx * 2.3, y: 4.3, w: 2.1, h: 0.4,
    fontFace: FONT_BODY, fontSize: 9, bold: true, align: "center", color: COLOR.textLight
  });
});

s1.addText("Project Type: Capstone / Academic Submission  |  Architecture: Hybrid Web & Mobile System", {
  x: 1.2, y: 5.6, w: 9.0, h: 0.3,
  fontFace: FONT_BODY, fontSize: 10, color: COLOR.textLightMuted
});
addFooter(s1, 1, 14, true);

// ==========================================
// SLIDE 2: Problem Statement (Light Theme)
// ==========================================
const s2 = pres.addSlide();
s2.background = { color: COLOR.lightBg };
addSlideHeader(s2, "The Core Threat", "Energy Depletion Attacks (EDA) in Pacemakers");

const probCards = [
  {
    title: "1. The Wireless Vulnerability",
    desc: "Modern pacemakers rely on wireless telemetry (RF/BLE) for remote monitoring. A pacemaker's radio transceiver consumes disproportionately high power compared to standard cardiac pacing."
  },
  {
    title: "2. The Attack Mechanism",
    desc: "Malicious actors exploit these wireless channels by flooding the device with continuous interrogation signals or fake authentication requests, keeping the transceiver constantly awake."
  },
  {
    title: "3. The Critical Impact",
    desc: "Battery life is drastically reduced from 7-10 years to mere weeks. Premature battery exhaustion requires emergency invasive surgical replacement, directly threatening patient survival."
  }
];

probCards.forEach((card, idx) => {
  const xPos = 0.8 + idx * 3.98;
  s2.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 1.6, w: 3.75, h: 4.8, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s2.addShape(pres.ShapeType.rect, {
    x: xPos, y: 1.6, w: 3.75, h: 0.1, fill: { color: idx === 0 ? COLOR.accent : COLOR.primary }
  });

  s2.addText(card.title, {
    x: xPos + 0.3, y: 2.0, w: 3.15, h: 0.7,
    fontFace: FONT_HEADER, fontSize: 15, bold: true, color: COLOR.textDark
  });

  s2.addText(card.desc, {
    x: xPos + 0.3, y: 2.8, w: 3.15, h: 3.2,
    fontFace: FONT_BODY, fontSize: 12, color: COLOR.textMuted, lineSpacing: 18
  });
});
addFooter(s2, 2);

// ==========================================
// SLIDE 3: Objectives & Solution Scope (Light)
// ==========================================
const s3 = pres.addSlide();
s3.background = { color: COLOR.lightBg };
addSlideHeader(s3, "Objectives & Core Scope", "PaceLink System Goals & Functionalities");

const objList = [
  {
    pillar: "A. Telemetry Proxying (Anti-Flood)",
    detail: "Implement a secure cloud middleware that intercepts all telemetry. The pacemaker only communicates on scheduled 30-min intervals, completely blocking continuous external ping floods."
  },
  {
    pillar: "B. Dual Clinical & Patient Interfaces",
    detail: "Provide doctors with a secure management portal and patients with a React Native app, isolating the physical pacemaker from direct external app connections."
  },
  {
    pillar: "C. Copilot-Style AI Heart Assistant",
    detail: "Embed an accessible, user-resizable right-side AI assistant offering context-aware patient support, safe symptom triage, and medical disclaimers."
  },
  {
    pillar: "D. Dynamic Voltage Constraint Validation",
    detail: "Enforce medical threshold constraints (0.5 V to 7.5 V range) at both API middleware and database model levels to guarantee clinical safety."
  }
];

objList.forEach((item, idx) => {
  const yPos = 1.5 + idx * 1.3;
  s3.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: yPos, w: 11.73, h: 1.15, rectRadius: 0.02,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s3.addShape(pres.ShapeType.rect, {
    x: 0.8, y: yPos, w: 0.15, h: 1.15, fill: { color: COLOR.primary }
  });

  s3.addText(item.pillar, {
    x: 1.2, y: yPos + 0.15, w: 10.8, h: 0.35,
    fontFace: FONT_HEADER, fontSize: 14, bold: true, color: COLOR.textDark
  });

  s3.addText(item.detail, {
    x: 1.2, y: yPos + 0.5, w: 10.8, h: 0.5,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textMuted
  });
});
addFooter(s3, 3);

// ==========================================
// SLIDE 4: System Architecture (Dark)
// ==========================================
const s4 = pres.addSlide();
s4.background = { color: COLOR.darkBg };
addDarkSlideHeader(s4, "System Architecture", "End-to-End Data Flow & Tier Isolation");

const archNodes = [
  { label: "1. Device / Simulator", sub: "Python Engine\nHeart Rate & Battery Telemetry", color: COLOR.accent },
  { label: "2. Backend Server", sub: "Django Web Framework\nCustom Auth & CORS Middleware", color: COLOR.primary },
  { label: "3. Clinical Database", sub: "SQLite / PostgreSQL\nPatients, Readings, Orders", color: "0284C7" },
  { label: "4. Mobile Client", sub: "React Native / Expo 51\nPanResponder Copilot Drawer", color: COLOR.success }
];

archNodes.forEach((node, idx) => {
  const xPos = 0.8 + idx * 3.0;
  s4.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 2.2, w: 2.6, h: 2.8, rectRadius: 0.04,
    fill: { color: COLOR.darkCard }, line: { color: node.color, width: 2 }
  });

  s4.addText(node.label, {
    x: xPos + 0.15, y: 2.5, w: 2.3, h: 0.6,
    fontFace: FONT_HEADER, fontSize: 14, bold: true, align: "center", color: COLOR.textLight
  });

  s4.addText(node.sub, {
    x: xPos + 0.15, y: 3.2, w: 2.3, h: 1.5,
    fontFace: FONT_BODY, fontSize: 11, align: "center", color: COLOR.textLightMuted
  });

  // Flow Arrow (except last node)
  if (idx < 3) {
    s4.addShape(pres.ShapeType.rightArrow, {
      x: xPos + 2.65, y: 3.4, w: 0.3, h: 0.3,
      fill: { color: COLOR.textLightMuted }, line: { color: COLOR.textLightMuted }
    });
  }
});

s4.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 5.4, w: 11.73, h: 1.1, rectRadius: 0.02,
  fill: { color: "1E293B" }, line: { color: COLOR.borderDark, width: 1 }
});

s4.addText("DATA PROTOCOL & LIFECYCLE:", {
  x: 1.1, y: 5.55, w: 3.0, h: 0.3,
  fontFace: FONT_BODY, fontSize: 10, bold: true, color: COLOR.accent
});

s4.addText("Doctor issues voltage update -> Order saved in Django Queue -> Auto 30-min Push Cycle syncs to Pacemaker Simulator -> Device returns latest Heart Rate & Battery logs -> React Native Mobile App pulls update via REST API.", {
  x: 1.1, y: 5.85, w: 11.0, h: 0.5,
  fontFace: FONT_BODY, fontSize: 11, color: COLOR.textLight
});
addFooter(s4, 4, 14, true);

// ==========================================
// SLIDE 5: Technology Stack (Light)
// ==========================================
const s5 = pres.addSlide();
s5.background = { color: COLOR.lightBg };
addSlideHeader(s5, "Technology Stack", "Robust Full-Stack Web, Mobile, and AI Frameworks");

const stackCols = [
  {
    category: "Backend Framework",
    techs: [
      { name: "Django 5.x / Python", desc: "Core REST API & Web Administration" },
      { name: "Custom CORS Middleware", desc: "Hand-rolled headers for cross-origin security" },
      { name: "Token Authentication", desc: "Custom token creation & user authorization" }
    ]
  },
  {
    category: "Mobile Application",
    techs: [
      { name: "React Native & Expo SDK 51", desc: "Cross-platform iOS / Android build" },
      { name: "Expo Router 3.5", desc: "File-based tab & modal navigation" },
      { name: "PanResponder & Animated API", desc: "Resizable sliding drawer UI gestures" }
    ]
  },
  {
    category: "Storage & Integration",
    techs: [
      { name: "SQLite / PostgreSQL", desc: "Relational clinical database models" },
      { name: "SecureStore / LocalStorage", desc: "Persistent cross-platform auth storage" },
      { name: "Simulation Engine", desc: "Background thread for periodic device telemetry" }
    ]
  }
];

stackCols.forEach((col, idx) => {
  const xPos = 0.8 + idx * 3.98;
  s5.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 1.6, w: 3.75, h: 4.8, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s5.addText(col.category, {
    x: xPos + 0.3, y: 1.9, w: 3.15, h: 0.4,
    fontFace: FONT_HEADER, fontSize: 15, bold: true, color: COLOR.primary
  });

  col.techs.forEach((t, tIdx) => {
    const ySub = 2.5 + tIdx * 1.3;
    s5.addText(t.name, {
      x: xPos + 0.3, y: ySub, w: 3.15, h: 0.3,
      fontFace: FONT_BODY, fontSize: 12, bold: true, color: COLOR.textDark
    });
    s5.addText(t.desc, {
      x: xPos + 0.3, y: ySub + 0.3, w: 3.15, h: 0.6,
      fontFace: FONT_BODY, fontSize: 10, color: COLOR.textMuted
    });
  });
});
addFooter(s5, 5);

// ==========================================
// SLIDE 6: Data Models & Schema (Light)
// ==========================================
const s6 = pres.addSlide();
s6.background = { color: COLOR.lightBg };
addSlideHeader(s6, "Data Architecture", "Clinical Data Models & Boundary Enforcement");

const models = [
  {
    name: "Patient Model",
    fields: [
      "user: OneToOneField(User)",
      "doctor: ForeignKey(Doctor)",
      "patient_id: Unique CharField",
      "blood_type: TextChoices Enum",
      "voltage: FloatField (0.5V - 7.5V)"
    ],
    color: COLOR.primary
  },
  {
    name: "VoltageChange Order",
    fields: [
      "patient: ForeignKey(Patient)",
      "requested_voltage: FloatField",
      "pushed: BooleanField (Pending vs Applied)",
      "timestamp: DateTimeField",
      "note: Optional Text Note"
    ],
    color: COLOR.accent
  },
  {
    name: "HeartRateRecord Model",
    fields: [
      "patient: ForeignKey(Patient)",
      "bpm: IntegerField (e.g. 60-120)",
      "battery_percentage: FloatField",
      "recorded_at: Auto DateTime",
      "device_status: Normal / Warning"
    ],
    color: "0284C7"
  }
];

models.forEach((m, idx) => {
  const xPos = 0.8 + idx * 3.98;
  s6.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 1.6, w: 3.75, h: 4.8, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s6.addShape(pres.ShapeType.rect, {
    x: xPos, y: 1.6, w: 3.75, h: 0.5, fill: { color: m.color }
  });

  s6.addText(m.name, {
    x: xPos + 0.2, y: 1.6, w: 3.35, h: 0.5,
    fontFace: FONT_BODY, fontSize: 13, bold: true, align: "center", color: COLOR.textLight
  });

  m.fields.forEach((f, fIdx) => {
    s6.addText(`*  ${f}`, {
      x: xPos + 0.3, y: 2.3 + fIdx * 0.7, w: 3.15, h: 0.6,
      fontFace: FONT_BODY, fontSize: 11, color: COLOR.textDark
    });
  });
});
addFooter(s6, 6);

// ==========================================
// SLIDE 7: Sync Engine Pipeline (Light)
// ==========================================
const s7 = pres.addSlide();
s7.background = { color: COLOR.lightBg };
addSlideHeader(s7, "Push/Pull Synchronization Engine", "30-Minute Automatic Telemetry Lifecycle");

const steps = [
  { step: "Step 1", title: "Doctor Stage Order", desc: "Doctor updates patient target voltage (e.g. 2.5V -> 3.0V). Order created with pushed=False." },
  { step: "Step 2", title: "Background Sync Loop", desc: "Automated timer runs every 30 mins or manual trigger initiated from clinical web dashboard." },
  { step: "Step 3", title: "Device Telemetry Apply", desc: "Simulator updates physical pacing hardware; sets order pushed=True and generates heart record." },
  { step: "Step 4", title: "Mobile App Fetch", desc: "React Native patient app pulls clean JSON payload to show updated voltage and heart metrics." }
];

steps.forEach((st, idx) => {
  const xPos = 0.8 + idx * 2.98;
  s7.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 1.8, w: 2.75, h: 4.4, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s7.addShape(pres.ShapeType.oval, {
    x: xPos + 0.87, y: 2.1, w: 1.0, h: 1.0, fill: { color: COLOR.primary }
  });

  s7.addText(st.step, {
    x: xPos + 0.87, y: 2.4, w: 1.0, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, bold: true, align: "center", color: COLOR.textLight
  });

  s7.addText(st.title, {
    x: xPos + 0.2, y: 3.3, w: 2.35, h: 0.6,
    fontFace: FONT_HEADER, fontSize: 13, bold: true, align: "center", color: COLOR.textDark
  });

  s7.addText(st.desc, {
    x: xPos + 0.2, y: 4.0, w: 2.35, h: 2.0,
    fontFace: FONT_BODY, fontSize: 11, align: "center", color: COLOR.textMuted
  });
});
addFooter(s7, 7);

// ==========================================
// SLIDE 8: Doctor Web Portal (Light)
// ==========================================
const s8 = pres.addSlide();
s8.background = { color: COLOR.lightBg };
addSlideHeader(s8, "Doctor Web Portal", "Clinical Management Dashboard & Control Tools");

s8.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 1.6, w: 5.7, h: 4.8, rectRadius: 0.03,
  fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
});

s8.addText("Clinical Dashboard Capabilities", {
  x: 1.1, y: 1.9, w: 5.1, h: 0.4,
  fontFace: FONT_HEADER, fontSize: 16, bold: true, color: COLOR.primary
});

const docFeats = [
  "Patient Registry & Search: Instant lookup by ID or name.",
  "Voltage Order Staging: Precise form with min/max safety guards.",
  "Pending Queue Tracker: Clear visual indicators for pushed vs pending order states.",
  "Manual Sync Trigger: Immediate bypass of 30-min timer for critical updates.",
  "Historical Telemetry Logs: Full audit trail of past voltage adjustments."
];

docFeats.forEach((f, idx) => {
  s8.addText(`•  ${f}`, {
    x: 1.1, y: 2.5 + idx * 0.75, w: 5.1, h: 0.7,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textDark
  });
});

// Mock UI Graphic Container for Doctor Portal
s8.addShape(pres.ShapeType.roundRect, {
  x: 6.8, y: 1.6, w: 5.73, h: 4.8, rectRadius: 0.03,
  fill: { color: "1E293B" }, line: { color: COLOR.borderDark, width: 1 }
});

s8.addText("CLINICAL DASHBOARD PREVIEW", {
  x: 7.1, y: 1.8, w: 5.1, h: 0.3,
  fontFace: FONT_BODY, fontSize: 10, bold: true, color: COLOR.accent
});

// Mock Table Graphic
s8.addShape(pres.ShapeType.rect, {
  x: 7.1, y: 2.3, w: 5.13, h: 0.4, fill: { color: "334155" }
});
s8.addText("PATIENT ID      VOLTAGE      STATUS      ACTION", {
  x: 7.2, y: 2.35, w: 4.9, h: 0.3,
  fontFace: FONT_BODY, fontSize: 9, bold: true, color: COLOR.textLight
});

const mockRows = [
  { id: "P-10482", v: "2.5 V", status: "SYNCED", color: COLOR.success },
  { id: "P-10483", v: "3.2 V", status: "PENDING", color: COLOR.warning },
  { id: "P-10484", v: "1.8 V", status: "SYNCED", color: COLOR.success }
];

mockRows.forEach((r, idx) => {
  const yRow = 2.8 + idx * 0.6;
  s8.addShape(pres.ShapeType.rect, {
    x: 7.1, y: yRow, w: 5.13, h: 0.5, fill: { color: "1E293B" }
  });
  s8.addText(`${r.id}        ${r.v}         ${r.status}`, {
    x: 7.2, y: yRow + 0.1, w: 3.5, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: COLOR.textLight
  });
  s8.addShape(pres.ShapeType.roundRect, {
    x: 10.8, y: yRow + 0.1, w: 1.2, h: 0.3, rectRadius: 0.02, fill: { color: r.color }
  });
});
addFooter(s8, 8);

// ==========================================
// SLIDE 9: Patient Mobile App (Light)
// ==========================================
const s9 = pres.addSlide();
s9.background = { color: COLOR.lightBg };
addSlideHeader(s9, "Patient Mobile App", "Expo 51 / React Native Mobile Experience");

const mobCards = [
  { title: "Home Dashboard", desc: "Features animated pulse indicator, live current voltage display, quick health cards, and heart rate status." },
  { title: "Readings History", desc: "Detailed chronological record of device voltage updates, battery levels, and clinical order timestamps." },
  { title: "Account & Settings", desc: "Profile details, assigned primary cardiologist contact, blood type badge, and session management." },
  { title: "Token Onboarding", desc: "Hassle-free setup via doctor-issued registration tokens, connecting patients securely to their device." }
];

mobCards.forEach((mc, idx) => {
  const xPos = (idx % 2 === 0) ? 0.8 : 6.8;
  const yPos = (idx < 2) ? 1.6 : 4.2;

  s9.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: yPos, w: 5.7, h: 2.2, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s9.addShape(pres.ShapeType.rect, {
    x: xPos, y: yPos, w: 0.12, h: 2.2, fill: { color: COLOR.primary }
  });

  s9.addText(mc.title, {
    x: xPos + 0.3, y: yPos + 0.25, w: 5.1, h: 0.4,
    fontFace: FONT_HEADER, fontSize: 15, bold: true, color: COLOR.textDark
  });

  s9.addText(mc.desc, {
    x: xPos + 0.3, y: yPos + 0.75, w: 5.1, h: 1.2,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textMuted
  });
});
addFooter(s9, 9);

// ==========================================
// SLIDE 10: Copilot AI Assistant (Light)
// ==========================================
const s10 = pres.addSlide();
s10.background = { color: COLOR.lightBg };
addSlideHeader(s10, "Copilot AI Assistant", "Global Resizable Side Drawer & Cardiac Guidance");

s10.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 1.6, w: 6.0, h: 4.8, rectRadius: 0.03,
  fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
});

s10.addText("Key Technical Innovations", {
  x: 1.1, y: 1.9, w: 5.4, h: 0.4,
  fontFace: FONT_HEADER, fontSize: 16, bold: true, color: COLOR.primary
});

const copilotDetails = [
  "Global App Mount: Context API wrapping root layout allows drawer to open over any screen without state reset.",
  "Right-Side Slide Panel: Sliding Copilot-style drawer opened via tab tap, quick card, or right-edge drag gesture.",
  "User-Resizable Width: Drag handle powered by PanResponder allows users to customize panel width (280px - 560px).",
  "Width Persistence: Remembers custom panel width across app restarts using SecureStore / LocalStorage API.",
  "Safety Guardrails: Features explicit medical disclaimers and immediate call prompts for emergency symptoms."
];

copilotDetails.forEach((cd, idx) => {
  s10.addText(`•  ${cd}`, {
    x: 1.1, y: 2.5 + idx * 0.75, w: 5.4, h: 0.7,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textDark
  });
});

// Mock Mobile Drawer UI Illustration
s10.addShape(pres.ShapeType.roundRect, {
  x: 7.1, y: 1.6, w: 5.43, h: 4.8, rectRadius: 0.04,
  fill: { color: "0F172A" }, line: { color: COLOR.primary, width: 2 }
});

s10.addText("ASSISTANT DRAWER PREVIEW", {
  x: 7.4, y: 1.8, w: 4.8, h: 0.3,
  fontFace: FONT_BODY, fontSize: 10, bold: true, color: COLOR.accent
});

// Chat Bubbles Graphic
s10.addShape(pres.ShapeType.roundRect, {
  x: 8.2, y: 2.3, w: 4.0, h: 0.7, rectRadius: 0.02, fill: { color: "334155" }
});
s10.addText("What does my voltage reading mean?", {
  x: 8.3, y: 2.4, w: 3.8, h: 0.5, fontFace: FONT_BODY, fontSize: 10, color: COLOR.textLight
});

s10.addShape(pres.ShapeType.roundRect, {
  x: 7.4, y: 3.2, w: 4.2, h: 1.1, rectRadius: 0.02, fill: { color: COLOR.primary }
});
s10.addText("Your current voltage is 2.5V, which is within the safe 0.5V - 7.5V range set by your doctor.", {
  x: 7.5, y: 3.3, w: 4.0, h: 0.9, fontFace: FONT_BODY, fontSize: 10, color: COLOR.textLight
});

// Drag Handle Graphic
s10.addShape(pres.ShapeType.roundRect, {
  x: 7.15, y: 3.2, w: 0.08, h: 1.2, rectRadius: 0.01, fill: { color: COLOR.accent }
});
addFooter(s10, 10);

// ==========================================
// SLIDE 11: Telemetry Data Visualization (Native Chart)
// ==========================================
const s11 = pres.addSlide();
s11.background = { color: COLOR.lightBg };
addSlideHeader(s11, "Telemetry Analytics", "Live Patient Heart Rate & Voltage Trends");

// Add Native Line Chart using pptxgenjs
const chartData = [
  {
    name: "Heart Rate (BPM)",
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
    values: [70, 68, 74, 85, 78, 72, 70]
  },
  {
    name: "Voltage (V)",
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
    values: [2.5, 2.5, 2.5, 3.0, 3.0, 3.0, 3.0]
  }
];

s11.addChart(pres.ChartType.line, chartData, {
  x: 0.8,
  y: 1.6,
  w: 11.73,
  h: 4.8,
  showLegend: true,
  legendPos: "b",
  chartColors: [COLOR.accent, COLOR.primary],
  lineDataSymbol: "circle",
  lineDataSymbolSize: 6,
  plotArea: { fill: { color: COLOR.lightCard } }
});
addFooter(s11, 11);

// ==========================================
// SLIDE 12: Security & Safety (Light)
// ==========================================
const s12 = pres.addSlide();
s12.background = { color: COLOR.lightBg };
addSlideHeader(s12, "Security & Compliance", "Data Privacy & Clinical Constraint Enforcement");

const secItems = [
  {
    title: "Token-Based Authentication",
    desc: "Restricts API telemetry access solely to authenticated patient and doctor instances using securely stored persistent user tokens."
  },
  {
    title: "Energy Depletion Defense",
    desc: "By enforcing a hardcoded 30-minute sleep/wake cycle at the backend gateway, malicious continuous ping floods are dropped at the cloud level and cannot reach hardware."
  },
  {
    title: "Hardened Boundaries (0.5V - 7.5V)",
    desc: "Prevents accidental or malicious out-of-bounds voltage requests at model level (MIN_VOLTAGE=0.5, MAX_VOLTAGE=7.5)."
  },
  {
    title: "CORS & Request Filtering",
    desc: "Custom Django middleware handles header validation and origin authorization for seamless cross-origin mobile app calls."
  }
];

secItems.forEach((sec, idx) => {
  const xPos = (idx % 2 === 0) ? 0.8 : 6.8;
  const yPos = (idx < 2) ? 1.6 : 4.2;

  s12.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: yPos, w: 5.7, h: 2.2, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s12.addShape(pres.ShapeType.rect, {
    x: xPos, y: yPos, w: 0.12, h: 2.2, fill: { color: COLOR.accent }
  });

  s12.addText(sec.title, {
    x: xPos + 0.3, y: yPos + 0.25, w: 5.1, h: 0.4,
    fontFace: FONT_HEADER, fontSize: 15, bold: true, color: COLOR.textDark
  });

  s12.addText(sec.desc, {
    x: xPos + 0.3, y: yPos + 0.75, w: 5.1, h: 1.2,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textMuted
  });
});
addFooter(s12, 12);

// ==========================================
// SLIDE 13: Challenges & Technical Solutions (Light)
// ==========================================
const s13 = pres.addSlide();
s13.background = { color: COLOR.lightBg };
addSlideHeader(s13, "Engineering Challenges", "Technical Obstacles & Implemented Solutions");

const challenges = [
  {
    prob: "Challenge: Cross-Platform Native Storage Differences",
    sol: "Solution: Abstracted storage utility (src/lib/storage.js) branching automatically between expo-secure-store for iOS/Android and web localStorage."
  },
  {
    prob: "Challenge: Smooth Gesture Resizing without Layout Jank",
    sol: "Solution: Combined Animated.Value interpolation for smooth slide transitions with real-time state clamping (280px-560px) on PanResponder move."
  },
  {
    prob: "Challenge: Asynchronous Push/Pull Race Conditions",
    sol: "Solution: Added an explicit 'pushed' boolean flag on VoltageChange model, ensuring order staging remains distinct from device application."
  }
];

challenges.forEach((ch, idx) => {
  const yPos = 1.6 + idx * 1.65;

  s13.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: yPos, w: 11.73, h: 1.45, rectRadius: 0.03,
    fill: { color: COLOR.lightCard }, line: { color: COLOR.borderLight, width: 1 }
  });

  s13.addText(ch.prob, {
    x: 1.1, y: yPos + 0.2, w: 11.1, h: 0.4,
    fontFace: FONT_HEADER, fontSize: 14, bold: true, color: COLOR.accent
  });

  s13.addText(ch.sol, {
    x: 1.1, y: yPos + 0.65, w: 11.1, h: 0.65,
    fontFace: FONT_BODY, fontSize: 12, color: COLOR.textDark
  });
});
addFooter(s13, 13);

// ==========================================
// SLIDE 14: Future Scope & Conclusion (Dark)
// ==========================================
const s14 = pres.addSlide();
s14.background = { color: COLOR.darkBg };
addDarkSlideHeader(s14, "Future Scope & Conclusion", "Roadmap for Next-Generation Pacemaker Care");

const futureCards = [
  { title: "Direct BLE Hardware Integration", desc: "Replace python simulator with real Bluetooth Low Energy (BLE) peripheral connectivity for live hardware pacing." },
  { title: "Predictive AI Anomaly Models", desc: "Train machine learning models on heart rate variability to forecast pacing battery decay and arrhythmia spikes." },
  { title: "FHIR / HL7 Interoperability", desc: "Integrate standardized clinical data interfaces for seamless electronic health record (EHR) synchronization across hospitals." }
];

futureCards.forEach((fc, idx) => {
  const xPos = 0.8 + idx * 3.98;
  s14.addShape(pres.ShapeType.roundRect, {
    x: xPos, y: 1.6, w: 3.75, h: 3.2, rectRadius: 0.03,
    fill: { color: COLOR.darkCard }, line: { color: COLOR.borderDark, width: 1 }
  });

  s14.addText(fc.title, {
    x: xPos + 0.3, y: 1.9, w: 3.15, h: 0.6,
    fontFace: FONT_HEADER, fontSize: 14, bold: true, color: COLOR.accent
  });

  s14.addText(fc.desc, {
    x: xPos + 0.3, y: 2.6, w: 3.15, h: 1.8,
    fontFace: FONT_BODY, fontSize: 11, color: COLOR.textLightMuted
  });
});

s14.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 5.1, w: 11.73, h: 1.5, rectRadius: 0.03,
  fill: { color: "1E293B" }, line: { color: COLOR.primary, width: 2 }
});

s14.addText("Thank You!  —  Questions & Evaluation Discussion", {
  x: 1.1, y: 5.4, w: 11.1, h: 0.5,
  fontFace: FONT_HEADER, fontSize: 20, bold: true, align: "center", color: COLOR.textLight
});

s14.addText("PaceLink System Demonstration  |  Django Web & Expo Mobile Platform", {
  x: 1.1, y: 5.95, w: 11.1, h: 0.4,
  fontFace: FONT_BODY, fontSize: 12, align: "center", color: COLOR.textLightMuted
});
addFooter(s14, 14, 14, true);

// Save File
const outputPath = "PaceLink_Academic_Presentation.pptx";
pres.writeFile({ fileName: outputPath }).then((filename) => {
  console.log(`Successfully generated presentation: ${filename}`);
}).catch((err) => {
  console.error("Error generating presentation:", err);
});
