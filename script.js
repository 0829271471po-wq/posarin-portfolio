// ===== Click sound (WebAudio, no file needed) =====
let soundOn = true;
try { soundOn = localStorage.getItem("sound") !== "off"; } catch {}
let audioCtx;
function playClick() {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {}
}
const soundBtn = document.getElementById("soundBtn");
function renderSound() {
  soundBtn.classList.toggle("off", !soundOn);
  soundBtn.innerHTML = `<i class="fa-solid ${soundOn ? "fa-volume-high" : "fa-volume-xmark"}"></i>`;
}
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  try { localStorage.setItem("sound", soundOn ? "on" : "off"); } catch {}
  renderSound();
});
renderSound();

// ===== Intro: circuit traces connect to the chip =====
const intro = document.getElementById("intro");
const board = document.getElementById("board");
const fillEl = document.getElementById("introFill");
const pctEl = document.getElementById("introPct");
const statusEl = document.getElementById("introStatus");
const bootEl = document.getElementById("boot");
const SVGNS = "http://www.w3.org/2000/svg";
const traces = [];
const sides = [
  { pin: (i) => [264 + i * 18, 150], out: [0, -1], perp: [1, 0], reach: 130 },
  { pin: (i) => [264 + i * 18, 250], out: [0, 1], perp: [1, 0], reach: 60 },  // short: keeps clear of the name below
  { pin: (i) => [250, 164 + i * 18], out: [-1, 0], perp: [0, 1], reach: 230 },
  { pin: (i) => [350, 164 + i * 18], out: [1, 0], perp: [0, 1], reach: 230 },
];
const traceGroup = document.getElementById("traces");
sides.forEach((s) => {
  for (let i = 0; i < 5; i++) {
    const [sx, sy] = s.pin(i);
    const [ox, oy] = s.out, [px, py] = s.perp;
    const a = 22 + Math.random() * 20;          // clear the orbit rings first
    const d = (8 + Math.random() * 24) * (i < 2 ? -1 : i > 2 ? 1 : 0); // outer pins fan outward
    const b = s.reach * (0.4 + Math.random() * 0.5);
    const p1 = [sx + ox * a, sy + oy * a];
    const p2 = [p1[0] + ox * Math.abs(d) + px * d, p1[1] + oy * Math.abs(d) + py * d];
    const p3 = [p2[0] + ox * b, p2[1] + oy * b];
    const dAttr = `M${sx} ${sy} L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} L${p3[0]} ${p3[1]}`;
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", dAttr);
    path.setAttribute("class", "trace");
    const pulse = document.createElementNS(SVGNS, "path");
    pulse.setAttribute("d", dAttr);
    pulse.setAttribute("class", "pulse");
    pulse.style.animationDelay = (Math.random() * -1.6).toFixed(2) + "s";
    const pad = document.createElementNS(SVGNS, "circle");
    pad.setAttribute("cx", p3[0]);
    pad.setAttribute("cy", p3[1]);
    pad.setAttribute("r", 4);
    pad.setAttribute("class", "pad");
    traceGroup.append(path, pulse, pad);
    traces.push({ path, pad, at: Math.random() * 0.75 });
  }
});
traces.forEach((t) => {
  t.len = t.path.getTotalLength();
  t.path.style.strokeDasharray = t.len;
  t.path.style.strokeDashoffset = t.len;
});
const bootLines = [
  [0, "> power on ............ <span class=\"ok\">ok</span>"],
  [18, "> load profile.json ... <span class=\"ok\">ok</span>"],
  [38, "> mount /projects ..... <span class=\"ok\">ok</span>"],
  [58, "> link hw + sw ........ <span class=\"ok\">ok</span>"],
  [80, "> start journey.exe ... <span class=\"ok\">ok</span>"],
];
const stages = [[0, "INITIALIZING"], [25, "LOADING ASSETS"], [55, "CONNECTING CIRCUITS"], [85, "PREPARING SURFACES"], [100, "READY"]];
let pct = 0;
let introDone = false;
function endIntro() {
  if (introDone) return;
  introDone = true;
  clearInterval(introTimer);
  board.classList.add("lit");
  intro.classList.add("done");
  document.body.classList.remove("loading");
  document.body.classList.add("ready");
  setTimeout(typeLoop, 1500);
  setTimeout(revealCheck, 60);
  onScroll();
}
const introTimer = setInterval(() => {
  pct = Math.min(100, pct + 1.2 + Math.random() * 2.6);
  const f = pct / 100;
  fillEl.style.width = pct + "%";
  pctEl.textContent = Math.floor(pct) + "%";
  statusEl.textContent = stages.filter((s) => pct >= s[0]).pop()[1];
  bootEl.innerHTML = bootLines.filter((l) => pct >= l[0]).map((l) => l[1]).join("\n");
  traces.forEach((t) => {
    const k = Math.max(0, Math.min(1, (f - t.at) / 0.25));
    t.path.style.strokeDashoffset = t.len * (1 - k);
    t.path.classList.toggle("on", k >= 1);
    t.pad.classList.toggle("on", k >= 1);
  });
  if (pct >= 100) {
    clearInterval(introTimer);
    board.classList.add("lit");
    setTimeout(endIntro, 1100);
  }
}, 50);
intro.addEventListener("click", endIntro);

// ===== Custom cursor + click effect =====
const dot = document.getElementById("cursorDot");
const ring = document.getElementById("cursorRing");
const bgGlow = document.getElementById("bgGlow");
let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
addEventListener("pointermove", (e) => {
  mx = e.clientX; my = e.clientY;
  document.body.classList.add("has-cursor");
  dot.style.transform = `translate(${mx}px, ${my}px)`;
  bgGlow.style.setProperty("--x", mx + "px");
  bgGlow.style.setProperty("--y", my + "px");
});
(function follow() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  ring.style.transform = `translate(${rx}px, ${ry}px)`;
  requestAnimationFrame(follow);
})();
document.addEventListener("pointerover", (e) => {
  ring.classList.toggle("hover", !!e.target.closest("a, button, input, textarea, .tile, .work, .card3d"));
});
addEventListener("pointerdown", (e) => {
  ring.classList.add("down");
  playClick();
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.left = e.clientX + "px";
  r.style.top = e.clientY + "px";
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 650);
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const d = 22 + Math.random() * 18;
    s.className = "spark";
    s.style.left = e.clientX + "px";
    s.style.top = e.clientY + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", Math.sin(a) * d + "px");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }
});
addEventListener("pointerup", () => ring.classList.remove("down"));

// ===== Nav: sliding pill, progress, active section =====
const nav = document.getElementById("nav");
const pill = document.getElementById("pill");
const pillBg = document.getElementById("pillBg");
const navLinks = [...pill.querySelectorAll("a")];
const navIds = new Set(navLinks.map((a) => a.getAttribute("href").slice(1)));
const sections = [...document.querySelectorAll("main section[id]")];
document.getElementById("burger").addEventListener("click", () => pill.classList.toggle("open"));
navLinks.forEach((a) => a.addEventListener("click", () => pill.classList.remove("open")));
function currentIndex() {
  const y = scrollY + innerHeight / 3;
  let idx = 0;
  sections.forEach((s, i) => { if (s.offsetTop <= y) idx = i; });
  return idx;
}
const heroEl = document.getElementById("home");
function onScroll() {
  nav.classList.toggle("scrolled", scrollY > 30);
  // hero gently fades and lifts as it scrolls away
  const k = Math.min(1, scrollY / (innerHeight * 0.9));
  heroEl.style.setProperty("--fade", (1 - k * 0.85).toFixed(3));
  heroEl.style.setProperty("--shift", (-k * 60).toFixed(1) + "px");
  const max = document.documentElement.scrollHeight - innerHeight;
  document.getElementById("navProgress").style.setProperty("--p", (max > 0 ? (scrollY / max) * 100 : 0) + "%");
  let i = currentIndex();
  while (i > 0 && !navIds.has(sections[i].id)) i--;   // PDF section has no link
  const id = sections[i].id;
  navLinks.forEach((a) => {
    const on = a.getAttribute("href") === "#" + id;
    a.classList.toggle("active", on);
    if (on) { pillBg.style.left = a.offsetLeft + "px"; pillBg.style.width = a.offsetWidth + "px"; }
  });
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
document.fonts.ready.then(onScroll);
onScroll();
document.getElementById("upBtn").addEventListener("click", () => sections[Math.max(0, currentIndex() - 1)].scrollIntoView({ behavior: "smooth" }));
document.getElementById("downBtn").addEventListener("click", () => {
  const next = sections[currentIndex() + 1];
  if (next) next.scrollIntoView({ behavior: "smooth" });
});

// ===== Typed headline =====
const words = ["ผมเริ่มทำไปแล้ว.", "ไม่ใช่แค่อยากเรียน."];
const typed = document.getElementById("typed");
let wi = 0, ci = words[0].length, deleting = true;
function typeLoop() {
  typed.textContent = words[wi].slice(0, ci);
  if (deleting) {
    if (ci > 0) ci--; else { deleting = false; wi = (wi + 1) % words.length; }
  } else if (ci < words[wi].length) ci++;
  else { deleting = true; return setTimeout(typeLoop, 2000); }
  setTimeout(typeLoop, deleting ? 40 : 85);
}

// ===== Hanging 3D Student ID: now a WebGL scene with rope physics, see card3d.js =====

// ===== Marquee: fill any width, slow constant speed =====
const mTrack = document.getElementById("mTrack");
const setHTML = mTrack.innerHTML;
function buildTrack() {
  mTrack.innerHTML = setHTML;
  while (mTrack.scrollWidth < innerWidth + 200) mTrack.insertAdjacentHTML("beforeend", setHTML);
  mTrack.insertAdjacentHTML("beforeend", mTrack.innerHTML);
  mTrack.style.setProperty("--dur", Math.round(mTrack.scrollWidth / 2 / 28) + "s");
}
buildTrack();
document.fonts.ready.then(buildTrack);
let rT;
addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(buildTrack, 200); });

// ===== Skill tiles + waveform =====
const wave = document.getElementById("wave");
for (let i = 0; i < 34; i++) {
  const b = document.createElement("i");
  b.style.setProperty("--h", 6 + Math.random() * 22 + "px");
  b.style.animationDelay = (Math.random() * -1.2).toFixed(2) + "s";
  b.style.animationDuration = (0.9 + Math.random() * 0.8).toFixed(2) + "s";
  wave.appendChild(b);
}
document.querySelectorAll(".tile").forEach((t) => {
  t.addEventListener("pointermove", (e) => {
    const r = t.getBoundingClientRect();
    t.style.setProperty("--mx", e.clientX - r.left + "px");
    t.style.setProperty("--my", e.clientY - r.top + "px");
  });
});

// ===== About terminal: real typing animation =====
// Each command is typed character by character after the "$ " prompt, then
// "Enter" prints its output, then the next command starts. Loops forever.
const TERM_SCRIPT = [
  { cmd: "whoami", out: ["posarin (โปโล) — ม.6 อยุธยาวิทยาลัย"] },
  { cmd: "cat goal.txt", out: ["วิศวกรรมคอมพิวเตอร์ @ KU 🎯"] },
  { cmd: "ls projects/", out: ["guardianeye/  personal-ai/", "polo-optimizer/"] },
  { cmd: "ls certs/", out: ["hackerrank-js-intermediate  hackerrank-js", "samsung-ai-workplace  samsung-testing", "samsung-genai  samsung-python", "samsung-data-structures  cisco-cybersecurity"] },
  { cmd: "./learn.sh --next", out: ['<span class="ok">✓ cs50 in progress...</span>'] },
];
const PROMPT = '<span class="p">$</span> ';
const termBody = document.getElementById("termBody");
const termState = { done: [], typing: null, solid: false };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function drawTerm() {
  const cursor = `<span class="cur${termState.solid ? " solid" : ""}"></span>`;
  const lines = termState.done.slice();
  if (termState.typing !== null) lines.push(PROMPT + termState.typing + cursor);
  termBody.innerHTML = lines.join("\n");
}
async function typeCommand(cmd) {
  termState.typing = "";
  termState.solid = false;
  drawTerm();
  await wait(550);                                // prompt waits with a blinking cursor
  termState.solid = true;                         // cursor stays solid while keys are pressed
  for (const ch of cmd) {
    termState.typing += ch;
    drawTerm();
    await wait(ch === " " ? 140 : 55 + Math.random() * 75);
  }
  termState.solid = false;
  drawTerm();
  await wait(380);                                // brief pause before "Enter"
  termState.done.push(PROMPT + cmd);
  termState.typing = null;
}
async function runTerm() {
  if (termState.running) return;
  termState.running = true;
  for (;;) {
    termState.done = [];
    termBody.classList.remove("fade");
    for (const step of TERM_SCRIPT) {
      await typeCommand(step.cmd);
      for (const line of step.out) {               // output prints line by line
        termState.done.push(line);
        drawTerm();
        await wait(110);
      }
      await wait(650);
    }
    termState.typing = "";                         // idle prompt, blinking cursor
    termState.solid = false;
    drawTerm();
    await wait(2600);
    termBody.classList.add("fade");                // smooth clear before the next loop
    await wait(450);
    termState.typing = null;
  }
}

// ===== Journey stepper =====
const STEPS = [
  { tag: "ช่วงที่ 1", title: "เล่นเกม แล้วแก้คอมพิวเตอร์เอง",
    desc: "ตอนแรกแค่อยากให้เกมลื่นขึ้น เลยลองลง driver ใหม่ ปรับค่าต่างๆ เอง ปรับไปปรับมาก็มีปัญหาตามมา ต้องหาปัญหาเองว่าเป็นเพราะอะไร แก้ไปเรื่อยๆ ก็เริ่มสงสัยว่าข้างในมันทำงานยังไงกันแน่",
    learned: ["ชิ้นส่วนในคอมพิวเตอร์ทำงานด้วยกันยังไง", "Driver มีผลกับเครื่องมากกว่าที่คิด", "ไล่หาสาเหตุทีละจุด ดีกว่าเดา"], tools: ["Windows", "Driver", "MSI Afterburner"],
    project: "ติดตัวมาจากช่วงนี้", note: "ไม่ได้อยากแค่ใช้คอมพิวเตอร์เป็น แต่อยากรู้ว่ามันทำงานยังไง" },
  { tag: "ช่วงที่ 2", title: "จากใช้โปรแกรม มาลองเขียนเอง",
    desc: "พอรู้ว่าเครื่องทำงานยังไงแล้ว ก็อยากรู้ต่อว่าโปรแกรมเขียนกันยังไง เลยลองเรียน CS50 ที่ใช้ภาษา C ทำ website เล็กๆ ด้วย JavaScript แล้วลองไปสอบ HackerRank ดูว่าทำได้จริงไหม ก็ผ่านมาได้",
    learned: ["ตัวแปร loop และ function", "อ่าน error แล้วรู้ว่าต้องแก้ตรงไหน", "แบ่งปัญหาใหญ่เป็นชิ้นเล็กๆ"], tools: ["C", "JavaScript", "HTML/CSS"],
    project: "HackerRank JavaScript (Basic)", note: "ใบแรกที่ยืนยันว่าผมเขียน code ได้จริง" },
  { tag: "ช่วงที่ 3", title: "ลองทำของที่มีคนใช้ได้",
    desc: "ลองเอาที่เรียนมาทำของจริง อันแรกเป็นกล้องจับคนล้มที่จำหน้าคนในบ้านได้ เพราะที่บ้านมียาย อีกอันเป็น AI ที่จำเรื่องที่เคยคุยได้ ระหว่างนั้นก็ไปเรียน course Cybersecurity ของ Cisco ด้วย",
    learned: ["ให้ AI ดูท่าทางคนจากกล้อง", "ต่อ LLM เข้ากับโปรแกรมของตัวเอง", "ทำให้กล้องกับ code ทำงานด้วยกัน"], tools: ["Python", "OpenCV", "MediaPipe", "ESP32-CAM"],
    project: "GuardianEye · AI ส่วนตัว · Polo Optimizer", note: "ดูรายละเอียดได้ในส่วน Projects ข้างล่าง" },
  { tag: "ต่อจากนี้", title: "ไปเรียนให้รู้จริง",
    desc: "ที่ผ่านมาผมทำได้เพราะลองผิดลองถูก แต่ยังมีคำถามที่ตอบตัวเองไม่ได้ เช่น ทำไม ESP32-CAM ถึง run AI เองไม่ไหว คำถามพวกนี้แหละที่ผมอยากไปหาคำตอบที่วิศวกรรมคอมพิวเตอร์ ม.เกษตร",
    learnedLabel: "วิชาที่อยากเรียน (หลักสูตร มก.)", learned: [
      '<b style="color:var(--text)">การออกแบบระบบดิจิทัล</b> คอมพิวเตอร์คิดด้วยแค่ 0 กับ 1 ได้ยังไง',
      '<b style="color:var(--text)">สถาปัตยกรรมและองค์ประกอบคอมพิวเตอร์</b> ทำไมเครื่องบางตัวถึงแรงกว่า',
      '<b style="color:var(--text)">ระบบฝังตัว</b> ทำให้ AI run บนกล้องได้เองยังไง'],
    toolsLabel: "อยากใช้ให้คล่องกว่านี้", tools: ["C", "Linux", "Git"],
    project: "ระหว่างนี้", note: "ยังเรียน CS50 ต่ออยู่ และอยากทำให้กล้องใช้ตอนกลางคืนได้ เพราะยายก็อาจล้มตอนกลางคืนได้เหมือนกัน" },
];
const panel = document.getElementById("stepPanel");
const stepBtns = [...document.querySelectorAll(".step")];
function showStep(i) {
  const s = STEPS[i];
  stepBtns.forEach((b, j) => { b.classList.toggle("active", j === i); b.classList.toggle("done", j < i); });
  document.getElementById("stepFill").style.width = (i / (STEPS.length - 1)) * 100 + "%";
  panel.innerHTML = `
    <div class="sp-card main"><small>${s.tag}</small><h4>${s.title}</h4><p>${s.desc}</p></div>
    <div class="sp-card"><small>${s.learnedLabel || "ได้รู้อะไรบ้าง"}</small><ul>${s.learned.map((c) => `<li>${c}</li>`).join("")}</ul></div>
    <div class="sp-card"><small>${s.toolsLabel || "ใช้อะไร"}</small>
      <div class="tags">${s.tools.map((t) => `<span>${t}</span>`).join("")}</div>
      <p><b style="color:var(--text)">${s.project}</b><br />${s.note}</p></div>`;
}stepBtns.forEach((b, i) => b.addEventListener("click", () => showStep(i)));
showStep(0);

// ===== Scroll-in effects =====
// 1) split section titles into words that rise from a mask
function wrapWord(node, i) {
  const outer = document.createElement("span");
  outer.className = "w";
  const inner = document.createElement("span");
  inner.style.setProperty("--i", i);
  inner.append(node);
  outer.append(inner);
  return outer;
}
document.querySelectorAll(".split").forEach((el) => {
  const nodes = [...el.childNodes];
  el.textContent = "";
  let i = 0;
  nodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) el.append(" ");
        else el.append(wrapWord(document.createTextNode(part), i++));
      });
    } else if (n.nodeName === "BR") el.append(n);
    else el.append(wrapWord(n, i++));
  });
});
// 2) stagger siblings inside [data-stagger] groups
document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.querySelectorAll(":scope > [data-anim]")].forEach((el, i) => el.style.setProperty("--d", (i * 0.1).toFixed(2) + "s"));
});
// 3) light sweep layer on cards
document.querySelectorAll(".card[data-anim]").forEach((el) => {
  const s = document.createElement("i");
  s.className = "sweep";
  el.appendChild(s);
});
// 4) scroll reveal: fade in + slide up when an element reaches ~88% of the screen height.
//    Elements reset when they drop back below the screen, so the effect replays on every pass.
function countUp(el) {
  const to = +el.dataset.to;
  let v = 0;
  const t = setInterval(() => { v = Math.min(to, v + 1); el.textContent = v; if (v >= to) clearInterval(t); }, 90);
}
let termStarted = false;
function onFirstReveal(el) {
  el.querySelectorAll("[data-to]").forEach(countUp);
  if (el.classList.contains("stack-card")) {
    setTimeout(() => el.querySelectorAll(".tile .bar span").forEach((s) => (s.style.width = s.closest(".tile").dataset.val + "%")), 500);
  }
  if (!termStarted && el.classList.contains("cell-term")) { termStarted = true; setTimeout(runTerm, 500); }
}
const revealTargets = [
  ...[...document.querySelectorAll(".section")].map((el) => ({ el, cls: "sec-in", at: 0.95 })),
  ...[...document.querySelectorAll("[data-anim], .sec-head")].map((el) => ({ el, cls: "in-view", at: 0.88 })),
];
function revealCheck() {
  if (document.body.classList.contains("loading")) return;
  const h = innerHeight;
  for (const t of revealTargets) {
    const r = t.el.getBoundingClientRect();
    if (r.top < h * t.at && r.bottom > 0) {
      if (!t.el.classList.contains(t.cls)) {
        t.el.classList.add(t.cls);
        if (!t.el.dataset.done) { t.el.dataset.done = "1"; onFirstReveal(t.el); }
      }
    } else if (r.top > h) {
      t.el.classList.remove(t.cls);   // below the screen again → replay next time
    }
  }
}
let revealQueued = false;
function queueReveal() {
  if (revealQueued) return;
  revealQueued = true;
  requestAnimationFrame(() => { revealQueued = false; revealCheck(); });
}
addEventListener("scroll", queueReveal, { passive: true });
addEventListener("resize", queueReveal);
setInterval(revealCheck, 250);   // safety net in case a scroll event is missed

// ===== Works filter =====
document.querySelectorAll("#seg button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#seg button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".work").forEach((w) => w.classList.toggle("hide", btn.dataset.f !== "all" && !w.dataset.cat.split(" ").includes(btn.dataset.f)));
  });
});


// ===== PosarinBot =====
const chat = document.getElementById("chat");
const chatBody = document.getElementById("chatBody");
const KB = [
  { k: ["เกษตร", "ku", "มก", "เลือกที่นี่", "ทำไมเลือก"], a: "โปโลอยากพัฒนาความรู้ทั้งด้านการเขียนโปรแกรมและระบบคอมพิวเตอร์ที่วิศวกรรมคอมพิวเตอร์ ม.เกษตรครับ 🎓 เพื่อเอาไปต่อยอด GuardianEye ให้ตรวจจับการล้มแม่นขึ้น และทำงานได้ต่อเนื่องเวลามีปัญหา วิชาที่อยากเรียนก็เช่น ระบบปฏิบัติการ ระบบฝังตัว และความปลอดภัยระบบคอมพิวเตอร์ ดูแผนได้ที่ส่วน Why KU ท้าย website", go: ["#contact", "ดูส่วน Why KU"] },
  { k: ["ทำไม", "วิศวะ", "why", "เหตุผล", "แรงบันดาลใจ"], a: "เริ่มจากโปโลเล่นเกมแล้วอยากดึงประสิทธิภาพคอมพิวเตอร์ ปรับก็เจอปัญหา เลยต้องแก้เองครับ แก้บ่อยจนอยากรู้ว่าข้างในมันทำงานยังไง เลยหัดเขียน code แล้วลองทำกล้องจับคนล้มกับ AI ส่วนตัวออกมา ทำได้แล้วแต่ยังไม่เข้าใจลึก เลยอยากไปเรียนวิศวกรรมคอมพิวเตอร์ให้รู้จริงครับ", go: ["#about", "อ่านเรื่องเต็มใน About"] },
  { k: ["กล้อง", "guardian", "ล้ม", "ผู้สูงอายุ", "esp32", "camera", "ใบหน้า", "หน้า", "face"], a: "อันนี้คือ GuardianEye ครับ 📷 ไอเดียมาจากที่บ้านโปโลมียายอยู่ด้วย เลยอยากมีอะไรช่วยดูเวลายายล้ม เอากล้อง ESP32-CAM ตัวละประมาณ 300 บาทมาตั้งไว้ ส่งภาพเข้าคอมพิวเตอร์ให้ดูท่าทางคน ถ้ามีคนล้มแล้วไม่ลุก มันจะส่งรูปเข้า Telegram พร้อมบอกว่าใครล้ม เพราะมันจำหน้าคนในบ้านได้ด้วย และถ้าเจอคนแปลกหน้าก็เตือน ส่วนที่ยากสุดคือทำให้มันไม่เตือนมั่วตอนแค่นั่งเก้าอี้", go: [".works > .work:nth-child(1)", "ดูผลงาน GuardianEye"] },
  { k: ["ai ส่วนตัว", "ความจำ", "สมอง", "llm", "แชตบอต", "chatbot", "ผู้ช่วย ai"], a: "เป็น AI ที่โปโลทำไว้คุยเองใน Telegram ครับ 🧠 ต่างจาก chatbot ทั่วไปตรงที่มันจำเรื่องที่เคยคุยได้ จดโน้ตให้ได้ และค่อยๆ ปรับวิธีตอบให้เข้ากับคนที่คุยด้วย", go: [".works > .work:nth-child(2)", "ดูผลงาน AI ส่วนตัว"] },
  { k: ["optimizer", "ปรับคอม", "ดูแลคอม", "โปรแกรมดูแล", "polo optimizer"], a: "Polo Optimizer เป็นโปรแกรมบน Windows ที่โปโลทำครับ 🛠️ รวมการลง app หา driver ล้าง file ขยะ ปรับเครื่องเล่นเกม และแก้ปัญหาคอมพิวเตอร์ไว้ในที่เดียว มีผู้ช่วย AI ที่ตรวจเครื่องจริงก่อนตอบ และทำเป็นตัวติดตั้งให้คนอื่นลงได้", go: [".works > .work:nth-child(3)", "ดูผลงาน Polo Optimizer"] },
  { k: ["ผลงาน", "โปรเจ", "project", "ทำอะไร"], a: "ตอนนี้มีสามอันครับ กล้องจับคนล้มที่จำหน้าคนได้ (GuardianEye), AI ส่วนตัวที่จำเรื่องของเราได้ และ Polo Optimizer โปรแกรมดูแลคอมพิวเตอร์สำหรับคนที่ใช้คอมพิวเตอร์ไม่เก่ง เลื่อนลงไปดูที่ส่วน Projects ได้เลย", go: ["#projects", "ไปที่ส่วน Projects"] },
  { k: ["รางวัล", "award", "ใบประกาศ", "cert", "เกียรติบัตร"], a: "มีแปดใบครับ 📜 จาก Samsung ห้าใบ (Introduction to Artificial Intelligence in the Workplace, Software Development Concepts and Testing with Python, Generative AI in Software Development, Introduction to Programming with Python, Python Mini-Course: Complex Data Structures), Introduction to Cybersecurity จาก Cisco และ JavaScript ทั้งระดับ Basic กับ Intermediate จาก HackerRank เป็น course ที่เรียนเองนอกเวลา ดูใบจริงได้ที่ส่วน Certificates", go: ["#activities", "ดูใบประกาศทั้งหมด"] },
  { k: ["โรงเรียน", "school", "อยุธยา", "เรียนที่", "ม.6"], a: "โปโลอยู่ ม.6 โรงเรียนอยุธยาวิทยาลัยครับ 🏫" },
  { k: ["เกรด", "gpax", "gpa", "ผลการเรียน", "คะแนน"], a: "GPAX 3.20 ครับ (5 ภาคเรียน) 📚 วิชาคอมพิวเตอร์ได้ 3.5 กับ 4 ส่วนฟิสิกส์ดีขึ้นเรื่อยๆ จาก 2 จนได้ 4" },
  { k: ["ทักษะ", "skill", "ภาษา", "ถนัด"], a: "ใช้ Python เยอะสุดครับ เพราะทำทั้ง 3 project ส่วน JavaScript สอบผ่าน HackerRank ถึงระดับ Intermediate แล้ว ส่วน C ยังเรียนอยู่จาก CS50 แต่ที่ถนัดจริงๆ คือแต่งกับแก้ปัญหาคอมพิวเตอร์ 🔧" },
  { k: ["ติดต่อ", "contact", "อีเมล", "email"], a: "ส่ง email มาที่ 0829271471po@gmail.com ได้เลยครับ ✉️" },
  { k: ["pdf", "พอร์ต", "portfolio", "github", "โค้ด", "code"], a: "ผลงานทั้งหมดอยู่ใน website นี้เลยครับ ถ้าอยากดู code กดปุ่ม \"ดู code บน GitHub\" ในการ์ดแต่ละผลงานได้ 💻" },
  { k: ["ว่าง", "งานอดิเรก", "hobby", "ชอบทำ"], a: "เวลาว่างก็เล่นเกม ฟังเพลง ดูหนังครับ 🎮 ปกติเหมือนวัยรุ่นทั่วไป" },
  { k: ["สวัสดี", "hello", "hi", "หวัดดี"], a: "สวัสดีครับ 👋 อยากรู้เรื่องไหนพิมพ์มาได้เลย หรือกดปุ่มด้านล่างก็ได้ครับ" },];
function addMsg(text, cls) {
  const m = document.createElement("div");
  m.className = "msg " + cls;
  m.textContent = text;
  chatBody.appendChild(m);
  chatBody.scrollTop = chatBody.scrollHeight;
  return m;
}
function ask(q) {
  if (!q.trim()) return;
  addMsg(q, "me");
  const typing = addMsg("กำลังพิมพ์...", "bot typing");
  const t = q.toLowerCase();
  const hit = KB.find((e) => e.k.some((k) => t.includes(k)));
  setTimeout(() => {
    typing.remove();
    addMsg(hit ? hit.a : "อันนี้ยังตอบไม่ได้ครับ 😅 Bot ตัวนี้รู้แค่เรื่องผลงาน ใบประกาศ ทักษะ กับเหตุผลที่อยากเรียนวิศวกรรมคอมพิวเตอร์ ลองกดปุ่มด้านล่างดูนะครับ", "bot");
    if (hit && hit.go) {
      const [sel, label] = hit.go;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "msg-go";
      b.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${label}`;
      b.addEventListener("click", () => {
        const el = document.querySelector(sel);
        if (!el) return;
        if (innerWidth < 700) chat.classList.remove("open");
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      chatBody.appendChild(b);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }, 600);
}
let greeted = false;
document.getElementById("chatFab").addEventListener("click", () => {
  chat.classList.toggle("open");
  if (!greeted) { greeted = true; addMsg("สวัสดีครับ 👋 Bot นี้ตอบคำถามเกี่ยวกับโปโลได้ไม่กี่เรื่อง กดปุ่มด้านล่างได้เลยครับ", "bot"); }
});
document.getElementById("chatClose").addEventListener("click", () => chat.classList.remove("open"));
document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chatText");
  ask(input.value);
  input.value = "";
});
document.querySelectorAll("#chatQuick button").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));

document.getElementById("year").textContent = new Date().getFullYear();

// ===== Image viewer: screenshots and certificates open on top of the page instead of a new tab =====
(function imageViewer() {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = '<button class="lb-close" type="button" aria-label="ปิดรูป"><i class="fa-solid fa-xmark"></i></button><figure><img alt="" /><figcaption></figcaption></figure>';
  document.body.appendChild(box);
  const img = box.querySelector("img"), cap = box.querySelector("figcaption");
  function open(src, alt, text) {
    img.src = src; img.alt = alt || "";
    cap.textContent = text || "";
    box.hidden = false;
    document.body.classList.add("lb-open");
    box.querySelector(".lb-close").focus();
  }
  function close() {
    box.hidden = true;
    document.body.classList.remove("lb-open");
    img.removeAttribute("src");
  }
  document.querySelectorAll(".shots a, .cert-img").forEach((a) => {
    a.removeAttribute("target");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const pic = a.querySelector("img");
      const label = a.querySelector("span")?.textContent || a.closest(".cert")?.querySelector("h4")?.textContent || "";
      open(a.getAttribute("href"), pic?.alt, label);
    });
  });
  box.addEventListener("click", (e) => { if (e.target !== img) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) close(); });
})();

// ===== Background: faint PCB traces with a few slow current pulses =====
(function pcbBackground() {
  const cv = document.getElementById("pcb");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const CELL = 36;
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let w = 0, h = 0, dpr = 1, traces = [], layer = null, pulses = [];

  function build() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    const cols = Math.ceil(w / CELL) + 1, rows = Math.ceil(h / CELL) + 1;
    const used = new Set();
    const key = (c, r) => c + "," + r;
    traces = [];
    const count = Math.round((w * h) / 52000);
    for (let n = 0, tries = 0; n < count && tries < count * 8; tries++) {
      let c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows);
      if (used.has(key(c, r))) continue;
      let d = [0, 2, 4, 6][Math.floor(Math.random() * 4)];       // start straight
      const pts = [[c, r]];
      used.add(key(c, r));
      const segs = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segs; s++) {
        const len = 1 + Math.floor(Math.random() * (d % 2 ? 2 : 4));
        let ok = true;
        for (let k = 0; k < len; k++) {
          const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
          if (nc < 0 || nr < 0 || nc > cols || nr > rows || used.has(key(nc, nr))) { ok = false; break; }
          c = nc; r = nr; used.add(key(c, r));
        }
        pts.push([c, r]);
        if (!ok) break;
        d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;               // 45° turn
      }
      if (pts.length > 2) { traces.push(pts.map(([pc, pr]) => [pc * CELL, pr * CELL])); n++; }
    }
    // draw the static layer once
    layer = document.createElement("canvas");
    layer.width = cv.width; layer.height = cv.height;
    const g = layer.getContext("2d");
    g.scale(dpr, dpr);
    g.lineCap = "round"; g.lineJoin = "round";
    for (const t of traces) {
      g.strokeStyle = "rgba(120, 210, 165, 0.11)";
      g.lineWidth = 1.3;
      g.beginPath();
      t.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      for (const [x, y] of [t[0], t[t.length - 1]]) {             // solder pads at both ends
        g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fillStyle = "#05120e"; g.fill();
        g.strokeStyle = "rgba(120, 210, 165, 0.2)"; g.lineWidth = 1.2; g.stroke();
      }
    }
    pulses = Array.from({ length: Math.min(4, traces.length) }, () => newPulse(Math.random() * 3000));
  }
  function newPulse(delay) {
    const t = traces[Math.floor(Math.random() * traces.length)];
    const segs = [];
    let total = 0;
    for (let i = 1; i < t.length; i++) {
      const l = Math.hypot(t[i][0] - t[i - 1][0], t[i][1] - t[i - 1][1]);
      segs.push(l); total += l;
    }
    return { t, segs, total, pos: 0, speed: 55 + Math.random() * 35, wait: delay || 1500 + Math.random() * 3500 };
  }
  function pointAt(p, dist) {
    let d = Math.max(0, Math.min(p.total, dist));
    for (let i = 0; i < p.segs.length; i++) {
      if (d <= p.segs[i]) {
        const a = p.t[i], b = p.t[i + 1], k = d / p.segs[i];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
      d -= p.segs[i];
    }
    return p.t[p.t.length - 1];
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (layer) ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pulses.forEach((p, i) => {
      if (p.wait > 0) { p.wait -= dt * 1000; return; }
      p.pos += p.speed * dt;
      if (p.pos > p.total + 40) { pulses[i] = newPulse(); return; }
      for (let k = 0; k < 8; k++) {                                 // short glowing tail
        const [x, y] = pointAt(p, p.pos - k * 4);
        ctx.beginPath();
        ctx.arc(x, y, 2.1 - k * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215, 235, 120, ${0.75 - k * 0.09})`;
        ctx.fill();
      }
    });
    requestAnimationFrame(frame);
  }
  build();
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 250); });
  requestAnimationFrame(frame);
})();
