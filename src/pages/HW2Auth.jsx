import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import { useToast } from '../components/Toast.jsx'

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function HW2Auth() {
  const { user, setToken, logout } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const errors = validate(mode, form)
  const isValid = Object.values(errors).every(v => !v)

  useEffect(() => {
    setFormError('')
  }, [mode])

  function onChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setTouched({ username: true, email: true, password: true })
    setFormError('')
    if (!isValid) {
      shake('auth-card')
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        const res = await api('/api/auth/register', { method: 'POST', body: form })
        setToken(res.token)
        toast({ title: 'Welcome!', description: 'Account created successfully.', variant: 'success' })
      } else {
        const res = await api('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
        setToken(res.token)
        toast({ title: 'Logged in', description: 'You are now authenticated.', variant: 'success' })
      }
    } catch (e) {
      setFormError(e.message || 'Request failed')
      toast({ title: 'Authentication failed', description: e.message || 'Please try again.', variant: 'error' })
      shake('auth-card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <h2 className="fade-in">HW2 — Authentication (JWT)</h2>

      {user ? (
        <div className="card stack slide-up" id="auth-card">
          <div><strong>Logged in as:</strong> {user.username} {user.isAdmin ? '(admin)' : ''}</div>
          <div className="row">
            <button className="btn" onClick={() => { logout(); toast({ title: 'Logged out', variant: 'info' }) }}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <form className="card stack slide-up" id="auth-card" onSubmit={submit} style={{ maxWidth: 480 }}>
          <div className="row" role="tablist" aria-label="Auth mode">
            <button type="button" className="btn" aria-selected={mode==='login'} onClick={() => setMode('login')}>Login</button>
            <button type="button" className="btn" aria-selected={mode==='register'} onClick={() => setMode('register')}>Register</button>
          </div>

          {mode === 'register' && (
            <Field
              label="Username"
              value={form.username}
              onChange={v => onChange('username', v)}
              placeholder="Your nickname"
              error={touched.username && errors.username}
              onBlur={() => setTouched(t => ({ ...t, username: true }))}
            />
          )}

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={v => onChange('email', v)}
            placeholder="you@example.com"
            error={touched.email && errors.email}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={v => onChange('password', v)}
            placeholder={mode==='register' ? 'At least 6 characters' : 'Your password'}
            error={touched.password && errors.password}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
          />

          {formError && <div className="label" role="alert" style={{ color:'crimson' }}>{formError}</div>}

          <button className="btn" type="submit" disabled={loading || !isValid}>
            {loading ? <span className="row"><span className="spin"></span> Processing…</span> : (mode === 'register' ? 'Create account' : 'Login')}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder='', error, onBlur }) {
  return (
    <label className="stack">
      <span className="label">{label}</span>
      <input
        className={'input' + (error ? ' invalid' : '')}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
      />
      {error && <span id={`${label}-error`} className="label" style={{ color:'crimson' }}>{error}</span>}
    </label>
  )
}

function validate(mode, f) {
  const errs = { username: '', email: '', password: '' }
  if (mode === 'register') {
    if (!f.username.trim()) errs.username = 'Username is required.'
    else if (f.username.trim().length < 3) errs.username = 'Min 3 characters.'
  }
  if (!f.email.trim()) errs.email = 'Email is required.'
  else if (!emailRx.test(f.email)) errs.email = 'Enter a valid email.'
  if (!f.password) errs.password = 'Password is required.'
  else if (mode === 'register' && f.password.length < 6) errs.password = 'At least 6 characters.'
  return errs
}

function shake(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake')
}
