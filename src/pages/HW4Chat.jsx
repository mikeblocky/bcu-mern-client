import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'

const WS = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:4000')

export default function HW4Chat() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [room, setRoom] = useState('general')
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('disconnected')
  const socketRef = useRef(null)
  const scrollRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    const socket = io(WS, { auth: { token } }); socketRef.current = socket
    setStatus('connecting')
    socket.on('connect', () => { setStatus('connected'); toast({ title:'Chat connected', variant:'success', duration:1200 }) })
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('history', msgs => setMessages(msgs.map(m => ({ id: m._id || m.id, content: m.content, sender: m.sender?.username || m.sender, timestamp: m.timestamp }))))
    socket.on('message', msg => setMessages(prev => [...prev, msg]))
    socket.on('typing', ({ user, isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev, [user]: isTyping }
        if (!isTyping) delete next[user]
        return next
      })
    })
    socket.emit('join', room)
    return () => socket.disconnect()
  }, [token, room])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  function send() {
    const content = input.trim()
    if (!content) return
    socketRef.current?.emit('message', { room, content })
    setInput('')
  }

  function onInputChange(v) {
    setInput(v)
    socketRef.current?.emit('typing', room, true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => socketRef.current?.emit('typing', room, false), 700)
  }

  const typers = Object.keys(typingUsers)
  return (
    <div className="stack">
      <h2>HW4 — Realtime Chat</h2>
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div className="label">
          Status: <span style={{ color: status==='connected' ? 'var(--ok)' : status === 'connecting' ? 'var(--warn)' : 'var(--err)'}}>{status}</span> · Room:
        </div>
        <select className="input" value={room} onChange={e => setRoom(e.target.value)}>
          <option value="general">general</option>
          <option value="random">random</option>
          <option value="help">help</option>
        </select>
      </div>

      <div ref={scrollRef} className="card stack" style={{ height: 360, overflow: 'auto' }}>
        {messages.map(m => (
          <div key={m.id} className="row slide-up"><strong>{m.sender || 'anon'}:</strong><span>{m.content}</span></div>
        ))}
        {messages.length === 0 && <div className="label">No messages yet.</div>}
      </div>

      {typers.length > 0 && (
        <div className="label" aria-live="polite">
          {typers.join(', ')} typing…
        </div>
      )}

      <div className="row">
        <input className="input" value={input} onChange={e => onInputChange(e.target.value)} placeholder="Type a message…" style={{ flex: 1 }} />
        <button className="btn" onClick={send} disabled={!input.trim()}>Send</button>
      </div>
    </div>
  )
}
