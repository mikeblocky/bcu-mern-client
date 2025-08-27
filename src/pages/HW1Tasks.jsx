import { useEffect, useRef, useState } from 'react'
import { useAuthFetch } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'

export default function HW1Tasks() {
  const authed = useAuthFetch()
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastDeleted, setLastDeleted] = useState(null)
  const inputRef = useRef(null)

  async function load() {
    setLoading(true); setError('')
    try { setItems(await authed('/api/tasks')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function addTask(e) {
    e.preventDefault()
    const title = text.trim()
    if (!title) {
      shake('task-form'); return
    }
    if (title.length > 120) {
      toast({ title: 'Too long', description: 'Keep titles under 120 chars.', variant: 'error' })
      return
    }
    try {
      const optimistic = { _id: 'tmp-' + Math.random(), title, completed: false, optimistic: true }
      setItems(prev => [optimistic, ...prev]); setText('')
      const task = await authed('/api/tasks', { method:'POST', body:{ title } })
      setItems(prev => prev.map(t => t._id === optimistic._id ? task : t))
      toast({ title: 'Added', variant:'success' })
      inputRef.current?.focus()
    } catch (e) { setError(e.message); shake('task-form') }
  }

  async function toggle(id, completed) {
    const prev = items
    setItems(list => list.map(t => t._id === id ? { ...t, completed: !completed } : t))
    try { await authed(`/api/tasks/${id}`, { method:'PUT', body:{ completed: !completed } }) }
    catch { setItems(prev) }
  }

  async function remove(id) {
    const target = items.find(t => t._id === id)
    setItems(prev => prev.filter(t => t._id !== id))
    setLastDeleted(target)
    toast({ title:'Task deleted', description:'Click to undo', variant:'info', duration:2000 })
    try { await authed(`/api/tasks/${id}`, { method:'DELETE' }) }
    catch { /* ignore */ }
  }

  function undo() {
    if (!lastDeleted) return
    setItems(prev => [lastDeleted, ...prev])
    setLastDeleted(null)
  }

  return (
    <div className="stack">
      <h2>HW1 — Tasks CRUD (Mongo + Express)</h2>

      <form id="task-form" className="card row" onSubmit={addTask}>
        <input ref={inputRef} className={'input' + (!text.trim() ? ' invalid' : '')} placeholder="Task title…" value={text} onChange={e => setText(e.target.value)} />
        <button className="btn" disabled={!text.trim()}>Add</button>
      </form>

      {loading ? (
        <div className="card stack" aria-busy="true">
          <div className="skeleton skeleton-line" style={{width:'70%'}}></div>
          <div className="skeleton skeleton-line" style={{width:'40%'}}></div>
          <div className="skeleton skeleton-line" style={{width:'55%'}}></div>
        </div>
      ) : (
        <ul className="card stack" style={{ listStyle: 'none', padding: 16 }}>
          {items.map(t => (
            <li key={t._id} className="row slide-up" style={{ justifyContent: 'space-between' }}>
              <label className="row" style={{ flex: 1 }}>
                <input type="checkbox" checked={!!t.completed} onChange={() => toggle(t._id, t.completed)} />
                <span style={{ textDecoration: t.completed ? 'line-through' : 'none', opacity: t.optimistic? .6 : 1 }}>
                  {t.title}
                </span>
              </label>
              <button className="btn" onClick={() => remove(t._id)}>Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="label">No tasks yet.</li>}
        </ul>
      )}

      {lastDeleted && (
        <div className="row">
          <button className="btn" onClick={undo}>Undo delete</button>
        </div>
      )}

      {error && <div className="label" role="alert" style={{ color: 'crimson' }}>{error}</div>}
    </div>
  )
}

function shake(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake')
}
