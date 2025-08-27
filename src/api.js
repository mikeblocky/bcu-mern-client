const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
export async function api(path, { method='GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  })
  const text = await res.text()
  let json; try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!res.ok) throw Object.assign(new Error(json.error || res.statusText), { status: res.status, data: json })
  return json
}