// =============================================================
// GWCATAT — app.js (Arsitektur 5 Halaman & Shortcut Lengkap)
// =============================================================

// ===== CEK SESSION =====
const session = JSON.parse(localStorage.getItem('gwcatat_session') || 'null');
if (!session) {
  window.location.href = 'login.html';
}

// User-specific storage key agar data terisolasi per akun
const userStorageKey = session && session.email
  ? `gwcatat_${session.email.replace(/[^a-zA-Z0-9]/g, '_')}_transactions`
  : 'gwcatat_transactions';

// ===== LOGOUT =====
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('gwcatat_session');
  window.location.href = 'login.html';
});

// ===== STATE =====
let currentMonth = currentMonthKey();
let transactions = loadTransactions();
let chartInstances = {
  pie: null,
  line: null,
  income: null,
  expense: null,
  savings: null,
  report: null
};

// Load transaksi dengan fallback
function loadTransactions() {
  const userTx = localStorage.getItem(userStorageKey);
  if (userTx) {
    try { return JSON.parse(userTx) || []; } catch (e) {}
  }
  const globalTx = localStorage.getItem('gwcatat_transactions');
  if (globalTx) {
    try {
      const parsed = JSON.parse(globalTx) || [];
      localStorage.setItem(userStorageKey, JSON.stringify(parsed));
      return parsed;
    } catch (e) {}
  }
  return [];
}

// ===== PEMETAAN KATEGORI & PILAR 50/30/20 =====
const CAT_INFO = {
  // Pemasukan
  pemasukan:   { label: 'Pemasukan Umum', pillar: 'income' },
  uang_jajan:  { label: 'Uang Jajan / Kiriman', pillar: 'income' },
  gaji:        { label: 'Gaji Pokok', pillar: 'income' },
  bonus:       { label: 'Bonus / THR', pillar: 'income' },
  investasi:   { label: 'Hasil Investasi / Usaha', pillar: 'income' },

  // Pengeluaran: Kebutuhan Pokok (50%)
  kebutuhan:   { label: 'Kebutuhan Pokok', pillar: 'kebutuhan' },
  makan:       { label: 'Makan & Minum', pillar: 'kebutuhan' },
  transport:   { label: 'Transportasi / Bensin', pillar: 'kebutuhan' },
  tagihan:     { label: 'Tagihan & Utilitas', pillar: 'kebutuhan' },

  // Pengeluaran: Keinginan & Gaya Hidup (30%)
  keinginan:   { label: 'Keinginan & Belanja', pillar: 'keinginan' },
  hiburan:     { label: 'Hiburan & Nongkrong', pillar: 'keinginan' },

  // Pengeluaran / Alokasi: Simpanan & Tabungan (20%)
  tabungan:    { label: 'Tabungan Masa Depan', pillar: 'tabungan' },
  darurat:     { label: 'Simpanan Dana Darurat', pillar: 'darurat' },

  // Lainnya
  lainnya:     { label: 'Lainnya', pillar: 'keinginan' }
};

function getPillar(cat) {
  if (CAT_INFO[cat]) return CAT_INFO[cat].pillar;
  return 'keinginan';
}

function getCategoryLabel(cat) {
  return CAT_INFO[cat] ? CAT_INFO[cat].label : (cat || 'Lainnya');
}

// ===== HELPERS =====
function currentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(key) {
  if (!key || typeof key !== 'string') return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function fmtRp(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + 'Rp' + Math.abs(v).toLocaleString('id-ID');
}

function parseRibuan(v) {
  if (typeof v !== 'string') return Math.floor(Number(v) || 0);
  return parseInt(v.replace(/[^0-9]/g, '') || '0', 10);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function saveData() {
  localStorage.setItem(userStorageKey, JSON.stringify(transactions));
  localStorage.setItem('gwcatat_transactions', JSON.stringify(transactions));
}

function safeDestroy(inst) {
  if (inst) {
    try { inst.destroy(); } catch (e) {}
  }
  return null;
}

function formatAmountInput(el) {
  if (!el) return;
  el.addEventListener('input', function () {
    const raw = this.value.replace(/[^0-9]/g, '');
    this.value = raw ? Number(raw).toLocaleString('id-ID') : '';
  });
}

// ===== RING & BADGE HELPERS =====
function setRing(id, percentage, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const p = Math.min(100, Math.max(0, percentage));
  const deg = (p / 100) * 360;
  el.style.background = `conic-gradient(${color} ${deg}deg, #e8e4de ${deg}deg)`;
}

function setBadge(id, text, color) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    let badgeClass = 'badge';
    if (color === '#5a9367') badgeClass += ' healthy';
    else if (color === '#C89B3C') badgeClass += ' warn';
    else if (color === '#c0604a') badgeClass += ' danger';
    el.className = badgeClass;
    if (color) {
      el.style.color = color;
      el.style.backgroundColor = color + '22';
    }
  }
}

// ===== MODAL TRANSAKSI LOGIC =====
let modalMode = 'in'; // 'in' or 'out'

const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const modalSubmit   = document.getElementById('modalSubmit');
const modalDate     = document.getElementById('modalDate');
const modalDesc     = document.getElementById('modalDesc');
const modalAmount   = document.getElementById('modalAmount');
const modalClose    = document.getElementById('modalClose');
const modalCategory = document.getElementById('modalCategory');
const transactionForm = document.getElementById('transactionForm');

if (modalAmount) formatAmountInput(modalAmount);

function openModal(mode, defaultCategory = null) {
  modalMode = mode;
  if (!modalOverlay) return;

  if (modalDate) modalDate.value = new Date().toISOString().slice(0, 10);
  if (modalDesc) modalDesc.value = '';
  if (modalAmount) modalAmount.value = '';

  if (mode === 'in') {
    if (modalTitle) modalTitle.textContent = '+ Tambah Pendapatan';
    if (modalSubmit) {
      modalSubmit.textContent = 'Simpan Pendapatan (Enter)';
      modalSubmit.className = 'modal-submit income';
    }
    if (modalCategory) {
      modalCategory.innerHTML = `
        <option value="pemasukan">Pemasukan Umum</option>
        <option value="gaji">Gaji Pokok</option>
        <option value="uang_jajan">Uang Jajan / Kiriman</option>
        <option value="bonus">Bonus / THR</option>
        <option value="investasi">Hasil Investasi / Usaha</option>
        <option value="lainnya">Lainnya</option>
      `;
      modalCategory.value = defaultCategory || 'pemasukan';
    }
  } else {
    const isSavings = defaultCategory === 'tabungan' || defaultCategory === 'darurat';
    if (modalTitle) {
      modalTitle.textContent = isSavings ? '★ Alokasi Tabungan & Simpanan' : '− Tambah Pengeluaran';
    }
    if (modalSubmit) {
      modalSubmit.textContent = isSavings ? 'Simpan Alokasi Tabungan (Enter)' : 'Simpan Pengeluaran (Enter)';
      modalSubmit.className = isSavings ? 'modal-submit savings' : 'modal-submit expense';
    }
    if (modalCategory) {
      modalCategory.innerHTML = `
        <optgroup label="Simpanan & Tabungan (20%)">
          <option value="tabungan">Tabungan Masa Depan</option>
          <option value="darurat">Simpanan Dana Darurat</option>
        </optgroup>
        <optgroup label="Kebutuhan Pokok (50%)">
          <option value="makan">Makan & Minum</option>
          <option value="kebutuhan">Kebutuhan Harian</option>
          <option value="transport">Transportasi / Bensin</option>
          <option value="tagihan">Tagihan & Utilitas</option>
        </optgroup>
        <optgroup label="Gaya Hidup & Keinginan (30%)">
          <option value="keinginan">Keinginan & Belanja</option>
          <option value="hiburan">Hiburan & Nongkrong</option>
          <option value="lainnya">Lainnya</option>
        </optgroup>
      `;
      modalCategory.value = defaultCategory || (isSavings ? defaultCategory : 'makan');
    }
  }
  modalOverlay.classList.add('open');

  // Auto focus ke kolom nominal
  setTimeout(() => {
    if (modalAmount) modalAmount.focus();
  }, 100);
}

function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove('open');
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function submitTransaction() {
  try {
    const date = modalDate ? modalDate.value : null;
    const desc = modalDesc ? modalDesc.value.trim() : '';
    const finalDesc = desc || (modalMode === 'in' ? 'Pendapatan' : 'Pengeluaran');
    const amount = modalAmount ? parseRibuan(modalAmount.value) : 0;
    const cat = modalCategory ? modalCategory.value : 'lainnya';

    if (!date || !amount) {
      if (modalAmount && !amount) modalAmount.focus();
      else if (modalDate && !date) modalDate.focus();
      return;
    }

    transactions.push({
      id: uid(),
      date,
      description: finalDesc,
      amount,
      type: modalMode,
      category: cat
    });

    saveData();

    // Sinkronkan currentMonth ke bulan transaksi
    const txMonth = date.slice(0, 7);
    if (txMonth !== currentMonth) {
      currentMonth = txMonth;
    }

    closeModal();
    renderAll();
  } catch (err) {
    console.error("Error saving transaction:", err);
    alert("Terjadi kesalahan saat menyimpan transaksi.");
  }
}

if (modalSubmit) {
  modalSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    submitTransaction();
  });
}

if (transactionForm) {
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitTransaction();
  });
}

// Tombol Enter pada input modal
[modalDate, modalDesc, modalAmount, modalCategory].forEach(el => {
  el?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTransaction();
    }
  });
});

// ===== RENDER ALL =====
function renderAll() {
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
  const labelEl = document.getElementById('monthLabel');
  if (labelEl) labelEl.textContent = monthLabel(currentMonth);

  renderSummary(monthTx);
  renderCharts(monthTx);
  renderIncomeList(monthTx);
  renderExpenseList(monthTx);
  renderSavings(monthTx);
  renderCalendar(monthTx);
  renderHealthIndicators(monthTx);
  renderAllowance(monthTx);
  updateReport(monthTx);
}

// ===== 1. SUMMARY CARDS (BERANDA) =====
function renderSummary(tx) {
  const totalIn = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
  const totalSimpanan = tx.filter(t => t.type === 'out' && (getPillar(t.category) === 'tabungan' || getPillar(t.category) === 'darurat'))
                          .reduce((s, t) => s + Number(t.amount), 0);

  const sisaKas = totalIn - totalOut;
  const totalWealth = Math.max(0, sisaKas) + totalSimpanan;

  const elIn = document.getElementById('totalIn');
  if (elIn) elIn.textContent = fmtRp(totalIn);

  const elOut = document.getElementById('totalOut');
  if (elOut) elOut.textContent = fmtRp(totalOut);

  const elSisa = document.getElementById('sisaSaldo');
  if (elSisa) {
    elSisa.textContent = fmtRp(sisaKas);
    elSisa.style.color = sisaKas >= 0 ? '' : 'var(--red)';
  }

  const elWealth = document.getElementById('totalWealth');
  if (elWealth) {
    elWealth.textContent = fmtRp(totalWealth);
  }
}

// ===== 2. CHARTS (BERANDA, PENDAPATAN, PENGELUARAN) =====
function renderCharts(tx) {
  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);

  // 1. Pie Chart Beranda
  const pieCtx = document.getElementById('pieChart');
  if (pieCtx) {
    chartInstances.pie = safeDestroy(chartInstances.pie);
    if (totalIn > 0 || totalOut > 0) {
      chartInstances.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pendapatan', 'Pengeluaran'],
          datasets: [{
            data: [totalIn, totalOut],
            backgroundColor: ['#5a9367', '#c0604a'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtRp(ctx.raw)}` } }
          },
          cutout: '68%',
          animation: { duration: 300 }
        }
      });
    }
  }

  // 2. Line Chart Tren Harian
  const days = {};
  tx.forEach(t => {
    if (t.date) {
      if (!days[t.date]) days[t.date] = { in: 0, out: 0 };
      if (t.type === 'in') days[t.date].in += Number(t.amount);
      else days[t.date].out += Number(t.amount);
    }
  });

  const dates  = Object.keys(days).sort().slice(-31);
  const labels = dates.map(d => d.slice(5));
  const inData  = dates.map(d => days[d].in || 0);
  const outData = dates.map(d => days[d].out || 0);

  const lineCtx = document.getElementById('lineChart');
  if (lineCtx) {
    chartInstances.line = safeDestroy(chartInstances.line);
    if (labels.length) {
      chartInstances.line = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Pendapatan', data: inData, borderColor: '#5a9367', backgroundColor: 'rgba(90,147,103,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
            { label: 'Pengeluaran', data: outData, borderColor: '#c0604a', backgroundColor: 'rgba(192,96,74,0.08)', fill: true, tension: 0.4, pointRadius: 3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtRp(ctx.raw)}` } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 11 } } },
            x: { ticks: { font: { family: 'Manrope', size: 11 } } }
          },
          animation: { duration: 300 }
        }
      });
    }
  }

  // 3. Tab Pendapatan Chart
  const incDays = {};
  tx.filter(t => t.type === 'in').forEach(t => {
    if (t.date) incDays[t.date] = (incDays[t.date] || 0) + Number(t.amount);
  });
  const incDates  = Object.keys(incDays).sort().slice(-31);
  const incLabels = incDates.map(d => d.slice(5));
  const incData   = incDates.map(d => incDays[d] || 0);
  const incCtx    = document.getElementById('incomeLineChart');
  if (incCtx) {
    chartInstances.income = safeDestroy(chartInstances.income);
    if (incLabels.length) {
      chartInstances.income = new Chart(incCtx, {
        type: 'line',
        data: {
          labels: incLabels,
          datasets: [{ label: 'Pendapatan', data: incData, borderColor: '#5a9367', backgroundColor: 'rgba(90,147,103,0.1)', fill: true, tension: 0.4, pointRadius: 3 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${fmtRp(ctx.raw)}` } } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 11 } } } },
          animation: { duration: 300 }
        }
      });
    }
  }

  // 4. Tab Pengeluaran Chart
  const expDays = {};
  tx.filter(t => t.type === 'out').forEach(t => {
    if (t.date) expDays[t.date] = (expDays[t.date] || 0) + Number(t.amount);
  });
  const expDates  = Object.keys(expDays).sort().slice(-31);
  const expLabels = expDates.map(d => d.slice(5));
  const expData   = expDates.map(d => expDays[d] || 0);
  const expCtx    = document.getElementById('expenseLineChart');
  if (expCtx) {
    chartInstances.expense = safeDestroy(chartInstances.expense);
    if (expLabels.length) {
      chartInstances.expense = new Chart(expCtx, {
        type: 'bar',
        data: {
          labels: expLabels,
          datasets: [{ label: 'Pengeluaran', data: expData, backgroundColor: 'rgba(192,96,74,0.65)', borderColor: '#c0604a', borderWidth: 1, borderRadius: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${fmtRp(ctx.raw)}` } } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 11 } } } },
          animation: { duration: 300 }
        }
      });
    }
  }
}

// ===== 3. TRANSACTION LISTS =====
function txItemHTML(t) {
  const isIn = t.type === 'in';
  const isSavings = t.type === 'out' && (getPillar(t.category) === 'tabungan' || getPillar(t.category) === 'darurat');
  const catLabel = getCategoryLabel(t.category);
  
  let iconClass = isIn ? 'in' : (isSavings ? 'savings' : 'out');
  let iconSymbol = isIn ? '↑' : (isSavings ? '★' : '↓');
  let amountClass = isIn ? 'in' : (isSavings ? 'savings' : 'out');
  let amountPrefix = isIn ? '+' : '−';

  return `
  <div class="tx-item">
    <div class="tx-icon ${iconClass}">${iconSymbol}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.description || (isIn ? 'Pendapatan' : 'Pengeluaran')}</div>
      <div class="tx-date">${t.date} · <span style="font-weight:600">${catLabel}</span></div>
    </div>
    <span class="tx-amount ${amountClass}">${amountPrefix}${fmtRp(t.amount)}</span>
    <button class="tx-del" data-id="${t.id}" title="Hapus transaksi">✕</button>
  </div>`;
}

function bindDeleteButtons() {
  document.querySelectorAll('.tx-del').forEach(btn => {
    btn.onclick = function () {
      if (!confirm('Hapus transaksi ini?')) return;
      transactions = transactions.filter(t => t.id !== this.dataset.id);
      saveData();
      renderAll();
    };
  });
}

function renderIncomeList(tx) {
  const list = document.getElementById('incomeList');
  if (!list) return;
  const items = tx.filter(t => t.type === 'in').sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Belum ada catatan pendapatan bulan ini.</div>';
    return;
  }
  list.innerHTML = '<div class="tx-list">' + items.map(txItemHTML).join('') + '</div>';
  bindDeleteButtons();
}

function renderExpenseList(tx) {
  const list = document.getElementById('expenseList');
  if (!list) return;
  // Tampilkan pengeluaran non-tabungan
  const items = tx.filter(t => t.type === 'out' && getPillar(t.category) !== 'tabungan' && getPillar(t.category) !== 'darurat')
                  .sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Belum ada catatan pengeluaran belanja bulan ini.</div>';
    return;
  }
  list.innerHTML = '<div class="tx-list">' + items.map(txItemHTML).join('') + '</div>';
  bindDeleteButtons();
}

// ===== 4. HALAMAN TABUNGAN (KHUSUS & DETAIL) =====
function renderSavings(tx) {
  const tabunganAmt = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'tabungan').reduce((s, t) => s + Number(t.amount), 0);
  const daruratAmt  = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'darurat').reduce((s, t) => s + Number(t.amount), 0);
  const totalSimpanan = tabunganAmt + daruratAmt;

  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
  const sisaKas  = totalIn - totalOut;
  const totalWealth = Math.max(0, sisaKas) + totalSimpanan;

  const effectiveSavings = totalSimpanan + Math.max(0, sisaKas);
  const savingsRatio = totalIn > 0 ? (effectiveSavings / totalIn) * 100 : (totalSimpanan > 0 ? 100 : 0);

  // Set ringkasan metrik tabungan
  const elSavTab = document.getElementById('savPageTotalTabungan');
  if (elSavTab) elSavTab.textContent = fmtRp(tabunganAmt);

  const elSavDar = document.getElementById('savPageTotalDarurat');
  if (elSavDar) elSavDar.textContent = fmtRp(daruratAmt);

  const elSavWealth = document.getElementById('savPageTotalWealth');
  if (elSavWealth) elSavWealth.textContent = fmtRp(totalWealth);

  const elSavRatio = document.getElementById('savPageRatio');
  if (elSavRatio) elSavRatio.textContent = Math.round(savingsRatio) + '%';

  // Set 3 pilar card values
  const elFutureAmt = document.getElementById('pillarFutureAmt');
  if (elFutureAmt) elFutureAmt.textContent = fmtRp(tabunganAmt);

  const elEmergAmt = document.getElementById('pillarEmergencyAmt');
  if (elEmergAmt) elEmergAmt.textContent = fmtRp(daruratAmt);

  const elInvestAmt = document.getElementById('pillarInvestAmt');
  if (elInvestAmt) {
    const investAmt = tx.filter(t => t.type === 'in' && t.category === 'investasi').reduce((s, t) => s + Number(t.amount), 0);
    elInvestAmt.textContent = fmtRp(investAmt);
  }

  // Progress Bar Savings Goal
  const goalInput = document.getElementById('savingsGoalInput');
  const progressWrap = document.getElementById('savingsProgressWrap');
  const usageText = document.getElementById('savingsUsageText');
  const remainingText = document.getElementById('savingsRemainingText');
  const progressBar = document.getElementById('savingsProgressBar');

  if (goalInput && progressWrap) {
    const target = parseRibuan(goalInput.value);
    if (target > 0) {
      progressWrap.style.display = 'block';
      const percent = Math.round((totalSimpanan / target) * 100);
      const remaining = target - totalSimpanan;

      if (usageText) usageText.textContent = `Terkumpul: ${fmtRp(totalSimpanan)} / ${fmtRp(target)} (${percent}%)`;
      if (remainingText) {
        if (remaining <= 0) {
          remainingText.textContent = `🎉 Target Tercapai! (+${fmtRp(Math.abs(remaining))})`;
          remainingText.style.color = 'var(--green)';
        } else {
          remainingText.textContent = `Sisa Target: ${fmtRp(remaining)}`;
          remainingText.style.color = 'var(--gold)';
        }
      }
      if (progressBar) {
        progressBar.style.width = Math.min(100, percent) + '%';
        progressBar.style.background = percent >= 100 ? 'var(--green)' : 'var(--gold)';
      }
    } else {
      progressWrap.style.display = 'none';
    }
  }

  // Riwayat Pos Tabungan & Simpanan
  const list = document.getElementById('savingsList');
  if (list) {
    const savingsItems = tx.filter(t => t.type === 'out' && (getPillar(t.category) === 'tabungan' || getPillar(t.category) === 'darurat'))
                           .sort((a, b) => b.date.localeCompare(a.date));
    if (!savingsItems.length) {
      list.innerHTML = '<div class="empty-state">Belum ada alokasi tabungan atau dana darurat bulan ini.</div>';
    } else {
      list.innerHTML = '<div class="tx-list">' + savingsItems.map(txItemHTML).join('') + '</div>';
      bindDeleteButtons();
    }
  }

  // Savings Pie Chart
  const savCtx = document.getElementById('savingsPieChart');
  if (savCtx) {
    chartInstances.savings = safeDestroy(chartInstances.savings);
    if (tabunganAmt > 0 || daruratAmt > 0 || sisaKas > 0) {
      chartInstances.savings = new Chart(savCtx, {
        type: 'doughnut',
        data: {
          labels: ['Tabungan Masa Depan', 'Dana Darurat', 'Sisa Kas Mengendap'],
          datasets: [{
            data: [tabunganAmt, daruratAmt, Math.max(0, sisaKas)],
            backgroundColor: ['#C89B3C', '#264653', '#5a9367'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtRp(ctx.raw)}` } }
          },
          cutout: '62%',
          animation: { duration: 300 }
        }
      });
    }
  }
}

// ===== 5. ALLOWANCE PROGRESS =====
function renderAllowance(tx) {
  const allowanceInput = document.getElementById('allowanceInput');
  const progressWrap = document.getElementById('allowanceProgressWrap');
  const usageText = document.getElementById('allowanceUsageText');
  const remainingText = document.getElementById('allowanceRemainingText');
  const progressBar = document.getElementById('allowanceProgressBar');

  if (!allowanceInput || !progressWrap) return;

  const target = parseRibuan(allowanceInput.value);
  if (!target || target <= 0) {
    progressWrap.style.display = 'none';
    return;
  }

  progressWrap.style.display = 'block';

  const spent = tx.filter(t => t.type === 'out' && (getPillar(t.category) === 'keinginan' || t.category === 'makan'))
                  .reduce((s, t) => s + Number(t.amount), 0);

  const percent = Math.round((spent / target) * 100);
  const remaining = target - spent;

  if (usageText) {
    usageText.textContent = `Terpakai: ${fmtRp(spent)} / ${fmtRp(target)} (${percent}%)`;
  }

  if (remainingText) {
    if (remaining >= 0) {
      remainingText.textContent = `Sisa Jajan: ${fmtRp(remaining)}`;
      remainingText.style.color = percent > 85 ? 'var(--gold)' : 'var(--green)';
    } else {
      remainingText.textContent = `Over budget: ${fmtRp(Math.abs(remaining))}`;
      remainingText.style.color = 'var(--red)';
    }
  }

  if (progressBar) {
    progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (percent > 100) progressBar.style.background = 'var(--red)';
    else if (percent > 75) progressBar.style.background = 'var(--gold)';
    else progressBar.style.background = 'var(--green)';
  }
}

// ===== 6. KALENDER TRANSAKSI =====
function renderCalendar(tx) {
  const container = document.getElementById('calendarContainer');
  if (!container) return;
  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  let html = days.map(d => `<div class="cal-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTx = tx.filter(t => t.date === dateStr);
    const tIn = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
    const tOut = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
    const has = tIn > 0 || tOut > 0;
    html += `<div class="cal-day ${has ? 'has-tx' : ''}" data-date="${dateStr}">
      <div class="dnum">${d}</div>
      ${has ? `<div class="dsums">${tIn > 0 ? `<span class="din">+${fmtRp(tIn)}</span>` : ''}${tOut > 0 ? `<span class="dout"> -${fmtRp(tOut)}</span>` : ''}</div>` : ''}
    </div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.cal-day.has-tx').forEach(el => {
    el.addEventListener('click', function () {
      const date = this.dataset.date;
      const dayTx = tx.filter(t => t.date === date);
      const tIn = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
      const tOut = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
      const sumEl = document.getElementById('calendarSummary');
      if (sumEl) sumEl.textContent = `${date} — Masuk: ${fmtRp(tIn)} · Keluar: ${fmtRp(tOut)} (${dayTx.length} transaksi)`;
    });
  });
}

let currentCalculatedHealth = null;

// ===== 7. INDIKATOR KESEHATAN FINANSIAL =====
function renderHealthIndicators(tx) {
  const totalIncome = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
  
  const kebutuhanAmt = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'kebutuhan').reduce((s, t) => s + Number(t.amount), 0);
  const keinginanAmt = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'keinginan').reduce((s, t) => s + Number(t.amount), 0);
  const tabunganAmt  = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'tabungan').reduce((s, t) => s + Number(t.amount), 0);
  const daruratAmt   = tx.filter(t => t.type === 'out' && getPillar(t.category) === 'darurat').reduce((s, t) => s + Number(t.amount), 0);

  const totalExpense = kebutuhanAmt + keinginanAmt + tabunganAmt + daruratAmt;
  const sisaKas      = totalIncome - totalExpense;

  // 1. Rasio Tabungan
  const effectiveSavings = tabunganAmt + daruratAmt + Math.max(0, sisaKas);
  const savingsRatio = totalIncome > 0
    ? (effectiveSavings / totalIncome) * 100
    : (tabunganAmt + daruratAmt > 0 ? 100 : 0);

  const sv = savingsRatio >= 20 ? { color: '#5a9367', label: 'Sehat' }
           : savingsRatio >= 10 ? { color: '#C89B3C', label: 'Kurang' }
           : { color: '#c0604a', label: 'Bahaya' };
  setRing('ringSavings', savingsRatio, sv.color);
  const savValEl = document.getElementById('savingsValue');
  if (savValEl) savValEl.textContent = Math.round(savingsRatio) + '%';
  setBadge('savingsBadge', sv.label, sv.color);

  // 2. Rasio Gaya Hidup
  const lifestyleRatio = totalIncome > 0
    ? (keinginanAmt / totalIncome) * 100
    : (totalExpense > 0 ? (keinginanAmt / totalExpense) * 100 : 0);

  const ls = lifestyleRatio <= 30 ? { color: '#5a9367', label: 'Terkendali' }
           : lifestyleRatio <= 45 ? { color: '#C89B3C', label: 'Waspada' }
           : { color: '#c0604a', label: 'Boros' };
  setRing('ringLifestyle', 100 - lifestyleRatio, ls.color);
  const lifeValEl = document.getElementById('lifestyleValue');
  if (lifeValEl) lifeValEl.textContent = Math.round(lifestyleRatio) + '%';
  setBadge('lifestyleBadge', ls.label, ls.color);

  // 3. Rasio Likuiditas
  const pengeluaranRutin = (kebutuhanAmt + keinginanAmt) || (totalIncome * 0.5) || 1;
  const danaLikuid = Math.max(0, sisaKas) + tabunganAmt;
  const liquidityMonths = totalExpense > 0
    ? (danaLikuid / pengeluaranRutin)
    : (totalIncome > 0 ? 6 : 0);

  const liq = liquidityMonths >= 3 ? { color: '#5a9367', label: 'Aman' }
            : liquidityMonths >= 1 ? { color: '#C89B3C', label: 'Rawan' }
            : { color: '#c0604a', label: 'Defisit' };
  const tankFill = document.getElementById('tankFill');
  if (tankFill) {
    const perc = Math.min(100, Math.max(0, (liquidityMonths / 6) * 100));
    tankFill.style.height = perc + '%';
    tankFill.textContent = isFinite(liquidityMonths)
      ? (liquidityMonths >= 10 ? '9.9+×' : liquidityMonths.toFixed(1) + '×')
      : '∞';
  }
  setBadge('liquidBadge', liq.label, liq.color);

  // 4. Dana Darurat Progress
  const targetEmergency = pengeluaranRutin * 6;
  const danaDaruratTotal = daruratAmt + (sisaKas > 0 ? sisaKas * 0.3 : 0);
  const emergencyRatio = Math.min(100, Math.round((danaDaruratTotal / targetEmergency) * 100));

  const em = emergencyRatio >= 100 ? { color: '#5a9367', label: 'Terpenuhi' }
           : emergencyRatio >= 40  ? { color: '#C89B3C', label: 'Menuju' }
           : { color: '#c0604a', label: 'Mulai' };
  setRing('ringEmergency', emergencyRatio, em.color);
  const emValEl = document.getElementById('emergencyValue');
  if (emValEl) emValEl.textContent = Math.round(emergencyRatio) + '%';
  setBadge('emergencyBadge', em.label, em.color);

  // 5. Skor Literasi Finansial
  const scoreSavings = Math.min(100, (savingsRatio / 20) * 100);
  const scoreLifestyle = lifestyleRatio <= 30 ? 100 : Math.max(0, 100 - (lifestyleRatio - 30) * 3);
  const scoreLiquidity = Math.min(100, (liquidityMonths / 3) * 100);
  const scoreEmergency = Math.min(100, emergencyRatio * 1.5);

  const literacyScore = (totalIncome === 0 && totalExpense === 0)
    ? 50
    : Math.round((scoreSavings * 0.35) + (scoreLifestyle * 0.30) + (scoreLiquidity * 0.20) + (scoreEmergency * 0.15));

  const levels = ['Pemula Boros', 'Belajar Hemat', 'Cukup Cermat', 'Jagoan Hemat', 'Master Keuangan'];
  const levelIdx = literacyScore >= 81 ? 4
                 : literacyScore >= 61 ? 3
                 : literacyScore >= 41 ? 2
                 : literacyScore >= 21 ? 1 : 0;

  const lvlEl = document.getElementById('levelValue');
  if (lvlEl) lvlEl.textContent = 'Lv.' + (levelIdx + 1);
  const xpEl = document.getElementById('xpFill');
  if (xpEl) xpEl.style.width = Math.min(100, Math.max(5, literacyScore)) + '%';
  const litTitleEl = document.getElementById('literacyTitle');
  if (litTitleEl) litTitleEl.textContent = levels[levelIdx] + ' · ' + literacyScore + '/100';

  currentCalculatedHealth = {
    savingsRatio, sv,
    lifestyleRatio, ls,
    liquidityMonths, liq,
    emergencyRatio, em,
    literacyScore, levelIdx, levels,
    effectiveSavings, tabunganAmt, daruratAmt, sisaKas
  };
}

// ===== POPUP EDUKASI FINANSIAL =====
const popInfo = {
  savings: {
    title: "1. Rasio Tabungan (Savings Ratio)",
    getVal: (r) => `${Math.round(r.savingsRatio)}%`,
    badgeText: (r) => r.sv.label,
    badgeColor: (r) => r.sv.color,
    desc: "Menghitung tabungan yang disetor serta sisa kas positif yang diamankan. Minimal 20% dari pendapatan wajib disisihkan untuk masa depan.",
    formula: "(Tabungan Disetor + Sisa Kas Positif) / Pendapatan × 100%",
    thresholds: [
      { text: "≥ 20% — Sehat (Kaidah 50/30/20)", color: "#5a9367" },
      { text: "10% – 19% — Kurang", color: "#C89B3C" },
      { text: "< 10% — Bahaya", color: "#c0604a" }
    ],
    refs: ["Kaidah 50/30/20 (Elizabeth Warren)", "CFP Board (Certified Financial Planner)"],
    tab: 'tabungan', category: 'tabungan', btnText: "Ke Halaman Tabungan"
  },
  lifestyle: {
    title: "2. Rasio Gaya Hidup (Lifestyle Ratio)",
    getVal: (r) => `${Math.round(r.lifestyleRatio)}%`,
    badgeText: (r) => r.ls.label,
    badgeColor: (r) => r.ls.color,
    desc: "Mengukur pengeluaran keinginan, hiburan, dan belanja tersier. Maksimal 30% dari pendapatan agar tidak terjadi self-sabotage keuangan.",
    formula: "Pengeluaran Keinginan & Hiburan / Pendapatan × 100%",
    thresholds: [
      { text: "≤ 30% — Terkendali", color: "#5a9367" },
      { text: "31% – 45% — Waspada", color: "#C89B3C" },
      { text: "> 45% — Boros", color: "#c0604a" }
    ],
    refs: ["Pedoman Otoritas Jasa Keuangan (OJK)", "The 50/30/20 Budgeting Rule"],
    tab: 'pengeluaran', category: 'keinginan', btnText: "Evaluasi Pengeluaran"
  },
  liquidity: {
    title: "3. Rasio Likuiditas (Liquidity Ratio)",
    getVal: (r) => isFinite(r.liquidityMonths) ? (r.liquidityMonths >= 10 ? '9.9+×' : `${r.liquidityMonths.toFixed(1)}×`) : '∞',
    badgeText: (r) => r.liq.label,
    badgeColor: (r) => r.liq.color,
    desc: "Berapa bulan pengeluaran rutin yang sanggup ditopang oleh sisa uang kas dan tabunganmu saat ini jika pemasukan tiba-tiba berhenti.",
    formula: "(Sisa Kas + Tabungan) / Pengeluaran Rutin Bulanan",
    thresholds: [
      { text: "≥ 3× Bulan — Aman", color: "#5a9367" },
      { text: "1× – 2.9× Bulan — Rawan", color: "#C89B3C" },
      { text: "< 1× Bulan — Defisit", color: "#c0604a" }
    ],
    refs: ["CFP Board Standards", "Standard Financial Planning Benchmarks"],
    tab: 'beranda', section: 'summary-grid', btnText: "Lihat Saldo Kas di Beranda"
  },
  emergency: {
    title: "4. Dana Darurat (Emergency Fund)",
    getVal: (r) => `${Math.round(r.emergencyRatio)}%`,
    badgeText: (r) => r.em.label,
    badgeColor: (r) => r.em.color,
    desc: "Progres pemenuhan dana darurat setara 6 bulan pengeluaran rutin sebagai jaring pengaman saat terjadi hal tidak terduga.",
    formula: "Simpanan Darurat / (Pengeluaran Bulanan × 6) × 100%",
    thresholds: [
      { text: "≥ 100% — Terpenuhi", color: "#5a9367" },
      { text: "40% – 99% — Menuju Target", color: "#C89B3C" },
      { text: "< 40% — Mulai Kumpulkan", color: "#c0604a" }
    ],
    refs: ["Perencana Keuangan Independen", "OJK Edukasi Finansial"],
    tab: 'tabungan', category: 'darurat', btnText: "Buka Pos Dana Darurat"
  },
  literacy: {
    title: "5. Skor Literasi Keuangan & Gamifikasi",
    getVal: (r) => `Lv.${r.levelIdx + 1} · ${r.levels[r.levelIdx]} (${r.literacyScore}/100)`,
    badgeText: (r) => `Lv.${r.levelIdx + 1}`,
    badgeColor: "#5a9367",
    desc: "Skor kesehatan finansial menyeluruh yang menilai porsi tabungan, pengendalian belanja, rasio likuiditas, dan konsistensi dana darurat.",
    formula: "Kombinasi Tertimbang: 35% Tabungan + 30% Gaya Hidup + 20% Likuiditas + 15% Darurat",
    thresholds: [
      { text: "81–100 — Lv.5 Master Keuangan", color: "#5a9367" },
      { text: "61–80 — Lv.4 Jagoan Hemat", color: "#5a9367" },
      { text: "41–60 — Lv.3 Cukup Cermat", color: "#C89B3C" },
      { text: "21–40 — Lv.2 Belajar Hemat", color: "#C89B3C" },
      { text: "0–20 — Lv.1 Pemula Boros", color: "#c0604a" }
    ],
    refs: ["Survei Nasional Literasi Keuangan (SNLIK OJK)", "OECD Financial Literacy Framework"],
    tab: 'beranda', section: 'healthGrid', btnText: "Lihat Indikator Lengkap"
  }
};

function openHealthModal(id) {
  const info = popInfo[id];
  const overlay = document.getElementById('healthModalOverlay');
  if (!info || !overlay) return;

  const titleEl = document.getElementById('healthModalTitle');
  if (titleEl) titleEl.textContent = info.title;

  const bText  = currentCalculatedHealth ? info.badgeText(currentCalculatedHealth) : '-';
  const bColor = currentCalculatedHealth ? info.badgeColor(currentCalculatedHealth) : '#5a9367';
  const badgeEl = document.getElementById('healthModalBadge');
  if (badgeEl) {
    badgeEl.textContent = bText;
    badgeEl.style.color = bColor;
    badgeEl.style.backgroundColor = bColor + '22';
  }

  const valEl = document.getElementById('healthModalValue');
  if (valEl) {
    valEl.textContent = currentCalculatedHealth ? info.getVal(currentCalculatedHealth) : '-';
    valEl.style.color = bColor;
  }

  const descEl = document.getElementById('healthModalDesc');
  if (descEl) descEl.textContent = info.desc;

  const formEl = document.getElementById('healthModalFormula');
  if (formEl) formEl.textContent = info.formula;

  const threshEl = document.getElementById('healthModalThresholds');
  if (threshEl) {
    threshEl.innerHTML = info.thresholds.map(t => `
      <div class="threshold-item">
        <span>${t.text}</span>
        <span class="badge" style="color:${t.color}; background:${t.color}22">Status</span>
      </div>
    `).join('');
  }

  const refEl = document.getElementById('healthModalRef');
  if (refEl) {
    refEl.innerHTML = info.refs.map(r => `<div class="ref-bullet">${r}</div>`).join('');
  }

  const actionBtn = document.getElementById('healthModalAction');
  if (actionBtn) {
    actionBtn.innerHTML = `<span>${info.btnText}</span> ➔`;
    actionBtn.onclick = () => {
      closeHealthModal();
      if (info.category) {
        openModal('out', info.category);
      } else if (info.tab) {
        switchTab(info.tab);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
  overlay.classList.add('open');
}

function closeHealthModal() {
  const overlay = document.getElementById('healthModalOverlay');
  if (overlay) overlay.classList.remove('open');
}

// ===== 8. LAPORAN KEUANGAN =====
function updateReport(tx) {
  try {
    const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
    const diff     = totalIn - totalOut;
    const count    = tx.length;

    const [y, m] = currentMonth.split('-').map(Number);
    const now = new Date();
    let daysCount = new Date(y, m, 0).getDate();
    if (now.getFullYear() === y && (now.getMonth() + 1) === m) {
      daysCount = Math.max(1, now.getDate());
    }
    const avgExpensePerDay = count ? (totalOut / daysCount) : 0;

    const repIn = document.getElementById('repTotalIn');
    if (repIn) repIn.textContent = fmtRp(totalIn);

    const repOut = document.getElementById('repTotalOut');
    if (repOut) repOut.textContent = fmtRp(totalOut);

    const diffEl = document.getElementById('repDiff');
    if (diffEl) {
      diffEl.textContent = fmtRp(diff);
      diffEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
    }

    const repAvg = document.getElementById('repAvg');
    if (repAvg) repAvg.textContent = fmtRp(avgExpensePerDay);

    const repCount = document.getElementById('repCount');
    if (repCount) repCount.textContent = count;

    // Bar chart laporan
    const days = {};
    tx.forEach(t => {
      if (!t.date) return;
      if (!days[t.date]) days[t.date] = { in: 0, out: 0 };
      if (t.type === 'in') days[t.date].in += Number(t.amount);
      else days[t.date].out += Number(t.amount);
    });

    const dates = Object.keys(days).sort().slice(-31);
    const labels = dates.map(d => d.slice(5));
    const inData = dates.map(d => days[d].in || 0);
    const outData = dates.map(d => days[d].out || 0);

    const ctx = document.getElementById('reportChart');
    if (ctx) {
      chartInstances.report = safeDestroy(chartInstances.report);
      if (labels.length) {
        chartInstances.report = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Pendapatan', data: inData, backgroundColor: 'rgba(90,147,103,0.7)', borderRadius: 4 },
              { label: 'Pengeluaran', data: outData, backgroundColor: 'rgba(192,96,74,0.7)', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } },
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtRp(ctx.raw)}` } }
            },
            scales: {
              y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 11 } } },
              x: { ticks: { font: { family: 'Manrope', size: 11 } } }
            },
            animation: { duration: 300 }
          }
        });
      }
    }
  } catch (e) {
    console.error("Error updating report:", e);
  }
}

// ===== 9. NAVIGASI 5 HALAMAN =====
const PAGE_TITLES = {
  beranda:     'Beranda',
  pendapatan:  'Pendapatan & Arus Masuk',
  pengeluaran: 'Pengeluaran & Belanja',
  tabungan:    'Manajemen Tabungan & Masa Depan',
  laporan:     'Laporan Keuangan & Statistik'
};

function switchTab(tabName) {
  if (!tabName) return;
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('active', el.id === 'tab-' + tabName);
  });

  const titleEl = document.getElementById('pageTitleIndicator');
  if (titleEl && PAGE_TITLES[tabName]) {
    titleEl.textContent = PAGE_TITLES[tabName];
  }

  // Update specific page data if needed
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
  if (tabName === 'tabungan') renderSavings(monthTx);
  if (tabName === 'laporan') updateReport(monthTx);

  // Close mobile sidebar
  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', function () {
    const tab = this.dataset.tab;
    switchTab(tab);
  });
});

// Mobile Sidebar Drawer
const appSidebar = document.getElementById('appSidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');

function openMobileSidebar() {
  appSidebar?.classList.add('open');
  sidebarBackdrop?.classList.add('open');
}

function closeMobileSidebar() {
  appSidebar?.classList.remove('open');
  sidebarBackdrop?.classList.remove('open');
}

mobileMenuBtn?.addEventListener('click', openMobileSidebar);
sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

// ===== 10. NAVIGASI BULAN =====
document.getElementById('prevMonth')?.addEventListener('click', () => {
  const [y, m] = currentMonth.split('-').map(Number);
  currentMonth = (m === 1) ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
  renderAll();
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
  const [y, m] = currentMonth.split('-').map(Number);
  currentMonth = (m === 12) ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
  renderAll();
});

// ===== 11. SAVINGS GOAL & ALLOWANCE EVENT =====
const allowanceInput = document.getElementById('allowanceInput');
if (allowanceInput) {
  formatAmountInput(allowanceInput);
  allowanceInput.value = localStorage.getItem('gwcatat_allowance') || '';
  allowanceInput.addEventListener('input', () => {
    localStorage.setItem('gwcatat_allowance', allowanceInput.value);
    const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    renderAllowance(monthTx);
  });
}

const savingsGoalInput = document.getElementById('savingsGoalInput');
if (savingsGoalInput) {
  formatAmountInput(savingsGoalInput);
  savingsGoalInput.value = localStorage.getItem('gwcatat_savings_goal') || '';
  savingsGoalInput.addEventListener('input', () => {
    localStorage.setItem('gwcatat_savings_goal', savingsGoalInput.value);
    const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    renderSavings(monthTx);
  });
}

// ===== 12. SHORTCUTS MODAL =====
const shortcutModalOverlay = document.getElementById('shortcutModalOverlay');
function openShortcutModal() {
  shortcutModalOverlay?.classList.add('open');
}
function closeShortcutModal() {
  shortcutModalOverlay?.classList.remove('open');
}

document.getElementById('btnShortcutGuide')?.addEventListener('click', openShortcutModal);
document.getElementById('shortcutModalClose')?.addEventListener('click', closeShortcutModal);
document.getElementById('shortcutModalDone')?.addEventListener('click', closeShortcutModal);
if (shortcutModalOverlay) {
  shortcutModalOverlay.addEventListener('click', (e) => {
    if (e.target === shortcutModalOverlay) closeShortcutModal();
  });
}

// ===== 13. GLOBAL KEYBOARD SHORTCUTS HANDLER =====
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isInputActive = activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea';

  // Modal Escape key
  if (e.key === 'Escape') {
    if (modalOverlay?.classList.contains('open')) closeModal();
    if (document.getElementById('healthModalOverlay')?.classList.contains('open')) closeHealthModal();
    if (shortcutModalOverlay?.classList.contains('open')) closeShortcutModal();
    closeMobileSidebar();
    return;
  }

  // Alt + Number (1-5) untuk pindah halaman
  if (e.altKey) {
    if (e.key === '1') { e.preventDefault(); switchTab('beranda'); return; }
    if (e.key === '2') { e.preventDefault(); switchTab('pendapatan'); return; }
    if (e.key === '3') { e.preventDefault(); switchTab('pengeluaran'); return; }
    if (e.key === '4') { e.preventDefault(); switchTab('tabungan'); return; }
    if (e.key === '5') { e.preventDefault(); switchTab('laporan'); return; }
    if (e.key.toLowerCase() === 'i') { e.preventDefault(); openModal('in'); return; }
    if (e.key.toLowerCase() === 'e') { e.preventDefault(); openModal('out'); return; }
    if (e.key.toLowerCase() === 's') { e.preventDefault(); openModal('out', 'tabungan'); return; }
    if (e.key.toLowerCase() === 'k') { e.preventDefault(); openShortcutModal(); return; }
  }

  // Quick single key shortcut ketika user tidak sedang mengetik di input
  if (!isInputActive && !modalOverlay?.classList.contains('open')) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      openModal('in');
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      openModal('out');
    }
  }
});

// ===== 14. TOMBOL-TOMBOL AKSI CEPAT =====
document.getElementById('btnIncome')?.addEventListener('click', () => openModal('in'));
document.getElementById('btnExpense')?.addEventListener('click', () => openModal('out'));
document.getElementById('btnSavingsAction')?.addEventListener('click', () => openModal('out', 'tabungan'));

document.getElementById('btnSideIncome')?.addEventListener('click', () => openModal('in'));
document.getElementById('btnSideExpense')?.addEventListener('click', () => openModal('out'));
document.getElementById('btnSideSavings')?.addEventListener('click', () => openModal('out', 'tabungan'));

document.getElementById('btnIncomeTab')?.addEventListener('click', () => openModal('in'));
document.getElementById('btnExpenseTab')?.addEventListener('click', () => openModal('out'));
document.getElementById('btnSavingsTab')?.addEventListener('click', () => openModal('out', 'tabungan'));
document.getElementById('btnEmergencyTab')?.addEventListener('click', () => openModal('out', 'darurat'));

// ===== 15. EKSPOR & IMPOR DATA CADANGAN =====
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const dataStr = JSON.stringify(transactions, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gwcatat_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

const importFileInput = document.getElementById('importFileInput');
document.getElementById('importBtn')?.addEventListener('click', () => {
  importFileInput?.click();
});

importFileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Impor ${imported.length} transaksi? Data saat ini akan digabungkan.`)) {
          const existingIds = new Set(transactions.map(t => t.id));
          imported.forEach(t => {
            if (!existingIds.has(t.id)) transactions.push(t);
          });
          saveData();
          renderAll();
          alert('Data transaksi berhasil diimpor!');
        }
      } else {
        alert('Format file JSON tidak valid.');
      }
    } catch (err) {
      alert('Gagal membaca file JSON cadangan.');
    }
  };
  reader.readAsText(file);
});

// ===== 16. REPORT FILTERS =====
document.getElementById('reportPeriod')?.addEventListener('change', () => {
  updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)));
});
document.getElementById('reportDate')?.addEventListener('change', () => {
  updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)));
});
if (document.getElementById('reportDate')) {
  document.getElementById('reportDate').value = new Date().toISOString().slice(0, 10);
}

// ===== 17. INIT =====
function init() {
  renderAll();

  const healthCloseBtn = document.getElementById('healthModalClose');
  const healthOverlay = document.getElementById('healthModalOverlay');
  if (healthCloseBtn) healthCloseBtn.onclick = closeHealthModal;
  if (healthOverlay) {
    healthOverlay.onclick = (e) => {
      if (e.target === healthOverlay) closeHealthModal();
    };
  }

  document.getElementById('cardSavings')?.addEventListener('click', () => openHealthModal('savings'));
  document.getElementById('cardLifestyle')?.addEventListener('click', () => openHealthModal('lifestyle'));
  document.getElementById('cardLiquidity')?.addEventListener('click', () => openHealthModal('liquidity'));
  document.getElementById('cardEmergency')?.addEventListener('click', () => openHealthModal('emergency'));
  document.getElementById('cardLiteracy')?.addEventListener('click', () => openHealthModal('literacy'));
}

document.addEventListener('DOMContentLoaded', init);
