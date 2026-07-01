/* ============================================================
   SAVIORS COMMAND STRUCTURE — APP LOGIC
   ============================================================ */

(function () {
  "use strict";

  // ---------- ICONS (inline SVG, stroke-based, themed per spec) ----------
  const ICONS = {
    Medic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>`,
    Engineer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    Scavenger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
    Survivalist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 14h6l-1 8 10-12h-6l0-8z"/></svg>`
  };

  const PERSON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>`;

  const SPEC_COLOR = {
    Medic: "var(--spec-medic, #e0566e)",
    Engineer: "#d4a52a",
    Scavenger: "#8fae4a",
    Survivalist: "#4ab0a0"
  };

  const RANK_CLASS = {
    Warlord: "rank-warlord",
    "Right Hand": "rank-righthand",
    Enforcer: "rank-enforcer",
    Youngblood: "rank-youngblood"
  };

  const RANK_COLOR_VAR = {
    Warlord: "#8a1818",
    "Right Hand": "#D4722A",
    Enforcer: "#4A7A9E",
    Youngblood: "#5C9E4A"
  };

  // ---------- Seeded pseudo-random for stable "fake" extra data ----------
  function seedFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function pick(arr, seed) {
    return arr[seed % arr.length];
  }

  const BIOS = [
    "Recruited during the second winter. Keeps to protocol, trusted on every supply run.",
    "Survived the Riverside collapse alone for three weeks before joining the faction.",
    "Quiet but reliable. Volunteers for the dangerous perimeter shifts without being asked.",
    "Former mechanic before the outbreak. Skills repurposed for the survival of the camp.",
    "Joined after the Warlord's unit cleared their settlement. Loyal ever since.",
    "Known for sharp instincts in the field and a short list of words wasted on small talk.",
    "Carries more scars than stories told. Most of the camp respects the silence.",
    "Was the last of their original group. Found a new one here.",
    "Trained the newer Youngbloods personally during the last outbreak season.",
    "Keeps a logbook of every run. Says memory fails faster than supplies do."
  ];

  function bioFor(code) {
    return pick(BIOS, seedFromString(code));
  }

  function dateJoinedFor(code) {
    const seed = seedFromString(code);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = 2027 + (seed % 4) * 0 + (seed % 3); // 2027-2029 range, faction's in-universe timeline
    const month = months[seed % 12];
    const day = (seed % 27) + 1;
    return `${day} ${month} ${2025 + (seed % 3)}`;
  }

  function clearanceFor(rank) {
    const map = { Warlord: 5, "Right Hand": 4, Enforcer: 3, Youngblood: 1 };
    return map[rank] || 1;
  }

  function onlineFor(code) {
    return seedFromString(code) % 5 !== 0; // ~80% online
  }

  // ---------- Build hierarchy from flat MEMBERS array ----------
  const warlord = MEMBERS.find((m) => m.pangkat === "Warlord");
  const rightHand = MEMBERS.filter((m) => m.pangkat === "Right Hand");
  const enforcer = MEMBERS.filter((m) => m.pangkat === "Enforcer");
  const youngblood = MEMBERS.filter((m) => m.pangkat === "Youngblood");

  // ---------- State ----------
  const state = {
    expanded: { righthand: true, enforcer: false, youngblood: false },
    filter: "ALL",
    query: "",
    zoom: 0.85,
    panX: 40,
    panY: 20
  };

  // ---------- DOM refs ----------
  const root = document.getElementById("cmd-root");
  const canvasWrap = document.getElementById("cmd-canvas-wrap");
  const canvas = document.getElementById("cmd-canvas");
  const searchInput = document.getElementById("cmd-search-input");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const overlay = document.getElementById("dossier-overlay");
  const statTotal = document.getElementById("stat-total");
  const statWarlord = document.getElementById("stat-warlord");
  const statRH = document.getElementById("stat-rh");
  const statEnf = document.getElementById("stat-enf");
  const statYB = document.getElementById("stat-yb");

  // fill top stats once
  statTotal.textContent = MEMBERS.length;
  statWarlord.textContent = 1;
  statRH.textContent = rightHand.length;
  statEnf.textContent = enforcer.length;
  statYB.textContent = youngblood.length;

  // spec counts
  (function fillSpecStats() {
    const counts = { Medic: 0, Engineer: 0, Scavenger: 0, Survivalist: 0 };
    MEMBERS.forEach((m) => counts[m.spesialisasi]++);
    const wrap = document.getElementById("cmd-spec-stats");
    wrap.innerHTML = Object.keys(counts)
      .map(
        (k) => `<div class="spec-stat"><span class="dot" style="background:${SPEC_COLOR[k]}"></span>${k} <b>${counts[k]}</b></div>`
      )
      .join("");
  })();

  // ---------- helpers for filtering/search ----------
  function matchesFilter(m) {
    if (state.filter !== "ALL" && m.spesialisasi.toUpperCase() !== state.filter) return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      return m.nama.toLowerCase().includes(q) || m.code.toLowerCase().includes(q);
    }
    return true;
  }

  function isSearching() {
    return state.query.trim().length > 0;
  }

  // ---------- Node card builder ----------
  function nodeCard(m) {
    if (!matchesFilter(m)) return "";
    const rankClass = RANK_CLASS[m.pangkat];
    const online = onlineFor(m.code);
    const icon = ICONS[m.spesialisasi] || PERSON_ICON;
    const specColor = SPEC_COLOR[m.spesialisasi];
    return `
      <div class="node-card ${rankClass}" data-code="${m.code}" tabindex="0" role="button" aria-label="${m.nama}, ${m.pangkat}">
        <div class="node-avatar" style="color:${specColor}">
          ${icon}
          <span class="status-dot ${online ? "" : "offline"}"></span>
        </div>
        <div class="node-name">${m.nama}</div>
        <div class="node-rank">${m.pangkat}</div>
        <div class="spec-badge" style="color:${specColor}">${icon}${m.spesialisasi}</div>
      </div>
    `;
  }

  function divisionNode(key, label, members, extraClass) {
    const isExpanded = state.expanded[key];
    const countLabel = `${members.length} personnel`;
    return `
      <div class="division-node ${extraClass}" data-division="${key}" style="color:${RANK_COLOR_VAR[label === "RIGHT HAND DIVISION" ? "Right Hand" : label === "ENFORCER DIVISION" ? "Enforcer" : "Youngblood"]}" tabindex="0" role="button">
        <div class="div-title">${label}</div>
        <div class="div-count">${countLabel}</div>
        <div class="div-toggle">${isExpanded ? "▲ Collapse" : "▼ Expand"}</div>
      </div>
    `;
  }

  // ---------- Tree renderer ----------
  function renderTree() {
    const forceExpandAll = isSearching() || state.filter !== "ALL";

    const rhExpanded = forceExpandAll || state.expanded.righthand;
    const enfExpanded = forceExpandAll || state.expanded.enforcer;
    const ybExpanded = forceExpandAll || state.expanded.youngblood;

    const warlordVisible = matchesFilter(warlord);
    const rhVisible = rightHand.filter(matchesFilter);
    const enfVisible = enforcer.filter(matchesFilter);
    const ybVisible = youngblood.filter(matchesFilter);

    const totalVisible = (warlordVisible ? 1 : 0) + rhVisible.length + enfVisible.length + ybVisible.length;

    if (totalVisible === 0) {
      canvas.innerHTML = `<div class="empty-state">No personnel match "${state.query}". Try a different name or member code.</div>`;
      return;
    }

    let html = `<div class="tree-col">`;

    // Warlord tier
    if (warlordVisible) {
      html += `<div class="tier-row">
        <div class="tier-label">Warlord</div>
        <div class="branch-wrap">${nodeCard(warlord)}</div>
      </div>`;
    }

    // Right Hand tier
    if (rhVisible.length > 0) {
      html += `<div class="tier-row">
        <div class="tier-label">Right Hand Division</div>
        <div class="branch-wrap">`;
      if (rhExpanded) {
        html += rhVisible.map(nodeCard).join("");
      } else {
        html += divisionNode("righthand", "RIGHT HAND DIVISION", rightHand, "div-righthand");
      }
      html += `</div></div>`;
    }

    // Enforcer tier
    if (enfVisible.length > 0) {
      html += `<div class="tier-row">
        <div class="tier-label">Enforcer Division</div>
        <div class="branch-wrap" style="max-width:1100px; flex-wrap:wrap;">`;
      if (enfExpanded) {
        html += enfVisible.map(nodeCard).join("");
      } else {
        html += divisionNode("enforcer", "ENFORCER DIVISION", enforcer, "div-enforcer");
      }
      html += `</div></div>`;
    }

    // Youngblood tier
    if (ybVisible.length > 0) {
      html += `<div class="tier-row" style="padding-bottom:8px;">
        <div class="tier-label">Youngblood Division</div>
        <div class="branch-wrap" style="max-width:1100px; flex-wrap:wrap;">`;
      if (ybExpanded) {
        html += ybVisible.map(nodeCard).join("");
      } else {
        html += divisionNode("youngblood", "YOUNGBLOOD DIVISION", youngblood, "div-youngblood");
      }
      html += `</div></div>`;
    }

    html += `</div>`;

    canvas.innerHTML = html;
    attachNodeListeners();
    applyTransform();
  }

  function attachNodeListeners() {
    canvas.querySelectorAll(".node-card").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (didDrag) return;
        const code = el.getAttribute("data-code");
        const member = MEMBERS.find((m) => m.code === code);
        if (member) openDossier(member);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const code = el.getAttribute("data-code");
          const member = MEMBERS.find((m) => m.code === code);
          if (member) openDossier(member);
        }
      });
    });

    canvas.querySelectorAll(".division-node").forEach((el) => {
      el.addEventListener("click", () => {
        if (didDrag) return;
        const key = el.getAttribute("data-division");
        state.expanded[key] = !state.expanded[key];
        renderTree();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const key = el.getAttribute("data-division");
          state.expanded[key] = !state.expanded[key];
          renderTree();
        }
      });
    });
  }

  // ---------- Pan & Zoom ----------
  function applyTransform() {
    canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }

  let isPanning = false;
  let didDrag = false;
  let startX = 0,
    startY = 0,
    startPanX = 0,
    startPanY = 0;

  canvasWrap.addEventListener("mousedown", (e) => {
    isPanning = true;
    didDrag = false;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvasWrap.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
    canvasWrap.classList.remove("dragging");
  });

  canvasWrap.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newZoom = Math.min(1.6, Math.max(0.3, state.zoom + delta));
      state.zoom = newZoom;
      applyTransform();
    },
    { passive: false }
  );

  // touch support
  let lastTouchDist = null;
  let lastTouchMid = null;

  canvasWrap.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        isPanning = true;
        didDrag = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startPanX = state.panX;
        startPanY = state.panY;
      } else if (e.touches.length === 2) {
        isPanning = false;
        lastTouchDist = touchDist(e.touches);
      }
    },
    { passive: true }
  );

  canvasWrap.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
        state.panX = startPanX + dx;
        state.panY = startPanY + dy;
        applyTransform();
      } else if (e.touches.length === 2) {
        const dist = touchDist(e.touches);
        if (lastTouchDist) {
          const delta = (dist - lastTouchDist) * 0.003;
          state.zoom = Math.min(1.6, Math.max(0.3, state.zoom + delta));
          applyTransform();
        }
        lastTouchDist = dist;
      }
    },
    { passive: true }
  );

  canvasWrap.addEventListener("touchend", () => {
    isPanning = false;
    lastTouchDist = null;
  });

  function touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  document.getElementById("zoom-in").addEventListener("click", () => {
    state.zoom = Math.min(1.6, state.zoom + 0.15);
    applyTransform();
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    state.zoom = Math.max(0.3, state.zoom - 0.15);
    applyTransform();
  });
  document.getElementById("zoom-reset").addEventListener("click", () => {
    setInitialView();
  });

  // ---------- Search & filters ----------
  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderTree();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.getAttribute("data-filter");
      renderTree();
    });
  });

  // ---------- Dossier modal ----------
  function openDossier(m) {
    const rankColor = RANK_COLOR_VAR[m.pangkat];
    const specColor = SPEC_COLOR[m.spesialisasi];
    const icon = ICONS[m.spesialisasi] || PERSON_ICON;
    const online = onlineFor(m.code);
    const clearance = clearanceFor(m.pangkat);

    const clearanceBars = Array.from({ length: 5 })
      .map((_, i) => `<div class="clearance-bar ${i < clearance ? "filled" : ""}"></div>`)
      .join("");

    overlay.innerHTML = `
      <div class="dossier-modal" role="dialog" aria-modal="true" aria-label="Personnel dossier: ${m.nama}">
        <div class="scanline"></div>
        <div class="dossier-head">
          <span>PERSONNEL DOSSIER // ${m.code}</span>
          <button class="dossier-close" aria-label="Close">&times;</button>
        </div>
        <div class="dossier-body">
          <div class="dossier-portrait-row">
            <div class="dossier-avatar" style="color:${specColor}; box-shadow:0 0 0 2px ${rankColor}55;">
              ${icon}
              <span class="status-dot ${online ? "" : "offline"}" style="width:13px;height:13px;"></span>
            </div>
            <div>
              <div class="dossier-name">${m.nama}</div>
              <div class="dossier-code">CODE: ${m.code}</div>
              <div class="dossier-rank-tag" style="color:${rankColor};">${m.pangkat}</div>
            </div>
          </div>

          <div class="dossier-grid">
            <div class="dossier-field">
              <div class="dossier-field-label">Specialization</div>
              <div class="dossier-field-value" style="color:${specColor}">${m.spesialisasi}</div>
            </div>
            <div class="dossier-field">
              <div class="dossier-field-label">Current Status</div>
              <div class="dossier-field-value">${online ? "Active — In Field" : "Offline — Last Seen Camp"}</div>
            </div>
            <div class="dossier-field">
              <div class="dossier-field-label">Date Joined</div>
              <div class="dossier-field-value">${dateJoinedFor(m.code)}</div>
            </div>
            <div class="dossier-field">
              <div class="dossier-field-label">Rank</div>
              <div class="dossier-field-value" style="color:${rankColor}">${m.pangkat}</div>
            </div>
          </div>

          <div class="dossier-bio-label">Biography</div>
          <div class="dossier-bio">${bioFor(m.code)}</div>

          <div class="dossier-clearance">
            <div class="dossier-field-label" style="margin-bottom:0;">Clearance Level</div>
            <div class="clearance-bars">${clearanceBars}</div>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");
    overlay.querySelector(".dossier-close").addEventListener("click", closeDossier);
    document.addEventListener("keydown", escCloseHandler);
  }

  function closeDossier() {
    overlay.classList.remove("open");
    document.removeEventListener("keydown", escCloseHandler);
  }

  function escCloseHandler(e) {
    if (e.key === "Escape") closeDossier();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDossier();
  });

  // ---------- init ----------
  function setInitialView() {
    const wrapWidth = canvasWrap.clientWidth;
    const cardHalfWidth = 84; // node-card is 168px wide, this is its unscaled half-width
    if (wrapWidth < 500) {
      state.zoom = 0.62;
    } else {
      state.zoom = 0.85;
    }
    // canvas .tree-col centers children via align-items:center, so the warlord
    // card's horizontal center sits at canvas-content-width/2. We don't know
    // that width before layout, so center using the wrap's own width instead:
    // place canvas left edge so its content midline lands at wrap's midline.
    requestAnimationFrame(() => {
      const contentWidth = canvas.scrollWidth || cardHalfWidth * 2;
      state.panX = wrapWidth / 2 - (contentWidth * state.zoom) / 2;
      state.panY = 20;
      applyTransform();
    });
  }

  renderTree();
  setInitialView();
})();
