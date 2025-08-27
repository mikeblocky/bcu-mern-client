import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext.jsx'
const WS = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:4000')
export default function HW4Chat() {
  const { token } = useAuth()
  const [room, setRoom] = useState('general')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('disconnected')
  const socketRef = useRef(null)
  useEffect(() => {
    const socket = io(WS, { auth: { token } }); socketRef.current = socket
    setStatus('connecting')
    socket.on('connect', () => setStatus('connected'))
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('history', msgs => setMessages(msgs.map(m => ({ id: m._id || m.id, content: m.content, sender: m.sender?.username || m.sender, timestamp: m.timestamp }))))
    socket.on('message', msg => setMessages(prev => [...prev, msg]))
    socket.emit('join', room)
    return () => socket.disconnect()
  }, [token, room])
  function send() {
    if (!input.trim()) return
    socketRef.current?.emit('message', { room, content: input }); setInput('')
  }
  return (
    <div className="stack">
      <h2>HW4 — Realtime Chat</h2>
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div className="label">Status: {status} · Room:</div>
        <select className="input" value={room} onChange={e => setRoom(e.target.value)}>
          <option value="general">general</option><option value="random">random</option><option value="help">help</option>
        </select>
      </div>
      <div className="card stack" style={{ height: 360, overflow: 'auto' }}>
        {messages.map(m => (<div key={m.id} className="row"><strong>{m.sender || 'anon'}:</strong><span>{m.content}</span></div>))}
        {messages.length === 0 && <div className="label">No messages yet.</div>}
      </div>
      <div className="row">
        <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" style={{ flex: 1 }} />
        <button className="btn" onClick={send}>Send</button>
      </div>
    </div>
  )
}