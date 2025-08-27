import { useEffect, useMemo, useState } from 'react'
import { Link, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth, useAuthFetch } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import ReqPopup from '../components/ReqPopup.jsx'

export default function HW5Shop() {
  return (
    <Routes>
      <Route index element={<Catalog />} />
      <Route path="product/:id" element={<ProductDetail />} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="orders" element={<Orders />} />   {/* <-- NEW */}
      <Route path="admin" element={<Admin />} />
    </Routes>
  )
}

function Catalog() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try { setData(await api(`/api/products?q=${encodeURIComponent(q)}`)) }
      finally { setLoading(false) }
    })()
  }, [q])

  return (
    <div className="stack">
      <h2>HW5 — Shop</h2>
      <div className="row">
        <input className="input" placeholder="Search…" value={q} onChange={e => setParams({ q: e.target.value })} />
        <Link className="btn" to="/hw5/cart">Cart</Link>
        <Link className="btn" to="/hw5/orders">Orders</Link> {/* <-- NEW */}
      </div>

      {loading ? (
        <div className="stack">
          <div className="card skeleton" style={{height:56}}></div>
          <div className="card skeleton" style={{height:56}}></div>
          <div className="card skeleton" style={{height:56}}></div>
        </div>
      ) : (
        <div className="stack">
          {data.items.map(p => (
            <div key={p._id} className="card row slide-up" style={{ justifyContent: 'space-between' }}>
              <div><strong>{p.name}</strong> — ${p.price}</div>
              <Link className="btn" to={`/hw5/product/${p._id}`}>View</Link>
            </div>
          ))}
          {data.items.length === 0 && <div className="card label">No products yet (ask admin to add some).</div>}
        </div>
      )}
    </div>
  )
}

function ProductDetail() {
  const [prod, setProd] = useState(null)
  const { toast } = useToast()
  const id = location.pathname.split('/').pop()
  useEffect(() => { (async () => setProd(await api('/api/products/' + id)))() }, [id])
  const nav = useNavigate()
  if (!prod) return <div className="card">Loading…</div>
  function addToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    cart.push({ product: prod._id, price: prod.price, quantity: 1, name: prod.name })
    localStorage.setItem('cart', JSON.stringify(cart))
    toast({ title:'Added to cart', description: prod.name, variant:'success' })
    nav('/hw5/cart')
  }
  return (
    <div className="stack">
      <div className="card stack slide-up">
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
          <div key={i} className="card row slide-up" style={{ justifyContent: 'space-between' }}>
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

/* ---------- Modernized Checkout (Stripe-ish) ---------- */
function Checkout() {
  const authed = useAuthFetch()
  const nav = useNavigate()
  const { toast } = useToast()

  // shipping / contact
  const [addr, setAddr] = useState({ fullName:'', line1:'', city:'', country:'', zip:'' })
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState({})
  const [focus, setFocus] = useState('')

  // payment (front-end only; not sent to API)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  const errs = validateAddr(addr)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const cart = useMemo(() => JSON.parse(localStorage.getItem('cart') || '[]'), [])
  const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0)
  const shipping = subtotal > 75 ? 0 : 6
  const total = subtotal + shipping

  // payment validations (like Stripe UI)
  const cardDigits = cardNumber.replace(/\D/g, '')
  const payRules = {
    cardName: [
      { id:'n1', label:'Required', ok: !!cardName.trim() },
      { id:'n2', label:'Letters/spaces only', ok: cardName.trim()==='' || /^[a-zA-Z\s.'-]+$/.test(cardName) },
    ],
    cardNumber: [
      { id:'c1', label:'16 digits (spaces OK)', ok: cardDigits.length === 16 },
      { id:'c2', label:'Passes Luhn check', ok: luhn(cardDigits) },
    ],
    expiry: [
      { id:'e1', label:'MM/YY format', ok: /^\d{2}\/\d{2}$/.test(expiry) },
      { id:'e2', label:'Not expired', ok: validExpiry(expiry) },
    ],
    cvc: [
      { id:'v1', label:'3 digits', ok: /^\d{3}$/.test(cvc) },
    ],
  }
  const paymentValid = Object.values(payRules).flat().every(r => r.ok)
  const shippingValid = Object.values(errs).every(v => !v) && emailOk
  const allValid = shippingValid && paymentValid && cart.length > 0

  function onNumInput(v) {
    // Format: 4242 4242 4242 4242
    const digits = v.replace(/\D/g, '').slice(0,16)
    const groups = digits.match(/.{1,4}/g) || []
    setCardNumber(groups.join(' '))
  }
  function onExpiry(v) {
    const d = v.replace(/\D/g, '').slice(0,4)
    let out = d
    if (d.length >= 3) out = d.slice(0,2) + '/' + d.slice(2)
    setExpiry(out)
  }

  async function placeOrder() {
    setTouched({ fullName:true, line1:true, city:true, country:true, zip:true })
    if (!allValid) return shake('checkout-card')
    try {
      const items = JSON.parse(localStorage.getItem('cart') || '[]')
      if (!items.length) return
      const order = await authed('/api/orders', {
        method: 'POST',
        body: { items, shippingAddress: { ...addr, email }, total }
      })
      localStorage.removeItem('cart')
      toast({ title:'Order placed', description: order._id, variant:'success' })
      nav('/hw5/orders')
    } catch (e) {
      toast({ title:'Checkout failed', description:e.message, variant:'error' })
    }
  }

  // rules popovers (reuse)
  const rulesByField = {
    fullName: [
      { id:'f1', label:'Required', ok: !!addr.fullName.trim() },
      { id:'f2', label:'At least 2 characters', ok: addr.fullName.trim().length >= 2 },
    ],
    line1: [{ id:'a1', label:'Required', ok: !!addr.line1.trim() }],
    city:  [{ id:'c1', label:'Required', ok: !!addr.city.trim() }],
    country:[{ id:'co1', label:'Required', ok: !!addr.country.trim() }],
    zip:   [
      { id:'z1', label:'Required', ok: !!addr.zip.trim() },
      { id:'z2', label:'Looks valid (3+ chars)', ok: addr.zip.trim().length >= 3 },
    ],
    email: [
      { id:'m1', label:'Looks like an email', ok: emailOk }
    ]
  }

  return (
    <div className="stack">
      <h2>Checkout</h2>

      <div className="checkout-grid">
        {/* LEFT: details */}
        <div className="card section" id="checkout-card">
          <div className="section">
            <div className="section-title">Contact</div>
            <div className="field" onFocus={() => setFocus('email')} onBlur={() => setFocus('')}>
              <label className="stack">
                <span className="label">Email</span>
                <input
                  className={'input' + (!emailOk ? ' invalid' : '')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-invalid={!emailOk}
                  aria-describedby="rules-email"
                  placeholder="you@example.com"
                />
              </label>
              <ReqPopup title="Email" items={rulesByField.email} show={focus==='email' || !emailOk} ariaId="rules-email" />
            </div>
          </div>

          <div className="divider" />

          <div className="section">
            <div className="section-title">Shipping</div>
            <div className="grid-2">
              <FieldWithPopup k="fullName" label="Full Name" value={addr.fullName} setValue={v=>setAddr(a=>({...a, fullName:v}))}
                touched={touched} setTouched={setTouched} errs={errs} rules={rulesByField} focus={focus} setFocus={setFocus} />
              <FieldWithPopup k="line1" label="Address Line" value={addr.line1} setValue={v=>setAddr(a=>({...a, line1:v}))}
                touched={touched} setTouched={setTouched} errs={errs} rules={rulesByField} focus={focus} setFocus={setFocus} />
            </div>
            <div className="grid-3">
              <FieldWithPopup k="city" label="City" value={addr.city} setValue={v=>setAddr(a=>({...a, city:v}))}
                touched={touched} setTouched={setTouched} errs={errs} rules={rulesByField} focus={focus} setFocus={setFocus} />
              <FieldWithPopup k="country" label="Country" value={addr.country} setValue={v=>setAddr(a=>({...a, country:v}))}
                touched={touched} setTouched={setTouched} errs={errs} rules={rulesByField} focus={focus} setFocus={setFocus} />
              <FieldWithPopup k="zip" label="ZIP" value={addr.zip} setValue={v=>setAddr(a=>({...a, zip:v}))}
                touched={touched} setTouched={setTouched} errs={errs} rules={rulesByField} focus={focus} setFocus={setFocus} />
            </div>
          </div>

          <div className="divider" />

          <div className="section">
            <div className="section-title">Payment</div>

            <div className="floating">
              <label className="label">Cardholder Name</label>
              <input className={'input' + (!payRules.cardName.every(r=>r.ok) ? ' invalid' : '')}
                     placeholder="e.g., Jane Doe" value={cardName} onChange={e => setCardName(e.target.value)}
                     aria-invalid={!payRules.cardName.every(r=>r.ok)} />
              <ReqPopup title="Cardholder" items={payRules.cardName} show={!payRules.cardName.every(r=>r.ok)} ariaId="rules-name" />
            </div>

            <div className="cc-row">
              <div className={'cc-field' + (!payRules.cardNumber.every(r=>r.ok) ? ' invalid' : '')}>
                <span className="badge">💳</span>
                <input inputMode="numeric" placeholder="Please type 0000 0000 0000 0000" value={cardNumber} onChange={e => onNumInput(e.target.value)} />
              </div>
              <div className="grid-3">
                <div className={'cc-field' + (!payRules.expiry.every(r=>r.ok) ? ' invalid' : '')}>
                  <input inputMode="numeric" placeholder="MM/YY" value={expiry} onChange={e => onExpiry(e.target.value)} />
                </div>
                <div className={'cc-field' + (!payRules.cvc.every(r=>r.ok) ? ' invalid' : '')}>
                  <input inputMode="numeric" placeholder="CVC" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g,'').slice(0,3))} />
                </div>
                <div className="badge">Test mode</div>
              </div>
            </div>

            {/* tiny requirement hints */}
            <div className="label" style={{marginTop:6}}>
              We don’t store card data (demo UI only).
            </div>
          </div>

          <button className="btn" onClick={placeOrder} disabled={!allValid}>
            {allValid ? 'Pay & Place Order' : 'Complete details to pay'}
          </button>
        </div>

        {/* RIGHT: summary */}
        <div className="card section">
          <div className="section-title">Order Summary</div>
          <div className="stack">
            {cart.map((it, i) => (
              <div key={i} className="price-row">
                <div>{it.name} × {it.quantity}</div>
                <div>${(it.price * it.quantity).toFixed(2)}</div>
              </div>
            ))}
            {cart.length === 0 && <div className="label">Cart is empty.</div>}
            <div className="divider" />
            <div className="price-row"><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
            <div className="price-row"><span>Shipping</span><strong>{shipping ? `$${shipping.toFixed(2)}` : <span className="badge">Free</span>}</strong></div>
            <div className="divider" />
            <div className="price-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldWithPopup({ k, label, value, setValue, touched, setTouched, errs, rules, focus, setFocus }) {
  const show = focus===k || (touched[k] && !!errs[k])
  return (
    <div className="field" onFocus={() => setFocus(k)} onBlur={() => setFocus('')}>
      <label className="stack">
        <span className="label">{label}</span>
        <input
          className={'input' + (touched[k] && errs[k] ? ' invalid' : '')}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, [k]: true }))}
          aria-invalid={!!(touched[k] && errs[k])}
          aria-describedby={`rules-${k}`}
        />
        {touched[k] && errs[k] && <span className="label" style={{ color:'crimson' }}>{errs[k]}</span>}
      </label>
      <ReqPopup title={`${label} requirements`} items={rules[k]} show={show} ariaId={`rules-${k}`} />
    </div>
  )
}

/* ---------- Orders ---------- */
function Orders() {
  const { user } = useAuth()
  const authed = useAuthFetch()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [all, setAll] = useState(false) // admin toggle

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const path = user?.isAdmin && all ? '/api/admin/orders' : '/api/orders'
        const data = await authed(path)
        // normalize to array
        setOrders(Array.isArray(data) ? data : data.items || [])
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    })()
  }, [all, user?.isAdmin])

  return (
    <div className="stack">
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Orders</h2>
        {user?.isAdmin && (
          <label className="row">
            <input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)} />
            <span className="label">View all (admin)</span>
          </label>
        )}
      </div>

      {loading ? (
        <div className="stack">
          <div className="card skeleton" style={{height:64}} />
          <div className="card skeleton" style={{height:64}} />
        </div>
      ) : error ? (
        <div className="card label" style={{color:'crimson'}}>{error}</div>
      ) : (
        <div className="order-list">
          {orders.map(o => (
            <div key={o._id} className="card order-card slide-up">
              <div className="order-head">
                <div className="row">
                  <span className="badge">#{short(o._id)}</span>
                  <span className="label">{formatDate(o.createdAt)}</span>
                </div>
                <div className={'status ' + (o.status || 'pending')}>
                  {o.status || 'pending'}
                </div>
              </div>
              <div className="price-row" style={{marginTop:8}}>
                <div className="label">{(o.items?.length || 0)} item(s)</div>
                <div><strong>${(o.total ?? sum(o.items)).toFixed(2)}</strong></div>
              </div>
              <div className="order-items">
                {(o.items || []).map((it, i) => (
                  <div key={i} className="row" style={{justifyContent:'space-between'}}>
                    <div>{it.name || it.product?.name || 'Item'} × {it.quantity}</div>
                    <div>${(it.price * it.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="card label">No orders yet.</div>}
        </div>
      )}
    </div>
  )
}

/* ---- Admin ---- */
function Admin() {
  const authed = useAuthFetch()
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ name:'', price:0, description:'', inventory:0, category:'' })
  const [list, setList] = useState([])
  useEffect(() => { (async () => setList((await api('/api/products')).items))() }, [])
  async function createProduct() {
    if (!form.name.trim() || form.price <= 0) {
      toast({ title:'Missing fields', description:'Name and positive price required.', variant:'error' })
      return
    }
    const p = await authed('/api/admin/products', { method:'POST', body: form })
    setList(prev => [p, ...prev])
    toast({ title:'Product created', description: p.name, variant:'success' })
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
        {list.map(p => <div key={p._id} className="card row slide-up" style={{ justifyContent:'space-between' }}><div>{p.name} — ${p.price} ({p.inventory} in stock)</div></div>)}
      </div>
    </div>
  )
}

/* ---- helpers ---- */
function validateAddr(a){
  const e = { fullName:'', line1:'', city:'', country:'', zip:'' }
  if (!a.fullName.trim()) e.fullName = 'Full name is required.'
  else if (a.fullName.trim().length < 2) e.fullName = 'Min 2 characters.'
  if (!a.line1.trim()) e.line1 = 'Address line is required.'
  if (!a.city.trim()) e.city = 'City is required.'
  if (!a.country.trim()) e.country = 'Country is required.'
  if (!a.zip.trim()) e.zip = 'ZIP/Postal code is required.'
  else if (a.zip.trim().length < 3) e.zip = 'Please enter a valid code.'
  return e
}

function luhn(numStr){
  if (numStr.length < 1) return false
  let sum=0, dbl=false
  for (let i=numStr.length-1;i>=0;i--){
    let d = Number(numStr[i])
    if (dbl){ d*=2; if (d>9) d-=9 }
    sum+=d; dbl=!dbl
  }
  return sum%10===0
}
function validExpiry(mmYY){
  const m = mmYY.match(/^(\d{2})\/(\d{2})$/); if (!m) return false
  const mm = Number(m[1]); const yy = Number(m[2])
  if (mm<1 || mm>12) return false
  const now = new Date()
  const yr = now.getFullYear()%100
  const mo = now.getMonth()+1
  return yy>yr || (yy===yr && mm>=mo)
}
function short(id){ return id?.slice?.(0,6) || '—' }
function sum(items=[]){ return items.reduce((s,it)=>s+(it.price*it.quantity),0) }
function formatDate(d){
  try { return new Date(d).toLocaleString() } catch { return '—' }
}
function shake(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake')
}
