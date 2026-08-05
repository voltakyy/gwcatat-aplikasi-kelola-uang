// ================== KONSTANTA ==================
const COLORS = { teal: "#7A9E7E", amber: "#C89B3C", coral: "#C76D4E", primary: "#264653" };
const PRIMARY_SOFT = "#F1EFEA";

const OUT_CATS = [
  { key: "kebutuhan", label: "Kebutuhan", icon: "shopping-bag", color: "#7A9E7E" },
  { key: "keinginan", label: "Keinginan", icon: "sparkles", color: "#C89B3C" },
  { key: "tabungan", label: "Tabungan", icon: "piggy-bank", color: "#264653" },
  { key: "darurat", label: "Dana Darurat", icon: "life-buoy", color: "#C76D4E" },
];
const IN_CATS = [
  { key: "uang_jajan", label: "Uang Jajan", icon: "wallet", color: "#7A9E7E" },
  { key: "lainnya", label: "Pemasukan Lain", icon: "plus-circle", color: "#7A9E7E" },
];

const TIPS = [
  "Kebutuhan itu yang bikin kamu tetap jalan: ongkos, makan, buku tugas. Keinginan itu yang bikin senang tapi bisa ditunda.",
  "Sebelum beli sesuatu, tanya: kalau ini nggak dibeli sekarang, apa masalahnya besok? Kalau jawabannya 'nggak ada', itu keinginan.",
  "Target aman: minimal 20% uang jajan masuk tabungan duluan, baru sisanya dipakai jalan-jalan.",
  "Dana darurat bukan tabungan cita-cita. Dia cuma boleh dipakai buat kejadian mendadak, bukan buat diskon sepatu.",
  "Kalau dompet & e-wallet sering nyaris nol di akhir bulan, itu tanda perlu rem di pos Keinginan, bukan nambah utang paylater.",
];

const POPUP_DATA = {
  income: { title: "Pemasukan", description: "Total uang yang masuk ke dompet Anda bulan ini. Semakin tinggi, semakin besar ruang gerak keuangan Anda.", shortcut: "pendapatan", shortcutLabel: "Lihat Daftar Pendapatan" },
  expense: { title: "Pengeluaran", description: "Total uang yang keluar bulan ini. Perhatikan komposisinya: kebutuhan, keinginan, tabungan, dan dana darurat.", shortcut: "pengeluaran", shortcutLabel: "Lihat Daftar Pengeluaran" },
  balance: { title: "Sisa di Tangan", description: "Pemasukan dikurangi pengeluaran. Jika negatif, artinya Anda 'boros' dan perlu menekan pos keinginan atau menambah pemasukan.", shortcut: "pengeluaran", shortcutLabel: "Cek Pengeluaran" },
  wealth: { title: "Total Kekayaan", description: "Gabungan dari kas, e-wallet, total tabungan, dan dana darurat, dikurangi utang. Inilah gambaran kekayaan bersih Anda saat ini.", shortcut: "beranda", shortcutLabel: "Lihat Rincian" },
  savings: { title: "Rasio Tabungan", description: "Persentase dari uang jajan (pendapatan) yang Anda tabung. Target sehat adalah ≥20%. Semakin tinggi, semakin cepat Anda membangun aset.", shortcut: "pengeluaran", shortcutLabel: "Atur Tabungan" },
  lifestyle: { title: "Rasio Gaya Hidup", description: "Persentase uang jajan yang dipakai untuk keinginan (bukan kebutuhan). Batas aman ≤30%. Jika berlebih, coba kurangi jajan estetik.", shortcut: "pengeluaran", shortcutLabel: "Cek Keinginan" },
  liquid: { title: "Aset Likuid Bersih", description: "Kas + E-Wallet - Utang. Ini adalah uang yang bisa Anda pakai kapan saja. Jika negatif, segera lunasi utang Anda.", shortcut: "beranda", shortcutLabel: "Lihat Rincian Aset" },
  emergency: { title: "Dana Darurat", description: "Dana khusus untuk kejadian tak terduga (ban bocor, sakit, dll). Target minimal 3-6 bulan pengeluaran. Semakin cepat mencapai target, semakin aman.", shortcut: "pengeluaran", shortcutLabel: "Tambahkan Dana Darurat" },
  literacy: { title: "Skor Literasi Keuangan", description: "Gabungan skor dari: Rasio Tabungan, Rasio Gaya Hidup, Aset Likuid, dan Dana Darurat. Semakin tinggi, semakin sehat keuangan Anda.", shortcut: "beranda", shortcutLabel: "Lihat Semua Indikator" }
};

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function fmtRp(n) {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? "-" : ""}Rp${Math.abs(v).toLocaleString("id-ID")}`;
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
  inputElement.setAttribute("type", "text");
  inputElement.setAttribute("inputmode", "numeric");
  inputElement.addEventListener("input", () => {
    const cursorPos = inputElement.selectionStart ?? inputElement.value.length;
    const rawBeforeFormat = inputElement.value;
    const digitsBeforeCursor = rawBeforeFormat.slice(0, cursorPos).replace(/[^0-9]/g, "").length;
    const digitsOnly = rawBeforeFormat.replace(/[^0-9]/g, "");
    const numericValue = digitsOnly === "" ? 0 : parseInt(digitsOnly, 10);
    const formatted = digitsOnly === "" ? "" : formatRibuan(numericValue);
    inputElement.value = formatted;
    let newCursorPos = formatted.length;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (digitCount === digitsBeforeCursor) { newCursorPos = i; break; }
      if (/[0-9]/.test(formatted[i])) digitCount++;
    }
    if (digitsBeforeCursor === 0) newCursorPos = 0;
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
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
  } catch (e) { console.warn("Gagal muat data lokal:", e); }
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
  reader.onload = (e) => {
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
      alert("File storage.txt tidak valid atau rusak.");
      setStorageStatus("Gagal muat");
    }
  };
  reader.readAsText(file);
}

// ================== PERHITUNGAN ==================
function computeMetrics() {
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions;
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const effectiveIn = totalIn > 0 ? totalIn : data.allowance;
  const baseIn = effectiveIn || 1;
  const sumCat = (key) => tx.filter(t => t.category === key).reduce((s, t) => s + t.amount, 0);
  const totalKebutuhan = sumCat("kebutuhan");
  const totalKeinginan = sumCat("keinginan");
  const totalTabungan = sumCat("tabungan");
  const totalDarurat = sumCat("darurat");
  const totalOut = totalKebutuhan + totalKeinginan + totalTabungan + totalDarurat;
  const sisa = totalIn - totalOut;
  const savingsRatio = (totalTabungan / baseIn) * 100;
  const lifestyleRatio = (totalKeinginan / baseIn) * 100;
  const netLiquid = data.kas + data.ewallet - data.utang;
  const emergencyRatio = data.emergencyTarget > 0 ? (totalDarurat / data.emergencyTarget) * 100 : 0;
  const savingsScore = Math.min(100, (savingsRatio / 20) * 100);
  const lifestyleScore = lifestyleRatio <= 30 ? 100 : Math.max(0, 100 - (lifestyleRatio - 30) * 3);
  const liquidScore = netLiquid >= 0 ? 100 : 0;
  const emergencyScore = Math.min(100, emergencyRatio);
  const literacyScore = (savingsScore + lifestyleScore + liquidScore + emergencyScore) / 4;
  const totalWealth = data.kas + data.ewallet - data.utang + totalTabungan + totalDarurat;
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
    if (value >= goodMin) return { color: COLORS.teal, badge: "" };
    if (value >= warnMin) return { color: COLORS.amber, badge: "warn" };
    return { color: COLORS.coral, badge: "danger" };
  } else {
    if (value <= goodMin) return { color: COLORS.teal, badge: "" };
    if (value <= warnMin) return { color: COLORS.amber, badge: "warn" };
    return { color: COLORS.coral, badge: "danger" };
  }
}

function setRing(ringEl, pct, color) {
  const clamped = Math.max(0, Math.min(100, pct));
  ringEl.style.background = `conic-gradient(${color} ${clamped * 3.6}deg, ${PRIMARY_SOFT} ${clamped * 3.6}deg)`;
}

function renderGauges() {
  const m = computeMetrics();
  const data = getMonthData(state.currentMonth);
  const sv = statusFor(m.savingsRatio, 20, 10, false);
  setRing(document.getElementById("ringSavings"), m.savingsScore, sv.color);
  document.getElementById("savingsValue").textContent = `${Math.round(m.savingsRatio)}%`;
  const savingsBadge = document.getElementById("savingsBadge");
  savingsBadge.className = "badge " + sv.badge;
  savingsBadge.textContent = m.savingsRatio >= 20 ? "Sehat" : m.savingsRatio >= 10 ? "Kurang" : "Rendah";

  const ls = statusFor(m.lifestyleRatio, 30, 45, true);
  setRing(document.getElementById("ringLifestyle"), m.lifestyleScore, ls.color);
  document.getElementById("lifestyleValue").textContent = `${Math.round(m.lifestyleRatio)}%`;
  const lifestyleBadge = document.getElementById("lifestyleBadge");
  lifestyleBadge.className = "badge " + ls.badge;
  lifestyleBadge.textContent = m.lifestyleRatio <= 30 ? "Terkendali" : m.lifestyleRatio <= 45 ? "Waspada" : "Boros";

  const isNeg = m.netLiquid < 0;
  const scale = Math.max(m.baseIn * 0.5, 50000);
  const pct = isNeg ? 100 : Math.max(4, Math.min(100, (m.netLiquid / scale) * 100));
  const tankFill = document.getElementById("tankFill");
  tankFill.style.height = `${pct}%`;
  tankFill.style.background = isNeg ? `linear-gradient(180deg, rgba(199,109,78,0.75), ${COLORS.coral})` : `linear-gradient(180deg, rgba(122,158,126,0.75), ${COLORS.teal})`;
  tankFill.style.boxShadow = `0 0 14px ${isNeg ? COLORS.coral : COLORS.teal}`;
  document.getElementById("liquidValue").textContent = fmtRp(m.netLiquid);
  const liquidBadge = document.getElementById("liquidBadge");
  liquidBadge.className = "badge " + (isNeg ? "danger" : "");
  liquidBadge.textContent = isNeg ? "Defisit — cek utang" : "Aman & Positif";

  const em = statusFor(m.emergencyRatio, 100, 50, false);
  setRing(document.getElementById("ringEmergency"), m.emergencyScore, em.color);
  document.getElementById("emergencyValue").textContent = `${Math.round(Math.min(999, m.emergencyRatio))}%`;
  document.getElementById("emergencyTargetLabel").textContent = `Target ${fmtRp(data.emergencyTarget)}`;
  const emergencyBadge = document.getElementById("emergencyBadge");
  emergencyBadge.className = "badge " + em.badge;
  emergencyBadge.textContent = m.emergencyRatio >= 100 ? "Terpenuhi" : m.emergencyRatio >= 50 ? "Menuju" : "Mulai";

  const level = Math.min(5, Math.max(1, Math.floor(m.literacyScore / 20) + 1));
  const titles = ["Pemula Boros", "Belajar Hemat", "Cukup Cermat", "Jagoan Hemat", "Master Keuangan"];
  const within = m.literacyScore % 20 === 0 && m.literacyScore > 0 ? 100 : (m.literacyScore % 20) * 5;
  document.getElementById("levelValue").textContent = `Lv.${level}`;
  document.getElementById("xpFill").style.width = `${Math.max(4, within)}%`;
  document.getElementById("literacyTitle").textContent = `${titles[level - 1]} · ${Math.round(m.literacyScore)}/100`;
}

function renderIncomeList() {
  const data = getMonthData(state.currentMonth);
  const list = document.getElementById("incomeList");
  const incomes = data.transactions.filter(t => t.type === "in");
  if (incomes.length === 0) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="wallet" class="w-8 h-8 text-charcoal/20"></i><p>Belum ada pendapatan bulan ini.</p><p class="text-xs text-charcoal/30">Klik tombol Tambah Pendapatan.</p></div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  list.innerHTML = "";
  incomes.forEach(t => {
    const cat = IN_CATS.find(c => c.key === t.category) || { label: t.category, icon: "plus-circle", color: "#7A9E7E" };
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
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
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
  const expenses = data.transactions.filter(t => t.type === "out");
  if (expenses.length === 0) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="wallet" class="w-8 h-8 text-charcoal/20"></i><p>Belum ada pengeluaran bulan ini.</p><p class="text-xs text-charcoal/30">Klik tombol Tambah Pengeluaran.</p></div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  list.innerHTML = "";
  expenses.forEach(t => {
    const cat = OUT_CATS.find(c => c.key === t.category) || { label: t.category, icon: "shopping-bag", color: "#C76D4E" };
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
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
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

function updateCharts() {
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions;
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = tx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);

  const pieCtx = document.getElementById("pieChart");
  if (pieChartInstance) pieChartInstance.destroy();
  if (pieCtx) {
    pieChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pendapatan', 'Pengeluaran'],
        datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#7A9E7E', '#C76D4E'], borderColor: ['#7A9E7E', '#C76D4E'], borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '65%', animation: { animateRotate: true, duration: 800 } }
    });
  }

  const days = {};
  tx.forEach(t => {
    const d = t.date;
    if (!days[d]) days[d] = { in: 0, out: 0 };
    if (t.type === "in") days[d].in += t.amount;
    else days[d].out += t.amount;
  });
  const sortedDates = Object.keys(days).sort();
  const labels = sortedDates.map(d => d.slice(5));
  const inData = sortedDates.map(d => days[d].in);
  const outData = sortedDates.map(d => days[d].out);

  const lineCtx = document.getElementById("lineChart");
  if (lineChartInstance) lineChartInstance.destroy();
  if (lineCtx) {
    lineChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Pendapatan', data: inData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3 },
          { label: 'Pengeluaran', data: outData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } }, animation: { duration: 800 } }
    });
  }

  const incomeDays = {};
  tx.filter(t => t.type === "in").forEach(t => {
    const d = t.date;
    if (!incomeDays[d]) incomeDays[d] = 0;
    incomeDays[d] += t.amount;
  });
  const incomeDates = Object.keys(incomeDays).sort();
  const incomeLabels = incomeDates.map(d => d.slice(5));
  const incomeData = incomeDates.map(d => incomeDays[d]);

  const incomeCtx = document.getElementById("incomeLineChart");
  if (incomeLineInstance) incomeLineInstance.destroy();
  if (incomeCtx) {
    incomeLineInstance = new Chart(incomeCtx, {
      type: 'line',
      data: { labels: incomeLabels, datasets: [{ label: 'Pendapatan', data: incomeData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } }, animation: { duration: 800 } }
    });
  }

  const expenseDays = {};
  tx.filter(t => t.type === "out").forEach(t => {
    const d = t.date;
    if (!expenseDays[d]) expenseDays[d] = 0;
    expenseDays[d] += t.amount;
  });
  const expenseDates = Object.keys(expenseDays).sort();
  const expenseLabels = expenseDates.map(d => d.slice(5));
  const expenseData = expenseDates.map(d => expenseDays[d]);

  const expenseCtx = document.getElementById("expenseLineChart");
  if (expenseLineInstance) expenseLineInstance.destroy();
  if (expenseCtx) {
    expenseLineInstance = new Chart(expenseCtx, {
      type: 'line',
      data: { labels: expenseLabels, datasets: [{ label: 'Pengeluaran', data: expenseData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } }, animation: { duration: 800 } }
    });
  }
}

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
  for (const monthKey of Object.keys(state.months)) {
    const monthData = state.months[monthKey];
    monthData.transactions.forEach(t => {
      if (t.date >= startStr && t.date <= endStr) allTx.push(t);
    });
  }
  const totalIn = allTx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = allTx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const diff = totalIn - totalOut;
  const count = allTx.length;
  const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const avg = count > 0 ? (totalIn + totalOut) / daysDiff : 0;
  document.getElementById("repTotalIn").textContent = fmtRp(totalIn);
  document.getElementById("repTotalOut").textContent = fmtRp(totalOut);
  document.getElementById("repDiff").textContent = fmtRp(diff);
  document.getElementById("repDiff").style.color = diff >= 0 ? 'var(--sage-green)' : 'var(--terracotta)';
  document.getElementById("repAvg").textContent = fmtRp(avg);
  document.getElementById("repCount").textContent = count;

  const daysMap = {};
  allTx.forEach(t => {
    const d = t.date;
    if (!daysMap[d]) daysMap[d] = { in: 0, out: 0 };
    if (t.type === "in") daysMap[d].in += t.amount;
    else daysMap[d].out += t.amount;
  });
  const sorted = Object.keys(daysMap).sort();
  const repLabels = sorted.map(d => d.slice(5));
  const repIn = sorted.map(d => daysMap[d].in);
  const repOut = sorted.map(d => daysMap[d].out);

  const reportCtx = document.getElementById("reportChart");
  if (reportChartInstance) reportChartInstance.destroy();
  if (reportCtx) {
    reportChartInstance = new Chart(reportCtx, {
      type: 'bar',
      data: {
        labels: repLabels,
        datasets: [
          { label: 'Pendapatan', data: repIn, backgroundColor: 'rgba(122,158,126,0.6)', borderColor: '#7A9E7E', borderWidth: 1 },
          { label: 'Pengeluaran', data: repOut, backgroundColor: 'rgba(199,109,78,0.6)', borderColor: '#C76D4E', borderWidth: 1 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } }, animation: { duration: 800 } }
    });
  }
}

function startTips() {
  const el = document.getElementById("tipText");
  if (el) {
    el.textContent = TIPS[0];
    setInterval(() => {
      tipIndex = (tipIndex + 1) % TIPS.length;
      el.textContent = TIPS[tipIndex];
    }, 7000);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ================== NAVIGATION ==================
function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      document.getElementById(`tab-${tab}`).classList.add("active");
      setTimeout(() => updateCharts(), 100);
      if (tab === "laporan") updateReport();
    });
  });
}

// ================== MODALS ==================
function setupModals() {
  const modalIncome = document.getElementById("modalIncome");
  const btnAddIncome = document.getElementById("btnAddIncome");
  const btnIncomeCancel = document.getElementById("modalIncomeCancel");
  const btnIncomeSave = document.getElementById("modalIncomeSave");

  btnAddIncome.addEventListener("click", () => {
    document.getElementById("incomeDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("incomeAmount").value = "";
    document.getElementById("incomeNote").value = "";
    modalIncome.classList.add("open");
  });
  btnIncomeCancel.addEventListener("click", () => modalIncome.classList.remove("open"));
  modalIncome.addEventListener("click", (e) => { if (e.target === modalIncome) modalIncome.classList.remove("open"); });
  btnIncomeSave.addEventListener("click", () => {
    const date = document.getElementById("incomeDate").value;
    const amount = parseRibuan(document.getElementById("incomeAmount").value);
    const note = document.getElementById("incomeNote").value.trim();
    if (!date || !amount || amount <= 0) { alert("Tanggal dan nominal harus diisi."); return; }
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

  btnAddExpense.addEventListener("click", () => {
    document.getElementById("expenseDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseNote").value = "";
    document.getElementById("expenseCategory").value = "kebutuhan";
    modalExpense.classList.add("open");
  });
  btnExpenseCancel.addEventListener("click", () => modalExpense.classList.remove("open"));
  modalExpense.addEventListener("click", (e) => { if (e.target === modalExpense) modalExpense.classList.remove("open"); });
  btnExpenseSave.addEventListener("click", () => {
    const date = document.getElementById("expenseDate").value;
    const amount = parseRibuan(document.getElementById("expenseAmount").value);
    const note = document.getElementById("expenseNote").value.trim();
    const category = document.getElementById("expenseCategory").value;
    if (!date || !amount || amount <= 0) { alert("Tanggal dan nominal harus diisi."); return; }
    const d = getMonthData(state.currentMonth);
    d.transactions.unshift({ id: uid(), type: "out", category, amount, note, date });
    saveState();
    renderAll();
    modalExpense.classList.remove("open");
  });
}

// ================== CURRENCY INPUTS ==================
function attachCurrencyInputs() {
  const allowanceInput = document.getElementById("allowanceInput");
  if (allowanceInput) {
    attachCurrencyInput(allowanceInput, (value) => {
      getMonthData(state.currentMonth).allowance = value;
      saveState();
      renderSummary();
      renderGauges();
    });
  }
  attachCurrencyInput(document.getElementById("incomeAmount"));
  attachCurrencyInput(document.getElementById("expenseAmount"));
}

// ================== POPUPS ==================
function setupPopups() {
  const overlay = document.getElementById("popupOverlay");
  const closeBtn = document.getElementById("popupClose");
  const shortcutBtn = document.getElementById("popupShortcut");
  let currentPopupKey = null;

  function openPopup(key) {
    const data = POPUP_DATA[key];
    if (!data) return;
    currentPopupKey = key;
    document.getElementById("popupTitleText").textContent = data.title;
    document.getElementById("popupDescription").textContent = data.description;
    shortcutBtn.textContent = data.shortcutLabel || "Lihat Detail";
    shortcutBtn.style.display = data.shortcut ? "inline-block" : "none";
    overlay.classList.add("open");
    setTimeout(() => { if (typeof lucide !== "undefined") lucide.createIcons(); }, 50);
  }

  function closePopup() { overlay.classList.remove("open"); currentPopupKey = null; }

  closeBtn.addEventListener("click", closePopup);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });

  shortcutBtn.addEventListener("click", () => {
    const data = POPUP_DATA[currentPopupKey];
    if (!data || !data.shortcut) return;
    closePopup();
    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(b => { if (b.getAttribute("data-tab") === data.shortcut) b.click(); });
  });

  document.querySelectorAll("[data-popup]").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-popup");
      openPopup(key);
    });
  });

  document.getElementById("wealthCard").addEventListener("click", () => {
    const m = computeMetrics();
    const data = getMonthData(state.currentMonth);
    document.getElementById("popupTitleText").textContent = "Total Kekayaan - Rincian";
    document.getElementById("popupDescription").innerHTML = `
      <div class="wealth-detail-grid">
        <div class="wealth-detail-item"><span class="label">Kas Dompet</span><span class="value">${fmtRp(data.kas)}</span></div>
        <div class="wealth-detail-item"><span class="label">E-Wallet</span><span class="value">${fmtRp(data.ewallet)}</span></div>
        <div class="wealth-detail-item"><span class="label">Total Tabungan</span><span class="value gold">${fmtRp(m.totalTabungan)}</span></div>
        <div class="wealth-detail-item"><span class="label">Dana Darurat</span><span class="value green">${fmtRp(m.totalDarurat)}</span></div>
        <div class="wealth-detail-item"><span class="label">Utang</span><span class="value red">${fmtRp(data.utang)}</span></div>
        <div class="wealth-detail-item" style="grid-column: span 2; background: rgba(200,155,60,0.08); border-color: var(--muted-gold);"><span class="label" style="font-weight:700;">Total Kekayaan Bersih</span><span class="value" style="font-size:16px;color:var(--muted-gold);">${fmtRp(m.totalWealth)}</span></div>
      </div>
      <p style="font-size:13px;color:rgba(44,42,38,0.6);margin-top:4px;">Total kekayaan = Kas + E-Wallet + Tabungan + Dana Darurat - Utang</p>
    `;
    shortcutBtn.textContent = "Lihat Rincian Aset";
    shortcutBtn.style.display = "inline-block";
    shortcutBtn.onclick = () => {
      closePopup();
      document.querySelector(".asset-panel").scrollIntoView({ behavior: "smooth" });
    };
    overlay.classList.add("open");
    setTimeout(() => { if (typeof lucide !== "undefined") lucide.createIcons(); }, 50);
  });
}

// ================== EVENTS ==================
function attachEvents() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    state.currentMonth = shiftMonth(state.currentMonth, -1);
    getMonthData(state.currentMonth);
    saveState();
    renderAll();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    state.currentMonth = shiftMonth(state.currentMonth, 1);
    getMonthData(state.currentMonth);
    saveState();
    renderAll();
  });
  document.getElementById("exportBtn").addEventListener("click", exportToFile);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFileInput").click());
  document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importFromFile(file);
    e.target.value = "";
  });
  document.getElementById("connectFileBtn").addEventListener("click", () => {
    if (window.showSaveFilePicker) {
      alert("Browser ini mendukung koneksi langsung ke file. Saat Anda menekan Simpan, Anda bisa memilih lokasi penyimpanan permanen untuk storage.txt.");
    } else {
      alert("Browser ini belum mendukung koneksi langsung ke file. Gunakan tombol Simpan untuk mengunduh storage.txt dan tombol Muat untuk membukanya kembali.");
    }
  });
  document.getElementById("reportPeriod").addEventListener("change", updateReport);
  document.getElementById("reportDate").addEventListener("change", updateReport);
  document.getElementById("reportDate").value = new Date().toISOString().slice(0, 10);
}

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  setupNavigation();
  setupModals();
  attachCurrencyInputs();
  attachEvents();
  setupPopups();
  renderAll();
  startTips();
  if (typeof lucide !== "undefined") lucide.createIcons();
});
