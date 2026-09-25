// =============================================================
// GWCATAT — app.js
// =============================================================

// ===== CEK SESSION =====
const session = JSON.parse(localStorage.getItem('gwcatat_session') || 'null')
if (!session) window.location.href = '/login.html'

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('gwcatat_session')
  window.location.href = '/login.html'
})

// ===== STATE =====
let currentMonth = currentMonthKey()
let transactions = JSON.parse(localStorage.getItem('gwcatat_transactions') || '[]')
let chartInstances = { pie: null, line: null, income: null, expense: null, report: null }

// ===== HELPERS =====
function currentMonthKey() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}
function fmtRp(n) {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + 'Rp' + Math.abs(v).toLocaleString('id-ID')
}
function parseRibuan(v) {
  if (typeof v !== 'string') return Math.floor(Number(v) || 0)
  return parseInt(v.replace(/[^0-9]/g, '') || '0', 10)
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }
function saveData() { localStorage.setItem('gwcatat_transactions', JSON.stringify(transactions)) }
function safeDestroy(inst) { if (inst) { try { inst.destroy() } catch (e) {} } return null }

function formatAmountInput(el) {
  el.addEventListener('input', function () {
    const raw = this.value.replace(/[^0-9]/g, '')
    this.value = raw ? Number(raw).toLocaleString('id-ID') : ''
  })
}

// ===== RING HELPER =====
function setRing(id, percentage, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const p = Math.min(100, Math.max(0, percentage));
  const deg = (p / 100) * 360;
  el.style.background = `conic-gradient(${color} ${deg}deg, #e8e4de ${deg}deg)`;
}

// ===== BADGE HELPER =====
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

// ===== MODAL LOGIC =====
let modalMode = 'in' // 'in' or 'out'

const modalOverlay = document.getElementById('modalOverlay')
const modalTitle   = document.getElementById('modalTitle')
const modalSubmit  = document.getElementById('modalSubmit')
const modalDate    = document.getElementById('modalDate')
const modalDesc    = document.getElementById('modalDesc')
const modalAmount  = document.getElementById('modalAmount')
const modalClose   = document.getElementById('modalClose')
const modalCategory= document.getElementById('modalCategory')
const categoryWrap = document.getElementById('categoryWrap')

formatAmountInput(modalAmount)

function openModal(mode) {
  modalMode = mode
  modalDate.value = new Date().toISOString().slice(0, 10)
  modalDesc.value = ''
  modalAmount.value = ''
  modalCategory.value = mode === 'in' ? 'pemasukan' : 'kebutuhan'

  if (mode === 'in') {
    modalTitle.textContent = '+ Tambah Pendapatan'
    modalSubmit.textContent = 'Simpan Pendapatan'
    modalSubmit.className = 'modal-submit income'
    // Kategori untuk pendapatan
    modalCategory.innerHTML = `
      <option value="pemasukan">Pemasukan Umum</option>
      <option value="uang_jajan">Uang Jajan</option>
      <option value="gaji">Gaji</option>
      <option value="bonus">Bonus</option>
      <option value="investasi">Investasi</option>
      <option value="lainnya">Lainnya</option>
    `
  } else {
    modalTitle.textContent = '− Tambah Pengeluaran'
    modalSubmit.textContent = 'Simpan Pengeluaran'
    modalSubmit.className = 'modal-submit expense'
    modalCategory.innerHTML = `
      <option value="kebutuhan">Kebutuhan</option>
      <option value="keinginan">Keinginan</option>
      <option value="tabungan">Tabungan</option>
      <option value="darurat">Dana Darurat</option>
      <option value="makan">Makan & Minum</option>
      <option value="transport">Transportasi</option>
      <option value="tagihan">Tagihan</option>
      <option value="hiburan">Hiburan</option>
      <option value="lainnya">Lainnya</option>
    `
  }
  modalOverlay.classList.add('open')
}

function closeModal() { modalOverlay.classList.remove('open') }

modalClose.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal() })

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const isModalOpen = modalOverlay && modalOverlay.classList.contains('open');
    if (isModalOpen) {
      e.preventDefault();
      modalSubmit.click();
    }
  }
});

modalSubmit.addEventListener('click', () => {
  const date   = modalDate.value
  const desc   = modalDesc.value.trim() || (modalMode === 'in' ? 'Pendapatan' : 'Pengeluaran')
  const amount = parseRibuan(modalAmount.value)
  const cat    = modalCategory.value
  if (!date || !amount) { modalAmount.focus(); return }

  transactions.push({ id: uid(), date, description: desc, amount, type: modalMode, category: cat })
  saveData()
  closeModal()
  renderAll()
})

document.getElementById('btnIncome').addEventListener('click', () => openModal('in'))
document.getElementById('btnExpense').addEventListener('click', () => openModal('out'))
// Tombol di tab Pendapatan & Pengeluaran
document.getElementById('btnIncomeTab').addEventListener('click', () => openModal('in'))
document.getElementById('btnExpenseTab').addEventListener('click', () => openModal('out'))

// ===== RENDER ALL =====
function renderAll() {
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth))
  document.getElementById('monthLabel').textContent = monthLabel(currentMonth)
  renderSummary(monthTx)
  renderCharts(monthTx)
  renderIncomeList(monthTx)
  renderExpenseList(monthTx)
  renderCalendar(monthTx)
  renderHealthIndicators(monthTx)
  updateReport(monthTx)
}

// ===== SUMMARY =====
function renderSummary(tx) {
  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const sisa     = totalIn - totalOut
  document.getElementById('totalIn').textContent    = fmtRp(totalIn)
  document.getElementById('totalOut').textContent   = fmtRp(totalOut)
  document.getElementById('sisaSaldo').textContent  = fmtRp(sisa)
  document.getElementById('totalWealth').textContent = fmtRp(sisa)
}

// ===== CHARTS =====
function renderCharts(tx) {
  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)

  // Doughnut
  const pieCtx = document.getElementById('pieChart')
  if (pieCtx) {
    chartInstances.pie = safeDestroy(chartInstances.pie)
    if (totalIn || totalOut) {
      chartInstances.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: ['Pendapatan', 'Pengeluaran'], datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#5a9367', '#c0604a'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } } }, cutout: '68%', animation: { duration: 300 } }
      })
    }
  }

  // Line - daily trend
  const days = {}
  tx.forEach(t => {
    if (t.date) {
      if (!days[t.date]) days[t.date] = { in: 0, out: 0 }
      if (t.type === 'in') days[t.date].in += Number(t.amount)
      else days[t.date].out += Number(t.amount)
    }
  })
  const dates  = Object.keys(days).sort().slice(-31)
  const labels = dates.map(d => d.slice(5))
  const inData  = dates.map(d => days[d].in || 0)
  const outData = dates.map(d => days[d].out || 0)

  const lineCtx = document.getElementById('lineChart')
  if (lineCtx) {
    chartInstances.line = safeDestroy(chartInstances.line)
    if (labels.length) {
      chartInstances.line = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Pendapatan', data: inData,  borderColor: '#5a9367', backgroundColor: 'rgba(90,147,103,0.08)',  fill: true, tension: 0.4, pointRadius: 2 },
            { label: 'Pengeluaran', data: outData, borderColor: '#c0604a', backgroundColor: 'rgba(192,96,74,0.08)', fill: true, tension: 0.4, pointRadius: 2 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 12 } } }, x: { ticks: { font: { family: 'Manrope', size: 12 } } } }, animation: { duration: 300 } }
      })
    }
  }

  // Income line (tab pendapatan)
  const incDays  = {}
  tx.filter(t => t.type === 'in').forEach(t => { if (t.date) incDays[t.date] = (incDays[t.date] || 0) + Number(t.amount) })
  const incDates  = Object.keys(incDays).sort().slice(-31)
  const incLabels = incDates.map(d => d.slice(5))
  const incData   = incDates.map(d => incDays[d] || 0)
  const incCtx    = document.getElementById('incomeLineChart')
  if (incCtx) {
    chartInstances.income = safeDestroy(chartInstances.income)
    if (incLabels.length) {
      chartInstances.income = new Chart(incCtx, {
        type: 'line',
        data: { labels: incLabels, datasets: [{ label: 'Pendapatan', data: incData, borderColor: '#5a9367', backgroundColor: 'rgba(90,147,103,0.1)', fill: true, tension: 0.4, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmtRp(ctx.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 12 } } }, animation: { duration: 300 } }
      })
    }
  }

  // Expense line (tab pengeluaran)
  const expDays  = {}
  tx.filter(t => t.type === 'out').forEach(t => { if (t.date) expDays[t.date] = (expDays[t.date] || 0) + Number(t.amount) })
  const expDates  = Object.keys(expDays).sort().slice(-31)
  const expLabels = expDates.map(d => d.slice(5))
  const expData   = expDates.map(d => expDays[d] || 0)
  const expCtx    = document.getElementById('expenseLineChart')
  if (expCtx) {
    chartInstances.expense = safeDestroy(chartInstances.expense)
    if (expLabels.length) {
      chartInstances.expense = new Chart(expCtx, {
        type: 'bar',
        data: { labels: expLabels, datasets: [{ label: 'Pengeluaran', data: expData, backgroundColor: 'rgba(192,96,74,0.65)', borderColor: '#c0604a', borderWidth: 1, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmtRp(ctx.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v), font: { family: 'Manrope', size: 12 } } }, animation: { duration: 300 } }
      })
    }
  }
}

// ===== LISTS =====
function txItemHTML(t) {
  const isIn = t.type === 'in'
  return `
  <div class="tx-item">
    <div class="tx-icon ${isIn ? 'in' : 'out'}">${isIn ? '↑' : '↓'}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.description || (isIn ? 'Pendapatan' : 'Pengeluaran')}</div>
      <div class="tx-date">${t.date} · ${t.category || ''}</div>
    </div>
    <span class="tx-amount ${isIn ? 'in' : 'out'}">${isIn ? '+' : '−'}${fmtRp(t.amount)}</span>
    <button class="tx-del" data-id="${t.id}" title="Hapus">✕</button>
  </div>`
}

function bindDeleteButtons() {
  document.querySelectorAll('.tx-del').forEach(btn => {
    btn.onclick = function () {
      if (!confirm('Hapus transaksi ini?')) return
      transactions = transactions.filter(t => t.id !== this.dataset.id)
      saveData()
      renderAll()
    }
  })
}

function renderIncomeList(tx) {
  const list  = document.getElementById('incomeList')
  const items = tx.filter(t => t.type === 'in').sort((a, b) => b.date.localeCompare(a.date))
  if (!items.length) { list.innerHTML = '<div class="empty-state">Belum ada pendapatan bulan ini.</div>'; return }
  list.innerHTML = '<div class="tx-list">' + items.map(txItemHTML).join('') + '</div>'
  bindDeleteButtons()
}

function renderExpenseList(tx) {
  const list  = document.getElementById('expenseList')
  const items = tx.filter(t => t.type === 'out').sort((a, b) => b.date.localeCompare(a.date))
  if (!items.length) { list.innerHTML = '<div class="empty-state">Belum ada pengeluaran bulan ini.</div>'; return }
  list.innerHTML = '<div class="tx-list">' + items.map(txItemHTML).join('') + '</div>'
  bindDeleteButtons()
}

// ===== CALENDAR =====
function renderCalendar(tx) {
  const container = document.getElementById('calendarContainer')
  const [year, month] = currentMonth.split('-').map(Number)
  const firstDay     = new Date(year, month - 1, 1).getDay()
  const daysInMonth  = new Date(year, month, 0).getDate()
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  let html = days.map(d => `<div class="cal-header">${d}</div>`).join('')
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day"></div>`

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const dayTx   = tx.filter(t => t.date === dateStr)
    const tIn     = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
    const tOut    = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
    const has     = tIn > 0 || tOut > 0
    html += `<div class="cal-day ${has ? 'has-tx' : ''}" data-date="${dateStr}">
      <div class="dnum">${d}</div>
      ${has ? `<div class="dsums">${tIn > 0 ? `<span class="din">+${fmtRp(tIn)}</span>` : ''}${tOut > 0 ? `<span class="dout"> -${fmtRp(tOut)}</span>` : ''}</div>` : ''}
    </div>`
  }
  container.innerHTML = html

  container.querySelectorAll('.cal-day.has-tx').forEach(el => {
    el.addEventListener('click', function () {
      const date  = this.dataset.date
      const dayTx = tx.filter(t => t.date === date)
      const tIn   = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
      const tOut  = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
      document.getElementById('calendarSummary').textContent =
        `${date} — Masuk: ${fmtRp(tIn)} · Keluar: ${fmtRp(tOut)}`
    })
  })
}

let currentCalculatedHealth = null;

// ===== HEALTH INDICATORS =====
function renderHealthIndicators(tx) {
  // Calculate base incomes and expenses
  const totalIncome = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
  const base = totalIncome || 1; // avoid division by zero

  // Category totals
  const tabunganAmt = tx.filter(t => t.type === 'out' && t.category === 'tabungan').reduce((s, t) => s + Number(t.amount), 0);
  const keinginanAmt = tx.filter(t => t.type === 'out' && t.category === 'keinginan').reduce((s, t) => s + Number(t.amount), 0);
  const daruratAmt   = tx.filter(t => t.type === 'out' && t.category === 'darurat').reduce((s, t) => s + Number(t.amount), 0);
  const cashEwallet  = totalIncome - totalExpense; // liquid cash

  // 1️⃣ Savings Ratio
  const savingsRatio = (tabunganAmt / base) * 100;
  const sv = savingsRatio >= 20 ? {color: '#5a9367', label: 'Sehat'}
           : savingsRatio >= 10 ? {color: '#C89B3C', label: 'Kurang'}
           : {color: '#c0604a', label: 'Bahaya'};
  setRing('ringSavings', savingsRatio, sv.color);
  const savValEl = document.getElementById('savingsValue');
  if (savValEl) savValEl.textContent = Math.round(savingsRatio) + '%';
  setBadge('savingsBadge', sv.label, sv.color);

  // 2️⃣ Lifestyle Ratio
  const lifestyleRatio = (keinginanAmt / base) * 100;
  const ls = lifestyleRatio <= 30 ? {color: '#5a9367', label: 'Terkendali'}
           : lifestyleRatio <= 45 ? {color: '#C89B3C', label: 'Waspada'}
           : {color: '#c0604a', label: 'Boros'};
  setRing('ringLifestyle', 100 - lifestyleRatio, ls.color);
  const lifeValEl = document.getElementById('lifestyleValue');
  if (lifeValEl) lifeValEl.textContent = Math.round(lifestyleRatio) + '%';
  setBadge('lifestyleBadge', ls.label, ls.color);

  // 3️⃣ Liquidity Ratio
  const liquidityMonths = totalExpense > 0 ? (cashEwallet / totalExpense) : (cashEwallet >= 0 ? 6 : 0);
  const liq = liquidityMonths >= 3 ? {color: '#5a9367', label: 'Aman'}
            : liquidityMonths >= 1 ? {color: '#C89B3C', label: 'Rawan'}
            : {color: '#c0604a', label: 'Defisit'};
  const tankFill = document.getElementById('tankFill');
  if (tankFill) {
    const perc = Math.min(100, Math.max(0, (liquidityMonths / 6) * 100));
    tankFill.style.height = perc + '%';
    tankFill.textContent = isFinite(liquidityMonths) ? liquidityMonths.toFixed(1) + '×' : '∞';
  }
  setBadge('liquidBadge', liq.label, liq.color);

  // 4️⃣ Emergency Fund Ratio
  const targetEmergency = (totalExpense || 1) * 6;
  const emergencyRatio = (daruratAmt / targetEmergency) * 100;
  const em = emergencyRatio >= 100 ? {color: '#5a9367', label: 'Terpenuhi'}
           : emergencyRatio >= 50  ? {color: '#C89B3C', label: 'Menuju'}
           : {color: '#c0604a', label: 'Mulai'};
  setRing('ringEmergency', emergencyRatio, em.color);
  const emValEl = document.getElementById('emergencyValue');
  if (emValEl) emValEl.textContent = Math.round(emergencyRatio) + '%';
  setBadge('emergencyBadge', em.label, em.color);

  // 5️⃣ Financial Literacy Score
  const scoreSavings = Math.min(100, Math.max(0, (savingsRatio / 20) * 100));
  const scoreLifestyle = lifestyleRatio <= 30 ? 100 : Math.max(0, 100 - (lifestyleRatio - 30) * 3);
  const scoreLiquidity = Math.min(100, Math.max(0, (liquidityMonths / 3) * 100));
  const scoreEmergency = Math.min(100, Math.max(0, emergencyRatio));
  const literacyScore = (scoreSavings + scoreLifestyle + scoreLiquidity + scoreEmergency) / 4;

  const levels = ['Pemula Boros','Belajar Hemat','Cukup Cermat','Jagoan Hemat','Master Keuangan'];
  const levelIdx = literacyScore >= 81 ? 4 : literacyScore >= 61 ? 3 : literacyScore >= 41 ? 2 : literacyScore >= 21 ? 1 : 0;

  const lvlEl = document.getElementById('levelValue');
  if (lvlEl) lvlEl.textContent = 'Lv.' + (levelIdx + 1);
  const xpEl = document.getElementById('xpFill');
  if (xpEl) xpEl.style.width = Math.min(100, Math.max(0, literacyScore)) + '%';
  const litTitleEl = document.getElementById('literacyTitle');
  if (litTitleEl) litTitleEl.textContent = levels[levelIdx] + ' · ' + Math.round(literacyScore) + '/100';

  // Store state for modal pop-ups
  currentCalculatedHealth = {
    savingsRatio, sv,
    lifestyleRatio, ls,
    liquidityMonths, liq,
    emergencyRatio, em,
    literacyScore, levelIdx, levels
  };
}

// ------- Clickable Cards & Pop-up Modal -------
const popInfo = {
  savings: {
    title: "1. Rasio Tabungan (Savings Ratio)",
    getVal: (r) => `${Math.round(r.savingsRatio)}%`,
    badgeText: (r) => r.sv.label,
    badgeColor: (r) => r.sv.color,
    desc: "Tabungan lo tuh bahan bakar masa depan. Minimal 20% dari uang jajan bulanan wajib disisihkan. Kurang dari 10%? Bahaya, lo hidup paycheck-to-paycheck.",
    formula: "Tabungan Bulanan / Pendapatan × 100%",
    thresholds: [
      { text: "≥ 20% — Sehat", color: "#5a9367" },
      { text: "10% – 19% — Kurang", color: "#C89B3C" },
      { text: "< 10% — Bahaya", color: "#c0604a" }
    ],
    refs: [
      "50/30/20 Rule — Elizabeth Warren & Amelia Warren Tyagi, buku All Your Worth (2005): 20% untuk tabungan & investasi",
      "Ligwina Hananto (QM Financial): Rasio menabung minimal 10% dari penghasilan",
      "CFP Board: Savings Rate target 10–20% dari gross income"
    ],
    tab: 'pengeluaran', category: 'tabungan', btnText: "Ke Tab Pengeluaran (Kategori Tabungan)"
  },
  lifestyle: {
    title: "2. Rasio Gaya Hidup (Lifestyle Ratio)",
    getVal: (r) => `${Math.round(r.lifestyleRatio)}%`,
    badgeText: (r) => r.ls.label,
    badgeColor: (r) => r.ls.color,
    desc: "Jajan boleh, tapi jangan sampai 30% lebih. Kalau lewat, lo bukan lagi 'self reward', lo udah 'self sabotage'.",
    formula: "Pengeluaran Keinginan / Pendapatan × 100%",
    thresholds: [
      { text: "≤ 30% — Terkendali", color: "#5a9367" },
      { text: "31% – 45% — Waspada", color: "#C89B3C" },
      { text: "> 45% — Boros", color: "#c0604a" }
    ],
    refs: [
      "50/30/20 Rule (Elizabeth Warren, 2005): Maksimal 30% untuk wants / gaya hidup",
      "QM Financial (Ligwina Hananto): Alokasi gaya hidup maksimal 20%",
      "CNBC Indonesia: Batasi pengeluaran non-esensial maksimal 30%"
    ],
    tab: 'pengeluaran', category: 'keinginan', btnText: "Ke Tab Pengeluaran (Kategori Keinginan)"
  },
  liquidity: {
    title: "3. Rasio Likuiditas (Liquidity Ratio)",
    getVal: (r) => isFinite(r.liquidityMonths) ? `${r.liquidityMonths.toFixed(1)}×` : '∞',
    badgeText: (r) => r.liq.label,
    badgeColor: (r) => r.liq.color,
    desc: "Ini duit yang bisa lo pakai kalau penghasilan mendadak stop. Minimal 3 bulan pengeluaran harus tersedia di kas/e-wallet. Kalau cuma 1 bulan, lo lagi main api.",
    formula: "(Kas + E-Wallet) / Pengeluaran Rutin Bulanan",
    thresholds: [
      { text: "≥ 3× — Aman (Bisa cover 3–6 bulan)", color: "#5a9367" },
      { text: "1× – 2.9× — Rawan", color: "#C89B3C" },
      { text: "< 1× — Defisit", color: "#c0604a" }
    ],
    refs: [
      "CFP Board: Ketahanan kas 4–6 bulan pengeluaran",
      "Pandji Harsanto: Rasio likuiditas ideal 3–12× pengeluaran",
      "CNBC Indonesia: Kas cair minimal 3–6 bulan"
    ],
    tab: 'beranda', section: 'summary-grid', btnText: "Lihat Saldo Bersih di Beranda"
  },
  emergency: {
    title: "4. Dana Darurat (Emergency Fund)",
    getVal: (r) => `${Math.round(r.emergencyRatio)}%`,
    badgeText: (r) => r.em.label,
    badgeColor: (r) => r.em.color,
    desc: "Dana darurat = jaring pengaman lo. Target 6 bulan pengeluaran. Ini bukan tabungan cita-cita — cuma boleh dipakai kalau kena musibah beneran.",
    formula: "Total Dana Darurat / (Pengeluaran Bulanan × 6) × 100%",
    thresholds: [
      { text: "≥ 100% — Terpenuhi (6 Bulan)", color: "#5a9367" },
      { text: "50% – 99% — Menuju Target", color: "#C89B3C" },
      { text: "< 50% — Mulai Kumpulkan", color: "#c0604a" }
    ],
    refs: [
      "CFP Board: Standar 3–6 bulan dana darurat",
      "Kontan: Target ideal 6× pengeluaran rutin",
      "Daya.id: 3–12 bulan sesuai profil risiko & tanggungan"
    ],
    tab: 'pengeluaran', category: 'darurat', btnText: "Ke Tab Pengeluaran (Kategori Dana Darurat)"
  },
  literacy: {
    title: "5. Skor Literasi Keuangan",
    getVal: (r) => `Lv.${r.levelIdx+1} · ${r.levels[r.levelIdx]} (${Math.round(r.literacyScore)}/100)`,
    badgeText: (r) => `Lv.${r.levelIdx+1}`,
    badgeColor: (r) => "#5a9367",
    desc: "Skor ini gabungan dari 4 pilar di atas. Makin tinggi, makin cermat lo kelola duit. Lv.5 = Master Keuangan, duit lo kerja buat lo.",
    formula: "(Skor Tabungan + Skor Gaya Hidup + Skor Likuiditas + Skor Darurat) / 4",
    thresholds: [
      { text: "81–100 — Lv.5 Master Keuangan", color: "#5a9367" },
      { text: "61–80 — Lv.4 Jagoan Hemat", color: "#5a9367" },
      { text: "41–60 — Lv.3 Cukup Cermat", color: "#C89B3C" },
      { text: "21–40 — Lv.2 Belajar Hemat", color: "#C89B3C" },
      { text: "0–20 — Lv.1 Pemula Boros", color: "#c0604a" }
    ],
    refs: [
      "OJK SNLIK 2025: Indeks Literasi Keuangan Indonesia (66,46%)",
      "OECD 2016: Framework (Knowledge + Behaviour + Attitude)",
      "Lusardi & Mitchell 2011: Measurement of Financial Literacy"
    ],
    tab: 'beranda', section: 'healthGrid', btnText: "Lihat Semua Indikator Beranda"
  }
};

function openHealthModal(id) {
  const info = popInfo[id];
  const overlay = document.getElementById('healthModalOverlay');
  if (!info || !overlay) return;

  const titleEl = document.getElementById('healthModalTitle');
  if (titleEl) titleEl.textContent = info.title;

  const bText = currentCalculatedHealth ? info.badgeText(currentCalculatedHealth) : '-';
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
      const navBtn = document.querySelector(`[data-tab="${info.tab}"]`);
      if (navBtn) navBtn.click();
      if (info.category) {
        const catSelect = document.getElementById('modalCategory');
        if (catSelect) catSelect.value = info.category;
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

// Bind modal close & card click events
document.addEventListener('DOMContentLoaded', () => {
  const healthCloseBtn = document.getElementById('healthModalClose');
  const healthOverlay = document.getElementById('healthModalOverlay');
  if (healthCloseBtn) healthCloseBtn.onclick = closeHealthModal;
  if (healthOverlay) {
    healthOverlay.onclick = (e) => { if (e.target === healthOverlay) closeHealthModal(); };
  }

  const cardSavings = document.getElementById('cardSavings');
  if (cardSavings) cardSavings.onclick = () => openHealthModal('savings');
  const cardLifestyle = document.getElementById('cardLifestyle');
  if (cardLifestyle) cardLifestyle.onclick = () => openHealthModal('lifestyle');
  const cardLiquidity = document.getElementById('cardLiquidity');
  if (cardLiquidity) cardLiquidity.onclick = () => openHealthModal('liquidity');
  const cardEmergency = document.getElementById('cardEmergency');
  if (cardEmergency) cardEmergency.onclick = () => openHealthModal('emergency');
  const cardLiteracy = document.getElementById('cardLiteracy');
  if (cardLiteracy) cardLiteracy.onclick = () => openHealthModal('literacy');
});

// ===== REPORT =====
function updateReport(tx) {
  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const diff     = totalIn - totalOut
  const count    = tx.length
  const avg      = count ? (totalIn + totalOut) / 30 : 0

  document.getElementById('repTotalIn').textContent  = fmtRp(totalIn)
  document.getElementById('repTotalOut').textContent = fmtRp(totalOut)
  const diffEl = document.getElementById('repDiff')
  diffEl.textContent  = fmtRp(diff)
  diffEl.style.color  = diff >= 0 ? '#5a9367' : '#c0604a'
  document.getElementById('repAvg').textContent   = fmtRp(avg)
  document.getElementById('repCount').textContent = count

  const days  = {}
  tx.forEach(t => {
    if (!t.date) return
    if (!days[t.date]) days[t.date] = { in: 0, out: 0 }
    if (t.type === 'in') days[t.date].in += Number(t.amount)
    else days[t.date].out += Number(t.amount)
  })
  const dates   = Object.keys(days).sort().slice(-31)
  const labels  = dates.map(d => d.slice(5))
  const inData  = dates.map(d => days[d].in || 0)
  const outData = dates.map(d => days[d].out || 0)
  const ctx = document.getElementById('reportChart')
  if (ctx) {
    chartInstances.report = safeDestroy(chartInstances.report)
    if (labels.length) {
      chartInstances.report = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Pendapatan', data: inData,  backgroundColor: 'rgba(90,147,103,0.7)',  borderRadius: 4 },
            { label: 'Pengeluaran', data: outData, backgroundColor: 'rgba(192,96,74,0.7)', borderRadius: 4 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } }, tooltip: { callbacks: { label: (ctx) => fmtRp(ctx.raw) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtRp(v) } } }, animation: { duration: 300 } }
      })
    }
  }
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
    this.classList.add('active')
    const tab = this.dataset.tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'))
    document.getElementById('tab-' + tab).classList.add('active')
    if (tab === 'laporan') updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
})

// ===== MONTH NAV =====
document.getElementById('prevMonth').addEventListener('click', () => {
  const [y, m] = currentMonth.split('-').map(Number)
  currentMonth = (m === 1) ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0')
  renderAll()
})
document.getElementById('nextMonth').addEventListener('click', () => {
  const [y, m] = currentMonth.split('-').map(Number)
  currentMonth = (m === 12) ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0')
  renderAll()
})

// ===== ALLOWANCE =====
const allowanceInput = document.getElementById('allowanceInput')
if (allowanceInput) {
  formatAmountInput(allowanceInput)
  allowanceInput.value = localStorage.getItem('gwcatat_allowance') || ''
  allowanceInput.addEventListener('change', () => {
    localStorage.setItem('gwcatat_allowance', allowanceInput.value)
  })
}

// ===== REPORT FILTERS =====
document.getElementById('reportPeriod').addEventListener('change', () => {
  updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)))
})
document.getElementById('reportDate').addEventListener('change', () => {
  updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)))
})
document.getElementById('reportDate').value = new Date().toISOString().slice(0, 10)

// ===== INIT =====
renderAll()
