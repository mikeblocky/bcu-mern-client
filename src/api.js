// client/src/api.js
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, { method = 'GET', body, headers = {}, token } = {}) {
  const url = `${BASE}${path}`
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',
  }
  if (token) opts.headers.Authorization = `Bearer ${token}`
  if (body !== undefined) opts.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(url, opts)
  } catch (e) {
    // typically connection refused / DNS / CORS preflight blocked
    throw new Error(`Network error contacting API: ${e.message}`)
  }

  let data = null
  try { data = await res.json() } catch { /* noop: some 204s have no body */ }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}
