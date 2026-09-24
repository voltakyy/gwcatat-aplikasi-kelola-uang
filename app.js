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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 12 } } } }, cutout: '68%', animation: { duration: 300 } }
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { font: { family: 'DM Mono', size: 10 } } }, x: { ticks: { font: { family: 'DM Mono', size: 10 } } } }, animation: { duration: 300 } }
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, animation: { duration: 300 } }
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } }, animation: { duration: 300 } }
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

// ===== HEALTH INDICATORS =====
function renderHealthIndicators(tx) {
  const totalIn  = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const base     = totalIn || 1
  const tabungan = tx.filter(t => t.type === 'out' && t.category === 'tabungan').reduce((s, t) => s + Number(t.amount), 0)
  const keinginan= tx.filter(t => t.type === 'out' && t.category === 'keinginan').reduce((s, t) => s + Number(t.amount), 0)
  const darurat  = tx.filter(t => t.type === 'out' && t.category === 'darurat').reduce((s, t) => s + Number(t.amount), 0)

  const savingsRatio   = (tabungan / base) * 100
  const lifestyleRatio = (keinginan / base) * 100
  const emergencyRatio = Math.min(100, darurat / 200000 * 100)

  function setRing(id, ratio, color) {
    const el = document.getElementById(id)
    if (el) el.style.background = `conic-gradient(${color} ${Math.min(100, ratio) * 3.6}deg, #e8e4de ${Math.min(100, ratio) * 3.6}deg)`
  }
  function setBadge(id, label) {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = label
    el.className = 'badge ' + (label === 'Bahaya' ? 'danger' : label === 'Waspada' ? 'warn' : '')
  }

  const sv = savingsRatio >= 20 ? { color: '#5a9367', label: 'Sehat' } : savingsRatio >= 10 ? { color: '#C89B3C', label: 'Waspada' } : { color: '#c0604a', label: 'Bahaya' }
  setRing('ringSavings', savingsRatio, sv.color)
  document.getElementById('savingsValue').textContent = Math.round(savingsRatio) + '%'
  setBadge('savingsBadge', sv.label)

  const ls = lifestyleRatio <= 30 ? { color: '#5a9367', label: 'Sehat' } : lifestyleRatio <= 45 ? { color: '#C89B3C', label: 'Waspada' } : { color: '#c0604a', label: 'Bahaya' }
  setRing('ringLifestyle', 100 - lifestyleRatio, ls.color)
  document.getElementById('lifestyleValue').textContent = Math.round(lifestyleRatio) + '%'
  setBadge('lifestyleBadge', ls.label)

  const tankFill = document.getElementById('tankFill')
  if (tankFill) tankFill.style.height = Math.max(8, 100 - (tabungan / base) * 100) + '%'
  setBadge('liquidBadge', 'Aman')

  const em = emergencyRatio >= 100 ? { color: '#5a9367', label: 'Terpenuhi' } : emergencyRatio >= 50 ? { color: '#C89B3C', label: 'Menuju' } : { color: '#c0604a', label: 'Mulai' }
  setRing('ringEmergency', emergencyRatio, em.color)
  document.getElementById('emergencyValue').textContent = Math.round(emergencyRatio) + '%'
  setBadge('emergencyBadge', em.label)

  const score = (Math.min(100, savingsRatio) + Math.min(100, 100 - lifestyleRatio) + 100 + emergencyRatio) / 4
  const level  = Math.min(5, Math.max(1, Math.floor(score / 20) + 1))
  const titles = ['Pemula', 'Belajar', 'Cermat', 'Jagoan', 'Master']
  document.getElementById('levelValue').textContent    = 'Lv.' + level
  document.getElementById('xpFill').style.width        = ((score % 20) * 5) + '%'
  document.getElementById('literacyTitle').textContent = titles[level - 1] + ' · ' + Math.round(score) + '/100'
}

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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11 } } } }, scales: { y: { beginAtZero: true } }, animation: { duration: 300 } }
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
