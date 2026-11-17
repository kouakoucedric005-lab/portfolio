/* ============================================================
   Portfolio v4 — logique
   Principes de sécurité appliqués ici :
   • tout le contenu passe par normalize() (liste blanche de champs, types, longueurs, URL https)
   • rendu uniquement via textContent / createElement (jamais innerHTML)
   • aucune donnée sensible dans le code ; mot de passe de l'éditeur = PBKDF2 + sel aléatoire
   • verrouillage anti-force-brute qui fonctionne réellement (et croît à chaque série d'échecs)
   ============================================================ */
(() => {
"use strict";

/* ---------- Utilitaires ---------- */
const SVG_NS = "http://www.w3.org/2000/svg";
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const reduced = () => reduceMQ.matches;

const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k){ try { localStorage.removeItem(k); } catch { /* ignore */ } }
};

function el(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/* ---------- Icônes (sprite SVG défini dans index.html) ---------- */
const ICONS = ["alert","arrow-right","arrow-up-right","bug","check","chevron-down","close","code","database",
  "download","github","globe","heart","layers","linkedin","lock","mail","menu","message","moon","palette",
  "rocket","rotate","save","send","server","shield","sliders","smartphone","sun","terminal","x"];
const ICON_SET = new Set(ICONS);
// Migration des anciens contenus (v3) qui stockaient un emoji : on les convertit en icône.
const LEGACY_EMOJI = { "\u{1F680}":"rocket", "\u{1F4F1}":"smartphone", "\u{1F3A8}":"palette", "\u{1F4BB}":"code",
  "\u{1F512}":"lock", "\u{1F6E1}":"shield", "\u{1F41B}":"bug" };

function icon(name, cls){
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "icon" + (cls ? " " + cls : ""));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", "#i-" + (ICON_SET.has(name) ? name : "layers"));
  svg.appendChild(use);
  return svg;
}

/* ---------- Validation / assainissement ----------
   On ne « supprime » pas de caractères utiles (apostrophes, guillemets) : la sécurité
   vient de l'encodage à l'affichage (textContent). On retire seulement les caractères
   de contrôle et les caractères bidirectionnels invisibles (usurpation d'affichage). */
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
const CONTROL   = /[\u0000-\u001F\u007F-\u009F]+/g;

function txt(v, max){
  const s = (typeof v === "string" || typeof v === "number") ? String(v) : "";
  return Array.from(s.replace(CONTROL, " ").replace(INVISIBLE, "").replace(/\s{2,}/g, " ").trim())
    .slice(0, max).join("");
}
function longText(v, max){
  const s = typeof v === "string" ? v : "";
  return Array.from(s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(INVISIBLE, "").trim()).slice(0, max).join("");
}
function safeUrl(v){
  const s = typeof v === "string" ? v.trim().slice(0, 300) : "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || u.username || u.password) return "";
    return u.href;
  } catch { return ""; }
}
const EMAIL_RE = /^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
function safeEmail(v){
  const s = typeof v === "string" ? v.trim() : "";
  return s.length <= 254 && EMAIL_RE.test(s) ? s : "";
}
const PATH_RE = /^(?!.*\.\.)(?!\/)[A-Za-z0-9_\-./]{1,100}\.(?:webp|jpe?g|png|avif|gif)$/i;
function safePath(v){                                   // fichier du site uniquement (pas d'URL, pas de ..)
  const s = typeof v === "string" ? v.trim() : "";
  return PATH_RE.test(s) && !s.includes("//") ? s : "";
}
const clampPct = v => Math.round(Math.min(100, Math.max(0, Number(v) || 0)));

function pickIcon(v, fallback){
  const raw = typeof v === "string" ? v.trim().replace(/\uFE0F/g, "") : "";
  const k = raw.toLowerCase();
  if (ICON_SET.has(k)) return k;
  if (LEGACY_EMOJI[raw]) return LEGACY_EMOJI[raw];
  return fallback;
}
function socialIcon(v, url){
  const k = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (ICON_SET.has(k)) return k;
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  if (host === "github.com") return "github";
  if (host === "linkedin.com") return "linkedin";
  if (host === "x.com" || host === "twitter.com") return "x";
  return "globe";
}

/* ---------- Contenu ---------- */
const FALLBACK = { name:"Votre Nom", words:["Développeur Web"] };

function normalize(raw){
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const obj  = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  const list = (v, max) => Array.isArray(v) ? v.slice(0, max) : [];
  const out = {
    name:   txt(r.name, 60) || FALLBACK.name,
    badge:  txt(r.badge, 60),
    photo:  safePath(r.photo),
    photoAlt: txt(r.photoAlt, 140),
    words:  list(r.words, 8).map(w => txt(w, 60)).filter(Boolean),
    desc:   txt(r.desc, 300),
    about1: txt(r.about1, 600),
    about2: txt(r.about2, 600),
    stats:  list(r.stats, 4).map(s => ({ n: txt(obj(s).n, 12), l: txt(obj(s).l, 60) })).filter(s => s.n && s.l),
    projects: list(r.projects, 12).map(p => {
      p = obj(p);
      return { icon: pickIcon(p.icon ?? p.emoji, "layers"), title: txt(p.title, 80), desc: txt(p.desc, 300),
               tags: list(p.tags, 6).map(t => txt(t, 30)).filter(Boolean), link: safeUrl(p.link) };
    }).filter(p => p.title),
    skills: list(r.skills, 30).map(s => txt(s, 40)).filter(Boolean),
    bars:   list(r.bars, 8).map(b => ({ label: txt(obj(b).label, 60), pct: clampPct(obj(b).pct) })).filter(b => b.label),
    email:  safeEmail(r.email),
    socials: list(r.socials, 8).map(s => {
      s = obj(s);
      const url = safeUrl(s.url);
      return { icon: socialIcon(s.icon, url), url, title: txt(s.title, 40) };
    }).filter(s => s.url)
  };
  if (!out.words.length) out.words = [...FALLBACK.words];
  return out;
}

const KEY_DRAFT = "pf_draft_v2", KEY_AUTH = "pf_auth", KEY_LOCK = "pf_lock", KEY_THEME = "pf_theme";

const published = normalize(window.PORTFOLIO_CONTENT);   // content.js

function loadDraft(){
  const raw = store.get(KEY_DRAFT);
  if (!raw) return null;
  try { return normalize(JSON.parse(raw)); }
  catch { store.del(KEY_DRAFT); return null; }        // brouillon corrompu : on l'ignore
}
let draft = loadDraft();
let SITE  = draft || published;

/* ---------- Rendu ---------- */
function setText(id, v){
  const n = document.getElementById(id); if (!n) return;
  if (n.dataset.split) splitText(n, n.dataset.split, v); else n.textContent = v;
}

/* ---------- Texte animé ----------
   Découpe un texte en mots (ou en lettres pour les titres) ; l'animation CSS se déclenche
   quand l'élément devient visible. Le texte reste du vrai texte (sélectionnable, lisible). */
function splitText(node, mode, text){
  const t = text !== undefined ? String(text) : node.textContent;
  node.textContent = "";
  node.classList.add("split");
  node.classList.remove("visible");
  if (mode === "chars") node.setAttribute("aria-label", t);   // les lecteurs d'écran lisent le titre entier
  let n = 0;
  const words = t.split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    if (mode === "chars"){
      const g = el("span", "sg"); g.setAttribute("aria-hidden", "true");
      Array.from(word).forEach(ch => { const c = el("span", "sc", ch); c.style.setProperty("--i", n++); g.appendChild(c); });
      node.appendChild(g);
    } else {
      const w = el("span", "sw", word); w.style.setProperty("--i", n++); node.appendChild(w);
    }
    if (wi < words.length - 1) node.appendChild(document.createTextNode(" "));
  });
}

/* Effet « décryptage » sur le nom : les lettres se résolvent de gauche à droite */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*<>/{}[]=+";
let decodeToken = 0, firstRender = true;
function decodeText(node, final, delay, dur){
  const my = ++decodeToken, chars = Array.from(final), n = chars.length;
  const t0 = performance.now() + delay;
  const rnd = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  let last = 0;
  node.textContent = chars.map(c => c === " " ? c : rnd()).join("");
  const frame = now => {
    if (my !== decodeToken) return;                       // un rendu plus récent a pris le relais
    const k = (now - t0) / dur;
    if (k >= 1){ node.textContent = final; return; }
    if (now - last > 45){
      last = now;
      node.textContent = chars.map((c, i) => c === " " || k >= .12 + .88 * (i + 1) / n ? c : rnd()).join("");
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function toggleSection(id, show){
  const s = document.getElementById(id); if (s) s.hidden = !show;
  const l = $(`.nav-menu a[href="#${id}"]`); if (l) l.parentElement.hidden = !show;
}

function render(){
  const nameEl = $("#heroName");
  if (firstRender && !reduced()) decodeText(nameEl, SITE.name, 350, 1300);
  else { decodeToken++; nameEl.textContent = SITE.name; }
  firstRender = false;
  const photo = $("#photo"), fallback = $("#avatarFallback");
  if (SITE.photo){
    photo.alt = SITE.photoAlt || ("Portrait de " + SITE.name);
    if (photo.getAttribute("src") !== SITE.photo) photo.src = SITE.photo;
    photo.hidden = false; fallback.hidden = true;
  } else {
    photo.hidden = true; photo.removeAttribute("src"); fallback.hidden = false;
  }
  setText("badgeText", SITE.badge);
  setText("heroDesc", SITE.desc);
  setText("about1", SITE.about1);
  setText("about2", SITE.about2);
  setText("wordsSr", SITE.words.join(", "));
  document.title = SITE.name + " — Portfolio";

  // Chiffres clés (compteurs animés)
  const statsRow = $("#statsRow"); statsRow.textContent = "";
  SITE.stats.forEach(s => {
    const d = el("div", "stat");
    const h = el("h3");
    const m = /^(\d+)(.*)$/.exec(s.n);
    if (m){
      h.dataset.target = m[1]; h.dataset.suffix = m[2]; h.dataset.final = s.n;
      h.textContent = reduced() ? s.n : "0" + m[2];
    } else h.textContent = s.n;
    d.append(h, el("span", null, s.l));
    statsRow.appendChild(d);
  });

  // Projets
  const grid = $("#projectsGrid"); grid.textContent = "";
  SITE.projects.forEach((p, i) => {
    const c = el("article", "card reveal");
    c.style.setProperty("--i", i % 3);
    const ic = el("div", "card-icon"); ic.appendChild(icon(p.icon));
    const tags = el("div", "tags");
    p.tags.forEach(t => tags.appendChild(el("span", "tag", t)));
    c.append(ic, el("h3", null, p.title), el("p", null, p.desc), tags);
    if (p.link){
      const a = el("a", "card-link");
      a.href = p.link; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", "Voir le projet " + p.title + " (nouvel onglet)");
      a.append("Voir le projet ", icon("arrow-up-right"));
      c.appendChild(a);
    }
    grid.appendChild(c);
  });

  // Compétences
  const skillsRow = $("#skillsRow"); skillsRow.textContent = "";
  skillsRow.classList.remove("visible");
  SITE.skills.forEach((s, i) => {
    const n = el("div", "skill", s);
    n.style.setProperty("--i", i);
    skillsRow.appendChild(n);
  });

  // Barres
  const barsRow = $("#barsRow"); barsRow.textContent = "";
  SITE.bars.forEach(b => {
    const row = el("div", "bar-row");
    const lbl = el("div", "lbl");
    const pct = el("span", "pct");
    pct.dataset.target = b.pct; pct.dataset.suffix = "%"; pct.dataset.final = b.pct + "%";
    pct.textContent = reduced() ? b.pct + "%" : "0%";
    lbl.append(el("span", null, b.label), pct);
    const bar = el("div", "bar");
    const fill = el("div", "bar-fill");
    fill.dataset.w = b.pct;
    if (reduced()) fill.style.width = b.pct + "%";
    bar.appendChild(fill);
    row.append(lbl, bar);
    barsRow.appendChild(row);
  });

  // Réseaux
  const socialsRow = $("#socialsRow"); socialsRow.textContent = "";
  SITE.socials.forEach(s => {
    const a = el("a", "social");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", (s.title || "Lien externe") + " (nouvel onglet)");
    a.title = s.title;
    a.appendChild(icon(s.icon));
    socialsRow.appendChild(a);
  });

  // Les sections vides disparaissent (et leur lien de menu aussi)
  toggleSection("projets", SITE.projects.length > 0);
  toggleSection("competences", SITE.skills.length > 0 || SITE.bars.length > 0);

  $("#draftPill").hidden = !draft;
  observeAll();
}

/* ---------- Observateurs : apparitions, compteurs, barres ---------- */
const hasIO = "IntersectionObserver" in window;
const revealIO = hasIO ? new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("visible");
    revealIO.unobserve(e.target);
  });
}, { threshold: .15, rootMargin: "0px 0px -6% 0px" }) : null;

const dataIO = hasIO ? new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target; dataIO.unobserve(n);
    if (n.classList.contains("bar-fill")) n.style.width = n.dataset.w + "%";
    else countTo(n);
  });
}, { threshold: .6 }) : null;

function countTo(node){
  const target = Number(node.dataset.target), suffix = node.dataset.suffix || "";
  const t0 = performance.now(), dur = 1600;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    node.textContent = k < 1 ? Math.round(target * e) + suffix : node.dataset.final;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function observeAll(){
  $$(".reveal:not(.visible), .stagger:not(.visible), .split:not(.visible)").forEach(n => {
    if (reduced() || !revealIO) n.classList.add("visible"); else revealIO.observe(n);
  });
  if (reduced() || !dataIO){
    $$(".bar-fill").forEach(f => f.style.width = f.dataset.w + "%");
    $$("[data-target]").forEach(n => n.textContent = n.dataset.final);
  } else {
    $$(".bar-fill, [data-target]").forEach(n => dataIO.observe(n));
  }
}

/* ---------- Thème (avec transition circulaire quand le navigateur la gère) ---------- */
const themeBtn = $("#themeBtn");
function applyTheme(t){
  root.dataset.theme = t;
  themeBtn.querySelector("use").setAttribute("href", t === "dark" ? "#i-moon" : "#i-sun");
  themeBtn.setAttribute("aria-label", t === "dark" ? "Passer au thème clair" : "Passer au thème sombre");
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === "dark" ? "#08070f" : "#f6f6fb";
}
const savedTheme = store.get(KEY_THEME);
if (savedTheme === "light" || savedTheme === "dark") applyTheme(savedTheme); else applyTheme("dark");

themeBtn.addEventListener("click", async () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  store.set(KEY_THEME, next);
  if (!document.startViewTransition || reduced()){ applyTheme(next); return; }
  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => applyTheme(next));
  try {
    await vt.ready;
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
      { duration: 700, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" });
  } catch { /* transition annulée : le thème est déjà appliqué */ }
});

/* ---------- Navigation : menu mobile, scrollspy, progression ---------- */
const nav = $("#nav"), navToggle = $("#navToggle");
function setMenu(open){
  nav.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  navToggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
}
navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
$$(".nav-menu a").forEach(a => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("click", e => { if (!nav.contains(e.target)) setMenu(false); });

if (hasIO){
  const links = $$('.nav-menu a[href^="#"]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => {
        const on = l.getAttribute("href") === "#" + e.target.id;
        l.classList.toggle("active", on);
        if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  $$("main section[id], #top").forEach(s => spy.observe(s));   // #top : aucun lien actif sur l'accueil
}

const progress = $("#progress");
let ticking = false;
function onScroll(){
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = root.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    nav.classList.toggle("scrolled", scrollY > 20);
    ticking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Pointeur : anneau, cartes inclinées, boutons magnétiques ---------- */
const ring = $("#cursorRing");
const mouse = { x: -9999, y: -9999 };
let rx = 0, ry = 0, ringOn = false;
const HOT = "a,button,input,textarea,select,label,.card,.skill,[data-magnetic]";

document.addEventListener("pointermove", e => {
  if (e.pointerType === "touch") return;
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (!ringOn && finePointer.matches && !reduced()){ ringOn = true; rx = mouse.x; ry = mouse.y; ring.classList.add("active"); }
  const t = e.target instanceof Element ? e.target : null;
  if (!t || reduced() || !finePointer.matches) return;
  ring.classList.toggle("hovering", !!t.closest(HOT));

  const card = t.closest(".card");
  if (card){
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    card.style.setProperty("--rx", ((.5 - py) * 7).toFixed(2) + "deg");
    card.style.setProperty("--ry", ((px - .5) * 9).toFixed(2) + "deg");
  }
  const mag = t.closest("[data-magnetic]");
  if (mag){
    const r = mag.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * .22, dy = (e.clientY - (r.top + r.height / 2)) * .3;
    mag.style.translate = dx.toFixed(1) + "px " + dy.toFixed(1) + "px";
  }
}, { passive: true });

document.addEventListener("pointerout", e => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t) return;
  const card = t.closest(".card");
  if (card && !card.contains(e.relatedTarget)){
    card.style.removeProperty("--rx"); card.style.removeProperty("--ry");
  }
  const mag = t.closest("[data-magnetic]");
  if (mag && !mag.contains(e.relatedTarget)) mag.style.translate = "";
});
root.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; ring.classList.remove("active"); ringOn = false; });

(function ringLoop(){
  if (ringOn){
    rx += (mouse.x - rx) * .17; ry += (mouse.y - ry) * .17;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
  }
  requestAnimationFrame(ringLoop);
})();

/* ---------- Particules ---------- */
const canvas = $("#particles"), ctx = canvas.getContext("2d");
let W = 0, H = 0; const parts = [];
const mkPart = () => ({ x: Math.random() * W, y: Math.random() * H,
  vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.8 + .6 });
function resizeCanvas(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = Math.min(90, Math.max(25, Math.floor(W * H / 15000)));
  while (parts.length < n) parts.push(mkPart());
  parts.length = n;
  if (reduced()) draw(false);
}
function draw(move){
  const dark = root.dataset.theme !== "light";
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark ? "rgba(124,92,255,.55)" : "rgba(106,69,255,.4)";
  for (const p of parts){
    if (move){
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 19600 && d2 > 1){ const d = Math.sqrt(d2); p.x += dx / d * .7; p.y += dy / d * .7; }
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
  }
  const rgb = dark ? "0,229,195" : "0,128,108";
  ctx.lineWidth = 1;
  for (let i = 0; i < parts.length; i++){
    const a = parts[i];
    for (let j = i + 1; j < parts.length; j++){
      const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 16900){
        ctx.strokeStyle = `rgba(${rgb},${(.12 * (1 - Math.sqrt(d2) / 130)).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // « constellation » autour du curseur
    const mx = a.x - mouse.x, my = a.y - mouse.y, md2 = mx * mx + my * my;
    if (md2 < 28900){
      ctx.strokeStyle = `rgba(124,92,255,${(.3 * (1 - Math.sqrt(md2) / 170)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
    }
  }
}
let resizeT;
addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(resizeCanvas, 120); });
resizeCanvas();
(function particleLoop(){
  if (!reduced()) draw(true);
  requestAnimationFrame(particleLoop);
})();

/* ---------- Machine à écrire ---------- */
const typedEl = $("#typedText");
let wi = 0, ci = 0, deleting = false;
(function type(){
  const words = SITE.words;
  if (reduced()){ typedEl.textContent = words[0]; return; }
  wi %= words.length;
  const chars = Array.from(words[wi]);
  typedEl.textContent = chars.slice(0, ci).join("");
  if (!deleting && ci < chars.length){ ci++; setTimeout(type, 70); }
  else if (!deleting){ deleting = true; setTimeout(type, 1800); }
  else if (ci > 0){ ci--; setTimeout(type, 35); }
  else { deleting = false; wi = (wi + 1) % words.length; setTimeout(type, 400); }
})();

/* ---------- Formulaire de contact (ouvre le client mail ; aucun envoi réseau) ---------- */
const form = $("#contactForm"), formMsg = $("#formMsg");
function say(kind, text){
  formMsg.className = "form-msg" + (kind ? " " + kind : "");
  formMsg.textContent = "";
  if (!kind) return;
  formMsg.append(icon(kind === "ok" ? "check" : "alert"), document.createTextNode(text));
}
const submitBtn = $(".btn-submit");
let sending = false;
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (sending) return;
  // Champ piège rempli = robot : fausse confirmation, rien n'est envoyé
  if (form.elements["bot-field"] && form.elements["bot-field"].value){
    say("ok", "Merci ! Votre message a bien été envoyé."); form.reset(); return;
  }
  const name  = txt($("#fName").value, 80);
  const email = safeEmail($("#fEmail").value);
  const msg   = longText($("#fMsg").value, 2000);
  if (!name || !msg) return say("err", "Merci de remplir tous les champs.");
  if (!email) return say("err", "Adresse email invalide.");

  sending = true; submitBtn.disabled = true;
  formMsg.className = "form-msg"; formMsg.textContent = "Envoi en cours…";
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
  try {
    // Netlify Forms : POST « classique » vers la racine du site, avec form-name
    const res = await fetch(form.getAttribute("action") || "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": "contact", name, email, message: msg }).toString(),
      signal: ctl.signal
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    say("ok", "Merci ! Votre message a bien été envoyé, je vous répondrai dès que possible.");
    form.reset();
  } catch {
    if (SITE.email){                                    // repli facultatif : le logiciel de messagerie
      location.href = "mailto:" + SITE.email
        + "?subject=" + encodeURIComponent("Contact portfolio de " + name)
        + "&body=" + encodeURIComponent(msg + "\n\n— " + name + " (" + email + ")");
      say("ok", "L'envoi direct a échoué : votre logiciel de messagerie va s'ouvrir…");
      form.reset();
    } else {
      say("err", "L'envoi a échoué. Réessayez dans un instant.");
    }
  } finally {
    clearTimeout(timer); sending = false; submitBtn.disabled = false;
  }
});

$("#year").textContent = new Date().getFullYear();

/* ============================================================
   Éditeur local
   Honnêtement : tout se passe dans le navigateur, donc ce n'est PAS une barrière de
   sécurité contre quelqu'un qui contrôle son navigateur. Ce qui compte, c'est qu'il
   n'expose aucun secret, qu'il ne puisse rien modifier sur le site publié (il produit
   un fichier content.js à déployer), et que ses défauts classiques soient corrigés.
   ============================================================ */
const PBKDF2_ITER = 600000, MIN_PASS = 10, IDLE_MS = 15 * 60 * 1000;
const hasCrypto = !!(window.crypto && crypto.subtle);
const enc = new TextEncoder();
const b64 = {
  to: u8 => btoa(String.fromCharCode(...u8)),
  from: s => Uint8Array.from(atob(s), c => c.charCodeAt(0))
};
async function derive(pass, salt, iter){
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256));
}
function sameBytes(a, b){
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
function readAuth(){
  try {
    const o = JSON.parse(store.get(KEY_AUTH) || "null");
    if (o && typeof o.salt === "string" && typeof o.hash === "string"
        && Number.isInteger(o.iter) && o.iter >= 100000 && o.iter <= 5000000) return o;
  } catch { /* ignore */ }
  return null;
}
async function makeAuth(pass){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pass, salt, PBKDF2_ITER);
  return { salt: b64.to(salt), hash: b64.to(hash), iter: PBKDF2_ITER };
}

/* Anti force-brute : 5 échecs → 60 s, puis 2 min, 4 min… (plafonné à 16 min) */
function readLock(){
  try {
    const o = JSON.parse(store.get(KEY_LOCK) || "{}");
    return { fails: Number.isInteger(o.fails) && o.fails > 0 ? o.fails : 0, until: Number.isFinite(o.until) ? o.until : 0 };
  } catch { return { fails: 0, until: 0 }; }
}
const lockLeft = () => Math.max(0, readLock().until - Date.now());
function registerFailure(){
  const s = readLock();
  s.fails += 1;                                       // le compteur n'est remis à zéro qu'après une réussite
  if (s.fails % 5 === 0) s.until = Date.now() + 60000 * 2 ** Math.min(s.fails / 5 - 1, 4);
  store.set(KEY_LOCK, JSON.stringify(s));
  return s;
}

const overlay = $("#adminOverlay"), page = $("#page");
const views = { noCrypto: $("#noCryptoView"), setup: $("#setupView"), login: $("#loginView"), editor: $("#editorView") };
let unlocked = false, idleT = 0, lastFocus = null, busy = false;

function showView(name){
  Object.entries(views).forEach(([k, v]) => v.hidden = k !== name);
  requestAnimationFrame(() => {
    const f = name === "setup" ? $("#setupPass") : name === "login" ? $("#adminPass") : name === "editor" ? $("#edName") : $("#adminClose");
    if (f) f.focus();
  });
}
function entryView(){ return !hasCrypto ? "noCrypto" : unlocked ? "editor" : readAuth() ? "login" : "setup"; }

function openAdmin(){
  lastFocus = document.activeElement;
  page.inert = true;
  overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false");
  const v = entryView();
  if (v === "editor") fillEditor();
  $("#loginErr").textContent = ""; $("#setupErr").textContent = "";
  showView(v);
}
function closeAdmin(){
  overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true");
  page.inert = false;
  if (location.hash === "#admin"){ try { history.replaceState(null, "", location.pathname + location.search); } catch { /* ignore */ } }
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function armIdle(){
  clearTimeout(idleT);
  if (unlocked) idleT = setTimeout(lockEditor, IDLE_MS);
}
function lockEditor(){
  unlocked = false; clearTimeout(idleT);
  $$("#editorView input, #editorView textarea").forEach(f => f.value = "");
  if (overlay.classList.contains("open")) showView(entryView());
}
function unlockEditor(){
  unlocked = true; armIdle(); fillEditor(); showView("editor"); $("#adminMsg").textContent = "";
}

$("#adminClose").addEventListener("click", closeAdmin);
$("#loginCancel").addEventListener("click", closeAdmin);
overlay.addEventListener("click", e => { if (e.target === overlay) closeAdmin(); });
["input", "click", "keydown"].forEach(ev => overlay.addEventListener(ev, armIdle));
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (overlay.classList.contains("open")) closeAdmin(); else setMenu(false);
});
if (location.hash === "#admin") openAdmin();
addEventListener("hashchange", () => { if (location.hash === "#admin") openAdmin(); });

$("#setupForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (busy) return; busy = true;
  const err = $("#setupErr"), p1 = $("#setupPass").value, p2 = $("#setupPass2").value;
  try {
    if (p1.length < MIN_PASS) { err.textContent = `Au moins ${MIN_PASS} caractères.`; return; }
    if (p1 !== p2) { err.textContent = "Les deux mots de passe ne correspondent pas."; return; }
    store.set(KEY_AUTH, JSON.stringify(await makeAuth(p1)));
    store.set(KEY_LOCK, JSON.stringify({ fails: 0, until: 0 }));
    $("#setupPass").value = $("#setupPass2").value = "";
    err.textContent = "";
    unlockEditor();
  } finally { busy = false; }
});

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (busy) return;
  const err = $("#loginErr");
  const wait = lockLeft();
  if (wait > 0){ err.textContent = `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 1000)} s.`; return; }
  busy = true;
  try {
    const auth = readAuth();
    if (!auth){ showView("setup"); return; }
    const ok = sameBytes(await derive($("#adminPass").value, b64.from(auth.salt), auth.iter), b64.from(auth.hash));
    if (ok){
      store.set(KEY_LOCK, JSON.stringify({ fails: 0, until: 0 }));
      err.textContent = "";
      unlockEditor();
    } else {
      const s = registerFailure();
      err.textContent = s.fails % 5 === 0
        ? `Trop d'échecs : éditeur verrouillé ${Math.ceil(lockLeft() / 1000)} s.`
        : `Mot de passe incorrect (${5 - (s.fails % 5)} essai${5 - (s.fails % 5) > 1 ? "s" : ""} avant verrouillage).`;
    }
  } finally { $("#adminPass").value = ""; busy = false; }
});

function fillEditor(){
  const s = SITE, json = v => JSON.stringify(v, null, 2);
  $("#edName").value = s.name;
  $("#edBadge").value = s.badge;
  $("#edPhoto").value = s.photo;
  $("#edPhotoAlt").value = s.photoAlt;
  $("#edWords").value = s.words.join("\n");
  $("#edDesc").value = s.desc;
  $("#edAbout1").value = s.about1;
  $("#edAbout2").value = s.about2;
  $("#edStats").value = json(s.stats);
  $("#edProjects").value = json(s.projects);
  $("#edSkills").value = s.skills.join("\n");
  $("#edBars").value = json(s.bars);
  $("#edEmail").value = s.email;
  $("#edSocials").value = json(s.socials);
  $("#edNewPass").value = "";
  $("#iconList").textContent = ICONS.join(", ");
}

function adminSay(kind, text){
  const m = $("#adminMsg");
  m.className = "admin-msg" + (kind ? " " + kind : "");
  m.textContent = text;
}

$("#saveBtn").addEventListener("click", async () => {
  try {
    if (!txt($("#edName").value, 60)) throw new Error("Le nom ne peut pas être vide.");
    const em = $("#edEmail").value.trim();
    if (em && !safeEmail(em)) throw new Error("Email invalide.");
    const parseList = (id, label) => {
      let v;
      try { v = JSON.parse($(id).value || "[]"); } catch (e) { throw new Error(`${label} : JSON invalide (${e.message}).`); }
      if (!Array.isArray(v)) throw new Error(`${label} : une liste [ ] est attendue.`);
      return v;
    };
    const lines = id => $(id).value.split("\n");
    const next = normalize({
      name: $("#edName").value, badge: $("#edBadge").value, words: lines("#edWords"),
      photo: $("#edPhoto").value, photoAlt: $("#edPhotoAlt").value,
      desc: $("#edDesc").value, about1: $("#edAbout1").value, about2: $("#edAbout2").value,
      stats: parseList("#edStats", "Chiffres clés"), projects: parseList("#edProjects", "Projets"),
      skills: lines("#edSkills"), bars: parseList("#edBars", "Barres"),
      email: $("#edEmail").value, socials: parseList("#edSocials", "Réseaux")
    });
    if ($("#edPhoto").value.trim() && !next.photo) throw new Error("Photo : nom de fichier invalide (ex. photo.webp, sans / initial ni ..).");
    const np = $("#edNewPass").value;
    if (np && np.length < MIN_PASS) throw new Error(`Le nouveau mot de passe doit faire ${MIN_PASS} caractères minimum.`);
    if (!store.set(KEY_DRAFT, JSON.stringify(next))) throw new Error("Impossible d'enregistrer (stockage du navigateur indisponible).");
    if (np){
      store.set(KEY_AUTH, JSON.stringify(await makeAuth(np)));
      $("#edNewPass").value = "";
    }
    draft = next; SITE = next;
    render(); fillEditor();
    adminSay("ok", np ? "Brouillon enregistré, mot de passe mis à jour." : "Brouillon enregistré (visible uniquement dans ce navigateur).");
  } catch (err) {
    adminSay("err", err.message);
  }
});

$("#exportBtn").addEventListener("click", () => {
  const body = "// Contenu du portfolio — exporté depuis l'éditeur local.\n"
    + "// Remplacez content.js par ce fichier, puis déployez.\n"
    + "window.PORTFOLIO_CONTENT = " + JSON.stringify(SITE, null, 2) + ";\n";
  const url = URL.createObjectURL(new Blob([body], { type: "text/javascript;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "content.js";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  adminSay("ok", "content.js exporté : remplacez le fichier du site puis déployez.");
});

function dropDraft(){
  if (!confirm("Abandonner le brouillon local et revenir à la version publiée (content.js) ?")) return;
  store.del(KEY_DRAFT);
  draft = null; SITE = published;
  render();
  if (unlocked){ fillEditor(); adminSay("ok", "Brouillon abandonné."); }
}
$("#resetBtn").addEventListener("click", dropDraft);
$("#draftDrop").addEventListener("click", dropDraft);
$("#lockBtn").addEventListener("click", () => { lockEditor(); });

// Titres et sous-titres statiques : découpés une fois (ceux qui ont un id sont gérés par render())
$$("[data-split]").forEach(n => { if (!n.id) splitText(n, n.dataset.split); });
$("#photo").addEventListener("error", () => { $("#photo").hidden = true; $("#avatarFallback").hidden = false; });

render();
})();
