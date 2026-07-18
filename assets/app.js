// ---------- constants ----------
const TOTAL_HOURS = 168;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RING_CIRCUMFERENCE = 2 * Math.PI * 96;
const PALETTE = ["cat-0", "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6"];

// ---------- state ----------
// each category: { id, name, colorVar, weekly, daily: [7 numbers], custom: bool }
let categories = [
  mkCategory("sleep", "Sleep", "cat-0", 56),
  mkCategory("school", "School", "cat-1", 0),
  mkCategory("work", "Work", "cat-2", 0),
  mkCategory("church", "Church", "cat-3", 0),
  mkCategory("commute", "Commute", "cat-4", 0),
];

let mode = "quick"; // 'quick' | 'detailed'
let paletteIndex = PALETTE.length;

function mkCategory(id, name, colorVar, weekly, custom = false) {
  return {
    id,
    name,
    colorVar,
    weekly,
    daily: splitEvenly(weekly),
    custom,
  };
}

function splitEvenly(weekly) {
  const per = weekly / 7;
  return new Array(7).fill(per);
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
const warningEl = document.getElementById("results-warning");
const daybarsEl = document.getElementById("daybars");

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

// ---------- rendering ----------
function renderQuickGrid() {
  quickGrid.innerHTML = "";
  categories.forEach((cat) => {
    const node = rowTemplate.content.cloneNode(true);
    const card = node.querySelector(".category-card");
    card.dataset.id = cat.id;
    if (cat.custom) card.classList.add("is-custom");

    node.querySelector(".category-card__swatch").style.background = `var(--${cat.colorVar})`;
    node.querySelector(".category-card__name").textContent = cat.name;

    const input = node.querySelector(".category-card__input");
    input.value = round1(cat.weekly);
    input.addEventListener("input", () => {
      const val = clamp(parseFloat(input.value) || 0, 0, 168);
      cat.weekly = val;
      cat.daily = splitEvenly(val);
      recalc();
    });

    node.querySelector(".category-card__remove").addEventListener("click", () => {
      removeCategory(cat.id);
    });

    quickGrid.appendChild(node);
  });
}

function renderDetailedTable() {
  detailedBody.innerHTML = "";
  categories.forEach((cat) => {
    const tr = document.createElement("tr");
    tr.dataset.id = cat.id;
    if (cat.custom) tr.classList.add("is-custom");

    const catTd = document.createElement("td");
    catTd.className = "detailed-table__cat";
    const catCell = document.createElement("div");
    catCell.className = "detailed-table__cat-cell";
    const swatch = document.createElement("span");
    swatch.className = "category-card__swatch";
    swatch.style.background = `var(--${cat.colorVar})`;
    const label = document.createElement("span");
    label.textContent = cat.name;
    catCell.appendChild(swatch);
    catCell.appendChild(label);
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
}

function renderDayBars(freePerDay) {
  daybarsEl.innerHTML = "";
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

// ---------- category management ----------
function removeCategory(id) {
  categories = categories.filter((c) => c.id !== id);
  renderQuickGrid();
  renderDetailedTable();
  recalc();
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
}

document.getElementById("add-category-quick").addEventListener("click", addCategory);
document.getElementById("add-category-detailed").addEventListener("click", addCategory);

// ---------- mode toggle ----------
document.querySelectorAll(".mode-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const newMode = btn.dataset.mode;
    if (newMode === mode) return;
    mode = newMode;

    document.querySelectorAll(".mode-toggle__btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
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
  });
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
  statStudy.textContent = Math.max(Math.floor(freeClamped / 2), 0);
  statShifts.textContent = Math.max(Math.floor(freeClamped / 8), 0);

  warningEl.hidden = free >= 0;

  // per-day free hours (Mon..Sun) = 24 - sum of each category's hours that day
  const freePerDay = DAYS.map((_, i) => {
    const usedToday = categories.reduce((sum, c) => sum + (c.daily[i] || 0), 0);
    return 24 - usedToday;
  });
  renderDayBars(freePerDay);
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
  renderQuickGrid();
  renderDetailedTable();
  recalc();
  heroCountUp();
  setupReveals();
}

init();
