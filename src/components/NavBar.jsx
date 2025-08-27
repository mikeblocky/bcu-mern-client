import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Overview' },
  { to: '/hw1', label: 'HW1: Tasks API UI' },
  { to: '/hw2', label: 'HW2: Auth (JWT)' },
  { to: '/hw3', label: 'HW3: Protected Routes' },
  { to: '/hw4', label: 'HW4: Chat' },
  { to: '/hw5', label: 'HW5: E-commerce' },
]

export default function NavBar() {
  return (
    <div className="navbar">
      <div className="nav-inner">
        <div className="brand">BCU MERN</div>
        <div className="tabs">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
