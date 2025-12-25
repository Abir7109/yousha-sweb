/* Youshas’Web — vanilla JS interactions (mobile-first, Android-friendly) */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORE_KEY = "youshaweb:prefs:v1";

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? true;
  const canHover = window.matchMedia?.("(hover: hover)")?.matches ?? false;

  const prefs = {
    fxHigh: true,
    motionReduced: false,
  };

  const runtime = {
    rain: {
      on: false,
      timer: null,
    },
    trail: {
      on: false,
      last: 0,
    },
    lightbox: {
      open: false,
      index: 0,
      items: [],
    },
  };

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.fxHigh === "boolean") prefs.fxHigh = parsed.fxHigh;
      if (typeof parsed?.motionReduced === "boolean") prefs.motionReduced = parsed.motionReduced;
    } catch {
      // ignore
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }

  function effectiveMotionReduced() {
    return Boolean(prefs.motionReduced || prefersReducedMotion?.matches);
  }

  function applyPrefs() {
    document.body.classList.toggle("fx-low", !prefs.fxHigh);
    document.body.classList.toggle("motion-reduced", effectiveMotionReduced());

    const fxBtn = $("#fxBtn");
    const motionBtn = $("#motionBtn");

    if (fxBtn) {
      fxBtn.setAttribute("aria-pressed", String(prefs.fxHigh));
      fxBtn.textContent = prefs.fxHigh ? "FX: High" : "FX: Low";
    }

    if (motionBtn) {
      motionBtn.setAttribute("aria-pressed", String(effectiveMotionReduced()));
      motionBtn.textContent = effectiveMotionReduced() ? "Motion: Reduced" : "Motion: On";
    }

    if (effectiveMotionReduced()) {
      stopEmojiRain();
      disableTrail(true);
    }

    buildHeroFx();
  }

  /* Loader */
  function hideLoader() {
    const loader = $("#loader");
    if (!loader) return;
    loader.classList.add("is-hidden");
    window.setTimeout(() => {
      loader.remove();
    }, 320);
  }

  /* Mobile menu */
  function setupMenu() {
    const btn = $("#menuBtn");
    const links = $("#navLinks");
    if (!btn || !links) return;

    const close = () => {
      links.dataset.open = "false";
      btn.setAttribute("aria-expanded", "false");
    };

    const open = () => {
      links.dataset.open = "true";
      btn.setAttribute("aria-expanded", "true");
    };

    btn.addEventListener("click", () => {
      const isOpen = links.dataset.open === "true";
      if (isOpen) close();
      else open();
    });

    links.addEventListener("click", (e) => {
      const a = e.target.closest?.("a");
      if (a && a.classList.contains("nav__link")) close();
    });

    document.addEventListener("click", (e) => {
      if (links.dataset.open !== "true") return;
      if (links.contains(e.target)) return;
      if (btn.contains(e.target)) return;
      close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      close();
    });
  }

  /* Scroll reveals */
  function setupReveals() {
    const nodes = $$(".reveal");
    if (!nodes.length) return;

    if (effectiveMotionReduced() || !window.IntersectionObserver) {
      nodes.forEach((n) => n.classList.add("reveal--in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("reveal--in");
          io.unobserve(en.target);
        }
      },
      { threshold: 0.14 }
    );

    nodes.forEach((n) => io.observe(n));
  }

  /* Typewriter */
  function setupTypewriter() {
    const el = document.querySelector("[data-typewriter]");
    if (!el) return;

    const full = el.textContent ?? "";
    const trimmed = full.replace(/\s+/g, " ").trim();

    if (!trimmed) return;

    if (effectiveMotionReduced()) {
      el.textContent = trimmed;
      return;
    }

    el.textContent = "";
    let i = 0;

    const tick = () => {
      // If user toggles reduced motion while typing, finish immediately.
      if (effectiveMotionReduced()) {
        el.textContent = trimmed;
        return;
      }

      i += 1;
      el.textContent = trimmed.slice(0, i);

      if (i < trimmed.length) {
        const ch = trimmed[i - 1];
        const delay = ch === "." || ch === "!" || ch === "?" ? 180 : 26;
        window.setTimeout(tick, delay);
      }
    };

    window.setTimeout(tick, 300);
  }

  /* Sparkles */
  function buildHeroFx() {
    const fx = $("#heroFx");
    if (!fx) return;

    fx.innerHTML = "";

    if (effectiveMotionReduced()) return;

    const computed = getComputedStyle(document.body);
    const raw = computed.getPropertyValue("--sparkle-count").trim();
    const count = Math.max(0, Math.min(48, Number.parseInt(raw || "24", 10)));

    for (let i = 0; i < count; i += 1) {
      const s = document.createElement("span");
      s.className = "sparkle";

      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dur = 2.8 + Math.random() * 4.2;
      const tw = 1.1 + Math.random() * 1.6;
      const scale = 0.55 + Math.random() * 1.2;

      s.style.left = `${left}%`;
      s.style.top = `${top}%`;
      s.style.setProperty("--dur", `${dur.toFixed(2)}s`);
      s.style.setProperty("--tw", `${tw.toFixed(2)}s`);
      s.style.setProperty("--s", `${scale.toFixed(2)}`);

      fx.appendChild(s);
    }
  }

  /* Emoji FX */
  const EMOJIS = ["✨", "💖", "🔥", "🌸", "🎉", "💫", "🫶", "⭐", "🌟"];

  function randomEmoji() {
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  }

  function burstAt(x, y, opts = {}) {
    if (effectiveMotionReduced()) return;

    const layer = $("#emojiLayer");
    if (!layer) return;

    const fxHigh = prefs.fxHigh;
    const isSmall = window.matchMedia?.("(max-width: 520px)")?.matches ?? false;

    // Reduced counts for better performance
    const count = opts.count ?? (isSmall ? (fxHigh ? 6 : 4) : fxHigh ? 10 : 6);
    const spread = opts.spread ?? (isSmall ? 60 : 80);

    for (let i = 0; i < count; i += 1) {
      const e = document.createElement("span");
      e.className = "emoji";
      e.textContent = opts.emoji ?? randomEmoji();

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.28;
      const dist = spread * (0.55 + Math.random() * 0.65);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      e.style.left = `${x}px`;
      e.style.top = `${y}px`;
      layer.appendChild(e);

      const rot = (Math.random() * 160 - 80) * (Math.PI / 180);

      const anim = e.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy * 0.8}px)) scale(1.1) rotate(${rot}rad)`, opacity: 1, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.9) rotate(${rot * 1.3}rad)`, opacity: 0 },
        ],
        {
          duration: 720 + Math.random() * 260,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "forwards",
        }
      );

      anim.onfinish = () => e.remove();
    }
  }

  function burstFromElement(el, opts = {}) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    burstAt(x, y, opts);
  }

  /* Emoji Rain */
  function spawnRainDrop() {
    if (effectiveMotionReduced()) return;

    const layer = $("#emojiLayer");
    if (!layer) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const e = document.createElement("span");
    e.className = "emoji";
    e.textContent = randomEmoji();

    const x = Math.random() * w;
    const startY = -30;
    const drift = (Math.random() * 120 - 60) * (prefs.fxHigh ? 1 : 0.7);

    e.style.left = `${x}px`;
    e.style.top = `${startY}px`;

    layer.appendChild(e);

    const dur = 1100 + Math.random() * 900;
    const rot = (Math.random() * 240 - 120) * (Math.PI / 180);

    const anim = e.animate(
      [
        { transform: "translate(-50%, 0) scale(0.85)", opacity: 0 },
        { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.12 },
        { transform: `translate(calc(-50% + ${drift}px), ${h + 90}px) rotate(${rot}rad)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
    );

    anim.onfinish = () => e.remove();
  }

  function startEmojiRain() {
    if (effectiveMotionReduced()) return;
    if (runtime.rain.on) return;

    runtime.rain.on = true;

    const btn = $("#rainBtn");
    if (btn) {
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "Stop Emoji Rain";
    }

    // Staggered drops: gentle on Android.
    const base = prefs.fxHigh ? 260 : 380;

    runtime.rain.timer = window.setInterval(() => {
      // Spawn a couple at once on big screens.
      spawnRainDrop();
      if (!isCoarsePointer && prefs.fxHigh) window.setTimeout(spawnRainDrop, 110);
    }, base);
  }

  function stopEmojiRain() {
    runtime.rain.on = false;

    if (runtime.rain.timer) {
      window.clearInterval(runtime.rain.timer);
      runtime.rain.timer = null;
    }

    const btn = $("#rainBtn");
    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "Start Emoji Rain";
    }
  }

  /* Cursor trail (desktop only) */
  function disableTrail(forceOff = false) {
    const btn = $("#trailBtn");

    runtime.trail.on = false;

    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = forceOff ? "Trail (desktop only)" : "Enable Trail";
    }
  }

  function enableTrail() {
    const btn = $("#trailBtn");

    // On Android (coarse pointer), keep this off.
    if (isCoarsePointer) {
      disableTrail(true);
      return;
    }

    if (effectiveMotionReduced()) {
      disableTrail(true);
      return;
    }

    runtime.trail.on = true;
    runtime.trail.last = 0;

    if (btn) {
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "Disable Trail";
    }
  }

  function setupTrail() {
    const btn = $("#trailBtn");
    if (!btn) return;

    if (isCoarsePointer) {
      btn.disabled = true;
      btn.textContent = "Trail (desktop only)";
      btn.setAttribute("aria-pressed", "false");
      return;
    }

    btn.addEventListener("click", () => {
      if (runtime.trail.on) disableTrail(false);
      else enableTrail();
    });

    document.addEventListener(
      "pointermove",
      (e) => {
        if (!runtime.trail.on) return;
        const now = performance.now();
        if (now - runtime.trail.last < 40) return;
        runtime.trail.last = now;

        // Small, subtle trail.
        burstAt(e.clientX, e.clientY, { count: prefs.fxHigh ? 3 : 2, spread: 22, emoji: "✨" });
      },
      { passive: true }
    );
  }

  /* Gallery */
  function makePlaceholderDataUri({ title, a, b }) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0.3"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.16"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="900" height="900" fill="#0b0620"/>
  <rect width="900" height="900" fill="url(#g)" opacity="0.72"/>
  <circle cx="240" cy="260" r="210" fill="rgba(255,255,255,0.16)"/>
  <circle cx="640" cy="560" r="300" fill="rgba(0,0,0,0.16)"/>
  <rect width="900" height="900" filter="url(#noise)" opacity="0.25"/>
  <text x="60" y="760" font-family="Poppins, Arial" font-size="56" font-weight="800" fill="rgba(255,255,255,0.92)">${title}</text>
  <text x="60" y="820" font-family="Poppins, Arial" font-size="26" font-weight="600" fill="rgba(255,255,255,0.72)">Replace with Yousha’s photos</text>
</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
  }

  async function loadGalleryManifest() {
    try {
      const res = await fetch("assets/gallery/manifest.json", { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.items) || json.items.length < 1) return null;
      return json;
    } catch {
      return null;
    }
  }

  function probeFirstLoad(urls) {
    return new Promise((resolve) => {
      const img = new Image();
      let i = 0;

      const tryNext = () => {
        if (i >= urls.length) return resolve(null);
        const url = urls[i];
        i += 1;

        img.onload = () => resolve(url);
        img.onerror = tryNext;
        img.src = url;
      };

      tryNext();
    });
  }

  async function buildGallery() {
    const grid = $("#galleryGrid");
    if (!grid) return null;

    const presets = [
      { title: "Neon Glow", a: "#ff3df2", b: "#3df5ff" },
      { title: "Golden Hour", a: "#ffd84a", b: "#ff3df2" },
      { title: "Deep Purple", a: "#6b3dff", b: "#14083a" },
      { title: "Star Pop", a: "#3df5ff", b: "#6b3dff" },
      { title: "Sparkle Storm", a: "#ff3df2", b: "#ffd84a" },
      { title: "Soft Bloom", a: "#3df5ff", b: "#14083a" },
      { title: "Confetti", a: "#ffd84a", b: "#3df5ff" },
      { title: "Main Character", a: "#6b3dff", b: "#ff3df2" },
    ];

    const manifest = await loadGalleryManifest();

    let items = [];

    if (manifest) {
      items = manifest.items.map((m, idx) => {
        const preset = presets[idx % presets.length];
        const title = typeof m?.title === "string" && m.title.trim() ? m.title.trim() : preset.title;
        const caption = typeof m?.caption === "string" && m.caption.trim() ? m.caption.trim() : `${title} ✨`;
        const src = typeof m?.src === "string" && m.src.trim() ? m.src.trim() : makePlaceholderDataUri(preset);

        return {
          ...preset,
          id: idx,
          title,
          caption,
          src,
          fallback: makePlaceholderDataUri(preset),
        };
      });
    } else {
      // Fallback (no manifest): probe numbered files (1.jpg/1.png/etc) and stop at first missing.
      const exts = ["jpg", "jpeg", "png", "webp"];
      const max = 400;

      for (let n = 1; n <= max; n += 1) {
        const preset = presets[(n - 1) % presets.length];
        const fallback = makePlaceholderDataUri(preset);
        const candidates = exts.map((ext) => `assets/gallery/${n}.${ext}`);
        const src = await probeFirstLoad(candidates);

        if (!src) break;

        items.push({
          ...preset,
          id: n - 1,
          src,
          fallback,
          caption: `${preset.title} ✨`,
        });
      }

      if (!items.length) {
        items = presets.map((preset, idx) => ({
          ...preset,
          id: idx,
          src: makePlaceholderDataUri(preset),
          fallback: makePlaceholderDataUri(preset),
          caption: `${preset.title} ✨`,
        }));
      }
    }

    runtime.lightbox.items = items;

    const frag = document.createDocumentFragment();
    const imgPromises = [];

    for (const it of items) {
      const tile = document.createElement("div");
      tile.className = "tile reveal";

      const btn = document.createElement("button");
      btn.className = "tile__btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `Open ${it.title}`);

      const img = document.createElement("img");
      img.className = "tile__img";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = it.caption;
      img.src = it.src;

      // Track when each image finishes loading (or fails) so we can
      // keep the loader on screen until the gallery is ready.
      imgPromises.push(
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }

          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", () => {
            img.src = it.fallback;
            resolve();
          }, { once: true });
        })
      );

      const cap = document.createElement("div");
      cap.className = "tile__cap";
      cap.innerHTML = `<strong>${it.title}</strong><span>Tap</span>`;

      const spark = document.createElement("div");
      spark.className = "tile__spark";

      btn.appendChild(img);
      tile.appendChild(btn);
      tile.appendChild(spark);
      tile.appendChild(cap);

      btn.addEventListener("click", () => {
        burstFromElement(btn);
        openLightbox(it.id);
      });

      frag.appendChild(tile);
    }

    grid.innerHTML = "";
    grid.appendChild(frag);

    // Wait for gallery images to be ready before we consider the
    // page "fully loaded". Prevents flicker on some mobile GPUs.
    try {
      await Promise.race([
        Promise.all(imgPromises),
        new Promise((resolve) => setTimeout(resolve, 8000)), // safety cap
      ]);
    } catch {
      // ignore
    }

    // Re-run reveals after dynamic content.
    setupReveals();

    return { itemsCount: items.length };
  }

  /* Lightbox */
  function setupLightbox() {
    const box = $("#lightbox");
    const img = $("#lightboxImg");
    const cap = $("#lightboxCap");
    const closeBtn = $("#lightboxClose");
    const prevBtn = $("#lightboxPrev");
    const nextBtn = $("#lightboxNext");

    if (!box || !img || !cap || !closeBtn || !prevBtn || !nextBtn) return;

    const close = () => {
      runtime.lightbox.open = false;
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const render = () => {
      const it = runtime.lightbox.items[runtime.lightbox.index];
      if (!it) return;
      img.onerror = null;
      img.src = it.src;
      img.alt = it.caption;
      cap.textContent = it.caption;

      img.onerror = () => {
        if (img.src !== it.fallback) img.src = it.fallback;
      };
    };

    const step = (dir) => {
      const n = runtime.lightbox.items.length;
      runtime.lightbox.index = (runtime.lightbox.index + dir + n) % n;
      render();
    };

    window.openLightbox = (index) => {
      runtime.lightbox.open = true;
      runtime.lightbox.index = index;
      render();
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus?.();
    };

    window.openLightbox = window.openLightbox;

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));

    box.addEventListener("click", (e) => {
      // Only clicks on the backdrop (not buttons/figure) should close.
      if (e.target === box) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!runtime.lightbox.open) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    // Expose close for other handlers.
    window.__youshaCloseLightbox = close;
  }

  function openLightbox(index) {
    // setupLightbox defines window.openLightbox
    if (typeof window.openLightbox === "function") window.openLightbox(index);
  }

  /* Controls */
  function setupControls() {
    const fxBtn = $("#fxBtn");
    const motionBtn = $("#motionBtn");

    fxBtn?.addEventListener("click", () => {
      prefs.fxHigh = !prefs.fxHigh;
      savePrefs();
      applyPrefs();
    });

    motionBtn?.addEventListener("click", () => {
      prefs.motionReduced = !prefs.motionReduced;
      savePrefs();
      applyPrefs();
    });

    prefersReducedMotion?.addEventListener?.("change", () => {
      applyPrefs();
      setupReveals();
    });
  }

  /* Hook up hero */
  function setupHero() {
    const portrait = $("#portraitBtn");
    const fx = $("#heroFx");
    if (!portrait) return;

    portrait.addEventListener("click", () => {
      burstFromElement(portrait, { emoji: "✨" });
    });

    if (canHover && fx) {
      const baseOpacity = () => {
        const v = getComputedStyle(document.body).getPropertyValue("--fx-opacity").trim();
        const n = Number.parseFloat(v || "1");
        return Number.isFinite(n) ? n : 1;
      };

      document.addEventListener(
        "pointermove",
        (e) => {
          if (effectiveMotionReduced()) return;

          const r = portrait.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const max = Math.max(r.width, r.height) * 0.9;
          const t = Math.max(0, Math.min(1, 1 - dist / max));

          fx.style.opacity = String(baseOpacity() * (0.55 + t * 0.65));
        },
        { passive: true }
      );

      portrait.addEventListener("pointerleave", () => {
        fx.style.opacity = "";
      });
    }
    
    // Hero text cursor sparkle trail
    setupHeroTextTrail();
  }
  
  /* Hero text sparkle trail */
  function setupHeroTextTrail() {
    const heroCopy = $("#heroCopy");
    if (!heroCopy || !canHover) return;
    
    let lastSparkle = 0;
    const sparkleInterval = 50; // ms between sparkles
    
    const SPARKLE_CHARS = ["✨", "⭐", "💫", "✷", "✦"];
    
    function createSparkle(x, y) {
      if (effectiveMotionReduced()) return;
      
      const sparkle = document.createElement("span");
      sparkle.className = "hero-sparkle";
      sparkle.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      
      document.body.appendChild(sparkle);
      
      // Random drift direction
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 20; // bias upward
      const scale = 0.5 + Math.random() * 0.5;
      const duration = 600 + Math.random() * 400;
      
      sparkle.animate([
        { transform: `translate(-50%, -50%) scale(0)`, opacity: 0 },
        { transform: `translate(-50%, -50%) scale(${scale})`, opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale * 0.5})`, opacity: 0 }
      ], {
        duration: duration,
        easing: "ease-out",
        fill: "forwards"
      }).onfinish = () => sparkle.remove();
    }
    
    heroCopy.addEventListener("pointermove", (e) => {
      if (effectiveMotionReduced()) return;
      
      const now = performance.now();
      if (now - lastSparkle < sparkleInterval) return;
      lastSparkle = now;
      
      createSparkle(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* Play zone */
  function setupPlayZone() {
    const rainBtn = $("#rainBtn");
    rainBtn?.addEventListener("click", () => {
      if (runtime.rain.on) {
        stopEmojiRain();
      } else {
        burstFromElement(rainBtn, { emoji: "🎉", count: 14, spread: 80 });
        startEmojiRain();
        // Auto-stop after a short while (mobile-friendly)
        window.setTimeout(() => {
          if (runtime.rain.on) stopEmojiRain();
        }, 5200);
      }
    });
  }

  /* Background music */
  function setupMusic() {
    const audio = $("#bgMusic");
    const toggle = $("#musicToggle");
    const volume = $("#musicVolume");
    const status = $("#musicStatus");

    if (!audio || !toggle || !volume) return;

    const MUSIC_KEY = "youshaweb:music:v1";

    let wantsOn = false;
    let isPlaying = false;

    // Defaults (soft)
    let vol = 0.22;

    try {
      const raw = localStorage.getItem(MUSIC_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.on === "boolean") wantsOn = parsed.on;
        if (typeof parsed?.volume === "number") vol = parsed.volume;
      }
    } catch {
      // ignore
    }

    function clamp01(n) {
      return Math.max(0, Math.min(1, n));
    }

    audio.volume = clamp01(vol);
    volume.value = String(Math.round(audio.volume * 100));

    function save() {
      try {
        localStorage.setItem(MUSIC_KEY, JSON.stringify({ on: wantsOn, volume: audio.volume }));
      } catch {
        // ignore
      }
    }

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function updateUi() {
      toggle.setAttribute("aria-pressed", String(isPlaying));

      const icon = toggle.querySelector(".musicBar__icon");
      const text = toggle.querySelector(".musicBar__text");

      if (isPlaying) {
        if (icon) icon.textContent = "⏸";
        if (text) text.textContent = "Pause";
        setStatus("Now playing");
      } else {
        if (icon) icon.textContent = "▶";
        if (text) text.textContent = "Play";
        setStatus(wantsOn ? "Tap to resume" : "Tap play for music");
      }
    }

    async function tryPlay() {
      try {
        await audio.play();
        isPlaying = true;
        wantsOn = true;
        save();
      } catch {
        isPlaying = false;
        wantsOn = false;
        save();
      }
      updateUi();
    }

    toggle.addEventListener("click", async () => {
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        wantsOn = false;
        save();
        updateUi();
      } else {
        await tryPlay();
      }
    });

    volume.addEventListener(
      "input",
      () => {
        audio.volume = clamp01(Number(volume.value) / 100);
        save();
      },
      { passive: true }
    );

    // If user previously enabled music, start after first user gesture.
    if (wantsOn) {
      setStatus("Tap anywhere to start music");
      window.addEventListener(
        "pointerdown",
        () => {
          tryPlay();
        },
        { once: true, capture: true, passive: true }
      );
    }

    updateUi();
  }

  /* Contact form (removed in markup, keep no-op for safety) */
  function setupContact() {
    // no form anymore
  }

  /* Boot */
  async function init() {
    loadPrefs();
    applyPrefs();

    setupMenu();
    setupControls();

    setupLightbox();
    const galleryResult = await buildGallery();

    setupHero();
    setupPlayZone();
    setupTrail();

    setupReveals();
    setupTypewriter();
    setupContact();
    setupMusic();

    // Prefer to hide the loader only after the gallery has had a
    // chance to load its images, so the first scroll into the
    // gallery feels stable (especially on mobile like Honor 200).
    if (galleryResult && galleryResult.itemsCount > 0) {
      hideLoader();
    } else {
      // Fallback: hide loader on window load or after a short timeout.
      window.addEventListener("load", hideLoader, { once: true });
      window.setTimeout(hideLoader, 2000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
