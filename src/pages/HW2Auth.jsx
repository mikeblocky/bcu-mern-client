import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import { useToast } from '../components/Toast.jsx'
import ReqPopup from '../components/ReqPopup.jsx'

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernameRx = /^[A-Za-z0-9_-]+$/

export default function HW2Auth() {
  const { user, setToken, logout } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [focus, setFocus] = useState('') // which field is focused
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const rules = useMemo(() => buildRules(mode, form), [mode, form])
  const errors = summarizeErrors(rules)
  const isValid = Object.values(errors).every(v => !v)

  useEffect(() => { setFormError('') }, [mode])

  function onChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setTouched({ username: true, email: true, password: true })
    setFormError('')
    if (!isValid) {
      shake('auth-card'); return
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
        <form className="card stack slide-up" id="auth-card" onSubmit={submit} style={{ maxWidth: 520 }}>
          <div className="row" role="tablist" aria-label="Auth mode">
            <button type="button" className="btn" aria-selected={mode==='login'} onClick={() => setMode('login')}>Login</button>
            <button type="button" className="btn" aria-selected={mode==='register'} onClick={() => setMode('register')}>Register</button>
          </div>

          {mode === 'register' && (
            <div className="field">
              <Field
                label="Username"
                value={form.username}
                onChange={v => onChange('username', v)}
                placeholder="letters, numbers, _ or -"
                error={touched.username && errors.username}
                onBlur={() => setTouched(t => ({ ...t, username: true }))}
                onFocus={() => setFocus('username')}
                onFocusOut={() => setFocus('')}
              />
              <ReqPopup
                title="Username must:"
                description=""
                items={rules.username}
                show={focus==='username' || (!!errors.username && touched.username)}
                ariaId="rules-username"
              />
            </div>
          )}

          <div className="field">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={v => onChange('email', v)}
              placeholder="you@example.com"
              error={touched.email && errors.email}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              onFocus={() => setFocus('email')}
              onFocusOut={() => setFocus('')}
            />
            <ReqPopup
              title="Email must:"
              items={rules.email}
              show={focus==='email' || (!!errors.email && touched.email)}
              ariaId="rules-email"
            />
          </div>

          <div className="field">
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={v => onChange('password', v)}
              placeholder={mode==='register' ? 'At least 6 chars, a letter & number' : 'Your password'}
              error={touched.password && errors.password}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              onFocus={() => setFocus('password')}
              onFocusOut={() => setFocus('')}
            />
            <ReqPopup
              title="Password must include:"
              items={rules.password}
              show={focus==='password' || (!!errors.password && touched.password)}
              ariaId="rules-password"
            />
          </div>

          {formError && <div className="label" role="alert" style={{ color:'crimson' }}>{formError}</div>}

          <button className="btn" type="submit" disabled={loading || !isValid}>
            {loading ? <span className="row"><span className="spin" /> Processing…</span> : (mode === 'register' ? 'Create account' : 'Login')}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder='', error, onBlur, onFocus, onFocusOut }) {
  return (
    <label className="stack" onFocus={onFocus} onBlur={onFocusOut}>
      <span className="label">{label}</span>
      <input
        className={'input' + (error ? ' invalid' : '')}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
      />
      {error && <span id={`${label}-error`} className="label" style={{ color:'crimson' }}>{error}</span>}
    </label>
  )
}

function buildRules(mode, f) {
  const username = [
    { id:'u1', label:'At least 3 characters', ok: f.username.trim().length >= 3 },
    { id:'u2', label:'Only letters, numbers, _ or -', ok: usernameRx.test(f.username.trim()) },
    { id:'u3', label:'No spaces', ok: !/\s/.test(f.username) },
  ]
  const email = [
    { id:'e1', label:'Looks like a valid email', ok: emailRx.test(f.email.trim()) },
  ]
  const password = [
    { id:'p1', label:'At least 6 characters', ok: f.password.length >= 6 },
    { id:'p2', label:'Contains a letter', ok: /[A-Za-z]/.test(f.password) },
    { id:'p3', label:'Contains a number', ok: /\d/.test(f.password) },
  ]
  return {
    username: mode==='register' ? username : [],
    email, password
  }
}

function summarizeErrors(rules) {
  const out = { username: '', email: '', password: '' }
  if (rules.username?.length && rules.username.some(r => !r.ok)) out.username = 'Please meet the username rules.'
  if (rules.email.some(r => !r.ok)) out.email = 'Please enter a valid email.'
  if (rules.password.some(r => !r.ok)) out.password = 'Password does not meet all requirements.'
  return out
}

function shake(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake')
}
