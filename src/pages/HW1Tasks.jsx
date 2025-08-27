import { useEffect, useRef, useState } from 'react'
import { useAuthFetch } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import ReqPopup from '../components/ReqPopup.jsx'

export default function HW1Tasks() {
  const authed = useAuthFetch()
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
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

  const rules = [
    { id:'t1', label:'1–120 characters', ok: text.trim().length >= 1 && text.trim().length <= 120 },
    { id:'t2', label:'Not only spaces', ok: text.length === 0 || text.trim().length > 0 },
  ]
  const invalid = rules.some(r => !r.ok)

  async function addTask(e) {
    e.preventDefault()
    if (invalid) { shake('task-form'); return }
    const title = text.trim()
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

      <div className="field">
        <form id="task-form" className="card row" onSubmit={addTask} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}>
          <input
            ref={inputRef}
            className={'input' + (invalid ? ' invalid' : '')}
            placeholder="Task title…"
            value={text}
            onChange={e => setText(e.target.value)}
            aria-invalid={invalid}
            aria-describedby="rules-task"
          />
          <button className="btn" disabled={invalid}>Add</button>
        </form>
        <ReqPopup
          title="Task title must:"
          items={rules}
          show={focus || invalid}
          ariaId="rules-task"
        />
      </div>

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
