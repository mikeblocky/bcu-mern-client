import { useAuth } from '../context/AuthContext.jsx'
export default function HW3ProtectedDemo() {
  const { user } = useAuth()
  return (
    <div className="stack">
      <h2>HW3 — Protected Route Demo</h2>
      <div className="card">
        <p>Hi <strong>{user?.username}</strong>, you're seeing this because your JWT is valid.</p>
      </div>
    </div>
  )
}