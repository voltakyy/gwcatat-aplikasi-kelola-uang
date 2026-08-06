import { supabase } from './supabase.js'

// DOM refs
const formLogin = document.getElementById('formLogin')
const formRegister = document.getElementById('formRegister')
const tabLogin = document.getElementById('tabLogin')
const tabRegister = document.getElementById('tabRegister')
const loginError = document.getElementById('loginError')
const registerError = document.getElementById('registerError')
const loginSubmit = document.getElementById('loginSubmit')
const registerSubmit = document.getElementById('registerSubmit')

// Toggle tabs
tabLogin.addEventListener('click', () => {
  formLogin.classList.remove('hidden')
  formRegister.classList.add('hidden')
  tabLogin.className = 'flex-1 py-2 text-sm font-semibold text-deep-forest border-b-2 border-muted-gold'
  tabRegister.className = 'flex-1 py-2 text-sm font-semibold text-charcoal/50 hover:text-deep-forest'
})
tabRegister.addEventListener('click', () => {
  formRegister.classList.remove('hidden')
  formLogin.classList.add('hidden')
  tabRegister.className = 'flex-1 py-2 text-sm font-semibold text-deep-forest border-b-2 border-muted-gold'
  tabLogin.className = 'flex-1 py-2 text-sm font-semibold text-charcoal/50 hover:text-deep-forest'
})

// Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginError.classList.add('hidden')
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  loginSubmit.disabled = true
  loginSubmit.textContent = 'Loading...'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  loginSubmit.disabled = false
  loginSubmit.textContent = 'Masuk'
  if (error) {
    loginError.textContent = error.message
    loginError.classList.remove('hidden')
  } else {
    window.location.href = '/'
  }
})

// Register
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault()
  registerError.classList.add('hidden')
  const name = document.getElementById('regName').value
  const email = document.getElementById('regEmail').value
  const password = document.getElementById('regPassword').value
  if (password.length < 6) {
    registerError.textContent = 'Password minimal 6 karakter'
    registerError.classList.remove('hidden')
    return
  }
  registerSubmit.disabled = true
  registerSubmit.textContent = 'Loading...'
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  })
  registerSubmit.disabled = false
  registerSubmit.textContent = 'Daftar'
  if (error) {
    registerError.textContent = error.message
    registerError.classList.remove('hidden')
  } else {
    alert('Pendaftaran berhasil! Silakan cek email untuk konfirmasi.')
    tabLogin.click()
  }
})

// Cek session, jika sudah login redirect ke index
supabase.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = '/'
})
