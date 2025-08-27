import { useEffect, useState } from 'react'
import { useAuthFetch } from '../context/AuthContext.jsx'
export default function HW1Tasks() {
  const authed = useAuthFetch()
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    setLoading(true); setError('')
    try { setItems(await authed('/api/tasks')) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  async function addTask(e) {
    e.preventDefault()
    try {
      const task = await authed('/api/tasks', { method: 'POST', body: { title: text } })
      setItems(prev => [task, ...prev]); setText('')
    } catch (e) { setError(e.message) }
  }
  async function toggle(id, completed) {
    const updated = await authed(`/api/tasks/${id}`, { method: 'PUT', body: { completed: !completed } })
    setItems(prev => prev.map(t => t._id === id ? updated : t))
  }
  async function remove(id) {
    await authed(`/api/tasks/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(t => t._id !== id))
  }
  return (
    <div className="stack">
      <h2>HW1 — Tasks CRUD (Mongo + Express)</h2>
      <form className="card row" onSubmit={addTask}>
        <input className="input" placeholder="Task title…" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn">Add</button>
      </form>
      {loading ? <div className="card">Loading…</div> : (
        <ul className="card stack" style={{ listStyle: 'none', padding: 16 }}>
          {items.map(t => (
            <li key={t._id} className="row" style={{ justifyContent: 'space-between' }}>
              <label className="row" style={{ flex: 1 }}>
                <input type="checkbox" checked={t.completed} onChange={() => toggle(t._id, t.completed)} />
                <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              </label>
              <button className="btn" onClick={() => remove(t._id)}>Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="label">No tasks yet.</li>}
        </ul>
      )}
      {error && <div className="label" role="alert" style={{ color: 'crimson' }}>{error}</div>}
    </div>
  )
}