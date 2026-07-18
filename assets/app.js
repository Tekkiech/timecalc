// ---------- constants ----------
const TOTAL_HOURS = 168;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RING_CIRCUMFERENCE = 2 * Math.PI * 96;
const PALETTE = ["cat-0", "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6"];
const STORAGE_KEY = "timecalc:v1";
const DEFAULT_SETTINGS = { studyBlockHours: 2, shiftBlockHours: 8, chartType: "bar" };

// ---------- state ----------
// each category: { id, name, colorVar, weekly, daily: [7 numbers], custom: bool }
function defaultCategoriesFactory() {
  return [
    mkCategory("sleep", "Sleep", "cat-0", 56),
    mkCategory("school", "School", "cat-1", 0),
    mkCategory("work", "Work", "cat-2", 0),
    mkCategory("church", "Church", "cat-3", 0),
    mkCategory("commute", "Commute", "cat-4", 0),
  ];
}

let categories = defaultCategoriesFactory();
let settings = { ...DEFAULT_SETTINGS };
let copyOverrides = {};
let mode = "quick"; // 'quick' | 'detailed'
let editMode = false;
let paletteIndex = PALETTE.length;
const ORIGINAL_COPY = {};

function mkCategory(id, name, colorVar, weekly, custom = false, daily = null) {
  return {
    id,
    name,
    colorVar,
    weekly,
    daily: Array.isArray(daily) && daily.length === 7 ? daily : splitEvenly(weekly),
    custom,
  };
}

function splitEvenly(weekly) {
  const per = weekly / 7;
  return new Array(7).fill(per);
}

// ---------- persistence ----------
function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          colorVar: c.colorVar,
          weekly: c.weekly,
          daily: c.daily,
          custom: c.custom,
        })),
        mode,
        settings,
        copyOverrides,
      })
    );
  } catch (e) {
    /* storage unavailable or full — silently skip persistence */
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ---------- dom refs ----------
const quickGrid = document.getElementById("quick-grid");
const detailedBody = document.getElementById("detailed-body");
const detailedHeadRow = document.querySelector(".detailed-table thead tr");
const detailedWrap = document.getElementById("detailed-wrap");
const rowTemplate = document.getElementById("category-row-template");
const ringFill = document.getElementById("ring-fill");
const freeHoursNum = document.getElementById("free-hours-num");
const statAllocated = document.getElementById("stat-allocated");
const statPerDay = document.getElementById("stat-perday");
const statStudy = document.getElementById("stat-study");
const statShifts = document.getElementById("stat-shifts");
const statStudyLabel = document.getElementById("stat-study-label");
const statShiftsLabel = document.getElementById("stat-shifts-label");
const warningEl = document.getElementById("results-warning");
const daybarsEl = document.getElementById("daybars");
const editToggleBtn = document.getElementById("edit-toggle");
const editPanel = document.getElementById("edit-panel");
const studyBlockInput = document.getElementById("study-block-input");
const shiftBlockInput = document.getElementById("shift-block-input");
const resetBtn = document.getElementById("reset-defaults");

// ---------- day header (detailed mode) ----------
DAYS.forEach((d) => {
  const th = document.createElement("th");
  th.scope = "col";
  th.textContent = d;
  detailedHeadRow.appendChild(th);
});
const totalTh = document.createElement("th");
totalTh.scope = "col";
totalTh.textContent = "Total";
detailedHeadRow.appendChild(totalTh);
const removeTh = document.createElement("th");
removeTh.scope = "col";
removeTh.textContent = "";
detailedHeadRow.appendChild(removeTh);

// ---------- drag & drop reorder ----------
function wireDragAndDrop(items, getId) {
  items.forEach((item) => {
    const handle = item.querySelector("[data-drag-handle]");
    if (handle) {
      handle.draggable = true;
      handle.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", getId(item));
        e.dataTransfer.effectAllowed = "move";
      });
    }
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("is-drag-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("is-drag-over"));
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("is-drag-over");
      const draggedId = e.dataTransfer.getData("text/plain");
      const targetId = getId(item);
      if (draggedId && draggedId !== targetId) reorderCategories(draggedId, targetId);
    });
  });
}

function reorderCategories(draggedId, targetId) {
  const fromIdx = categories.findIndex((c) => c.id === draggedId);
  const toIdx = categories.findIndex((c) => c.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = categories.splice(fromIdx, 1);
  categories.splice(toIdx, 0, moved);
  renderQuickGrid();
  renderDetailedTable();
  recalc();
  saveState();
}

// ---------- color popover ----------
let activePopover = null;
function closeActivePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

function openColorPopover(anchor, cat, onPick) {
  closeActivePopover();
  const rect = anchor.getBoundingClientRect();
  const pop = document.createElement("div");
  pop.className = "color-popover";
  pop.style.top = `${rect.bottom + window.scrollY + 6}px`;
  pop.style.left = `${rect.left + window.scrollX}px`;

  PALETTE.forEach((colorVar) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "color-popover__swatch" + (colorVar === cat.colorVar ? " is-selected" : "");
    b.style.background = `var(--${colorVar})`;
    b.setAttribute("aria-label", "Set color " + colorVar);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onPick(colorVar);
      closeActivePopover();
    });
    pop.appendChild(b);
  });

  document.body.appendChild(pop);
  activePopover = pop;
  setTimeout(() => {
    document.addEventListener("click", closeActivePopover, { once: true });
  }, 0);
}

// ---------- rendering ----------
function renderQuickGrid() {
  quickGrid.innerHTML = "";
  categories.forEach((cat) => {
    const node = rowTemplate.content.cloneNode(true);
    const card = node.querySelector(".category-card");
    card.dataset.id = cat.id;
    if (cat.custom) card.classList.add("is-custom");

    const swatchBtn = node.querySelector(".category-card__swatch");
    swatchBtn.style.background = `var(--${cat.colorVar})`;
    swatchBtn.addEventListener("click", (e) => {
      if (!editMode) return;
      e.stopPropagation();
      openColorPopover(swatchBtn, cat, (newColor) => {
        cat.colorVar = newColor;
        swatchBtn.style.background = `var(--${newColor})`;
        saveState();
      });
    });

    const nameInput = node.querySelector(".category-card__name");
    nameInput.value = cat.name;
    nameInput.readOnly = !editMode;
    nameInput.addEventListener("input", () => {
      cat.name = nameInput.value;
      saveState();
    });

    const input = node.querySelector(".category-card__input");
    input.value = round1(cat.weekly);
    input.addEventListener("input", () => {
      const val = clamp(parseFloat(input.value) || 0, 0, 168);
      cat.weekly = val;
      cat.daily = splitEvenly(val);
      recalc();
      saveState();
    });

    node.querySelector(".category-card__remove").addEventListener("click", () => {
      removeCategory(cat.id);
    });

    quickGrid.appendChild(node);
  });

  wireDragAndDrop(Array.from(quickGrid.querySelectorAll(".category-card")), (el) => el.dataset.id);
}

function renderDetailedTable() {
  detailedBody.innerHTML = "";
  categories.forEach((cat) => {
    const tr = document.createElement("tr");
    tr.dataset.id = cat.id;
    if (cat.custom) tr.classList.add("is-custom");

    const dragTd = document.createElement("td");
    dragTd.className = "detailed-table__drag";
    const dragBtn = document.createElement("button");
    dragBtn.type = "button";
    dragBtn.className = "detailed-table__drag-btn";
    dragBtn.setAttribute("aria-label", "Drag to reorder");
    dragBtn.setAttribute("data-drag-handle", "");
    dragBtn.textContent = "⠿";
    dragTd.appendChild(dragBtn);
    tr.appendChild(dragTd);

    const catTd = document.createElement("td");
    catTd.className = "detailed-table__cat";
    const catCell = document.createElement("div");
    catCell.className = "detailed-table__cat-cell";

    const swatchBtn = document.createElement("button");
    swatchBtn.type = "button";
    swatchBtn.className = "detailed-table__swatch-btn";
    swatchBtn.setAttribute("aria-label", "Change color");
    swatchBtn.style.background = `var(--${cat.colorVar})`;
    swatchBtn.addEventListener("click", (e) => {
      if (!editMode) return;
      e.stopPropagation();
      openColorPopover(swatchBtn, cat, (newColor) => {
        cat.colorVar = newColor;
        swatchBtn.style.background = `var(--${newColor})`;
        saveState();
      });
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "detailed-table__name-input";
    nameInput.value = cat.name;
    nameInput.readOnly = !editMode;
    nameInput.setAttribute("aria-label", "Category name");
    nameInput.addEventListener("input", () => {
      cat.name = nameInput.value;
      saveState();
    });

    catCell.appendChild(swatchBtn);
    catCell.appendChild(nameInput);
    catTd.appendChild(catCell);
    tr.appendChild(catTd);

    const totalTd = document.createElement("td");
    totalTd.className = "detailed-table__row-total";
    totalTd.textContent = round1(cat.weekly);

    cat.daily.forEach((val, dayIdx) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "24";
      input.step = "0.5";
      input.inputMode = "decimal";
      input.value = round1(val);
      input.addEventListener("input", () => {
        const v = clamp(parseFloat(input.value) || 0, 0, 24);
        cat.daily[dayIdx] = v;
        cat.weekly = cat.daily.reduce((a, b) => a + b, 0);
        totalTd.textContent = round1(cat.weekly);
        recalc();
        saveState();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    tr.appendChild(totalTd);

    const removeTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.className = "detailed-table__remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove category");
    removeBtn.addEventListener("click", () => removeCategory(cat.id));
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);

    detailedBody.appendChild(tr);
  });

  wireDragAndDrop(Array.from(detailedBody.querySelectorAll("tr")), (el) => el.dataset.id);
}

// ---------- day chart (bar / pie / pictogram) ----------
function renderDayChart(freePerDay) {
  daybarsEl.className = "daybars reveal chart--" + settings.chartType;
  daybarsEl.innerHTML = "";
  if (settings.chartType === "pie") renderDayPie(freePerDay);
  else if (settings.chartType === "pictogram") renderDayPictogram(freePerDay);
  else renderDayBars(freePerDay);
}

function renderDayBars(freePerDay) {
  freePerDay.forEach((val, i) => {
    const bar = document.createElement("div");
    bar.className = "daybar";

    const value = document.createElement("span");
    value.className = "daybar__value";
    value.textContent = round1(val) + "h";

    const track = document.createElement("div");
    track.className = "daybar__track";
    const fill = document.createElement("div");
    fill.className = "daybar__fill";
    track.appendChild(fill);

    const label = document.createElement("span");
    label.className = "daybar__label";
    label.textContent = DAYS[i];

    bar.appendChild(value);
    bar.appendChild(track);
    bar.appendChild(label);
    daybarsEl.appendChild(bar);

    const pct = clamp((val / 24) * 100, 0, 100);
    if (window.gsap) {
      gsap.to(fill, { height: pct + "%", duration: 0.6, ease: "power2.out" });
    } else {
      fill.style.height = pct + "%";
    }
  });
}

function renderDayPie(freePerDay) {
  const totalFree = freePerDay.reduce((sum, v) => sum + Math.max(v, 0), 0);

  const wrap = document.createElement("div");
  wrap.className = "piechart";

  const disc = document.createElement("div");
  disc.className = "piechart__disc";

  if (totalFree > 0) {
    let cumulative = 0;
    const stops = freePerDay.map((val, i) => {
      const v = Math.max(val, 0);
      const startPct = (cumulative / totalFree) * 100;
      cumulative += v;
      const endPct = (cumulative / totalFree) * 100;
      return `var(--${PALETTE[i % PALETTE.length]}) ${startPct}% ${endPct}%`;
    });
    disc.style.background = `conic-gradient(${stops.join(", ")})`;
  } else {
    disc.style.background = "var(--bg-elev-2)";
  }

  const legend = document.createElement("div");
  legend.className = "piechart__legend";
  DAYS.forEach((d, i) => {
    const item = document.createElement("div");
    item.className = "piechart__item";
    const sw = document.createElement("span");
    sw.className = "piechart__swatch";
    sw.style.background = `var(--${PALETTE[i % PALETTE.length]})`;
    const text = document.createElement("span");
    text.innerHTML = `${d} — <strong>${round1(freePerDay[i])}h</strong>`;
    item.appendChild(sw);
    item.appendChild(text);
    legend.appendChild(item);
  });

  wrap.appendChild(disc);
  wrap.appendChild(legend);
  daybarsEl.appendChild(wrap);
}

function renderDayPictogram(freePerDay) {
  const wrap = document.createElement("div");
  wrap.className = "pictogram";

  const note = document.createElement("p");
  note.className = "edit-panel__hint";
  note.style.margin = "0 0 0.25rem";
  note.textContent = "Each square ≈ 2 free hours";
  wrap.appendChild(note);

  DAYS.forEach((d, i) => {
    const val = freePerDay[i];
    const filled = clamp(Math.round(clamp(val, 0, 24) / 2), 0, 12);

    const row = document.createElement("div");
    row.className = "pictogram__row";

    const label = document.createElement("span");
    label.className = "pictogram__label";
    label.textContent = d;

    const cells = document.createElement("div");
    cells.className = "pictogram__cells";
    for (let c = 0; c < 12; c++) {
      const cell = document.createElement("span");
      cell.className = "pictogram__cell" + (c < filled ? " is-filled" : "");
      cells.appendChild(cell);
    }

    const value = document.createElement("span");
    value.className = "pictogram__value";
    value.textContent = round1(val) + "h";

    row.appendChild(label);
    row.appendChild(cells);
    row.appendChild(value);
    wrap.appendChild(row);
  });

  daybarsEl.appendChild(wrap);
}

// ---------- category management ----------
function removeCategory(id) {
  categories = categories.filter((c) => c.id !== id);
  renderQuickGrid();
  renderDetailedTable();
  recalc();
  saveState();
}

function addCategory() {
  const name = prompt("Category name (e.g. Gym, Volunteering)");
  if (!name || !name.trim()) return;
  const colorVar = PALETTE[paletteIndex % PALETTE.length];
  paletteIndex++;
  const id = "custom-" + Date.now();
  categories.push(mkCategory(id, name.trim(), colorVar, 0, true));
  renderQuickGrid();
  renderDetailedTable();
  recalc();
  saveState();
}

document.getElementById("add-category-quick").addEventListener("click", addCategory);
document.getElementById("add-category-detailed").addEventListener("click", addCategory);

// ---------- mode toggle ----------
function setModeUI() {
  document.querySelectorAll(".mode-toggle__btn").forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (mode === "detailed") {
    quickGrid.style.display = "none";
    document.getElementById("add-category-quick").style.display = "none";
    detailedWrap.hidden = false;
    renderDetailedTable();
  } else {
    quickGrid.style.display = "";
    document.getElementById("add-category-quick").style.display = "";
    detailedWrap.hidden = true;
    renderQuickGrid();
  }
}

document.querySelectorAll(".mode-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const newMode = btn.dataset.mode;
    if (newMode === mode) return;
    mode = newMode;
    setModeUI();
    saveState();
  });
});

// ---------- chart type toggle ----------
document.querySelectorAll(".chart-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    settings.chartType = btn.dataset.chart;
    document.querySelectorAll(".chart-toggle__btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    recalc();
    saveState();
  });
});

// ---------- edit mode ----------
function setEditMode(on) {
  editMode = on;
  document.body.classList.toggle("edit-mode", editMode);
  editToggleBtn.classList.toggle("is-active", editMode);
  editToggleBtn.setAttribute("aria-pressed", editMode ? "true" : "false");
  editPanel.hidden = !editMode;
  document.querySelectorAll("[data-copy-key]").forEach((el) => {
    el.contentEditable = editMode ? "true" : "false";
  });
  document.querySelectorAll(".category-card__name, .detailed-table__name-input").forEach((el) => {
    el.readOnly = !editMode;
  });
  closeActivePopover();
}

editToggleBtn.addEventListener("click", () => setEditMode(!editMode));

// ---------- insight block-size settings ----------
function updateInsightLabels() {
  statStudyLabel.textContent = `${round1(settings.studyBlockHours)}-hr study blocks`;
  statShiftsLabel.textContent = `${round1(settings.shiftBlockHours)}-hr shifts you could pick up`;
}

studyBlockInput.addEventListener("input", () => {
  settings.studyBlockHours = clamp(parseFloat(studyBlockInput.value) || 2, 0.5, 24);
  updateInsightLabels();
  recalc();
  saveState();
});

shiftBlockInput.addEventListener("input", () => {
  settings.shiftBlockHours = clamp(parseFloat(shiftBlockInput.value) || 8, 0.5, 24);
  updateInsightLabels();
  recalc();
  saveState();
});

// ---------- editable copy ----------
function captureOriginalCopy() {
  document.querySelectorAll("[data-copy-key]").forEach((el) => {
    ORIGINAL_COPY[el.dataset.copyKey] = el.textContent.trim();
  });
}

function applyCopyOverrides() {
  Object.keys(copyOverrides).forEach((key) => {
    const el = document.querySelector(`[data-copy-key="${key}"]`);
    if (el) el.textContent = copyOverrides[key];
  });
}

function wireCopyEditing() {
  document.querySelectorAll("[data-copy-key]").forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
    el.addEventListener("input", () => {
      copyOverrides[el.dataset.copyKey] = el.textContent;
      saveState();
    });
  });
}

// ---------- reset to defaults ----------
resetBtn.addEventListener("click", () => {
  const ok = window.confirm("Reset everything to defaults? This clears your saved setup on this browser.");
  if (!ok) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }

  categories = defaultCategoriesFactory();
  settings = { ...DEFAULT_SETTINGS };
  copyOverrides = {};
  mode = "quick";

  document.querySelectorAll("[data-copy-key]").forEach((el) => {
    el.textContent = ORIGINAL_COPY[el.dataset.copyKey];
  });

  studyBlockInput.value = settings.studyBlockHours;
  shiftBlockInput.value = settings.shiftBlockHours;
  updateInsightLabels();

  document.querySelectorAll(".chart-toggle__btn").forEach((b) => {
    const active = b.dataset.chart === settings.chartType;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  setModeUI();
  recalc();
  saveState();
});

// ---------- calculations ----------
function recalc() {
  const totalAllocated = categories.reduce((sum, c) => sum + c.weekly, 0);
  const free = TOTAL_HOURS - totalAllocated;
  const freeClamped = Math.max(free, 0);

  // ring
  const pct = clamp(freeClamped / TOTAL_HOURS, 0, 1);
  const offset = RING_CIRCUMFERENCE * (1 - pct);
  if (window.gsap) {
    gsap.to(ringFill, { strokeDashoffset: offset, duration: 0.6, ease: "power2.out" });
  } else {
    ringFill.style.strokeDashoffset = offset;
  }
  ringFill.style.stroke = free < 0 ? "var(--warn)" : "var(--accent)";

  animateNumber(freeHoursNum, free);
  animateNumber(statAllocated, totalAllocated);
  statPerDay.textContent = round1(free / 7);
  statStudy.textContent = Math.max(Math.floor(freeClamped / settings.studyBlockHours), 0);
  statShifts.textContent = Math.max(Math.floor(freeClamped / settings.shiftBlockHours), 0);

  warningEl.hidden = free >= 0;

  // per-day free hours (Mon..Sun) = 24 - sum of each category's hours that day
  const freePerDay = DAYS.map((_, i) => {
    const usedToday = categories.reduce((sum, c) => sum + (c.daily[i] || 0), 0);
    return 24 - usedToday;
  });
  renderDayChart(freePerDay);
}

function animateNumber(el, target) {
  const rounded = Math.round(target * 10) / 10;
  if (window.gsap) {
    if (!el._numState) el._numState = { val: parseFloat(el.textContent) || 0 };
    gsap.killTweensOf(el._numState);
    gsap.to(el._numState, {
      val: rounded,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = round1(el._numState.val);
      },
    });
  } else {
    el.textContent = round1(rounded);
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

// ---------- hero count-up ----------
function heroCountUp() {
  const el = document.querySelector(".hero__num");
  const target = parseFloat(el.dataset.countTo);
  if (window.gsap) {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.4,
      ease: "power3.out",
      delay: 0.2,
      onUpdate: () => (el.textContent = Math.round(obj.val)),
    });
  } else {
    el.textContent = target;
  }
}

// ---------- scroll reveals ----------
function setupReveals() {
  const revealEls = document.querySelectorAll(".reveal");
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    revealEls.forEach((el) => {
      gsap.fromTo(
        el,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        }
      );
    });

    // safety net: never leave content permanently hidden if the ticker
    // stalls (throttled background tab, slow CDN, etc.)
    setTimeout(() => {
      revealEls.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
    }, 4000);
  }
}

// ---------- init ----------
function init() {
  captureOriginalCopy();

  const saved = loadState();
  if (saved) {
    if (Array.isArray(saved.categories) && saved.categories.length) {
      categories = saved.categories.map((c) =>
        mkCategory(c.id, c.name, c.colorVar, c.weekly, !!c.custom, c.daily)
      );
    }
    if (saved.mode === "quick" || saved.mode === "detailed") mode = saved.mode;
    if (saved.settings) settings = { ...DEFAULT_SETTINGS, ...saved.settings };
    if (saved.copyOverrides) copyOverrides = saved.copyOverrides;
  }

  applyCopyOverrides();
  wireCopyEditing();

  studyBlockInput.value = settings.studyBlockHours;
  shiftBlockInput.value = settings.shiftBlockHours;
  updateInsightLabels();

  document.querySelectorAll(".chart-toggle__btn").forEach((b) => {
    const active = b.dataset.chart === settings.chartType;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  setModeUI();
  recalc();
  heroCountUp();
  setupReveals();
}

init();
