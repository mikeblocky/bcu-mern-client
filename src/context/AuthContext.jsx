import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
function decodeJwt(token) { try { return JSON.parse(atob(token.split('.')[1])) } catch { return null } }
const AuthCtx = createContext(null)
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  useEffect(() => {
    if (!token) { setUser(null); localStorage.removeItem('token'); return }
    localStorage.setItem('token', token)
    const payload = decodeJwt(token)
    if (payload?.exp && payload.exp * 1000 < Date.now()) { setToken(''); setUser(null); return }
    setUser({ id: payload?.id, username: payload?.username, email: payload?.email, isAdmin: !!payload?.isAdmin })
  }, [token])
  const value = useMemo(() => ({ token, user, setToken, logout: () => setToken('') }), [token, user])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export function useAuth() { return useContext(AuthCtx) }
export function useAuthFetch() {
  const { token } = useAuth()
  return (path, opts={}) => import('./../api').then(m => m.api(path, { ...opts, token }))
}