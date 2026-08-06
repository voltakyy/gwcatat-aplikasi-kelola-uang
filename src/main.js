'use strict';

// ================== STATE ==================
let state = {
  currentMonth: currentMonthKey(),
  months: {},
};
let tipIndex = 0;
let pieChartInstance = null, lineChartInstance = null, incomeLineInstance = null, expenseLineInstance = null, reportChartInstance = null;

// ================== HELPERS ==================
function currentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, "0");
}
function shiftMonth(key, delta) {
  const parts = key.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, "0");
}
function monthLabel(key) {
  const parts = key.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function fmtRp(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? "-" : "") + "Rp" + Math.abs(v).toLocaleString("id-ID");
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function formatRibuan(value) {
  const num = Math.floor(Math.abs(Number(value)) || 0);
  return num.toLocaleString("id-ID");
}
function parseRibuan(value) {
  if (typeof value !== "string") return Math.floor(Number(value) || 0);
  const digitsOnly = value.replace(/[^0-9]/g, "");
  return digitsOnly === "" ? 0 : parseInt(digitsOnly, 10);
}
function attachCurrencyInput(inputElement, onValueChange) {
  if (!inputElement) return;
  inputElement.setAttribute("type", "text");
  inputElement.setAttribute("inputmode", "numeric");
  inputElement.addEventListener("input", function() {
    const cursorPos = inputElement.selectionStart || inputElement.value.length;
    const raw = inputElement.value;
    const digitsBefore = raw.slice(0, cursorPos).replace(/[^0-9]/g, "").length;
    const digits = raw.replace(/[^0-9]/g, "");
    const numericValue = digits === "" ? 0 : parseInt(digits, 10);
    const formatted = digits === "" ? "" : formatRibuan(numericValue);
    inputElement.value = formatted;
    let newPos = formatted.length;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (count === digitsBefore) { newPos = i; break; }
      if (/[0-9]/.test(formatted[i])) count++;
    }
    if (digitsBefore === 0) newPos = 0;
    inputElement.setSelectionRange(newPos, newPos);
    if (onValueChange) onValueChange(numericValue);
  });
}
function defaultMonthData() {
  return { allowance: 0, emergencyTarget: 200000, kas: 0, ewallet: 0, utang: 0, transactions: [] };
}
function getMonthData(key) {
  if (!state.months[key]) state.months[key] = defaultMonthData();
  return state.months[key];
}

// ================== PERSISTENSI ==================
function loadState() {
  try {
    const raw = localStorage.getItem("gwcatat_tx");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.months) state = parsed;
    }
  } catch (e) { console.warn("Gagal muat data:", e); }
  if (!state.currentMonth) state.currentMonth = currentMonthKey();
  getMonthData(state.currentMonth);
}
function saveState() {
  try {
    localStorage.setItem("gwcatat_tx", JSON.stringify(state));
    setStorageStatus("Siap");
  } catch (e) { setStorageStatus("Gagal simpan"); }
}
function setStorageStatus(text) {
  const el = document.getElementById("storageStatus");
  if (el) el.textContent = text;
}

// ================== SIMPAN / MUAT FILE ==================
function exportToFile() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storage.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStorageStatus("storage.txt disimpan");
}
function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !parsed.months) throw new Error("Format tidak dikenali");
      state = parsed;
      if (!state.currentMonth) state.currentMonth = currentMonthKey();
      getMonthData(state.currentMonth);
      saveState();
      renderAll();
      setStorageStatus("storage.txt dimuat");
    } catch (err) {
      alert("File storage.txt tidak valid.");
      setStorageStatus("Gagal muat");
    }
  };
  reader.readAsText(file);
}

// ================== PERHITUNGAN ==================
function computeMetrics() {
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions || [];
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + (t.amount || 0), 0);
  const effectiveIn = totalIn > 0 ? totalIn : data.allowance;
  const baseIn = effectiveIn || 1;
  const sumCat = (key) => tx.filter(t => t.category === key).reduce((s, t) => s + (t.amount || 0), 0);
  const totalKebutuhan = sumCat("kebutuhan");
  const totalKeinginan = sumCat("keinginan");
  const totalTabungan = sumCat("tabungan");
  const totalDarurat = sumCat("darurat");
  const totalOut = totalKebutuhan + totalKeinginan + totalTabungan + totalDarurat;
  const sisa = totalIn - totalOut;
  const savingsRatio = (totalTabungan / baseIn) * 100;
  const lifestyleRatio = (totalKeinginan / baseIn) * 100;
  const netLiquid = (data.kas || 0) + (data.ewallet || 0) - (data.utang || 0);
  const emergencyRatio = data.emergencyTarget > 0 ? (totalDarurat / data.emergencyTarget) * 100 : 0;
  const savingsScore = Math.min(100, (savingsRatio / 20) * 100);
  const lifestyleScore = lifestyleRatio <= 30 ? 100 : Math.max(0, 100 - (lifestyleRatio - 30) * 3);
  const liquidScore = netLiquid >= 0 ? 100 : 0;
  const emergencyScore = Math.min(100, emergencyRatio);
  const literacyScore = (savingsScore + lifestyleScore + liquidScore + emergencyScore) / 4;
  const totalWealth = (data.kas || 0) + (data.ewallet || 0) - (data.utang || 0) + totalTabungan + totalDarurat;
  return { totalIn, totalOut, sisa, baseIn, totalKebutuhan, totalKeinginan, totalTabungan, totalDarurat,
    savingsRatio, lifestyleRatio, netLiquid, emergencyRatio, savingsScore, lifestyleScore, liquidScore, emergencyScore,
    literacyScore, totalWealth };
}

// ================== RENDER ==================
function renderAll() {
  const data = getMonthData(state.currentMonth);
  document.getElementById("monthLabel").textContent = monthLabel(state.currentMonth);
  const allowanceInput = document.getElementById("allowanceInput");
  if (allowanceInput) allowanceInput.value = data.allowance ? formatRibuan(data.allowance) : "";
  renderSummary();
  renderGauges();
  renderIncomeList();
  renderExpenseList();
  updateCharts();
  updateAssetPanel();
  updateReport();
  renderCalendar();
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderSummary() {
  const m = computeMetrics();
  document.getElementById("totalIn").textContent = fmtRp(m.totalIn);
  document.getElementById("totalOut").textContent = fmtRp(m.totalOut);
  document.getElementById("sisaSaldo").textContent = fmtRp(m.sisa);
  document.getElementById("totalWealth").textContent = fmtRp(m.totalWealth);
}

function statusFor(value, goodMin, warnMin, inverse) {
  if (!inverse) {
    if (value >= goodMin) return { color: "#7A9E7E", badge: "" };
    if (value >= warnMin) return { color: "#C89B3C", badge: "warn" };
    return { color: "#C76D4E", badge: "danger" };
  } else {
    if (value <= goodMin) return { color: "#7A9E7E", badge: "" };
    if (value <= warnMin) return { color: "#C89B3C", badge: "warn" };
    return { color: "#C76D4E", badge: "danger" };
  }
}
function setRing(ringEl, pct, color) {
  if (!ringEl) return;
  const clamped = Math.max(0, Math.min(100, pct));
  ringEl.style.background = "conic-gradient(" + color + " " + (clamped * 3.6) + "deg, #F1EFEA " + (clamped * 3.6) + "deg)";
}

function renderGauges() {
  const m = computeMetrics();
  const data = getMonthData(state.currentMonth);
  // Ring savings
  const sv = statusFor(m.savingsRatio, 20, 10, false);
  setRing(document.getElementById("ringSavings"), m.savingsScore, sv.color);
  document.getElementById("savingsValue").textContent = Math.round(m.savingsRatio) + "%";
  const sb = document.getElementById("savingsBadge");
  if (sb) { sb.className = "badge " + sv.badge; sb.textContent = m.savingsRatio >= 20 ? "Sehat" : m.savingsRatio >= 10 ? "Kurang" : "Rendah"; }
  // Lifestyle
  const ls = statusFor(m.lifestyleRatio, 30, 45, true);
  setRing(document.getElementById("ringLifestyle"), m.lifestyleScore, ls.color);
  document.getElementById("lifestyleValue").textContent = Math.round(m.lifestyleRatio) + "%";
  const lb = document.getElementById("lifestyleBadge");
  if (lb) { lb.className = "badge " + ls.badge; lb.textContent = m.lifestyleRatio <= 30 ? "Terkendali" : m.lifestyleRatio <= 45 ? "Waspada" : "Boros"; }
  // Liquid
  const isNeg = m.netLiquid < 0;
  const scale = Math.max(m.baseIn * 0.5, 50000);
  const pct = isNeg ? 100 : Math.max(4, Math.min(100, (m.netLiquid / scale) * 100));
  const tankFill = document.getElementById("tankFill");
  if (tankFill) {
    tankFill.style.height = pct + "%";
    tankFill.style.background = isNeg ? "linear-gradient(180deg, rgba(199,109,78,0.75), #C76D4E)" : "linear-gradient(180deg, rgba(122,158,126,0.75), #7A9E7E)";
    tankFill.style.boxShadow = "0 0 14px " + (isNeg ? "#C76D4E" : "#7A9E7E");
  }
  document.getElementById("liquidValue").textContent = fmtRp(m.netLiquid);
  const liqBadge = document.getElementById("liquidBadge");
  if (liqBadge) { liqBadge.className = "badge " + (isNeg ? "danger" : ""); liqBadge.textContent = isNeg ? "Defisit" : "Aman"; }
  // Emergency
  const em = statusFor(m.emergencyRatio, 100, 50, false);
  setRing(document.getElementById("ringEmergency"), m.emergencyScore, em.color);
  document.getElementById("emergencyValue").textContent = Math.round(Math.min(999, m.emergencyRatio)) + "%";
  document.getElementById("emergencyTargetLabel").textContent = "Target " + fmtRp(data.emergencyTarget);
  const eb = document.getElementById("emergencyBadge");
  if (eb) { eb.className = "badge " + em.badge; eb.textContent = m.emergencyRatio >= 100 ? "Terpenuhi" : m.emergencyRatio >= 50 ? "Menuju" : "Mulai"; }
  // Literacy
  const level = Math.min(5, Math.max(1, Math.floor(m.literacyScore / 20) + 1));
  const titles = ["Pemula", "Belajar", "Cermat", "Jagoan", "Master"];
  const within = m.literacyScore % 20 === 0 && m.literacyScore > 0 ? 100 : (m.literacyScore % 20) * 5;
  document.getElementById("levelValue").textContent = "Lv." + level;
  const xp = document.getElementById("xpFill");
  if (xp) xp.style.width = Math.max(4, within) + "%";
  document.getElementById("literacyTitle").textContent = titles[level-1] + " · " + Math.round(m.literacyScore) + "/100";
}

// ================== RENDER LIST ==================
function renderIncomeList() {
  const data = getMonthData(state.currentMonth);
  const list = document.getElementById("incomeList");
  if (!list) return;
  const incomes = data.transactions.filter(t => t.type === "in");
  if (incomes.length === 0) {
    list.innerHTML = '<div class="empty-state">Belum ada pendapatan.</div>';
    return;
  }
  list.innerHTML = "";
  incomes.forEach(t => {
    const cat = { label: t.category === "uang_jajan" ? "Uang Jajan" : "Pemasukan Lain", icon: "wallet", color: "#7A9E7E" };
    const row = document.createElement("div");
    row.className = "tx-item";
    row.innerHTML = `
      <div class="tx-icon" style="background:${cat.color}1a"><i data-lucide="${cat.icon}" style="color:${cat.color}"></i></div>
      <div class="tx-info"><p>${cat.label}${t.note ? " · " + escapeHtml(t.note) : ""}</p><p class="tx-date">${t.date}</p></div>
      <p class="tx-amount in">+${fmtRp(t.amount)}</p>
      <button class="tx-delete" data-id="${t.id}"><i data-lucide="trash-2"></i></button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll(".tx-delete").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const d = getMonthData(state.currentMonth);
      d.transactions = d.transactions.filter(t => t.id !== id);
      saveState();
      renderAll();
    });
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderExpenseList() {
  const data = getMonthData(state.currentMonth);
  const list = document.getElementById("expenseList");
  if (!list) return;
  const expenses = data.transactions.filter(t => t.type === "out");
  if (expenses.length === 0) {
    list.innerHTML = '<div class="empty-state">Belum ada pengeluaran.</div>';
    return;
  }
  list.innerHTML = "";
  expenses.forEach(t => {
    const cat = { label: t.category, icon: "shopping-bag", color: "#C76D4E" };
    const row = document.createElement("div");
    row.className = "tx-item";
    row.innerHTML = `
      <div class="tx-icon" style="background:${cat.color}1a"><i data-lucide="${cat.icon}" style="color:${cat.color}"></i></div>
      <div class="tx-info"><p>${cat.label}${t.note ? " · " + escapeHtml(t.note) : ""}</p><p class="tx-date">${t.date}</p></div>
      <p class="tx-amount out">-${fmtRp(t.amount)}</p>
      <button class="tx-delete" data-id="${t.id}"><i data-lucide="trash-2"></i></button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll(".tx-delete").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const d = getMonthData(state.currentMonth);
      d.transactions = d.transactions.filter(t => t.id !== id);
      saveState();
      renderAll();
    });
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function updateAssetPanel() {
  const data = getMonthData(state.currentMonth);
  const m = computeMetrics();
  document.getElementById("assetKas").textContent = fmtRp(data.kas);
  document.getElementById("assetEwallet").textContent = fmtRp(data.ewallet);
  document.getElementById("assetUtang").textContent = fmtRp(data.utang);
  document.getElementById("assetTabungan").textContent = fmtRp(m.totalTabungan);
  document.getElementById("assetDarurat").textContent = fmtRp(m.totalDarurat);
  document.getElementById("assetTargetDarurat").textContent = fmtRp(data.emergencyTarget);
}

// ================== CHART ==================
function safeDestroy(instance) {
  if (instance && typeof instance.destroy === "function") {
    try { instance.destroy(); } catch (e) {}
  }
  return null;
}

function updateCharts() {
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions || [];

  // Pie
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = tx.filter(t => t.type === "out").reduce((s, t) => s + (t.amount || 0), 0);
  const pieCtx = document.getElementById("pieChart");
  if (pieCtx) {
    pieChartInstance = safeDestroy(pieChartInstance);
    if (totalIn || totalOut) {
      pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pendapatan', 'Pengeluaran'],
          datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#7A9E7E', '#C76D4E'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '65%', animation: { animateRotate: true, duration: 300 } }
      });
    }
  }

  // Line
  const allDays = {};
  tx.forEach(t => {
    if (t.date && t.date.length === 10) {
      if (!allDays[t.date]) allDays[t.date] = { in: 0, out: 0 };
      if (t.type === "in") allDays[t.date].in += (t.amount || 0);
      else allDays[t.date].out += (t.amount || 0);
    }
  });
  const dates = Object.keys(allDays).sort().slice(-31);
  const labels = dates.map(d => d.slice(5));
  const inData = dates.map(d => allDays[d].in || 0);
  const outData = dates.map(d => allDays[d].out || 0);

  const lineCtx = document.getElementById("lineChart");
  if (lineCtx) {
    lineChartInstance = safeDestroy(lineChartInstance);
    if (labels.length > 0) {
      lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Pendapatan', data: inData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3, pointRadius: 3 },
            { label: 'Pengeluaran', data: outData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3, pointRadius: 3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } }, scales: { y: { beginAtZero: true } }, animation: { duration: 200 } }
      });
    }
  }

  // Income line
  const incomeDays = {};
  tx.filter(t => t.type === "in").forEach(t => {
    if (t.date && t.date.length === 10) {
      if (!incomeDays[t.date]) incomeDays[t.date] = 0;
      incomeDays[t.date] += (t.amount || 0);
    }
  });
  const incDates = Object.keys(incomeDays).sort().slice(-31);
  const incLabels = incDates.map(d => d.slice(5));
  const incData = incDates.map(d => incomeDays[d] || 0);
  const incCtx = document.getElementById("incomeLineChart");
  if (incCtx) {
    incomeLineInstance = safeDestroy(incomeLineInstance);
    if (incLabels.length > 0) {
      incomeLineInstance = new Chart(incCtx, {
        type: 'line',
        data: { labels: incLabels, datasets: [{ label: 'Pendapatan', data: incData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, animation: { duration: 200 } }
      });
    }
  }

  // Expense line
  const expDays = {};
  tx.filter(t => t.type === "out").forEach(t => {
    if (t.date && t.date.length === 10) {
      if (!expDays[t.date]) expDays[t.date] = 0;
      expDays[t.date] += (t.amount || 0);
    }
  });
  const expDates = Object.keys(expDays).sort().slice(-31);
  const expLabels = expDates.map(d => d.slice(5));
  const expData = expDates.map(d => expDays[d] || 0);
  const expCtx = document.getElementById("expenseLineChart");
  if (expCtx) {
    expenseLineInstance = safeDestroy(expenseLineInstance);
    if (expLabels.length > 0) {
      expenseLineInstance = new Chart(expCtx, {
        type: 'line',
        data: { labels: expLabels, datasets: [{ label: 'Pengeluaran', data: expData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, animation: { duration: 200 } }
      });
    }
  }
}

// ================== REPORT ==================
function updateReport() {
  const period = document.getElementById("reportPeriod").value;
  const dateVal = document.getElementById("reportDate").value;
  const refDate = dateVal ? new Date(dateVal) : new Date();
  let start, end;
  if (period === "minggu") {
    const d = new Date(refDate);
    const day = d.getDay();
    start = new Date(d); start.setDate(d.getDate() - day);
    end = new Date(start); end.setDate(start.getDate() + 6);
  } else if (period === "bulan") {
    const d = new Date(refDate);
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  } else {
    const d = new Date(refDate);
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear(), 11, 31);
  }
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  let allTx = [];
  for (const monthKey in state.months) {
    const monthData = state.months[monthKey];
    monthData.transactions.forEach(t => {
      if (t.date && t.date >= startStr && t.date <= endStr) allTx.push(t);
    });
  }
  const totalIn = allTx.filter(t => t.type === "in").reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = allTx.filter(t => t.type === "out").reduce((s, t) => s + (t.amount || 0), 0);
  const diff = totalIn - totalOut;
  const count = allTx.length;
  const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const avg = count > 0 ? (totalIn + totalOut) / daysDiff : 0;
  document.getElementById("repTotalIn").textContent = fmtRp(totalIn);
  document.getElementById("repTotalOut").textContent = fmtRp(totalOut);
  document.getElementById("repDiff").textContent = fmtRp(diff);
  document.getElementById("repDiff").style.color = diff >= 0 ? '#7A9E7E' : '#C76D4E';
  document.getElementById("repAvg").textContent = fmtRp(avg);
  document.getElementById("repCount").textContent = count;

  const daysMap = {};
  allTx.forEach(t => {
    if (t.date && t.date.length === 10) {
      if (!daysMap[t.date]) daysMap[t.date] = { in: 0, out: 0 };
      if (t.type === "in") daysMap[t.date].in += (t.amount || 0);
      else daysMap[t.date].out += (t.amount || 0);
    }
  });
  const sorted = Object.keys(daysMap).sort().slice(-100);
  const repLabels = sorted.map(d => d.slice(5));
  const repIn = sorted.map(d => daysMap[d].in || 0);
  const repOut = sorted.map(d => daysMap[d].out || 0);
  const reportCtx = document.getElementById("reportChart");
  if (reportCtx) {
    reportChartInstance = safeDestroy(reportChartInstance);
    if (repLabels.length > 0) {
      reportChartInstance = new Chart(reportCtx, {
        type: 'bar',
        data: {
          labels: repLabels,
          datasets: [
            { label: 'Pendapatan', data: repIn, backgroundColor: 'rgba(122,158,126,0.6)', borderColor: '#7A9E7E', borderWidth: 1 },
            { label: 'Pengeluaran', data: repOut, backgroundColor: 'rgba(199,109,78,0.6)', borderColor: '#C76D4E', borderWidth: 1 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } }, scales: { y: { beginAtZero: true } }, animation: { duration: 200 } }
      });
    }
  }
}

// ================== CALENDAR ==================
function renderCalendar() {
  const container = document.getElementById("calendarContainer");
  if (!container) return;
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions || [];
  const [year, month] = state.currentMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  let html = "";
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  days.forEach(d => html += `<div class="text-xs font-semibold text-charcoal/50 py-1">${d}</div>`);
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + "-" + String(month).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const dayTx = tx.filter(t => t.date === dateStr);
    const totalIn = dayTx.filter(t => t.type === "in").reduce((s, t) => s + (t.amount || 0), 0);
    const totalOut = dayTx.filter(t => t.type === "out").reduce((s, t) => s + (t.amount || 0), 0);
    const has = totalIn > 0 || totalOut > 0;
    html += `<div class="calendar-day ${has ? 'has-transaction' : ''}" data-date="${dateStr}">
      <span class="day-number">${d}</span>
      ${has ? `<span class="day-summary">${totalIn > 0 ? '<span class="in">+'+fmtRp(totalIn)+'</span>' : ''}${totalOut > 0 ? ' <span class="out">-'+fmtRp(totalOut)+'</span>' : ''}</span>` : ''}
    </div>`;
  }
  container.innerHTML = html;
  // Click event
  container.querySelectorAll(".calendar-day.has-transaction").forEach(el => {
    el.addEventListener("click", function() {
      const date = this.dataset.date;
      const dayTx = tx.filter(t => t.date === date);
      const totalIn = dayTx.filter(t => t.type === "in").reduce((s, t) => s + (t.amount || 0), 0);
      const totalOut = dayTx.filter(t => t.type === "out").reduce((s, t) => s + (t.amount || 0), 0);
      document.getElementById("calendarSummary").textContent = date + " → Pendapatan: " + fmtRp(totalIn) + " | Pengeluaran: " + fmtRp(totalOut);
    });
  });
}

// ================== TIPS ==================
function startTips() {
  const el = document.getElementById("tipText");
  if (!el) return;
  const tips = [
    "Kebutuhan itu yang bikin kamu tetap jalan: ongkos, makan, buku. Keinginan itu bisa ditunda.",
    "Sebelum beli, tanya: kalau nggak dibeli sekarang, apa masalahnya?",
    "Target aman: minimal 20% uang jajan masuk tabungan.",
    "Dana darurat cuma untuk kejadian mendadak, bukan diskon sepatu.",
  ];
  let idx = 0;
  el.textContent = tips[0];
  setInterval(() => {
    idx = (idx + 1) % tips.length;
    el.textContent = tips[idx];
  }, 7000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ================== NAVIGATION ==================
function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  // Toggle sidebar
  toggleBtn.addEventListener("click", function() {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  });
  overlay.addEventListener("click", function() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  });

  // Tab switching
  navBtns.forEach(btn => {
    btn.addEventListener("click", function() {
      navBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const tab = this.getAttribute("data-tab");
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      document.getElementById("tab-" + tab).classList.add("active");
      // Tutup sidebar di mobile
      if (window.innerWidth < 768) {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
      }
      // Update charts
      setTimeout(() => {
        if (tab === "laporan") updateReport();
        else updateCharts();
      }, 50);
    });
  });
}

// ================== MODALS ==================
function setupModals() {
  const modalIncome = document.getElementById("modalIncome");
  const btnAddIncome = document.getElementById("btnAddIncome");
  const btnIncomeCancel = document.getElementById("modalIncomeCancel");
  const btnIncomeSave = document.getElementById("modalIncomeSave");

  btnAddIncome.addEventListener("click", function() {
    document.getElementById("incomeDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("incomeAmount").value = "";
    document.getElementById("incomeNote").value = "";
    modalIncome.classList.add("open");
  });
  btnIncomeCancel.addEventListener("click", function() { modalIncome.classList.remove("open"); });
  modalIncome.addEventListener("click", function(e) { if (e.target === modalIncome) modalIncome.classList.remove("open"); });
  btnIncomeSave.addEventListener("click", function() {
    const date = document.getElementById("incomeDate").value;
    const amount = parseRibuan(document.getElementById("incomeAmount").value);
    const note = document.getElementById("incomeNote").value.trim();
    if (!date || !amount || amount <= 0) { alert("Isi tanggal dan nominal."); return; }
    const d = getMonthData(state.currentMonth);
    d.transactions.unshift({ id: uid(), type: "in", category: "uang_jajan", amount, note, date });
    saveState();
    renderAll();
    modalIncome.classList.remove("open");
  });

  const modalExpense = document.getElementById("modalExpense");
  const btnAddExpense = document.getElementById("btnAddExpense");
  const btnExpenseCancel = document.getElementById("modalExpenseCancel");
  const btnExpenseSave = document.getElementById("modalExpenseSave");

  btnAddExpense.addEventListener("click", function() {
    document.getElementById("expenseDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseNote").value = "";
    document.getElementById("expenseCategory").value = "kebutuhan";
    modalExpense.classList.add("open");
  });
  btnExpenseCancel.addEventListener("click", function() { modalExpense.classList.remove("open"); });
  modalExpense.addEventListener("click", function(e) { if (e.target === modalExpense) modalExpense.classList.remove("open"); });
  btnExpenseSave.addEventListener("click", function() {
    const date = document.getElementById("expenseDate").value;
    const amount = parseRibuan(document.getElementById("expenseAmount").value);
    const note = document.getElementById("expenseNote").value.trim();
    const category = document.getElementById("expenseCategory").value;
    if (!date || !amount || amount <= 0) { alert("Isi tanggal dan nominal."); return; }
    const d = getMonthData(state.currentMonth);
    d.transactions.unshift({ id: uid(), type: "out", category, amount, note, date });
    saveState();
    renderAll();
    modalExpense.classList.remove("open");
  });
}

// ================== POPUPS ==================
function setupPopups() {
  const overlay = document.getElementById("popupOverlay");
  const closeBtn = document.getElementById("popupClose");
  const shortcutBtn = document.getElementById("popupShortcut");
  let currentKey = null;

  const dataMap = {
    income: { title: "Pemasukan", desc: "Total uang masuk bulan ini.", tab: "pendapatan" },
    expense: { title: "Pengeluaran", desc: "Total uang keluar bulan ini.", tab: "pengeluaran" },
    balance: { title: "Sisa di Tangan", desc: "Pemasukan dikurangi pengeluaran.", tab: "pengeluaran" },
    wealth: { title: "Total Kekayaan", desc: "Kas + E-Wallet + Tabungan + Dana Darurat - Utang", tab: "beranda" },
    savings: { title: "Rasio Tabungan", desc: "Persentase uang yang ditabung dari total pemasukan.", tab: "pengeluaran" },
    lifestyle: { title: "Rasio Gaya Hidup", desc: "Persentase uang untuk keinginan.", tab: "pengeluaran" },
    liquid: { title: "Aset Likuid Bersih", desc: "Kas + E-Wallet - Utang.", tab: "beranda" },
    emergency: { title: "Dana Darurat", desc: "Dana untuk kejadian tak terduga.", tab: "pengeluaran" },
    literacy: { title: "Skor Literasi", desc: "Gabungan skor tabungan, gaya hidup, likuiditas, dan darurat.", tab: "beranda" }
  };

  function openPopup(key) {
    const data = dataMap[key];
    if (!data) return;
    currentKey = key;
    document.getElementById("popupTitleText").textContent = data.title;
    document.getElementById("popupDescription").textContent = data.desc;
    shortcutBtn.textContent = "Lihat di " + (data.tab === "pendapatan" ? "Pendapatan" : data.tab === "pengeluaran" ? "Pengeluaran" : "Beranda");
    shortcutBtn.style.display = "inline-block";
    overlay.classList.add("open");
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function closePopup() { overlay.classList.remove("open"); currentKey = null; }

  closeBtn.addEventListener("click", closePopup);
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closePopup(); });
  shortcutBtn.addEventListener("click", function() {
    const data = dataMap[currentKey];
    if (!data) return;
    closePopup();
    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(b => { if (b.getAttribute("data-tab") === data.tab) b.click(); });
  });

  document.querySelectorAll("[data-popup]").forEach(el => {
    el.addEventListener("click", function() {
      const key = this.getAttribute("data-popup");
      openPopup(key);
    });
  });
}

// ================== EVENTS ==================
function attachEvents() {
  document.getElementById("prevMonth").addEventListener("click", function() {
    state.currentMonth = shiftMonth(state.currentMonth, -1);
    getMonthData(state.currentMonth);
    saveState();
    renderAll();
  });
  document.getElementById("nextMonth").addEventListener("click", function() {
    state.currentMonth = shiftMonth(state.currentMonth, 1);
    getMonthData(state.currentMonth);
    saveState();
    renderAll();
  });
  document.getElementById("exportBtn").addEventListener("click", exportToFile);
  document.getElementById("importBtn").addEventListener("click", function() { document.getElementById("importFileInput").click(); });
  document.getElementById("importFileInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) importFromFile(file);
    e.target.value = "";
  });
  document.getElementById("reportPeriod").addEventListener("change", updateReport);
  document.getElementById("reportDate").addEventListener("change", updateReport);
  document.getElementById("reportDate").value = new Date().toISOString().slice(0, 10);
}

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", function() {
  loadState();
  setupNavigation();
  setupModals();
  attachEvents();
  setupPopups();
  attachCurrencyInput(document.getElementById("allowanceInput"), function(value) {
    getMonthData(state.currentMonth).allowance = value;
    saveState();
    renderSummary();
    renderGauges();
  });
  attachCurrencyInput(document.getElementById("incomeAmount"));
  attachCurrencyInput(document.getElementById("expenseAmount"));
  renderAll();
  startTips();
  if (typeof lucide !== "undefined") lucide.createIcons();
});
