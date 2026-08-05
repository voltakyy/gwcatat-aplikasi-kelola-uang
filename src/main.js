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
  if (!inputElement) return;
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
  const monthLabelEl = document.getElementById("monthLabel");
  if (monthLabelEl) monthLabelEl.textContent = monthLabel(state.currentMonth);
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
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("totalIn", fmtRp(m.totalIn));
  setText("totalOut", fmtRp(m.totalOut));
  setText("sisaSaldo", fmtRp(m.sisa));
  setText("totalWealth", fmtRp(m.totalWealth));
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
  if (!ringEl) return;
  const clamped = Math.max(0, Math.min(100, pct));
  ringEl.style.background = `conic-gradient(${color} ${clamped * 3.6}deg, ${PRIMARY_SOFT} ${clamped * 3.6}deg)`;
}

function renderGauges() {
  const m = computeMetrics();
  const data = getMonthData(state.currentMonth);
  const sv = statusFor(m.savingsRatio, 20, 10, false);
  setRing(document.getElementById("ringSavings"), m.savingsScore, sv.color);
  const savingsVal = document.getElementById("savingsValue");
  if (savingsVal) savingsVal.textContent = `${Math.round(m.savingsRatio)}%`;
  const savingsBadge = document.getElementById("savingsBadge");
  if (savingsBadge) {
    savingsBadge.className = "badge " + sv.badge;
    savingsBadge.textContent = m.savingsRatio >= 20 ? "Sehat" : m.savingsRatio >= 10 ? "Kurang" : "Rendah";
  }

  const ls = statusFor(m.lifestyleRatio, 30, 45, true);
  setRing(document.getElementById("ringLifestyle"), m.lifestyleScore, ls.color);
  const lifestyleVal = document.getElementById("lifestyleValue");
  if (lifestyleVal) lifestyleVal.textContent = `${Math.round(m.lifestyleRatio)}%`;
  const lifestyleBadge = document.getElementById("lifestyleBadge");
  if (lifestyleBadge) {
    lifestyleBadge.className = "badge " + ls.badge;
    lifestyleBadge.textContent = m.lifestyleRatio <= 30 ? "Terkendali" : m.lifestyleRatio <= 45 ? "Waspada" : "Boros";
  }

  const isNeg = m.netLiquid < 0;
  const scale = Math.max(m.baseIn * 0.5, 50000);
  const pct = isNeg ? 100 : Math.max(4, Math.min(100, (m.netLiquid / scale) * 100));
  const tankFill = document.getElementById("tankFill");
  if (tankFill) {
    tankFill.style.height = `${pct}%`;
    tankFill.style.background = isNeg ? `linear-gradient(180deg, rgba(199,109,78,0.75), ${COLORS.coral})` : `linear-gradient(180deg, rgba(122,158,126,0.75), ${COLORS.teal})`;
    tankFill.style.boxShadow = `0 0 14px ${isNeg ? COLORS.coral : COLORS.teal}`;
  }
  const liquidVal = document.getElementById("liquidValue");
  if (liquidVal) liquidVal.textContent = fmtRp(m.netLiquid);
  const liquidBadge = document.getElementById("liquidBadge");
  if (liquidBadge) {
    liquidBadge.className = "badge " + (isNeg ? "danger" : "");
    liquidBadge.textContent = isNeg ? "Defisit — cek utang" : "Aman & Positif";
  }

  const em = statusFor(m.emergencyRatio, 100, 50, false);
  setRing(document.getElementById("ringEmergency"), m.emergencyScore, em.color);
  const emergencyVal = document.getElementById("emergencyValue");
  if (emergencyVal) emergencyVal.textContent = `${Math.round(Math.min(999, m.emergencyRatio))}%`;
  const emergencyTargetLabel = document.getElementById("emergencyTargetLabel");
  if (emergencyTargetLabel) emergencyTargetLabel.textContent = `Target ${fmtRp(data.emergencyTarget)}`;
  const emergencyBadge = document.getElementById("emergencyBadge");
  if (emergencyBadge) {
    emergencyBadge.className = "badge " + em.badge;
    emergencyBadge.textContent = m.emergencyRatio >= 100 ? "Terpenuhi" : m.emergencyRatio >= 50 ? "Menuju" : "Mulai";
  }

  const level = Math.min(5, Math.max(1, Math.floor(m.literacyScore / 20) + 1));
  const titles = ["Pemula Boros", "Belajar Hemat", "Cukup Cermat", "Jagoan Hemat", "Master Keuangan"];
  const within = m.literacyScore % 20 === 0 && m.literacyScore > 0 ? 100 : (m.literacyScore % 20) * 5;
  const levelEl = document.getElementById("levelValue");
  if (levelEl) levelEl.textContent = `Lv.${level}`;
  const xpFill = document.getElementById("xpFill");
  if (xpFill) xpFill.style.width = `${Math.max(4, within)}%`;
  const literacyTitle = document.getElementById("literacyTitle");
  if (literacyTitle) literacyTitle.textContent = `${titles[level - 1]} · ${Math.round(m.literacyScore)}/100`;
}

// ================== RENDER INCOME LIST ==================
function renderIncomeList() {
  const data = getMonthData(state.currentMonth);
  const list = document.getElementById("incomeList");
  if (!list) return;
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

// ================== RENDER EXPENSE LIST ==================
function renderExpenseList() {
  const data = getMonthData(state.currentMonth);
  const list = document.getElementById("expenseList");
  if (!list) return;
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

// ================== ASSET PANEL ==================
function updateAssetPanel() {
  const data = getMonthData(state.currentMonth);
  const m = computeMetrics();
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("assetKas", fmtRp(data.kas));
  setText("assetEwallet", fmtRp(data.ewallet));
  setText("assetUtang", fmtRp(data.utang));
  setText("assetTabungan", fmtRp(m.totalTabungan));
  setText("assetDarurat", fmtRp(m.totalDarurat));
  setText("assetTargetDarurat", fmtRp(data.emergencyTarget));
}

// ================== CHART UPDATES (DIPERBAIKI) ==================
function safeDestroy(instance) {
  if (instance) {
    try { instance.destroy(); } catch (e) { /* ignore */ }
    return null;
  }
  return null;
}

function updateCharts() {
  const data = getMonthData(state.currentMonth);
  const tx = data.transactions;

  // --- PIE CHART ---
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = tx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const pieCtx = document.getElementById("pieChart");
  if (pieCtx) {
    pieChartInstance = safeDestroy(pieChartInstance);
    if (totalIn || totalOut) {
      pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pendapatan', 'Pengeluaran'],
          datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#7A9E7E', '#C76D4E'], borderColor: ['#7A9E7E', '#C76D4E'], borderWidth: 1 }]
        },
        position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: rgba(44, 42, 38, 0.4);
  transition: color 0.2s;
}
.close-popup:hover {
  color: #2D2D2D;
}
.shortcut-btn {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 40px;
  background: #264653;
  color: #fff;
  font-weight: 600;
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.25s;
}
.shortcut-btn:hover {
  background: #1d3a47;
  transform: translateY(-2px);
}

/* ---------- MODAL ---------- */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(44, 42, 38, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-overlay.open {
  display: flex;
}
.modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 28px 32px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(44, 42, 38, 0.08);
  animation: fadeSlide 0.3s ease;
  position: relative;
}
.modal h3 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #264653;
  margin-bottom: 1.125rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.modal h3 i {
  width: 1.25rem;
  height: 1.25rem;
  color: #C89B3C;
}
.form-group {
  margin-bottom: 0.875rem;
}
.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(44, 42, 38, 0.6);
  margin-bottom: 4px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: 10px;
  border: 1px solid rgba(44, 42, 38, 0.08);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.8125rem;
  color: #2D2D2D;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #C89B3C;
  box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.08);
}
.form-group textarea {
  resize: vertical;
  min-height: 60px;
}
.modal-actions {
  display: flex;
  gap: 0.625rem;
  margin-top: 1.125rem;
  justify-content: flex-end;
}
.btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 40px;
  background: #F1EFEA;
  color: #2D2D2D;
  font-weight: 600;
  font-size: 0.8125rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-secondary:hover {
  background: #d6d2ca;
}
.btn-primary {
  padding: 0.625rem 1.5rem;
  border-radius: 40px;
  background: #264653;
  color: #fff;
  font-weight: 600;
  font-size: 0.8125rem;
  border: none;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 14px rgba(38, 70, 83, 0.15);
}
.btn-primary:hover {
  background: #1d3a47;
  transform: translateY(-1px);
}

/* ---------- REPORT ---------- */
.report-stat {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(44, 42, 38, 0.08);
  border-radius: 14px;
  padding: 0.875rem 1rem;
  text-align: center;
}
.stat-label {
  font-size: 0.6875rem;
  color: rgba(44, 42, 38, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 1.125rem;
  color: #2D2D2D;
  margin-top: 4px;
}
.stat-value.gold {
  color: #C89B3C;
}
.stat-value.green {
  color: #7A9E7E;
}
.stat-value.red {
  color: #C76D4E;
}

/* ---------- WEALTH DETAIL ---------- */
.wealth-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
  margin: 0.75rem 0;
}
.wealth-detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(44, 42, 38, 0.08);
  font-size: 0.8125rem;
}
.wealth-detail-item .label {
  color: rgba(44, 42, 38, 0.6);
}
.wealth-detail-item .value {
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}
.wealth-detail-item .value.gold {
  color: #C89B3C;
}
.wealth-detail-item .value.green {
  color: #7A9E7E;
}
.wealth-detail-item .value.red {
  color: #C76D4E;
}

/* ---------- TARGET BOX ---------- */
.target-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  background: rgba(200, 155, 60, 0.06);
  border: 1px solid rgba(200, 155, 60, 0.15);
  border-radius: 14px;
  padding: 0.75rem 1rem;
}
.target-box label {
  font-weight: 600;
  font-size: 0.8125rem;
  color: #264653;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.target-box label i {
  width: 1rem;
  height: 1rem;
  color: #C89B3C;
}
.target-box input {
  flex: 1;
  min-width: 120px;
  padding: 0.5rem 0.875rem;
  border-radius: 10px;
  border: 1px solid rgba(44, 42, 38, 0.08);
  background: rgba(255, 255, 255, 0.6);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2D2D2D;
}
.target-box input:focus {
  border-color: #C89B3C;
  box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
}

/* ---------- ANIMATIONS ---------- */
@keyframes fadeSlide {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fadeSlide {
  animation: fadeSlide 0.3s ease;
}

/* ---------- SCROLLBAR ---------- */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: #F1EFEA;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: #C89B3C;
  border-radius: 10px;
    }
