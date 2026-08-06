// ============================================================
// src/main.js — Dashboard Logic
// ============================================================

import { supabase } from './supabase.js'

// Chart.js sudah tersedia global dari CDN, tidak perlu import

// ===== STATE =====
let currentMonth = currentMonthKey()
let transactions = []
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
  const d = v.replace(/[^0-9]/g, '')
  return d === '' ? 0 : parseInt(d, 10)
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }

// ===== SUPABASE =====
async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

async function addTransaction(tx) {
  const { error } = await supabase.from('transactions').insert([tx])
  if (error) { console.error(error); return false }
  return true
}

async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) { console.error(error); return false }
  return true
}

// ===== RENDER =====
async function renderAll() {
  transactions = await fetchTransactions()
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth))
  document.getElementById('monthLabel').textContent = monthLabel(currentMonth)

  renderSummary(monthTx)
  renderCharts(monthTx)
  renderIncomeList(monthTx)
  renderExpenseList(monthTx)
  renderCalendar(monthTx)
  renderHealthIndicators(monthTx)
  updateReport(monthTx)
  if (typeof lucide !== 'undefined') lucide.createIcons()
}

function renderSummary(tx) {
  const totalIn = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const sisa = totalIn - totalOut
  const tabungan = tx.filter(t => t.type === 'out' && t.category === 'tabungan').reduce((s, t) => s + Number(t.amount), 0)
  const darurat = tx.filter(t => t.type === 'out' && t.category === 'darurat').reduce((s, t) => s + Number(t.amount), 0)
  const wealth = sisa + tabungan + darurat
  document.getElementById('totalIn').textContent = fmtRp(totalIn)
  document.getElementById('totalOut').textContent = fmtRp(totalOut)
  document.getElementById('sisaSaldo').textContent = fmtRp(sisa)
  document.getElementById('totalWealth').textContent = fmtRp(wealth)
}

// ===== CHARTS =====
function safeDestroy(inst) { if (inst) { try { inst.destroy() } catch (e) { } } return null }

function renderCharts(tx) {
  // Pie
  const totalIn = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const pieCtx = document.getElementById('pieChart')
  if (pieCtx) {
    chartInstances.pie = safeDestroy(chartInstances.pie)
    if (totalIn || totalOut) {
      chartInstances.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pendapatan', 'Pengeluaran'],
          datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#7A9E7E', '#C76D4E'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '65%' }
      })
    }
  }

  // Line
  const days = {}
  tx.forEach(t => {
    if (t.date) {
      if (!days[t.date]) days[t.date] = { in: 0, out: 0 }
      if (t.type === 'in') days[t.date].in += Number(t.amount)
      else days[t.date].out += Number(t.amount)
    }
  })
  const dates = Object.keys(days).sort().slice(-31)
  const labels = dates.map(d => d.slice(5))
  const inData = dates.map(d => days[d].in || 0)
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
            { label: 'Pendapatan', data: inData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3, pointRadius: 2 },
            { label: 'Pengeluaran', data: outData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3, pointRadius: 2 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
      })
    }
  }

  // Income line
  const incDays = {}
  tx.filter(t => t.type === 'in').forEach(t => { if (t.date) { incDays[t.date] = (incDays[t.date] || 0) + Number(t.amount) } })
  const incDates = Object.keys(incDays).sort().slice(-31)
  const incLabels = incDates.map(d => d.slice(5))
  const incData = incDates.map(d => incDays[d] || 0)
  const incCtx = document.getElementById('incomeLineChart')
  if (incCtx) {
    chartInstances.income = safeDestroy(chartInstances.income)
    if (incLabels.length) {
      chartInstances.income = new Chart(incCtx, {
        type: 'line',
        data: { labels: incLabels, datasets: [{ label: 'Pendapatan', data: incData, borderColor: '#7A9E7E', backgroundColor: 'rgba(122,158,126,0.1)', fill: true, tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      })
    }
  }

  // Expense line
  const expDays = {}
  tx.filter(t => t.type === 'out').forEach(t => { if (t.date) { expDays[t.date] = (expDays[t.date] || 0) + Number(t.amount) } })
  const expDates = Object.keys(expDays).sort().slice(-31)
  const expLabels = expDates.map(d => d.slice(5))
  const expData = expDates.map(d => expDays[d] || 0)
  const expCtx = document.getElementById('expenseLineChart')
  if (expCtx) {
    chartInstances.expense = safeDestroy(chartInstances.expense)
    if (expLabels.length) {
      chartInstances.expense = new Chart(expCtx, {
        type: 'line',
        data: { labels: expLabels, datasets: [{ label: 'Pengeluaran', data: expData, borderColor: '#C76D4E', backgroundColor: 'rgba(199,109,78,0.1)', fill: true, tension: 0.3, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      })
    }
  }
}

// ===== LISTS =====
function renderIncomeList(tx) {
  const list = document.getElementById('incomeList')
  const items = tx.filter(t => t.type === 'in')
  if (!items.length) { list.innerHTML = '<div class="empty-state">Belum ada pendapatan</div>'; return }
  list.innerHTML = items.map(t => `
    <div class="tx-item">
      <div class="tx-icon bg-sage-green/10"><i data-lucide="wallet" class="w-4 h-4 text-sage-green"></i></div>
      <div class="tx-info"><p>${t.description || 'Pendapatan'}</p><p class="tx-date">${t.date}</p></div>
      <p class="tx-amount in">+${fmtRp(t.amount)}</p>
      <button class="tx-delete" data-id="${t.id}"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('')
  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id = this.dataset.id
      await deleteTransaction(id)
      renderAll()
    })
  })
  if (typeof lucide !== 'undefined') lucide.createIcons()
}

function renderExpenseList(tx) {
  const list = document.getElementById('expenseList')
  const items = tx.filter(t => t.type === 'out')
  if (!items.length) { list.innerHTML = '<div class="empty-state">Belum ada pengeluaran</div>'; return }
  list.innerHTML = items.map(t => `
    <div class="tx-item">
      <div class="tx-icon bg-terracotta/10"><i data-lucide="shopping-bag" class="w-4 h-4 text-terracotta"></i></div>
      <div class="tx-info"><p>${t.description || t.category || 'Pengeluaran'}</p><p class="tx-date">${t.date}</p></div>
      <p class="tx-amount out">-${fmtRp(t.amount)}</p>
      <button class="tx-delete" data-id="${t.id}"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('')
  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id = this.dataset.id
      await deleteTransaction(id)
      renderAll()
    })
  })
  if (typeof lucide !== 'undefined') lucide.createIcons()
}

// ===== CALENDAR =====
function renderCalendar(tx) {
  const container = document.getElementById('calendarContainer')
  const [year, month] = currentMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  let html = days.map(d => `<div class="text-xs font-semibold text-charcoal/50 py-1">${d}</div>`).join('')
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayTx = tx.filter(t => t.date === dateStr)
    const totalIn = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
    const totalOut = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
    const has = totalIn > 0 || totalOut > 0
    html += `<div class="calendar-day ${has ? 'has-transaction' : ''}" data-date="${dateStr}">
      <span class="day-number">${d}</span>
      ${has ? `<span class="day-summary">${totalIn > 0 ? '<span class="in">+'+fmtRp(totalIn)+'</span>' : ''}${totalOut > 0 ? ' <span class="out">-'+fmtRp(totalOut)+'</span>' : ''}</span>` : ''}
    </div>`
  }
  container.innerHTML = html
  container.querySelectorAll('.calendar-day.has-transaction').forEach(el => {
    el.addEventListener('click', function () {
      const date = this.dataset.date
      const dayTx = tx.filter(t => t.date === date)
      const totalIn = dayTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
      const totalOut = dayTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
      document.getElementById('calendarSummary').textContent = `${date} → Pendapatan: ${fmtRp(totalIn)} | Pengeluaran: ${fmtRp(totalOut)}`
    })
  })
}

// ===== HEALTH INDICATORS =====
function renderHealthIndicators(tx) {
  const totalIn = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const base = totalIn || 1
  const tabungan = tx.filter(t => t.type === 'out' && t.category === 'tabungan').reduce((s, t) => s + Number(t.amount), 0)
  const keinginan = tx.filter(t => t.type === 'out' && t.category === 'keinginan').reduce((s, t) => s + Number(t.amount), 0)
  const darurat = tx.filter(t => t.type === 'out' && t.category === 'darurat').reduce((s, t) => s + Number(t.amount), 0)
  const savingsRatio = (tabungan / base) * 100
  const lifestyleRatio = (keinginan / base) * 100
  const emergencyRatio = darurat / 200000 * 100

  // Savings
  const sv = savingsRatio >= 20 ? { color: '#7A9E7E', label: 'Sehat' } : savingsRatio >= 10 ? { color: '#C89B3C', label: 'Waspada' } : { color: '#C76D4E', label: 'Bahaya' }
  document.getElementById('ringSavings').style.background = `conic-gradient(${sv.color} ${Math.min(100, savingsRatio) * 3.6}deg, #F1EFEA ${Math.min(100, savingsRatio) * 3.6}deg)`
  document.getElementById('savingsValue').textContent = Math.round(savingsRatio) + '%'
  document.getElementById('savingsBadge').textContent = sv.label
  document.getElementById('savingsBadge').className = 'badge ' + (sv.label === 'Bahaya' ? 'danger' : sv.label === 'Waspada' ? 'warn' : '')

  // Lifestyle
  const ls = lifestyleRatio <= 30 ? { color: '#7A9E7E', label: 'Sehat' } : lifestyleRatio <= 45 ? { color: '#C89B3C', label: 'Waspada' } : { color: '#C76D4E', label: 'Bahaya' }
  document.getElementById('ringLifestyle').style.background = `conic-gradient(${ls.color} ${Math.min(100, 100 - lifestyleRatio) * 3.6}deg, #F1EFEA ${Math.min(100, 100 - lifestyleRatio) * 3.6}deg)`
  document.getElementById('lifestyleValue').textContent = Math.round(lifestyleRatio) + '%'
  document.getElementById('lifestyleBadge').textContent = ls.label
  document.getElementById('lifestyleBadge').className = 'badge ' + (ls.label === 'Bahaya' ? 'danger' : ls.label === 'Waspada' ? 'warn' : '')

  // Liquid (dummy)
  document.getElementById('liquidBadge').textContent = 'Aman'
  document.getElementById('liquidBadge').className = 'badge'

  // Emergency
  const em = emergencyRatio >= 100 ? { color: '#7A9E7E', label: 'Terpenuhi' } : emergencyRatio >= 50 ? { color: '#C89B3C', label: 'Menuju' } : { color: '#C76D4E', label: 'Mulai' }
  document.getElementById('ringEmergency').style.background = `conic-gradient(${em.color} ${Math.min(100, emergencyRatio) * 3.6}deg, #F1EFEA ${Math.min(100, emergencyRatio) * 3.6}deg)`
  document.getElementById('emergencyValue').textContent = Math.round(Math.min(100, emergencyRatio)) + '%'
  document.getElementById('emergencyBadge').textContent = em.label
  document.getElementById('emergencyBadge').className = 'badge ' + (em.label === 'Mulai' ? 'warn' : '')

  // Literacy
  const score = (Math.min(100, savingsRatio) + Math.min(100, 100 - lifestyleRatio) + 100 + Math.min(100, emergencyRatio)) / 4
  const level = Math.min(5, Math.max(1, Math.floor(score / 20) + 1))
  const titles = ['Pemula', 'Belajar', 'Cermat', 'Jagoan', 'Master']
  document.getElementById('levelValue').textContent = 'Lv.' + level
  document.getElementById('xpFill').style.width = (score % 20) * 5 + '%'
  document.getElementById('literacyTitle').textContent = titles[level - 1] + ' · ' + Math.round(score) + '/100'
}

// ===== REPORT =====
function updateReport(tx) {
  const totalIn = tx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const diff = totalIn - totalOut
  const count = tx.length
  const avg = count ? (totalIn + totalOut) / 30 : 0
  document.getElementById('repTotalIn').textContent = fmtRp(totalIn)
  document.getElementById('repTotalOut').textContent = fmtRp(totalOut)
  document.getElementById('repDiff').textContent = fmtRp(diff)
  document.getElementById('repDiff').style.color = diff >= 0 ? '#7A9E7E' : '#C76D4E'
  document.getElementById('repAvg').textContent = fmtRp(avg)
  document.getElementById('repCount').textContent = count

  // Report chart
  const days = {}
  tx.forEach(t => {
    if (t.date) {
      if (!days[t.date]) days[t.date] = { in: 0, out: 0 }
      if (t.type === 'in') days[t.date].in += Number(t.amount)
      else days[t.date].out += Number(t.amount)
    }
  })
  const dates = Object.keys(days).sort().slice(-31)
  const labels = dates.map(d => d.slice(5))
  const inData = dates.map(d => days[d].in || 0)
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
            { label: 'Pendapatan', data: inData, backgroundColor: 'rgba(122,158,126,0.6)', borderColor: '#7A9E7E', borderWidth: 1 },
            { label: 'Pengeluaran', data: outData, backgroundColor: 'rgba(199,109,78,0.6)', borderColor: '#C76D4E', borderWidth: 1 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
      })
    }
  }
}

// ===== EVENT LISTENERS =====
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn')
  const toggleBtn = document.getElementById('sidebarToggle')
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebarOverlay')

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full')
    overlay.classList.toggle('hidden')
  })
  overlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full')
    overlay.classList.add('hidden')
  })

  navBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      navBtns.forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      const tab = this.dataset.tab
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'))
      document.getElementById('tab-' + tab).classList.add('active')
      if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full')
        overlay.classList.add('hidden')
      }
      if (tab === 'laporan') updateReport(transactions.filter(t => t.date && t.date.startsWith(currentMonth)))
    })
  })
}

function setupProfile() {
  const btn = document.getElementById('profileBtn')
  const dropdown = document.getElementById('profileDropdown')
  const loginBtn = document.getElementById('profileLoginBtn')
  const logoutBtn = document.getElementById('profileLogoutBtn')

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdown.classList.toggle('hidden')
  })
  document.addEventListener('click', () => dropdown.classList.add('hidden'))

  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user
    if (user) {
      document.getElementById('userInitial').textContent = user.email?.charAt(0).toUpperCase() || 'U'
      document.getElementById('userName').textContent = user.email?.split('@')[0] || 'User'
      loginBtn.style.display = 'none'
      logoutBtn.style.display = 'block'
    } else {
      loginBtn.style.display = 'block'
      logoutBtn.style.display = 'none'
    }
  })

  loginBtn.addEventListener('click', () => { window.location.href = '/login.html' })
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
  })
}

function setupForm() {
  const dateInput = document.getElementById('txDate')
  const descInput = document.getElementById('txDesc')
  const amountInput = document.getElementById('txAmount')
  dateInput.value = new Date().toISOString().slice(0, 10)

  amountInput.addEventListener('input', function () {
    const val = this.value.replace(/[^0-9]/g, '')
    if (val) this.value = Number(val).toLocaleString('id-ID')
  })

  const addTx = async (type) => {
    const date = dateInput.value
    const description = descInput.value.trim() || (type === 'in' ? 'Pendapatan' : 'Pengeluaran')
    const amount = parseRibuan(amountInput.value)
    if (!date || !amount) { alert('Isi tanggal dan nominal'); return }
    const user = await supabase.auth.getUser()
    const tx = {
      id: uid(),
      date,
      description,
      amount,
      type,
      category: type === 'in' ? 'uang_jajan' : 'kebutuhan',
      user_id: user.data.user?.id
    }
    const ok = await addTransaction(tx)
    if (ok) {
      amountInput.value = ''
      descInput.value = ''
      renderAll()
    }
  }

  document.getElementById('btnAddIncome').addEventListener('click', () => addTx('in'))
  document.getElementById('btnAddExpense').addEventListener('click', () => addTx('out'))
}

function setupMonthNav() {
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
}

function setupPopup() {
  const overlay = document.getElementById('popupOverlay')
  const closeBtn = document.getElementById('popupClose')
  const shortcutBtn = document.getElementById('popupShortcut')
  const titleEl = document.getElementById('popupTitleText')
  const descEl = document.getElementById('popupDescription')
  let currentKey = null

  const dataMap = {
    income: { title: 'Pemasukan', desc: 'Total uang masuk bulan ini.', tab: 'pendapatan' },
    expense: { title: 'Pengeluaran', desc: 'Total uang keluar bulan ini.', tab: 'pengeluaran' },
    balance: { title: 'Sisa di Tangan', desc: 'Pemasukan dikurangi pengeluaran.', tab: 'pengeluaran' },
    wealth: { title: 'Total Kekayaan', desc: 'Kas + E-Wallet + Tabungan + Dana Darurat - Utang', tab: 'beranda' },
    savings: { title: 'Rasio Tabungan', desc: 'Persentase uang yang ditabung dari total pemasukan.', tab: 'pengeluaran' },
    lifestyle: { title: 'Rasio Gaya Hidup', desc: 'Persentase uang untuk keinginan.', tab: 'pengeluaran' },
    liquid: { title: 'Aset Likuid Bersih', desc: 'Kas + E-Wallet - Utang.', tab: 'beranda' },
    emergency: { title: 'Dana Darurat', desc: 'Dana untuk kejadian tak terduga.', tab: 'pengeluaran' },
    literacy: { title: 'Skor Literasi', desc: 'Gabungan skor tabungan, gaya hidup, likuiditas, dan darurat.', tab: 'beranda' }
  }

  function openPopup(key) {
    const data = dataMap[key]
    if (!data) return
    currentKey = key
    titleEl.textContent = data.title
    descEl.textContent = data.desc
    shortcutBtn.textContent = 'Lihat di ' + (data.tab === 'pendapatan' ? 'Pendapatan' : data.tab === 'pengeluaran' ? 'Pengeluaran' : 'Beranda')
    overlay.classList.add('open')
    if (typeof lucide !== 'undefined') lucide.createIcons()
  }

  function closePopup() { overlay.classList.remove('open'); currentKey = null }

  closeBtn.addEventListener('click', closePopup)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup() })
  shortcutBtn.addEventListener('click', () => {
    const data = dataMap[currentKey]
    if (!data) return
    closePopup()
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.tab === data.tab) b.click()
    })
  })

  document.querySelectorAll('[data-popup]').forEach(el => {
    el.addEventListener('click', function () {
      const key = this.dataset.popup
      openPopup(key)
    })
  })
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation()
  setupProfile()
  setupForm()
  setupMonthNav()
  setupPopup()
  renderAll()
})
