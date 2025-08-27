import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
export default function HW2Auth() {
  const { user, setToken, logout } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setError('')
    try {
      if (mode === 'register') {
        const res = await api('/api/auth/register', { method: 'POST', body: form })
        setToken(res.token)
      } else {
        const res = await api('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
        setToken(res.token)
      }
    } catch (e) { setError(e.message || 'Request failed') }
  }
  return (
    <div className="stack">
      <h2>HW2 — Authentication (JWT)</h2>
      {user ? (
        <div className="card stack">
          <div><strong>Logged in as:</strong> {user.username} {user.isAdmin ? '(admin)' : ''}</div>
          <div className="row"><button className="btn" onClick={logout}>Logout</button></div>
        </div>
      ) : (
        <form className="card stack" onSubmit={submit} style={{ maxWidth: 420 }}>
          <div className="row">
            <button type="button" className="btn" onClick={() => setMode('login')}>Login</button>
            <button type="button" className="btn" onClick={() => setMode('register')}>Register</button>
          </div>
          {mode === 'register' && (
            <label className="stack"><span className="label">Username</span>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></label>
          )}
          <label className="stack"><span className="label">Email</span>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
          <label className="stack"><span className="label">Password</span>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></label>
          <button className="btn" type="submit">{mode === 'register' ? 'Create account' : 'Login'}</button>
          {error && <div className="label" role="alert" style={{ color: 'crimson' }}>{error}</div>}
        </form>
      )}
    </div>
  )
}