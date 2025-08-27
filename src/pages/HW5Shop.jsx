import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth, useAuthFetch } from '../context/AuthContext.jsx'
export default function HW5Shop() {
  return (
    <Routes>
      <Route index element={<Catalog />} />
      <Route path="product/:id" element={<ProductDetail />} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="admin" element={<Admin />} />
    </Routes>
  )
}
function Catalog() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 })
  useEffect(() => { (async () => setData(await api(`/api/products?q=${encodeURIComponent(q)}`)))() }, [q])
  return (
    <div className="stack">
      <h2>HW5 — Shop</h2>
      <div className="row">
        <input className="input" placeholder="Search…" value={q} onChange={e => setParams({ q: e.target.value })} />
        <Link className="btn" to="/hw5/cart">Cart</Link>
      </div>
      <div className="stack">
        {data.items.map(p => (
          <div key={p._id} className="card row" style={{ justifyContent: 'space-between' }}>
            <div><strong>{p.name}</strong> — ${p.price}</div>
            <Link className="btn" to={`/hw5/product/${p._id}`}>View</Link>
          </div>
        ))}
        {data.items.length === 0 && <div className="card label">No products yet (ask admin to add some).</div>}
      </div>
    </div>
  )
}
function ProductDetail() {
  const [prod, setProd] = useState(null)
  const id = location.pathname.split('/').pop()
  useEffect(() => { (async () => setProd(await api('/api/products/' + id)))() }, [id])
  const nav = useNavigate()
  if (!prod) return <div className="card">Loading…</div>
  function addToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    cart.push({ product: prod._id, price: prod.price, quantity: 1, name: prod.name })
    localStorage.setItem('cart', JSON.stringify(cart)); nav('/hw5/cart')
  }
  return (
    <div className="stack">
      <div className="card stack">
        <h3>{prod.name}</h3><div>${prod.price}</div>
        <div className="label">{prod.description || 'No description'}</div>
        <button className="btn" onClick={addToCart}>Add to Cart</button>
      </div>
    </div>
  )
}
function Cart() {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const nav = useNavigate()
  function update(i, d) { const copy = items.slice(); copy[i].quantity = Math.max(1, copy[i].quantity + d); setItems(copy); localStorage.setItem('cart', JSON.stringify(copy)) }
  function remove(i) { const copy = items.slice(); copy.splice(i,1); setItems(copy); localStorage.setItem('cart', JSON.stringify(copy)) }
  return (
    <div className="stack">
      <h2>Your Cart</h2>
      <div className="stack">
        {items.map((it, i) => (
          <div key={i} className="card row" style={{ justifyContent: 'space-between' }}>
            <div>{it.name} — ${it.price} × {it.quantity}</div>
            <div className="row">
              <button className="btn" onClick={() => update(i, -1)}>-</button>
              <button className="btn" onClick={() => update(i, +1)}>+</button>
              <button className="btn" onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="card label">Cart is empty.</div>}
      </div>
      <div className="row">
        <div className="card"><strong>Total:</strong> ${total.toFixed(2)}</div>
        <button className="btn" disabled={!items.length} onClick={() => nav('/hw5/checkout')}>Checkout</button>
      </div>
    </div>
  )
}
function Checkout() {
  const authed = useAuthFetch()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const [addr, setAddr] = useState({ fullName:'', line1:'', city:'', country:'', zip:'' })
  async function placeOrder() {
    setError('')
    try {
      const items = JSON.parse(localStorage.getItem('cart') || '[]')
      if (!items.length) return
      const order = await authed('/api/orders', { method: 'POST', body: { items, shippingAddress: addr } })
      localStorage.removeItem('cart'); nav('/hw5'); alert('Order placed: ' + order._id)
    } catch (e) { setError(e.message) }
  }
  return (
    <div className="stack">
      <h2>Checkout</h2>
      <div className="card stack" style={{ maxWidth: 520 }}>
        {Object.keys(addr).map(k => (
          <label key={k} className="stack"><span className="label">{k}</span>
            <input className="input" value={addr[k]} onChange={e => setAddr(a => ({...a, [k]: e.target.value}))} /></label>
        ))}
        <button className="btn" onClick={placeOrder}>Place Order</button>
        {error && <div className="label" role="alert" style={{ color:'crimson' }}>{error}</div>}
      </div>
    </div>
  )
}
function Admin() {
  const authed = useAuthFetch()
  const { user } = useAuth()
  const [form, setForm] = useState({ name:'', price:0, description:'', inventory:0, category:'' })
  const [list, setList] = useState([])
  useEffect(() => { (async () => setList((await api('/api/products')).items))() }, [])
  async function createProduct() {
    const p = await authed('/api/admin/products', { method:'POST', body: form })
    setList(prev => [p, ...prev])
  }
  if (!user?.isAdmin) return <div className="card">Admins only.</div>
  return (
    <div className="stack">
      <h2>Admin</h2>
      <div className="card stack">
        <label className="stack"><span className="label">Name</span><input className="input" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/></label>
        <label className="stack"><span className="label">Price</span><input className="input" type="number" value={form.price} onChange={e=>setForm(f=>({...f, price:Number(e.target.value)}))}/></label>
        <label className="stack"><span className="label">Inventory</span><input className="input" type="number" value={form.inventory} onChange={e=>setForm(f=>({...f, inventory:Number(e.target.value)}))}/></label>
        <label className="stack"><span className="label">Category</span><input className="input" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))}/></label>
        <label className="stack"><span className="label">Description</span><textarea className="input" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))}/></label>
        <button className="btn" onClick={createProduct}>Create Product</button>
      </div>
      <div className="stack">
        {list.map(p => <div key={p._id} className="card row" style={{ justifyContent:'space-between' }}><div>{p.name} — ${p.price} ({p.inventory} in stock)</div></div>)}
      </div>
    </div>
  )
}