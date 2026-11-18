import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const projectRoot = process.cwd();
const exportsDir = path.join(projectRoot, "exports");
const storyboardDir = path.join(exportsDir, "storyboard");
const edgeExe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function getBase64(relPath) {
  const fullPath = path.join(projectRoot, relPath);
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(fullPath).replace(".", "");
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    const data = fs.readFileSync(fullPath).toString("base64");
    return `data:${mime};base64,${data}`;
  }
  return "";
}

const assets = {
  today: getBase64("public/case-studies/habiganize/showreel-assets/today.png"),
  habits: getBase64("public/case-studies/habiganize/showreel-assets/habits.png"),
  pups: getBase64("public/case-studies/habiganize/showreel-assets/pups.png"),
  desktop: getBase64("public/case-studies/habiganize/showreel-assets/desktop.png"),
  stats: getBase64("public/case-studies/habiganize/showreel-assets/stats.png"),
  ranks: getBase64("public/case-studies/habiganize/showreel-assets/ranks.png"),
  corgi: getBase64("public/case-studies/habiganize/corgi.png"),
  shiba: getBase64("public/case-studies/habiganize/shiba.png"),
  golden: getBase64("public/case-studies/habiganize/golden.png"),
};

const boards = [
  {
    num: "01",
    timecode: "00:00:00 — 00:03:80",
    duration: "3.8 SECONDS",
    title: "THE RETENTION CLIFF",
    type: "HOOK & PROBLEM STATEMENT",
    accent: "#E95D91",
    camera: "28mm Wide · Slow Push-in · Subtle Dutch Tilt (4°)",
    motion: "Glitch shake on 'ABANDONED'. Telemetry counters count up rapidly from 0% with ease-out.",
    sfx: "Deep 45Hz sub-bass impact, analog tape stop, rising digital distortion hum.",
    copy: "97% OF HABIT APPS GET ABANDONED.\nStreak guilt triggers drop-off. What if habits nurtured life instead?",
    figmaNode: "01 Branding / Brief Framing (Industry Retention Cliff)",
    render: `
      <div class="vis-s1">
        <div class="vis-badge">INDUSTRY DATA · 2026 BENCHMARK</div>
        <div class="vis-glitch-text">97% ABANDONED</div>
        <div class="vis-telemetry-grid">
          <div class="vis-metric"><span class="m-val">25%</span><span class="m-lbl">Day 1</span></div>
          <div class="vis-metric"><span class="m-val">7%</span><span class="m-lbl">Day 7</span></div>
          <div class="vis-metric danger"><span class="m-val">3%</span><span class="m-lbl">Day 30 Cliff</span></div>
        </div>
        <div class="vis-guideline-cam">&larr; CAMERA PUSH-IN [28mm] &rarr;</div>
      </div>
    `,
  },
  {
    num: "02",
    timecode: "00:03:80 — 00:08:00",
    duration: "4.2 SECONDS",
    title: "THE IDENTITY REVEAL",
    type: "BRAND ANCHOR & STAR LOCKUP",
    accent: "#F6CD28",
    camera: "50mm Prime · Frontal Isometric Center · 3D Extrusion",
    motion: "Mascot Star ★ scales in with spring bounce. Conic glow sweep rotates 360°. Kinetic typography letters reveal with staggered mask.",
    sfx: "Punchy synth bass drop at 130 BPM, whoosh riser, metallic brand chime.",
    copy: "HABITGANIZER\nBUILD HABITS THAT STICK\nPlayful · Bold · Encouraging · Clear",
    figmaNode: "Node 3:75 (Logo Lockup) & Node 3:82 (Brand Colors Palette)",
    render: `
      <div class="vis-s2">
        <div class="vis-conic-glow"></div>
        <div class="vis-star-badge">&starf;</div>
        <div class="vis-brand-title">HABITGANIZER</div>
        <div class="vis-brand-tagline">BUILD HABITS THAT STICK</div>
        <div class="vis-color-strip">
          <span style="background:#E95D91"></span>
          <span style="background:#F6CD28"></span>
          <span style="background:#C77BE0"></span>
          <span style="background:#403326"></span>
          <span style="background:#FAF6F0"></span>
        </div>
      </div>
    `,
  },
  {
    num: "03",
    timecode: "00:08:00 — 00:12:50",
    duration: "4.5 SECONDS",
    title: "FRICTIONLESS DAILY FLOW",
    type: "HERO INTERACTION & MICRO-REWARD",
    accent: "#E95D91",
    camera: "85mm Macro · Perspective 1200px · 14° Orbit Tilt",
    motion: "Phone floats in 3D space with continuous micro-levitation. Virtual finger taps 'Drink water' -> checkmark explodes into ring particles -> +10 COINS badge floats up.",
    sfx: "Satisfying tactile UI click, dual-tone coin arpeggio (987Hz & 1318Hz), fiery swoosh.",
    copy: "ONE TAP LOGGING. INSTANT REWARD.\nStreak Record: 7 Days 🔥 · Bank: +10 Coins",
    figmaNode: "Node 4:17 (HF / Today / Mobile) & Node 3:303 (HabitRow Component)",
    render: `
      <div class="vis-s3">
        <div class="phone-frame tilt-left">
          <img src="${assets.today}" alt="Today screen" />
          <div class="tap-indicator">&check;</div>
          <div class="coin-float">+10 COINS &bull; 7 DAYS &flame;</div>
        </div>
        <div class="cam-orbit-tag">ORBIT 14&deg; TILT</div>
      </div>
    `,
  },
  {
    num: "04",
    timecode: "00:12:50 — 00:17:30",
    duration: "4.8 SECONDS",
    title: "THE PET CARE ECONOMY",
    type: "EMOTIONAL ANCHOR & CORE DIFFERENTIATOR",
    accent: "#F6CD28",
    camera: "50mm Portrait · Gentle Dolly Pan · Warm Vignette",
    motion: "Camera glides across the 3 companions. Corgi, Shiba, and Golden do staggered joyful bounces. Golden coins cascade into food bowl. Soft pink hearts float upward.",
    sfx: "Bubbly melodic plucks, warm acoustic kick, companion bark/happy chime.",
    copy: "NO GUILT. JUST PUPS.\nPets get hungry, but they NEVER die. Caretaking outlasts streak anxiety.",
    figmaNode: "Node 8:324 (HF / Pups / Mobile) & Node 7:143 (PupCard Component)",
    render: `
      <div class="vis-s4">
        <div class="pups-showcase">
          <img class="pup" src="${assets.corgi}" alt="Corgi" />
          <img class="pup" src="${assets.shiba}" alt="Shiba" />
          <img class="pup" src="${assets.golden}" alt="Golden" />
        </div>
        <div class="phone-preview-mini">
          <img src="${assets.pups}" alt="Pups screen" />
        </div>
        <div class="floating-hearts">&hearts; &hearts; &hearts;</div>
      </div>
    `,
  },
  {
    num: "05",
    timecode: "00:17:30 — 00:21:50",
    duration: "4.2 SECONDS",
    title: "MULTI-DEVICE HARMONY",
    type: "PLATFORM ECOSYSTEM & ARCHITECTURE",
    accent: "#C77BE0",
    camera: "35mm Wide · High-angle Isometric (22° X, -18° Y) · Deep DOF",
    motion: "Desktop dashboard and Mobile iPhone float in synchronized 3D planes. Data pulse beam flows between mobile checkmark and desktop live graph.",
    sfx: "Stereo spatial whoosh, futuristic data transmission beep, tech riser.",
    copy: "DESKTOP & MOBILE IN HARMONY\nReal-time cross-platform sync built on a unified Figma design system.",
    figmaNode: "Node 5:37 (HF / Today / Desktop) & Node 8:97 (HF / Habits / Mobile)",
    render: `
      <div class="vis-s5">
        <div class="desktop-frame">
          <div class="browser-dots"><span></span><span></span><span></span></div>
          <img src="${assets.desktop}" alt="Desktop screen" />
        </div>
        <div class="mobile-overlap">
          <img src="${assets.habits}" alt="Habits screen" />
        </div>
        <div class="sync-beam">SYNC PULSE &bull;&bull;&bull;&bull;</div>
      </div>
    `,
  },
  {
    num: "06",
    timecode: "00:21:50 — 00:25:50",
    duration: "4.0 SECONDS",
    title: "CAMARADERIE & RANKS",
    type: "SOCIAL & FRIEND CODES",
    accent: "#C77BE0",
    camera: "60mm Medium · Card Flip Transition (rotateY 90° to 0°)",
    motion: "RankRow cards snap into view with metallic shimmer on Gold, Silver, and Bronze badges. Friend Code chip 'HG-LEX-42' glows with copy feedback animation.",
    sfx: "Snappy mechanical card snaps, celebratory brass stab, clipboard click.",
    copy: "ZERO TOXIC GUILT. PURE CAMARADERIE.\nShare friend code HG-LEX-42 · Celebrate consistency together.",
    figmaNode: "Node 8:450 (HF / Ranks / Mobile) & Node 7:175 (RankRow Component)",
    render: `
      <div class="vis-s6">
        <div class="phone-frame tilt-right">
          <img src="${assets.ranks}" alt="Ranks screen" />
        </div>
        <div class="code-card">
          <div class="c-lbl">FRIEND CODE</div>
          <div class="c-code">HG-LEX-42</div>
          <div class="c-status">ACTIVE &bull; CONNECTED</div>
        </div>
      </div>
    `,
  },
  {
    num: "07",
    timecode: "00:25:50 — 00:29:50",
    duration: "4.0 SECONDS",
    title: "INTELLIGENT HABIT METRICS",
    type: "ANALYTICS & FLEX",
    accent: "#F6CD28",
    camera: "45mm · Quick Snap Zoom on 92% StatCard · Bento Grid",
    motion: "StatCard bento modules snap into place with staggered spring physics. Circular gauge fills dynamically to 92%. Habit breakdown bars animate from 0% to target.",
    sfx: "Crisp digital clock ticking, rhythmic hi-hat roll, data success tone.",
    copy: "DATA THAT EMPOWERS, NOT SHAMES.\n92% Water Intake · 88% Pup Walks · Healthy habit velocity.",
    figmaNode: "Node 8:178 (HF / Stats / Mobile) & Node 7:127 (StatCard Component)",
    render: `
      <div class="vis-s7">
        <div class="phone-frame">
          <img src="${assets.stats}" alt="Stats screen" />
        </div>
        <div class="stat-pill-grid">
          <div class="s-pill gold">92% Water Intake</div>
          <div class="s-pill pink">88% Pup Walks</div>
          <div class="s-pill grape">4-Tier Routine Grid</div>
        </div>
      </div>
    `,
  },
  {
    num: "08",
    timecode: "00:29:50 — 00:38:00",
    duration: "8.1 SECONDS",
    title: "THE FINALE & CALL TO ACTION",
    type: "CLIMAX & CONVERSION",
    accent: "#E95D91",
    camera: "35mm Hero · Slow Orbit · Golden Radial Glare",
    motion: "Golden coins and confetti burst across screen. All 3 pups celebrate together in center stage. Devices align in dynamic hero lockup. Glowing CTA button pulses.",
    sfx: "Full 130 BPM musical climax resolution, coin cascade shower, celebratory crowd swell.",
    copy: "HABITS YOU CAN FALL IN LOVE WITH.\nLaunch Habitganizer at habitganizer.tech · Figma Design System",
    figmaNode: "Node 3:63 (00 Cover) & Shipped Product Live Deployment",
    render: `
      <div class="vis-s8">
        <div class="all-pups">
          <img src="${assets.corgi}" />
          <img src="${assets.shiba}" class="p-center" />
          <img src="${assets.golden}" />
        </div>
        <div class="cta-lockup">
          <div class="cta-head">HABITS YOU CAN FALL IN LOVE WITH.</div>
          <div class="cta-btn">LAUNCH HABITGANIZER &rarr;</div>
        </div>
      </div>
    `,
  },
];

// Generate individual 1920x1080 HTML cards and render PNGs
boards.forEach((b) => {
  const cardHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    background: #0A0604;
    color: #FAF6F0;
    font-family: 'Space Mono', monospace;
    display: flex;
    flex-direction: column;
    padding: 60px 80px;
    justify-content: space-between;
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #2B1E16;
    padding-bottom: 24px;
  }
  .head-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .badge-frame {
    background: ${b.accent};
    color: #000;
    font-weight: 900;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 20px;
    font-family: 'Outfit';
  }
  .head-title {
    font-family: 'Outfit';
    font-size: 38px;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .head-right {
    text-align: right;
    font-size: 20px;
    color: #F6CD28;
    font-weight: 700;
  }
  .main-content {
    display: grid;
    grid-template-columns: 1050px 1fr;
    gap: 60px;
    flex: 1;
    margin: 40px 0;
  }
  .stage-box {
    background: radial-gradient(circle at 50% 50%, #20150F 0%, #0E0906 100%);
    border: 2px solid #2B1E16;
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 30px 60px rgba(0,0,0,0.8);
  }
  .info-box {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #140E0A;
    border: 2px solid #2B1E16;
    border-radius: 24px;
    padding: 40px;
  }
  .spec-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .row {
    display: grid;
    grid-template-columns: 160px 1fr;
    font-size: 18px;
    line-height: 1.5;
  }
  .lbl {
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    font-size: 15px;
    letter-spacing: 0.1em;
  }
  .val {
    color: #fff;
  }
  .val.gold { color: #F6CD28; font-weight: 700; }
  .script-box {
    background: #000;
    border-left: 6px solid #E95D91;
    padding: 24px;
    border-radius: 0 12px 12px 0;
    font-size: 19px;
    font-style: italic;
    color: #FAF6F0;
    white-space: pre-line;
    line-height: 1.6;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    font-size: 16px;
    color: rgba(255,255,255,0.4);
    border-top: 2px solid #2B1E16;
    padding-top: 20px;
  }

  /* VISUAL STYLING IN 1080P */
  .vis-s1 { text-align: center; }
  .vis-badge { font-size: 18px; color: #ff5555; background: rgba(255,0,0,0.15); border: 2px solid #ff5555; padding: 8px 24px; border-radius: 30px; display: inline-block; margin-bottom: 30px; }
  .vis-glitch-text { font-family: 'Outfit'; font-weight: 900; font-size: 76px; color: #fff; text-shadow: 4px 4px #E95D91; letter-spacing: -0.02em; }
  .vis-telemetry-grid { display: flex; gap: 30px; margin-top: 40px; justify-content: center; }
  .vis-metric { background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.15); padding: 20px 36px; border-radius: 16px; text-align: center; }
  .vis-metric .m-val { display: block; font-size: 48px; font-weight: 700; color: #ffaa44; font-family: 'Outfit'; }
  .vis-metric.danger .m-val { color: #ff4444; }
  .vis-metric .m-lbl { font-size: 18px; opacity: 0.6; }
  .vis-guideline-cam { margin-top: 40px; font-size: 18px; color: rgba(255,255,255,0.4); letter-spacing: 0.2em; }

  .vis-s2 { text-align: center; position: relative; }
  .vis-conic-glow { position: absolute; inset: -100px; background: radial-gradient(circle, #E95D91 0%, transparent 60%); opacity: 0.35; filter: blur(60px); }
  .vis-star-badge { width: 150px; height: 150px; background: linear-gradient(135deg, #E95D91, #F6CD28); border-radius: 36px; display: flex; align-items: center; justify-content: center; font-size: 90px; color: #fff; margin: 0 auto 24px; box-shadow: 0 20px 60px rgba(233,93,145,0.6); }
  .vis-brand-title { font-family: 'Outfit'; font-size: 80px; font-weight: 900; letter-spacing: -0.02em; }
  .vis-brand-tagline { font-size: 24px; letter-spacing: 0.25em; color: #F6CD28; margin-top: 10px; font-weight: 700; }
  .vis-color-strip { display: flex; gap: 16px; justify-content: center; margin-top: 30px; }
  .vis-color-strip span { width: 60px; height: 24px; border-radius: 6px; }

  .vis-s3 { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .phone-frame { width: 340px; height: 680px; border-radius: 54px; border: 8px solid #3d2f26; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.9); background: #FAF6F0; position: relative; }
  .phone-frame img { width: 100%; height: 100%; object-fit: cover; }
  .phone-frame.tilt-left { transform: rotate(-8deg) scale(0.95); }
  .phone-frame.tilt-right { transform: rotate(8deg) scale(0.95); }
  .tap-indicator { position: absolute; top: 40%; right: 18%; width: 70px; height: 70px; background: #E95D91; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 36px; box-shadow: 0 0 40px #E95D91; }
  .coin-float { position: absolute; bottom: 22%; left: 8%; background: #000; border: 2px solid #F6CD28; color: #F6CD28; padding: 12px 20px; border-radius: 10px; font-size: 20px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
  .cam-orbit-tag { position: absolute; bottom: 20px; right: 24px; font-size: 16px; color: rgba(255,255,255,0.4); }

  .vis-s4 { display: flex; align-items: center; justify-content: space-around; width: 100%; padding: 0 40px; }
  .pups-showcase { display: flex; gap: 24px; }
  .pup { width: 160px; height: 160px; object-fit: contain; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.6)); }
  .phone-preview-mini { width: 220px; height: 440px; border-radius: 36px; overflow: hidden; border: 6px solid #3d2f26; }
  .phone-preview-mini img { width: 100%; height: 100%; object-fit: cover; }
  .floating-hearts { font-size: 40px; color: #E95D91; }

  .vis-s5 { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .desktop-frame { width: 620px; height: 387px; border-radius: 16px; overflow: hidden; border: 4px solid rgba(255,255,255,0.2); box-shadow: 0 30px 70px rgba(0,0,0,0.9); background: #1C1410; }
  .desktop-frame img { width: 100%; height: 100%; object-fit: cover; }
  .browser-dots { background: #2A1C14; padding: 8px 16px; display: flex; gap: 8px; }
  .browser-dots span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.4); }
  .mobile-overlap { position: absolute; right: 14%; bottom: 8%; width: 180px; height: 360px; border-radius: 28px; border: 5px solid #E95D91; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.95); }
  .mobile-overlap img { width: 100%; height: 100%; object-fit: cover; }
  .sync-beam { position: absolute; top: 30px; background: rgba(199,123,224,0.25); border: 2px solid #C77BE0; color: #C77BE0; padding: 6px 18px; border-radius: 20px; font-size: 16px; font-weight: 700; }

  .vis-s6 { display: flex; align-items: center; justify-content: center; gap: 50px; width: 100%; }
  .code-card { background: rgba(255,255,255,0.06); border: 2px solid #F6CD28; border-radius: 16px; padding: 28px 36px; text-align: left; }
  .code-card .c-lbl { font-size: 16px; opacity: 0.6; }
  .code-card .c-code { font-size: 38px; font-weight: 700; color: #F6CD28; letter-spacing: 0.1em; font-family: 'Space Mono'; margin: 8px 0; }
  .code-card .c-status { font-size: 16px; color: #44ff88; font-weight: 700; }

  .vis-s7 { display: flex; align-items: center; justify-content: center; gap: 50px; width: 100%; }
  .stat-pill-grid { display: flex; flex-direction: column; gap: 16px; }
  .s-pill { font-size: 22px; font-weight: 700; padding: 16px 26px; border-radius: 12px; border: 2px solid; }
  .s-pill.gold { background: rgba(246,205,40,0.15); border-color: #F6CD28; color: #F6CD28; }
  .s-pill.pink { background: rgba(233,93,145,0.15); border-color: #E95D91; color: #E95D91; }
  .s-pill.grape { background: rgba(199,123,224,0.15); border-color: #C77BE0; color: #C77BE0; }

  .vis-s8 { text-align: center; }
  .all-pups { display: flex; justify-content: center; gap: 24px; margin-bottom: 24px; }
  .all-pups img { width: 120px; height: 120px; object-fit: contain; }
  .all-pups .p-center { transform: scale(1.3); }
  .cta-lockup .cta-head { font-family: 'Outfit'; font-size: 38px; font-weight: 900; }
  .cta-lockup .cta-btn { margin-top: 18px; background: #E95D91; color: #fff; padding: 14px 32px; border-radius: 12px; font-size: 20px; font-weight: 700; display: inline-block; box-shadow: 0 10px 30px rgba(233,93,145,0.5); }
</style>
</head>
<body>
  <div class="header">
    <div class="head-left">
      <div class="badge-frame">FRAME ${b.num}</div>
      <div class="head-title">${b.title}</div>
    </div>
    <div class="head-right">${b.timecode} &bull; ${b.duration}</div>
  </div>

  <div class="main-content">
    <div class="stage-box">
      ${b.render}
    </div>

    <div class="info-box">
      <div class="spec-grid">
        <div class="row">
          <span class="lbl">Scene Type</span>
          <span class="val gold">${b.type}</span>
        </div>
        <div class="row">
          <span class="lbl">Camera</span>
          <span class="val">${b.camera}</span>
        </div>
        <div class="row">
          <span class="lbl">Motion</span>
          <span class="val">${b.motion}</span>
        </div>
        <div class="row">
          <span class="lbl">Audio & SFX</span>
          <span class="val gold">${b.sfx}</span>
        </div>
        <div class="row">
          <span class="lbl">Figma Node</span>
          <span class="val" style="font-size: 15px;">${b.figmaNode}</span>
        </div>
      </div>

      <div class="script-box">
        "${b.copy}"
      </div>
    </div>
  </div>

  <div class="footer">
    <span>HABITGANIZER SHOWREEL ANIMATION SPECIFICATION &bull; LOVABLE 2.0 BENCHMARK</span>
    <span>60 FPS &bull; 130 BPM SYNC &bull; RESOLUTION: 1920 &times; 1080</span>
  </div>
</body>
</html>`;

  const tempHtml = path.join(storyboardDir, `frame-${b.num}.html`);
  const outPng = path.join(storyboardDir, `frame-${b.num}.png`);
  fs.writeFileSync(tempHtml, cardHtml, "utf8");

  try {
    console.log(`Exporting Frame ${b.num} -> ${outPng}...`);
    execSync(
      `"${edgeExe}" --headless --disable-gpu --screenshot="${outPng}" --window-size=1920,1080 "file:///${tempHtml.replace(/\\/g, "/")}"`,
      { stdio: "ignore" }
    );
    fs.unlinkSync(tempHtml);
  } catch (err) {
    console.warn(`Failed to export frame ${b.num}:`, err.message);
  }
});

console.log("All individual 1920x1080 storyboard frames successfully exported!");
