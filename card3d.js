// ===== 3D Student ID (WebGL): thick card, front + back, lanyard with Verlet rope physics =====
// Drag = swing, flick sideways = spin 360°, double-click / "พลิกบัตร" = flip.
// The strap can never stretch past its length, so the card always stays attached.
// Colours: switch THEME to "neon" for the blue/cyan look.
(function () {
  const THEME = "ku";
  const THEMES = {
    ku: {
      a: "#34c296", a2: "#c8d63c", gold: "#d4b05a", deep: "#008576",
      cardA: "#0d3327", cardB: "#071c15", cardC: "#030d09", text: "#ffffff", label: "#a9cdbd", sub: "#b9e6cf",
      strapA: "#00443f", strapB: "#007a6c", strapStripe: "#d4b05a", band: ["#0b6b4f", "#1fae84", "#c8d63c"], bandText: "#04140e",
      wire: 0x34c296, wire2: 0xc8d63c, wire3: 0x0fb5a0, glow: 0x0f8f6e, rimL: 0x34c296, fillL: 0x008576, edge: 0x0a2a20, edgeGlow: 0x0e7a5c,
      holoTint: [0.55, 1.0, 0.75], fresBase: "#03140e", fresRim: "#1fae84", diamondRim: "#c8d63c",
    },
    neon: {
      a: "#22d3ee", a2: "#67e8f9", gold: "#cfd9e6", deep: "#1d4ed8",
      cardA: "#0d2250", cardB: "#071434", cardC: "#040a1e", text: "#ffffff", label: "#8fb0dc", sub: "#9fdcff",
      strapA: "#0b2a6b", strapB: "#1d4ed8", strapStripe: "#67e8f9", band: ["#1d4ed8", "#0ea5e9", "#67e8f9"], bandText: "#03122b",
      wire: 0x38bdf8, wire2: 0x67e8f9, wire3: 0x818cf8, glow: 0x2563eb, rimL: 0x22d3ee, fillL: 0x3b82f6, edge: 0x0a1a3c, edgeGlow: 0x0e7490,
      holoTint: [0.3, 0.85, 1.0], fresBase: "#020617", fresRim: "#1e66ff", diamondRim: "#67e8f9",
    },
  };
  const P = THEMES[THEME];

  const stage = document.getElementById("idStage");
  const canvas = document.getElementById("idCanvas");
  const hudYaw = document.getElementById("hudYaw");
  if (!stage) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const seeded = (s) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const mouse = { nx: 0, ny: 0 };
  addEventListener("pointermove", (e) => { mouse.nx = e.clientX / innerWidth - 0.5; mouse.ny = e.clientY / innerHeight - 0.5; }, { passive: true });

  const CARD = { W: 1.7, H: 2.7, T: 0.05, R: 0.12, SLOT_Y: 0.17, SLOT_W: 0.42, SLOT_H: 0.07, CLIP: 0.32 };
  const TEX = { w: 768, h: Math.round((768 * CARD.H) / CARD.W) }, RES = 1.5;   // drawn in 768-px units, rendered at RES×

  // ---------- 2D drawing of the card faces ----------
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const spaced = (g, px) => { if ("letterSpacing" in g) g.letterSpacing = px + "px"; };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function slotRing(g) {
    const pxU = TEX.w / CARD.W, sy = CARD.SLOT_Y * pxU, sw = CARD.SLOT_W * pxU, sh = CARD.SLOT_H * pxU;
    g.strokeStyle = rgba(P.a, 0.45); g.lineWidth = 3;
    rr(g, TEX.w / 2 - sw / 2 - 12, sy - sh / 2 - 12, sw + 24, sh + 24, (sh + 24) / 2); g.stroke();
  }

  function drawFront() {
    const c = document.createElement("canvas"); c.width = TEX.w * RES; c.height = TEX.h * RES;
    const g = c.getContext("2d"), W = TEX.w, H = TEX.h;
    g.scale(RES, RES);
    let grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, P.cardA); grd.addColorStop(0.55, P.cardB); grd.addColorStop(1, P.cardC);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = rgba(P.a, 0.05); g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    grd = g.createRadialGradient(W * 0.9, H * 0.08, 0, W * 0.9, H * 0.08, W * 0.8);
    grd.addColorStop(0, rgba(P.a, 0.32)); grd.addColorStop(1, rgba(P.a, 0));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(0, H * 0.75, 0, 0, H * 0.75, W * 0.9);
    grd.addColorStop(0, rgba(P.deep, 0.3)); grd.addColorStop(1, rgba(P.deep, 0));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // circuit traces
    g.strokeStyle = rgba(P.a, 0.12); g.lineWidth = 2;
    const rnd = seeded(31);
    for (let i = 0; i < 9; i++) {
      let x = W - 40 - rnd() * 260, y = 560 + rnd() * 600;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 3; s++) { x += 40 + rnd() * 80; g.lineTo(x, y); y += (rnd() - 0.5) * 120; g.lineTo(x + 30, y); x += 30; }
      g.stroke();
      g.fillStyle = rgba(P.a, 0.25); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
    }
    slotRing(g);
    g.textBaseline = "middle";
    g.fillStyle = P.a2; g.font = '700 30px "JetBrains Mono", monospace'; spaced(g, 7);
    g.fillText("STUDENT ID", 48, 172); spaced(g, 0);
    // chip
    const chipG = g.createLinearGradient(620, 136, 712, 206);
    chipG.addColorStop(0, "#f1dfa6"); chipG.addColorStop(0.5, P.gold); chipG.addColorStop(1, "#8a6a24");
    g.fillStyle = THEME === "ku" ? chipG : (() => { const n = g.createLinearGradient(620, 136, 712, 206); n.addColorStop(0, "#e6f1ff"); n.addColorStop(0.5, "#8aa4c8"); n.addColorStop(1, "#c8d8ee"); return n; })();
    rr(g, 626, 140, 92, 66, 12); g.fill();
    g.strokeStyle = "rgba(10,20,10,0.5)"; g.lineWidth = 2;
    [[626, 162, 718, 162], [626, 184, 718, 184], [672, 140, 672, 206], [650, 162, 650, 184], [694, 162, 694, 184]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
    grd = g.createLinearGradient(48, 0, W - 48, 0);
    grd.addColorStop(0, rgba(P.a, 0.8)); grd.addColorStop(1, rgba(P.a, 0));
    g.fillStyle = grd; g.fillRect(48, 230, W - 96, 2);
    // photo
    const px = 48, py = 262, pw = 250, ph = 310;
    grd = g.createLinearGradient(px, py, px + pw, py + ph);
    grd.addColorStop(0, THEME === "ku" ? "#1d6b55" : "#1a3f8f"); grd.addColorStop(1, THEME === "ku" ? "#0f2a20" : "#081a42");
    g.fillStyle = grd; rr(g, px, py, pw, ph, 26); g.fill();
    g.strokeStyle = rgba(P.a, 0.6); g.lineWidth = 2.5; g.stroke();
    g.save(); rr(g, px, py, pw, ph, 26); g.clip();
    grd = g.createRadialGradient(px + pw / 2, py + ph * 1.05, 10, px + pw / 2, py + ph * 1.05, 190);
    grd.addColorStop(0, rgba(P.a, 0.5)); grd.addColorStop(1, rgba(P.a, 0));
    g.fillStyle = grd; g.fillRect(px, py, pw, ph);
    g.fillStyle = rgba(P.sub, 0.18);
    g.beginPath(); g.arc(px + pw / 2, py + 132, 58, 0, 7); g.fill();
    g.beginPath(); g.ellipse(px + pw / 2, py + ph + 30, 112, 120, 0, Math.PI, 0); g.fill();
    g.restore();
    g.textAlign = "center"; g.font = '800 92px "Manrope", sans-serif';
    g.shadowColor = P.a; g.shadowBlur = 26;
    grd = g.createLinearGradient(0, py + 60, 0, py + 200);
    grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, P.a2);
    g.fillStyle = grd; g.fillText("PS", px + pw / 2, py + 138);
    g.shadowBlur = 0; g.textAlign = "left";
    g.strokeStyle = P.a2; g.lineWidth = 4;
    [[px - 10, py + 30, px - 10, py - 10, px + 30, py - 10], [px + pw + 10, py + ph - 30, px + pw + 10, py + ph + 10, px + pw - 30, py + ph + 10]].forEach(([a, b, c2, d, e, f]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.lineTo(e, f); g.stroke(); });
    // name
    g.fillStyle = "#ffffff"; g.font = '800 60px "Manrope", sans-serif'; spaced(g, -1);
    g.fillText("Posarin", 330, 318); g.fillText("Sukdee", 330, 386); spaced(g, 0);
    g.fillStyle = P.sub; g.font = '600 36px "Anuphan", sans-serif';
    g.fillText("โปสรินท์ สุขดี", 332, 452);
    g.font = '700 23px "JetBrains Mono", monospace'; spaced(g, 2);
    const bw = g.measureText("ALREADY BUILDING").width + 36;
    g.fillStyle = THEME === "ku" ? P.a2 : rgba(P.a, 0.14); rr(g, 330, 494, bw, 46, 10); g.fill();
    if (THEME !== "ku") { g.strokeStyle = rgba(P.a, 0.75); g.lineWidth = 2; g.stroke(); }
    g.fillStyle = THEME === "ku" ? "#04140e" : P.a; g.fillText("ALREADY BUILDING", 348, 518); spaced(g, 0);
    // fields
    [["SCHOOL", "อยุธยาวิทยาลัย"], ["NICKNAME", "โปโล"], ["TARGET", "CPE · KU"], ["GPAX", "3.20"]].forEach(([k, v], i) => {
      const fx = 48 + (i % 2) * 344, fy = 630 + Math.floor(i / 2) * 128, fw = 328, fh = 112;
      g.fillStyle = "rgba(255,255,255,0.04)"; rr(g, fx, fy, fw, fh, 18); g.fill();
      g.strokeStyle = rgba(P.a, 0.18); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = P.label; g.font = '700 22px "JetBrains Mono", monospace'; spaced(g, 3);
      g.fillText(k, fx + 22, fy + 32); spaced(g, 0);
      g.fillStyle = P.text; g.font = '700 38px "Anuphan", "Manrope", sans-serif';
      g.fillText(v, fx + 22, fy + 76);
    });
    // barcode + id
    const br = seeded(2026); let bx = 48;
    g.fillStyle = "rgba(236,246,240,0.92)";
    while (bx < 470) { const bwid = 2 + Math.floor(br() * 3) * 2; g.fillRect(bx, 920, bwid, 86); bx += bwid + 3 + Math.floor(br() * 3) * 2; }
    g.textAlign = "right";
    g.fillStyle = P.label; g.font = '700 21px "JetBrains Mono", monospace'; spaced(g, 3); g.fillText("ID NO.", W - 48, 932);
    spaced(g, 1); g.fillStyle = "#ffffff"; g.font = '700 32px "JetBrains Mono", monospace'; g.fillText("PS-2026-CPE", W - 48, 978);
    spaced(g, 0); g.textAlign = "left";
    if (g.createConicGradient) {
      const cg = g.createConicGradient(0, W - 96, 1056);
      [P.a, P.a2, "#f0abfc", P.deep, P.a].forEach((cc, i) => cg.addColorStop(i / 4, cc));
      g.globalAlpha = 0.85; g.fillStyle = cg; g.beginPath(); g.arc(W - 96, 1056, 34, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.beginPath(); g.arc(W - 96, 1056, 22, 0, 7); g.stroke();
    }
    grd = g.createLinearGradient(0, 0, W, 0);
    P.band.forEach((cc, i) => grd.addColorStop(i / (P.band.length - 1), cc));
    g.fillStyle = grd; g.fillRect(0, H - 96, W, 96);
    g.fillStyle = P.bandText; g.font = '800 25px "JetBrains Mono", monospace'; spaced(g, 4);
    g.fillText("TCAS70 · COMPUTER ENGINEERING", 48, H - 48); spaced(g, 0);
    return c;
  }

  function drawBack() {
    const c = document.createElement("canvas"); c.width = TEX.w * RES; c.height = TEX.h * RES;
    const g = c.getContext("2d"), W = TEX.w, H = TEX.h;
    g.scale(RES, RES);
    let grd = g.createLinearGradient(W, 0, 0, H);
    grd.addColorStop(0, P.cardA); grd.addColorStop(1, P.cardC);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(W * 0.1, H * 0.9, 0, W * 0.1, H * 0.9, W);
    grd.addColorStop(0, rgba(P.a, 0.2)); grd.addColorStop(1, rgba(P.a, 0));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = rgba(P.a, 0.04); g.lineWidth = 2;
    for (let i = -H; i < W; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
    slotRing(g);
    grd = g.createLinearGradient(0, 150, 0, 250);
    grd.addColorStop(0, "#0a0d0c"); grd.addColorStop(0.5, "#1c2421"); grd.addColorStop(1, "#050807");
    g.fillStyle = grd; g.fillRect(0, 150, W, 100);
    g.textBaseline = "middle";
    g.fillStyle = P.a2; g.font = '700 25px "JetBrains Mono", monospace'; spaced(g, 3);
    g.fillText("PORTFOLIO • CPE APPLICANT", 48, 310); spaced(g, 0);
    g.strokeStyle = rgba(P.a, 0.7); g.lineWidth = 2; rr(g, W - 120, 280, 72, 60, 14); g.stroke();
    g.fillStyle = "#ffffff"; g.font = '800 30px "Manrope", sans-serif'; g.textAlign = "center"; g.fillText("PS", W - 84, 311); g.textAlign = "left";
    [["MAJOR", "Computer Engineering"], ["STACK", "Python · JavaScript · C"], ["BUILDS", "AI Camera · Personal AI"], ["ROUND", "TCAS70 · Portfolio"]].forEach(([k, v], i) => {
      const y = 390 + i * 102;
      g.fillStyle = P.label; g.font = '700 21px "JetBrains Mono", monospace'; spaced(g, 3); g.fillText(k, 48, y);
      spaced(g, 0); g.fillStyle = P.text; g.font = '800 33px "Manrope", sans-serif'; g.fillText(v, 48, y + 42);
      g.fillStyle = rgba(P.a, 0.12); g.fillRect(48, y + 76, W - 96, 1.5);
    });
    g.fillStyle = "rgba(0,0,0,0.38)"; rr(g, 48, 812, W - 96, 150, 18); g.fill();
    g.strokeStyle = rgba(P.a, 0.2); g.lineWidth = 1.5; g.stroke();
    g.font = '600 27px "JetBrains Mono", monospace';
    g.fillStyle = "#e9f7f0"; g.fillText("while (curious) {", 74, 850); g.fillText("  learn(); build(); ", 74, 887);
    const wSolve = g.measureText("  learn(); build(); ").width;
    g.fillStyle = P.a2; g.shadowColor = P.a2; g.shadowBlur = 12; g.fillText("solve();", 74 + wSolve, 887); g.shadowBlur = 0;
    g.fillStyle = "#d6efe3"; g.fillText("}", 74, 924);
    g.fillStyle = P.text; g.font = 'italic 300 50px "Manrope", serif'; g.fillText("Posarin S.", 48, 1046);
    g.strokeStyle = rgba(P.text, 0.4); g.lineWidth = 1.5; g.beginPath(); g.moveTo(48, 1084); g.lineTo(340, 1084); g.stroke();
    g.fillStyle = P.label; g.font = '700 19px "JetBrains Mono", monospace'; spaced(g, 3); g.fillText("SIGNATURE", 48, 1110); spaced(g, 0);
    const qx = W - 48 - 168, qy = 990, cell = 8, ink = "#06130e", paper = "#efe9d6";
    g.fillStyle = paper; rr(g, qx - 12, qy - 12, 192, 192, 14); g.fill();
    g.fillStyle = ink;
    const finder = (x, y) => { g.fillRect(qx + x * cell, qy + y * cell, 56, 56); g.fillStyle = paper; g.fillRect(qx + (x + 1) * cell, qy + (y + 1) * cell, 40, 40); g.fillStyle = ink; g.fillRect(qx + (x + 2) * cell, qy + (y + 2) * cell, 24, 24); };
    finder(0, 0); finder(14, 0); finder(0, 14);
    const qr = seeded(2026);
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inF && qr() < 0.48) g.fillRect(qx + x * cell, qy + y * cell, cell, cell);
    }
    g.fillStyle = P.label; g.font = '600 16px "JetBrains Mono", monospace'; spaced(g, 1);
    g.fillText("IF FOUND, PLEASE RETURN TO POSARIN SUKDEE · AYUTTHAYA, TH", 48, H - 40); spaced(g, 0);
    return c;
  }

  function drawStrap() {
    const c = document.createElement("canvas"); c.width = 64; c.height = 512;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 64, 0);
    grd.addColorStop(0, P.strapA); grd.addColorStop(0.5, P.strapB); grd.addColorStop(1, P.strapA);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 512);
    g.fillStyle = P.strapStripe; g.fillRect(5, 0, 3, 512); g.fillRect(56, 0, 3, 512);
    g.save(); g.translate(32, 0); g.rotate(Math.PI / 2);
    g.fillStyle = "rgba(240,248,244,0.92)"; g.font = '700 22px "JetBrains Mono", monospace'; g.textBaseline = "middle"; spaced(g, 3);
    g.fillText("POSARIN · CPE · ", 8, 0); g.fillText("TCAS70 ◆ ", 270, 0);
    g.restore();
    return c;
  }

  function fallback() {
    canvas.style.display = "none";
    const fb = document.createElement("div"); fb.className = "id3d-fallback";
    fb.appendChild(drawFront()); stage.appendChild(fb);
    const hint = document.querySelector(".id3d-hint"); if (hint) hint.style.display = "none";
  }

  async function loadFonts() {
    const fonts = ['800 60px "Manrope"', '300 40px "Manrope"', '500 30px "Anuphan"', '600 22px "JetBrains Mono"'];
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f, "Posarin โปสรินท์ 0123"))).catch(() => {}), wait(2500)]);
  }

  if (typeof THREE === "undefined") { loadFonts().then(fallback); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { loadFonts().then(fallback); return; }
  renderer.setClearColor(0x000000, 0);
  const lite = !finePointer || innerWidth < 760;   // phones: lighter rendering so scrolling stays smooth
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // environment for reflections: dark room with a few coloured softboxes
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x040a08, side: THREE.BackSide })));
  [[0, 12, 4, 16, 3, 0xffffff, 3], [-12, 2, 4, 3, 14, P.rimL, 4], [12, 0, 2, 3, 14, P.fillL, 4], [0, -10, 6, 14, 2, P.edgeGlow, 2]].forEach(([x, y, z, w, h, col, i]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
  });
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xd8f5e8, 0x040a08, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-3, 5, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -6, near: 1, far: 20 });
  key.shadow.radius = 6; key.shadow.bias = -0.0005;
  scene.add(key);
  const rimPt = new THREE.PointLight(P.rimL, 2.2, 14, 2); rimPt.position.set(3.2, 0.5, 2.5); scene.add(rimPt);
  const fillPt = new THREE.PointLight(P.fillL, 2.0, 14, 2); fillPt.position.set(-3.5, -1.5, 1.5); scene.add(fillPt);
  const back = new THREE.DirectionalLight(P.rimL, 1.2); back.position.set(0, 2, -6); scene.add(back);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.45, depthWrite: false }));
  wall.position.z = -1.1; wall.receiveShadow = true; scene.add(wall);

  // ---------- background core: wireframe icosahedron, diamond, rings, mini cubes ----------
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,0.9)"); grd.addColorStop(0.25, "rgba(255,255,255,0.3)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const fresnelMat = (base, rim, o = 1) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uBase: { value: new THREE.Color(base) }, uRim: { value: new THREE.Color(rim) }, uO: { value: o } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uBase, uRim; uniform float uO;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(mix(uBase, uRim, f), (0.08 + f * 0.75) * uO); }`,
  });
  const lineMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const edges = (geo, c, o) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(c, o));
  const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });

  const core = new THREE.Group(), coreSpin = new THREE.Group();
  core.add(coreSpin);
  const ico = new THREE.IcosahedronGeometry(2.6, 1);
  coreSpin.add(edges(ico, P.wire, 0.35));
  coreSpin.add(new THREE.Mesh(ico, fresnelMat(P.fresBase, P.fresRim, 0.45)));
  const dGeo = new THREE.OctahedronGeometry(1.1, 0); dGeo.scale(1, 1.45, 1);
  const diamond = new THREE.Group();
  diamond.add(new THREE.Mesh(dGeo, fresnelMat(P.fresBase, P.diamondRim, 1)));
  diamond.add(edges(dGeo, P.wire2, 0.9));
  core.add(diamond);
  const rings = [[3.5, 0.016, P.wire2, 0.75, 1.2, 0.3], [4.1, 0.01, P.wire, 0.6, -0.5, 1.1], [4.9, 0.008, P.wire3, 0.45, 0.4, -0.7]].map(([r, t, c, o, rx, ry]) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 160), basic(c, o));
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), basic(0xffffff, 0.95));
    node.position.x = r;
    const ng = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ng.scale.setScalar(0.8); node.add(ng); m.add(node);
    g.add(m); g.rotation.set(rx, ry, 0); core.add(g);
    return m;
  });
  const minis = [0, 1, 2, 3].map((i) => {
    const s = 0.28 + (i % 2) * 0.12, bg = new THREE.BoxGeometry(s, s, s), g = new THREE.Group();
    g.add(new THREE.Mesh(bg, fresnelMat(P.fresBase, P.fresRim, 0.9)));
    g.add(edges(bg, P.wire2, 0.9));
    g.userData = { a: (i / 4) * Math.PI * 2, r: 5.4 + (i % 2) * 0.8, sp: 0.18 + i * 0.03, y: (i - 1.5) * 1.1 };
    core.add(g);
    return g;
  });
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: P.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  coreGlow.scale.setScalar(13); coreGlow.position.z = -2;
  core.add(coreGlow);
  core.scale.setScalar(0.62);
  core.position.set(0, -0.5, -3);
  scene.add(core);

  // ---------- card ----------
  const { W, H, T, R } = CARD;
  function roundedShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slotPath(grow = 0) {
    const w = CARD.SLOT_W + grow * 2, h = CARD.SLOT_H + grow * 2, cy = H / 2 - CARD.SLOT_Y, r = h / 2;
    const p = new THREE.Path();
    p.moveTo(-w / 2 + r, cy - h / 2); p.lineTo(w / 2 - r, cy - h / 2);
    p.absarc(w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2, false);
    p.lineTo(-w / 2 + r, cy + h / 2);
    p.absarc(-w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5, false);
    return p;
  }
  const BEV = 0.012;
  const bodyShape = roundedShape(W - BEV * 2, H - BEV * 2, R - BEV);
  bodyShape.holes.push(slotPath(BEV));
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: T - BEV * 2, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 12 });
  bodyGeo.translate(0, 0, -(T - BEV * 2) / 2);
  const faceShape = roundedShape(W, H, R);
  faceShape.holes.push(slotPath(0));
  const faceGeo = new THREE.ShapeGeometry(faceShape, 16);
  { const p = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + 0.5, p.getY(i) / H + 0.5);
    uv.needsUpdate = true; }

  const edgeMat = new THREE.MeshPhysicalMaterial({ color: P.edge, metalness: 0.7, roughness: 0.25, clearcoat: 1, emissive: P.edgeGlow, emissiveIntensity: 0.55 });
  const faceMat = (tex) => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, toneMapped: false });
  const holoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Vector3(...P.holoTint) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uTime; uniform vec3 uTint;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.6 + vUv.x * 0.7 + vUv.y * 0.35 + uTime * 0.04));
        irid = mix(irid, uTint, 0.45);
        float band = smoothstep(0.09, 0.0, abs(fract(vUv.x * 0.8 + vUv.y * 0.45 - uTime * 0.12) - 0.5));
        gl_FragColor = vec4(irid, 0.015 + f * 0.2 + band * 0.05);
      }`,
  });

  const card = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, [edgeMat, edgeMat]);
  body.castShadow = true; card.add(body);
  const fh = new THREE.Mesh(faceGeo, holoMat); fh.position.z = T / 2 + 0.003; card.add(fh);
  const bh = new THREE.Mesh(faceGeo, holoMat); bh.position.z = -T / 2 - 0.003; bh.rotation.y = Math.PI; card.add(bh);
  card.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(roundedShape(W + 0.006, H + 0.006, R).getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0))),
    lineMat(P.wire2, 0.55)));
  const metal = new THREE.MeshStandardMaterial({ color: THEME === "ku" ? 0xe3cf8f : 0xc7d6ea, metalness: 1, roughness: 0.22 });
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.07), metal); crimp.position.y = H / 2 + CARD.CLIP - 0.05;
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.04), metal); jaw.position.y = H / 2 + 0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.017, 12, 40), metal); ring.position.y = H / 2 - CARD.SLOT_Y + 0.105; ring.rotation.y = Math.PI / 2;
  [crimp, jaw, ring].forEach((m) => { m.castShadow = true; card.add(m); });
  scene.add(card);

  const mount = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 20), metal); bar.rotation.z = Math.PI / 2;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 32), metal); hook.position.y = -0.1;
  const barGlow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: P.wire2 })); barGlow.position.set(0, -0.055, 0.04);
  bar.castShadow = hook.castShadow = true;
  mount.add(bar, hook, barGlow);
  scene.add(mount);

  // ---------- strap ribbon ----------
  const SEG = 18, RIB = 64, STRAP_W = 0.17;
  const ribGeo = new THREE.BufferGeometry();
  const ribPos = new Float32Array((RIB + 1) * 6), ribUv = new Float32Array((RIB + 1) * 4), idx = [];
  for (let i = 0; i < RIB; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  ribGeo.setIndex(idx);
  ribGeo.setAttribute("position", new THREE.BufferAttribute(ribPos, 3));
  ribGeo.setAttribute("uv", new THREE.BufferAttribute(ribUv, 2));
  const strapMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide, emissive: P.edgeGlow, emissiveIntensity: 0.25 });
  const strap = new THREE.Mesh(ribGeo, strapMat);
  strap.castShadow = true; strap.frustumCulled = false;
  scene.add(strap);

  // ---------- physics: Verlet rope + 2-point rigid card ----------
  const ANCHOR = new THREE.Vector3(0, 3.0, 0);
  const ROPE = 1.6, SEGL = ROPE / SEG, ROD = CARD.CLIP + H;
  const G = 20, DAMP = 0.994, ITER = 14, STEP = 1 / 120;
  const pts = [];
  for (let i = 0; i <= SEG; i++) { const y = ANCHOR.y - i * SEGL; pts.push({ p: new THREE.Vector3(0, y, 0), q: new THREE.Vector3(0, y, 0), w: i === 0 ? 0 : 1 }); }
  const C = pts[SEG]; C.w = 0.35;
  const B = { p: new THREE.Vector3(0, C.p.y - ROD, 0), q: new THREE.Vector3(0, C.p.y - ROD, 0), w: 0.35 };
  const st = { yaw: 0, yv: 0, rest: 0, t: 0, acc: 0, drag: null, visible: true };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3();

  function solve(a, b, rest) {
    const ws = a.w + b.w; if (!ws) return;
    tmp.subVectors(b.p, a.p);
    const d = tmp.length() || 1e-6, diff = (d - rest) / d;
    if (a.w) a.p.addScaledVector(tmp, (diff * a.w) / ws);
    if (b.w) b.p.addScaledVector(tmp, (-diff * b.w) / ws);
  }
  function integrate(pt, ax, ay, az) {
    if (!pt.w) return;
    tmp.subVectors(pt.p, pt.q).multiplyScalar(DAMP);
    if (tmp.length() > 18 * STEP) tmp.setLength(18 * STEP);
    pt.q.copy(pt.p);
    pt.p.add(tmp).add(tmp2.set(ax, ay, az).multiplyScalar(STEP * STEP));
  }
  function step() {
    st.t += STEP;
    const k = st.drag ? 0 : 1;
    const bx = (Math.sin(st.t * 0.7) * 0.9 + Math.sin(st.t * 1.9 + 1.3) * 0.35) * k;
    const bz = Math.sin(st.t * 0.45 + 0.6) * 0.6 * k;
    for (let i = 1; i <= SEG; i++) integrate(pts[i], bx * 0.3, -G, bz * 0.3);
    integrate(B, bx, -G, bz);
    const d = st.drag;
    for (let it = 0; it < ITER; it++) {
      if (d) {                                                    // the grabbed point on the card follows the pointer
        tmp.copy(C.p).lerp(B.p, d.s);
        tmp2.subVectors(d.target, tmp);
        const n = (1 - d.s) * (1 - d.s) + d.s * d.s;
        C.p.addScaledVector(tmp2, ((1 - d.s) / n) * 0.9);
        B.p.addScaledVector(tmp2, (d.s / n) * 0.9);
      }
      solve(C, B, ROD);
      for (let i = SEG - 1; i >= 0; i--) solve(pts[i], pts[i + 1], SEGL);
    }
    // hard limits: strap never longer than ROPE, card never leaves the clip
    tmp.subVectors(C.p, ANCHOR);
    if (tmp.length() > ROPE) C.p.copy(ANCHOR).addScaledVector(tmp.normalize(), ROPE);
    tmp.subVectors(B.p, C.p).setLength(ROD); B.p.copy(C.p).add(tmp);
    for (let i = 1; i < SEG; i++) {
      tmp.subVectors(pts[i].p, pts[i - 1].p);
      if (tmp.length() > SEGL * 1.02) pts[i].p.copy(pts[i - 1].p).addScaledVector(tmp.normalize(), SEGL * 1.02);
    }
    // twist: flicks spin the card, the twisted strap unwinds every turn it took
    if (d) st.yv += (d.vx * 2.4 - st.yv) * Math.min(1, STEP * 7);
    else st.yv += (clamp(-1.5 * (st.yaw - st.rest), -5, 5) - 0.42 * st.yv + Math.sin(st.t * 0.6) * 0.08) * STEP;
    st.yv = clamp(st.yv, -26, 26);
    st.yaw += st.yv * STEP;
  }

  const qUp = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), Zv = new THREE.Vector3(0, 0, 1);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => p.p.clone()));
  const side = new THREE.Vector3(), tan = new THREE.Vector3(), pt = new THREE.Vector3(), prev = new THREE.Vector3();
  let lastClock = 0;
  function render() {
    up.subVectors(C.p, B.p).normalize();
    qUp.setFromUnitVectors(Y, up);
    qYaw.setFromAxisAngle(Y, st.yaw);
    card.quaternion.copy(qUp).multiply(qYaw);
    card.position.copy(C.p).addScaledVector(up, -(CARD.CLIP + H / 2));
    pts.forEach((p, i) => curve.points[i].copy(p.p));
    let len = 0; prev.copy(pts[0].p);
    for (let i = 0; i <= RIB; i++) {
      const u = i / RIB;
      curve.getPointAt(u, pt); curve.getTangentAt(u, tan);
      len += pt.distanceTo(prev); prev.copy(pt);
      side.crossVectors(tan, Zv);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize().applyAxisAngle(tan, st.yaw * u * u);
      if (i === RIB) side.set(1, 0, 0).applyQuaternion(card.quaternion);
      const hw = (STRAP_W / 2) * (i === RIB ? 0.9 : 1);
      ribPos.set([pt.x - side.x * hw, pt.y - side.y * hw, pt.z - side.z * hw, pt.x + side.x * hw, pt.y + side.y * hw, pt.z + side.z * hw], i * 6);
      const v = len / (STRAP_W * 8);
      ribUv.set([0, v, 1, v], i * 4);
    }
    ribGeo.attributes.position.needsUpdate = true;
    ribGeo.attributes.uv.needsUpdate = true;
    ribGeo.computeVertexNormals();
    holoMat.uniforms.uTime.value = st.t;
    // core motion
    const t = st.t, dt = Math.min(0.05, t - lastClock); lastClock = t;
    const sp = reduceMotion ? 0.2 : 1;
    coreSpin.rotation.y += 0.0025 * sp;
    coreSpin.rotation.x = Math.sin(t * 0.2) * 0.25 + mouse.ny * 0.3;
    diamond.rotation.y -= 0.008 * sp;
    diamond.position.y = Math.sin(t * 0.9) * 0.18;
    rings.forEach((r, i) => { r.rotation.z += (0.004 + i * 0.002) * (i % 2 ? -1 : 1) * sp; });
    minis.forEach((m) => {
      const u = m.userData; u.a += u.sp * dt * sp;
      m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t + u.a) * 0.3, Math.sin(u.a) * u.r * 0.5);
      m.rotation.x += 0.01 * sp; m.rotation.y += 0.014 * sp;
    });
    core.rotation.y = lerp(core.rotation.y, mouse.nx * 0.5, 0.05);
    core.rotation.x = lerp(core.rotation.x, mouse.ny * 0.3, 0.05);
    coreGlow.material.opacity = 0.42 + Math.sin(t * 1.4) * 0.08;
    rimPt.position.x = lerp(rimPt.position.x, 3.2 + mouse.nx * 3, 0.05);
    rimPt.position.y = lerp(rimPt.position.y, 0.5 - mouse.ny * 3, 0.05);
    renderer.render(scene, camera);
    if (hudYaw) hudYaw.textContent = "YAW " + String(Math.round(((((st.yaw * 180) / Math.PI) % 360) + 360) % 360)).padStart(3, "0") + "°";
  }

  // The canvas is bigger than the frame (#idStage) so the card can swing out of it.
  // The camera is fitted to the frame, then widened with a view offset to cover the whole canvas.
  const FOV = 32;
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight, cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!w || !h || !cw || !ch) return;
    renderer.setPixelRatio(Math.min(lite ? 1.25 : 2, devicePixelRatio || 1));
    renderer.setSize(cw, ch, false);
    const top = ANCHOR.y + 0.55, bottom = ANCHOR.y - ROPE - ROD - 0.5, halfW = 1.5;   // the canvas extends past the frame, so the swing needs no extra margin
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const d = Math.max((top - bottom) / 2 / tanH, halfW / (tanH * (w / h)));
    camera.position.set(0, (top + bottom) / 2, d);
    camera.lookAt(0, (top + bottom) / 2, 0);
    const sx = w / 2 - canvas.offsetLeft, sy = h / 2 - canvas.offsetTop;      // frame centre in canvas px
    const FW = 2 * Math.max(sx, cw - sx), FH = 2 * Math.max(sy, ch - sy);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanH * (FH / h)));
    camera.aspect = FW / FH;
    camera.setViewOffset(FW, FH, FW / 2 - sx, FH / 2 - sy, cw, ch);
    camera.updateProjectionMatrix();
    mount.position.copy(ANCHOR).add(new THREE.Vector3(0, 0.1, 0));
  }

  // ---------- interaction ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  let pickables = [body];
  function setRay(cx, cy) {
    const r = canvas.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return true;
  }
  // the canvas ignores the mouse (it overlaps the hero text), so hits are tested on the document
  const pick = (cx, cy) => (setRay(cx, cy) ? ray.intersectObjects(pickables, false)[0] : undefined);
  let dragged = false;
  document.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t && pick(t.clientX, t.clientY)) e.preventDefault(); }, { passive: false });
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || st.drag) return;
    const h = pick(e.clientX, e.clientY);
    if (!h) return;
    e.preventDefault();
    dragged = true;
    plane.setFromNormalAndCoplanarPoint(Zv, h.point);
    tmp.subVectors(B.p, C.p);
    const s = clamp(tmp2.subVectors(h.point, C.p).dot(tmp) / tmp.lengthSq(), 0.08, 1);
    tmp.copy(C.p).lerp(B.p, s);
    st.drag = { id: e.pointerId, s, off: new THREE.Vector3().subVectors(h.point, tmp), target: tmp.clone(), vx: 0, lx: h.point.x, lt: performance.now() };
    document.body.classList.add("id3d-grabbing");
  });
  document.addEventListener("pointermove", (e) => {
    const d = st.drag;
    if (!d) { if (finePointer) document.body.classList.toggle("id3d-hover", !!pick(e.clientX, e.clientY)); return; }
    if (e.pointerId !== d.id) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const now = performance.now(), dt = Math.max(0.008, (now - d.lt) / 1000);
    d.vx = d.vx * 0.6 + ((hit.x - d.lx) / dt) * 0.4;
    d.lx = hit.x; d.lt = now;
    d.target.subVectors(hit, d.off);
    const maxR = ROPE + ROD * d.s - 0.02;                          // can't pull past the strap length
    tmp.subVectors(d.target, ANCHOR);
    if (tmp.length() > maxR) d.target.copy(ANCHOR).addScaledVector(tmp.normalize(), maxR);
  });
  function release(e) {
    const d = st.drag;
    if (!d || (e && e.pointerId !== undefined && e.pointerId !== d.id)) return;
    if (performance.now() - d.lt > 100) { d.vx = 0; C.q.copy(C.p); B.q.copy(B.p); }   // held still: no throw
    st.drag = null;
    document.body.classList.remove("id3d-grabbing");
  }
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
  // a drag that ends over a link/button must not click it
  document.addEventListener("click", (e) => { if (dragged) { dragged = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("pointerdown", () => { if (!st.drag) dragged = false; }, true);
  function flip() { st.rest = st.rest === 0 ? Math.PI : 0; st.yv += st.rest ? 9 : -9; }
  document.addEventListener("dblclick", (e) => { if (pick(e.clientX, e.clientY)) flip(); });
  const flipBtn = document.getElementById("flipBtn");
  if (flipBtn) flipBtn.addEventListener("click", flip);

  let last = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!st.visible || document.hidden) { last = t; return; }
    st.acc += Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    let n = 0;
    while (st.acc >= STEP && n < 8) { step(); st.acc -= STEP; n++; }
    if (n === 8) st.acc = 0;
    render();
  }

  (async function init() {
    await loadFonts();
    const fTex = new THREE.CanvasTexture(drawFront()), bTex = new THREE.CanvasTexture(drawBack()), sTex = new THREE.CanvasTexture(drawStrap());
    [fTex, bTex, sTex].forEach((t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });
    sTex.wrapT = THREE.RepeatWrapping;
    strapMat.map = sTex; strapMat.needsUpdate = true;
    const front = new THREE.Mesh(faceGeo, faceMat(fTex)); front.position.z = T / 2 + 0.0015;
    const backFace = new THREE.Mesh(faceGeo, faceMat(bTex)); backFace.position.z = -T / 2 - 0.0015; backFace.rotation.y = Math.PI;
    front.castShadow = backFace.castShadow = true;
    card.add(front, backFace);
    pickables = [body, front, backFace];
    layout();
    new ResizeObserver(layout).observe(stage);
    new IntersectionObserver(([en]) => { st.visible = en.isIntersecting; }).observe(stage);
    requestAnimationFrame(loop);
    // swing in once the intro screen has gone
    const ready = setInterval(() => {
      if (!document.body.classList.contains("ready")) return;
      clearInterval(ready);
      setTimeout(() => { if (!reduceMotion) { B.q.copy(B.p); B.p.x += 0.05; B.p.z += 0.02; st.yv = 7; } }, 700);
    }, 150);
  })();
})();
