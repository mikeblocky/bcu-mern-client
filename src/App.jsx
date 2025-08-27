import { Routes, Route, Link } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import HW1Tasks from './pages/HW1Tasks.jsx'
import HW2Auth from './pages/HW2Auth.jsx'
import HW3ProtectedDemo from './pages/HW3ProtectedDemo.jsx'
import HW4Chat from './pages/HW4Chat.jsx'
import HW5Shop from './pages/HW5Shop.jsx'
import Protected from './components/Protected.jsx'
export default function App() {
  return (
    <div>
      <NavBar />
      <div className="container">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="/hw1" element={<Protected><HW1Tasks /></Protected>} />
          <Route path="/hw2" element={<HW2Auth />} />
          <Route path="/hw3" element={<Protected><HW3ProtectedDemo /></Protected>} />
          <Route path="/hw4" element={<Protected><HW4Chat /></Protected>} />
          <Route path="/hw5" element={<HW5Shop />} />
          <Route path="*" element={<div className="card">Not found. <Link to="/">Home</Link></div>} />
        </Routes>
      </div>
    </div>
  )
}
function Overview() {
  return (
    <div className="card stack">
      <h1>Homeworks 1–5 — One website</h1>
      <p>Tasks CRUD + JWT auth, protected routes, realtime chat, and a mini shop. Beige skin, Geist Mono bones.</p>
    </div>
  )
}