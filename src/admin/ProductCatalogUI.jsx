import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { membershipApi, productCatalogApi, reportApi } from '../services/api'
import { apiError } from '../services/api/client'
import { useAuth } from '../context/AuthContext'
import { ConferenceBookingPage, HotdeskBookWizard } from './ConferenceBooking'

function Panel({ title, children, actions }) {
  return (
    <article className="dash-card admin-rise">
      <div className="admin-panel__head">
        <div>
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </article>
  )
}

function Banner({ error, success }) {
  if (error) return <p className="admin-login__error">{error}</p>
  if (success) return <p className="admin-login__hint">{success}</p>
  return null
}

function familyLabel(c) {
  if (c === 'CONFERENCE') return 'Conference / Meeting'
  if (c === 'HOT_DESK') return 'Hotdesk'
  if (c === 'PHYSICAL_OFFICE') return 'Physical'
  if (c === 'VIRTUAL_OFFICE') return 'Virtual'
  return c || '—'
}

const PRODUCT_STATUSES = [
  ['VACANT', 'Vacant'],
  ['OCCUPIED', 'Occupied'],
  ['PIPELINE', 'Pipeline'],
  ['RENOVATION', 'Renovation'],
  ['INACTIVE', 'Inactive'],
]

function normalizeAvailability(v) {
  const s = String(v || 'VACANT').toUpperCase()
  const map = {
    AVAILABLE: 'VACANT',
    LIMITED: 'PIPELINE',
    FULL: 'OCCUPIED',
    UNDER_MAINTENANCE: 'RENOVATION',
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    PIPELINE: 'PIPELINE',
    RENOVATION: 'RENOVATION',
    INACTIVE: 'INACTIVE',
  }
  return map[s] || 'VACANT'
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function bookingClientLabel(b) {
  const notes = String(b?.notes || '')
  const company =
    notes.match(/company=([^·]+)/i)?.[1]?.trim() || notes.match(/External:\s*([^·]+)/i)?.[1]?.trim()
  if (company) return company
  if (/client=EXTERNAL/i.test(notes)) return 'External client'
  return b?.user?.fullName || '—'
}

function printNode(title) {
  const node = document.getElementById('detail-print-root')
  if (!node) return
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) return
  w.document.write(
    `<!doctype html><html><head><title>${title}</title><style>
      body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111}
      h1,h2,h3{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
      .muted{color:#555;font-size:13px} section{margin-bottom:18px}
    </style></head><body>${node.innerHTML}</body></html>`,
  )
  w.document.close()
  w.focus()
  w.print()
}

function blankProduct(productCategory) {
  const isRoom = productCategory === 'CONFERENCE' || productCategory === 'HOT_DESK'
  const isVirtual = productCategory === 'VIRTUAL_OFFICE'
  return {
    id: null,
    productCategory,
    centerId: '',
    catalogCategoryId: '',
    code: '',
    name: '',
    numberOfSeats: isVirtual ? '' : isRoom ? 4 : 1,
    availability: 'VACANT',
    depositAmount: '',
    price: '',
    duration: isRoom ? 1 : 12,
    durationUnit: isRoom ? 'DAY' : 'MONTH',
    slotStartTime: '09:00',
    slotEndTime: '20:00',
    slotIntervalMinutes: 30,
    minHours: 1,
    maxHours: null,
    slotPrice: '',
    hotdeskType: productCategory === 'CONFERENCE' ? 'CONFERENCE' : productCategory === 'HOT_DESK' ? 'DAYPASS' : '',
    isActive: true,
  }
}

function previewSlots(start, end, interval) {
  if (!start || !end || !interval) return []
  const toMin = (t) => {
    const [h, m] = String(t).split(':').map(Number)
    return h * 60 + m
  }
  const open = toMin(start)
  const close = toMin(end)
  const step = Number(interval) || 30
  const out = []
  for (let m = open; m + step <= close; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    out.push(`${hh}:${mm}`)
  }
  return out.slice(0, 24)
}

function ProductModal({ open, title, form, setForm, centers, categories, onClose, onSave, saving, error }) {
  if (!open || !form) return null
  const isRoom = form.productCategory === 'CONFERENCE' || form.productCategory === 'HOT_DESK'
  const isConference = form.productCategory === 'CONFERENCE'
  const isVirtual = form.productCategory === 'VIRTUAL_OFFICE'
  const isPhysical = form.productCategory === 'PHYSICAL_OFFICE'
  const familyCats = categories.filter((c) => {
    if (form.productCategory === 'PHYSICAL_OFFICE') return c.forPhysical
    if (form.productCategory === 'VIRTUAL_OFFICE') return c.forVirtual
    if (form.productCategory === 'CONFERENCE' || form.productCategory === 'HOT_DESK') return c.forHotdesk
    return true
  })
  const slots = isRoom ? previewSlots(form.slotStartTime, form.slotEndTime, form.slotIntervalMinutes) : []

  return createPortal(
    <div className="enq-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={onClose} />
      <div className="enq-modal__panel product-modal__panel">
        <header className="enq-modal__head">
          <div>
            <p className="enq-modal__eyebrow">{familyLabel(form.productCategory)} product</p>
            <h3 id="product-modal-title">{title}</h3>
          </div>
          <button type="button" className="enq-ghost product-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="enq-modal__form" onSubmit={onSave}>
          <div className="enq-modal__body">
            {error ? <p className="admin-login__error">{error}</p> : null}
            <div className="admin-grid-2">
              <label className="admin-field">
                <span>Center</span>
                <select
                  required
                  value={form.centerId}
                  onChange={(e) => setForm({ ...form, centerId: e.target.value })}
                >
                  <option value="">Select center</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Category</span>
                <select
                  required
                  value={form.catalogCategoryId}
                  onChange={(e) => setForm({ ...form, catalogCategoryId: e.target.value })}
                  disabled={!form.centerId}
                >
                  <option value="">{form.centerId ? 'Select category' : 'Select center first'}</option>
                  {familyCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Product code</span>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. A01-S1" />
              </label>
              <label className="admin-field">
                <span>Display name (optional)</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto from code if empty" />
              </label>

              {!isVirtual ? (
                <label className="admin-field">
                  <span>{isConference ? 'No. of seats (4 / 8 seater)' : 'No. of seats'}</span>
                  {isConference ? (
                    <select
                      required
                      value={form.numberOfSeats || 4}
                      onChange={(e) => setForm({ ...form, numberOfSeats: e.target.value })}
                    >
                      <option value={4}>4 seater</option>
                      <option value={8}>8 seater</option>
                      <option value={6}>6 seater</option>
                      <option value={10}>10 seater</option>
                      <option value={12}>12 seater</option>
                    </select>
                  ) : (
                    <input
                      required
                      type="number"
                      min={1}
                      value={form.numberOfSeats}
                      onChange={(e) => setForm({ ...form, numberOfSeats: e.target.value })}
                    />
                  )}
                </label>
              ) : null}

              <label className="admin-field">
                <span>Product status</span>
                <select
                  value={normalizeAvailability(form.availability)}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                >
                  {PRODUCT_STATUSES.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{isRoom ? 'Price per slot' : 'Cost'}</span>
                <input
                  required
                  type="number"
                  min={0}
                  value={isRoom ? form.slotPrice : form.price}
                  onChange={(e) =>
                    isRoom
                      ? setForm({ ...form, slotPrice: e.target.value, price: e.target.value })
                      : setForm({ ...form, price: e.target.value })
                  }
                />
              </label>
              <label className="admin-field">
                <span>{isPhysical ? 'Deposit amount' : 'Deposit amount (optional)'}</span>
                <input
                  type="number"
                  min={0}
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                  placeholder={isPhysical ? '' : 'Optional'}
                />
              </label>

              {isRoom ? (
                <>
                  {isConference ? (
                    <label className="admin-field">
                      <span>Room kind</span>
                      <select
                        value={form.hotdeskType || 'CONFERENCE'}
                        onChange={(e) => setForm({ ...form, hotdeskType: e.target.value })}
                      >
                        <option value="CONFERENCE">Conference</option>
                        <option value="MEETING">Meeting</option>
                      </select>
                    </label>
                  ) : null}
                  <label className="admin-field">
                    <span>Start time</span>
                    <input
                      required
                      type="time"
                      value={form.slotStartTime}
                      onChange={(e) => setForm({ ...form, slotStartTime: e.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>End time</span>
                    <input
                      required
                      type="time"
                      value={form.slotEndTime}
                      onChange={(e) => setForm({ ...form, slotEndTime: e.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Slot difference (minutes)</span>
                    <select
                      value={form.slotIntervalMinutes}
                      onChange={(e) => setForm({ ...form, slotIntervalMinutes: Number(e.target.value) })}
                    >
                      {[15, 30, 60].map((n) => (
                        <option key={n} value={n}>
                          {n} mins
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Minimum hours (required)</span>
                    <input
                      required
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={form.minHours}
                      onChange={(e) => setForm({ ...form, minHours: e.target.value })}
                    />
                  </label>
                  <p className="admin-login__hint" style={{ gridColumn: '1 / -1', margin: 0 }}>
                    No maximum duration — clients can book any contiguous free span until closing time.
                  </p>
                  {slots.length ? (
                    <p className="admin-login__hint" style={{ gridColumn: '1 / -1' }}>
                      Sample slots: {slots.slice(0, 8).join(', ')}
                      {slots.length > 8 ? '…' : ''}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="admin-field">
                    <span>Duration</span>
                    <input
                      type="number"
                      min={1}
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Unit</span>
                    <select value={form.durationUnit} onChange={(e) => setForm({ ...form, durationUnit: e.target.value })}>
                      {['DAY', 'MONTH', 'QUARTER', 'YEAR'].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>

            {isRoom && slots.length ? (
              <p className="admin-login__hint" style={{ marginTop: 10, textAlign: 'left' }}>
                Slots preview: {slots.join(', ')}
                {previewSlots(form.slotStartTime, form.slotEndTime, form.slotIntervalMinutes).length > 24 ? '…' : ''}
              </p>
            ) : null}
          </div>

          <footer className="enq-modal__foot">
            <button type="button" className="enq-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit product-modal__save" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Save product'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function ProductViewModal({ open, data, loading, error, onClose, onEdit, onBook, memberView }) {
  if (!open) return null
  const plan = data?.plan
  const memberships = data?.memberships || []
  const contracts = data?.contracts || []
  const bookings = data?.bookings || []
  const canBookThis = plan?.productCategory === 'CONFERENCE' && typeof onBook === 'function'

  const download = () => {
    if (!plan) return
    const lines = [
      `Product: ${plan.code || plan.name}`,
      `Name: ${plan.name}`,
      `Family: ${familyLabel(plan.productCategory)}`,
      `Center: ${plan.center?.code || '—'}`,
      `Category: ${plan.catalogCategory?.name || '—'}`,
      `Seats: ${plan.numberOfSeats ?? '—'}`,
      `Cost: ₹${plan.slotPrice ?? plan.price}`,
      `Deposit: ${plan.depositAmount != null ? `₹${plan.depositAmount}` : '—'}`,
      `Status: ${plan.isActive === false ? 'Inactive' : plan.availability || '—'}`,
      '',
      '--- Memberships ---',
      ...memberships.map(
        (m) =>
          `${m.user?.fullName || '—'} | ${m.user?.email || '—'} | ${m.status} | ${String(m.startsAt || '').slice(0, 10)}–${String(m.expiresAt || '').slice(0, 10)}`,
      ),
      '',
      '--- Contracts / bookings ---',
      ...contracts.map(
        (c) => `${c.contractId} | ${c.kind} | ${c.productName || '—'} | ${c.status} | ${c.company || '—'}`,
      ),
      '',
      '--- Slot / resource bookings ---',
      ...bookings.map(
        (b) =>
          `${b.bookingNumber || b.id} | ${bookingClientLabel(b)} | ${b.status} | ${String(b.startAt || '').slice(0, 16)}–${String(b.endAt || '').slice(0, 16)}`,
      ),
    ]
    downloadText(`${plan.code || plan.name || 'product'}-history.txt`, lines.join('\n'))
  }

  return createPortal(
    <div className="enq-modal product-modal" role="dialog" aria-modal="true">
      <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={onClose} />
      <div className="enq-modal__panel product-modal__panel">
        <header className="enq-modal__head">
          <div>
            <p className="enq-modal__eyebrow">{familyLabel(plan?.productCategory)} · product detail</p>
            <h3>{plan?.code || plan?.name || 'Product'}</h3>
          </div>
          <div className="enq-excel__actions">
            <button type="button" className="enq-ghost" onClick={() => printNode(plan?.name || 'Product')} disabled={!plan}>
              Print
            </button>
            <button type="button" className="enq-ghost" onClick={download} disabled={!plan}>
              Download
            </button>
            {onEdit && plan ? (
              <button type="button" className="admin-login__submit" onClick={() => onEdit(plan)}>
                Edit
              </button>
            ) : null}
            {canBookThis ? (
              <button
                type="button"
                className="admin-login__submit"
                onClick={() => {
                  onBook(plan)
                  onClose()
                }}
              >
                Book
              </button>
            ) : null}
            <button type="button" className="enq-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="enq-modal__body" id="detail-print-root">
          {loading ? <p className="admin-login__hint">Loading…</p> : null}
          {error ? <p className="admin-login__error">{error}</p> : null}
          {plan ? (
            <>
              <section>
                <h4>Product info</h4>
                <div className="admin-grid-2">
                  <p>
                    <strong>Code:</strong> {plan.code || '—'}
                  </p>
                  <p>
                    <strong>Name:</strong> {plan.name}
                  </p>
                  <p>
                    <strong>Type:</strong> {familyLabel(plan.productCategory)}
                  </p>
                  <p>
                    <strong>Center:</strong> {plan.center?.code || '—'}
                  </p>
                  {!memberView ? (
                    <p>
                      <strong>Category:</strong> {plan.catalogCategory?.name || '—'}
                    </p>
                  ) : null}
                  <p>
                    <strong>Seats:</strong> {plan.numberOfSeats ?? '—'}
                  </p>
                  <p>
                    <strong>Availability:</strong> {plan.availability || '—'}
                  </p>
                  <p>
                    <strong>Cost:</strong> ₹{plan.slotPrice ?? plan.price}
                  </p>
                  <p>
                    <strong>Deposit:</strong> {plan.depositAmount != null ? `₹${plan.depositAmount}` : '—'}
                  </p>
                  {plan.productCategory === 'CONFERENCE' ? (
                    <p>
                      <strong>Timing:</strong> {plan.slotStartTime || '—'}–{plan.slotEndTime || '—'} /{' '}
                      {plan.slotIntervalMinutes || 30}m
                    </p>
                  ) : null}
                </div>
              </section>

              {!memberView ? (
                <>
              <section>
                <h4>Membership history ({memberships.length})</h4>
                {!memberships.length ? (
                  <p className="admin-login__hint">No memberships linked yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberships.map((m) => (
                          <tr key={m.id}>
                            <td>{m.user?.fullName || m.user?.memberProfile?.memberId || '—'}</td>
                            <td>{m.user?.email || '—'}</td>
                            <td>{m.status}</td>
                            <td>
                              {String(m.startsAt || '').slice(0, 10) || '—'} → {String(m.expiresAt || '').slice(0, 10) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h4>Contracts ({contracts.length})</h4>
                {!contracts.length ? (
                  <p className="admin-login__hint">No contracts matched this product.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Contract</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contracts.map((c) => (
                          <tr key={c.id}>
                            <td>{c.contractId}</td>
                            <td>{c.kind}</td>
                            <td>{c.status}</td>
                            <td>{c.company || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h4>Bookings ({bookings.length})</h4>
                {!bookings.length ? (
                  <p className="admin-login__hint">No bookings yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Booking</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b.id}>
                            <td>{b.bookingNumber || b.id.slice(-8)}</td>
                            <td>{bookingClientLabel(b)}</td>
                            <td>{b.status}</td>
                            <td>
                              {String(b.startAt || '').slice(0, 16).replace('T', ' ')} –{' '}
                              {String(b.endAt || '').slice(11, 16)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function PackagesPage({ initialCategory = '', title }) {
  const { can, role } = useAuth()
  const isMember = role === 'MEMBER'
  const [plans, setPlans] = useState([])
  const [centers, setCenters] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState(initialCategory || '')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [bookProduct, setBookProduct] = useState(null)
  const [bookWizardOpen, setBookWizardOpen] = useState(false)
  const canEdit = !isMember && (can('membership.create') || can('membership.update'))
  // Members enquire only — staff/admin book conference & hotdesk
  const canBook = !isMember && (can('booking.create') || can('conference.view'))
  const isRoomPage =
    filter === 'CONFERENCE' ||
    filter === 'HOT_DESK' ||
    initialCategory === 'CONFERENCE' ||
    initialCategory === 'HOT_DESK'
  const isConferencePage = filter === 'CONFERENCE' || initialCategory === 'CONFERENCE'
  const isPhysicalPage = filter === 'PHYSICAL_OFFICE' || initialCategory === 'PHYSICAL_OFFICE'
  const showSeatsCol = filter !== 'VIRTUAL_OFFICE' && initialCategory !== 'VIRTUAL_OFFICE'
  const showTimingCol = isRoomPage
  const showTypeCol = false

  useEffect(() => {
    setFilter(initialCategory || '')
  }, [initialCategory])

  const reload = () =>
    membershipApi
      .plans({ productCategory: filter || undefined })
      .then((r) => setPlans((r.data.data.plans || []).filter((p) => p.isActive !== false)))
      .catch((e) => setError(apiError(e)))

  const reloadMeta = () =>
    Promise.all([
      productCatalogApi.centers({ includeInactive: '1' }).then((r) => setCenters(r.data.data.items || [])),
      productCatalogApi.categories({ includeInactive: '1' }).then((r) => setCategories(r.data.data.items || [])),
    ]).catch((e) => setError(apiError(e)))

  useEffect(() => {
    reload()
  }, [filter])

  useEffect(() => {
    reloadMeta()
  }, [])

  const openCreate = () => {
    setModalError('')
    setForm(blankProduct(filter || 'PHYSICAL_OFFICE'))
  }

  const openEdit = (p) => {
    setViewData(null)
    setModalError('')
    setForm({
      id: p.id,
      productCategory: p.productCategory || filter || 'PHYSICAL_OFFICE',
      centerId: p.centerId || p.center?.id || '',
      catalogCategoryId: p.catalogCategoryId || p.catalogCategory?.id || '',
      code: p.code || '',
      name: p.name || '',
      numberOfSeats: p.numberOfSeats ?? (p.productCategory === 'VIRTUAL_OFFICE' ? '' : 1),
      availability: normalizeAvailability(p.availability || 'VACANT'),
      depositAmount: p.depositAmount ?? '',
      price: p.price ?? '',
      duration: p.duration ?? 12,
      durationUnit: p.durationUnit || 'MONTH',
      slotStartTime: p.slotStartTime || '09:00',
      slotEndTime: p.slotEndTime || '20:00',
      slotIntervalMinutes: p.slotIntervalMinutes || 30,
      minHours: p.minHours ?? 1,
      maxHours: null,
      slotPrice: p.slotPrice ?? p.price ?? '',
      hotdeskType: p.hotdeskType || 'CONFERENCE',
      isActive: p.isActive !== false,
    })
  }

  const openView = async (p) => {
    setViewError('')
    setViewLoading(true)
    setViewData({ plan: p, memberships: [], contracts: [], bookings: [] })
    try {
      const res = await membershipApi.getPlan(p.id)
      setViewData(res.data.data)
    } catch (err) {
      setViewError(apiError(err))
    } finally {
      setViewLoading(false)
    }
  }

  const removePlan = async (p) => {
    if (!window.confirm(`Delete product ${p.code || p.name}?`)) return
    setError('')
    try {
      await membershipApi.deactivatePlan(p.id)
      setMsg('Product deleted')
      if (viewData?.plan?.id === p.id) setViewData(null)
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setModalError('')
    try {
      const emptyToNull = (v) => (v === '' || v == null ? null : v)
      const body = {
        ...form,
        name: form.name || form.code,
        price: form.productCategory === 'CONFERENCE' ? form.slotPrice : form.price,
        numberOfSeats: emptyToNull(form.numberOfSeats),
        depositAmount: emptyToNull(form.depositAmount),
        slotPrice: emptyToNull(form.slotPrice),
        ...(form.productCategory === 'CONFERENCE' || form.productCategory === 'HOT_DESK'
          ? {
              minHours: Number(form.minHours) || 1,
              maxHours: null,
              hotdeskType:
                form.productCategory === 'HOT_DESK' ? 'DAYPASS' : form.hotdeskType || 'CONFERENCE',
            }
          : {}),
      }
      delete body.id
      await membershipApi.savePlan(form.id || null, {
        ...body,
        price:
          form.productCategory === 'CONFERENCE' || form.productCategory === 'HOT_DESK'
            ? form.slotPrice || form.price
            : form.price,
      })
      setMsg(form.id ? 'Product updated' : 'Product created')
      setForm(null)
      reload()
    } catch (err) {
      setModalError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const activeCenters = useMemo(() => centers.filter((c) => c.isActive !== false), [centers])
  const activeCategories = useMemo(() => categories.filter((c) => c.isActive !== false), [categories])

  const exportSeatsReport = async (centerCode = '') => {
    setError('')
    try {
      const category = initialCategory || filter || ''
      const res = await reportApi.export('products', {
        limit: 5000,
        ...(category ? { category } : {}),
        ...(centerCode ? { center: centerCode } : {}),
      })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products${centerCode ? `-${centerCode}` : ''}-seats-report.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg(
        centerCode
          ? `Exported seats report for centre ${centerCode}`
          : 'Exported seats report for all products',
      )
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title={title || 'Products'}
      actions={
        <div className="enq-excel__actions">
          <button type="button" className="enq-ghost" onClick={() => exportSeatsReport('')}>
            Export seats Excel
          </button>
          {activeCenters.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              className="enq-ghost"
              title={`Export booked / vacant seats for ${c.code}`}
              onClick={() => exportSeatsReport(c.code)}
            >
              Export {c.code}
            </button>
          ))}
          {isRoomPage && canBook ? (
            <button type="button" className="admin-login__submit" onClick={() => setBookWizardOpen(true)}>
              {isConferencePage ? 'Book conference' : 'Book hotdesk'}
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className="admin-login__submit" onClick={openCreate}>
              + Add product
            </button>
          ) : null}
        </div>
      }
    >
      <Banner error={error} success={msg} />
      <p className="admin-login__hint">
        {isMember
          ? isRoomPage
            ? 'Browse room products and book available time slots. You cannot add or edit products.'
            : 'Browse available membership types. Contact Senate Space for physical or virtual office onboarding.'
          : isConferencePage
            ? 'Book flow: Date → seats (4/8) → centre → time slot. In-house needs a member; external needs company name only (no member).'
            : isRoomPage
              ? 'Hotdesk products are separate from Conference / Meeting rooms.'
              : 'Create centers and categories under Settings first. Then add membership-type products: Center → Category → code, status, cost & deposit.'}
      </p>

      {!initialCategory ? (
        <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PHYSICAL_OFFICE">Physical</option>
            <option value="VIRTUAL_OFFICE">Virtual</option>
            <option value="HOT_DESK">Hotdesk</option>
            <option value="CONFERENCE">Conference / Meeting</option>
          </select>
        </div>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name / Membership type</th>
              <th>Center</th>
              {isPhysicalPage ? <th>Category</th> : null}
              {showSeatsCol ? <th>Seats</th> : null}
              <th>Status</th>
              <th>Cost</th>
              <th>Deposit</th>
              {showTimingCol ? <th>Timing</th> : null}
              <th />
            </tr>
          </thead>
          <tbody>
            {!plans.length ? (
              <tr>
                <td
                  colSpan={
                    (showSeatsCol ? 1 : 0) +
                    (showTimingCol ? 1 : 0) +
                    (isPhysicalPage ? 1 : 0) +
                    6
                  }
                >
                  {isMember ? 'No products available right now.' : 'No products yet. Click Add product.'}
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openView(p)}>
                  <td>{p.code || '—'}</td>
                  <td>{p.name}</td>
                  <td>{p.center?.code || '—'}</td>
                  {isPhysicalPage ? <td>{p.catalogCategory?.name || '—'}</td> : null}
                  {showSeatsCol ? <td>{p.numberOfSeats ?? '—'}</td> : null}
                  <td>{normalizeAvailability(p.availability)}</td>
                  <td>₹{p.slotPrice ?? p.price}</td>
                  <td>{p.depositAmount != null ? `₹${p.depositAmount}` : '—'}</td>
                  {showTimingCol ? (
                    <td>
                      {(p.productCategory === 'CONFERENCE' || p.productCategory === 'HOT_DESK') && p.slotStartTime
                        ? `${p.slotStartTime}–${p.slotEndTime} / ${p.slotIntervalMinutes || 30}m`
                        : '—'}
                    </td>
                  ) : null}
                  <td className="enq-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="enq-ghost" onClick={() => openView(p)}>
                      View
                    </button>
                    {canBook && (p.productCategory === 'CONFERENCE' || p.productCategory === 'HOT_DESK') ? (
                      <button type="button" className="admin-login__submit" onClick={() => setBookProduct(p)}>
                        Book
                      </button>
                    ) : null}
                    {canEdit ? (
                      <>
                        <button type="button" className="admin-login__submit" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button type="button" className="enq-ghost enq-ghost--danger" onClick={() => removePlan(p)}>
                          Delete
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isMember ? (
        <ProductModal
          open={Boolean(form)}
          title={form?.id ? 'Edit product' : 'Add product'}
          form={form}
          setForm={setForm}
          centers={activeCenters}
          categories={activeCategories}
          onClose={() => setForm(null)}
          onSave={save}
          saving={saving}
          error={modalError}
        />
      ) : null}

      <ProductViewModal
        open={Boolean(viewData)}
        data={viewData}
        loading={viewLoading}
        error={viewError}
        onClose={() => setViewData(null)}
        onEdit={canEdit ? openEdit : null}
        onBook={canBook ? setBookProduct : null}
        memberView={isMember}
      />

      {bookProduct ? (
        <ConferenceBookingPage
          productId={bookProduct.id}
          product={bookProduct}
          embedded
          onClose={() => setBookProduct(null)}
        />
      ) : null}

      {bookWizardOpen ? (
        <HotdeskBookWizard
          centers={activeCenters}
          mode={isConferencePage ? 'conference' : 'hotdesk'}
          onClose={() => setBookWizardOpen(false)}
        />
      ) : null}
    </Panel>
  )
}

/** Centers + Categories managers for Settings page */
export function CatalogSettingsPanels() {
  const { can } = useAuth()
  const canEdit = can('settings.update') || can('membership.create') || can('membership.update')
  const [centers, setCenters] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [centerForm, setCenterForm] = useState(null)
  const [catForm, setCatForm] = useState(null)

  const reload = () =>
    Promise.all([
      productCatalogApi.centers({ includeInactive: '1' }).then((r) => setCenters(r.data.data.items || [])),
      productCatalogApi.categories({ includeInactive: '1' }).then((r) => setCategories(r.data.data.items || [])),
    ]).catch((e) => setError(apiError(e)))

  useEffect(() => {
    reload()
  }, [])

  const saveCenter = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await productCatalogApi.saveCenter(centerForm.id || null, centerForm)
      setMsg('Center saved')
      setCenterForm(null)
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const saveCategory = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await productCatalogApi.saveCategory(catForm.id || null, catForm)
      setMsg('Category saved')
      setCatForm(null)
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const removeCenter = async (c) => {
    if (!window.confirm(`Delete center ${c.code}?`)) return
    try {
      await productCatalogApi.deactivateCenter(c.id)
      setMsg('Center deleted')
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const removeCategory = async (c) => {
    if (!window.confirm(`Delete category ${c.name}?`)) return
    try {
      await productCatalogApi.deactivateCategory(c.id)
      setMsg('Category deleted')
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <>
      <Banner error={error} success={msg} />
      <Panel
        title="Centers"
        actions={
          canEdit ? (
            <button
              type="button"
              className="admin-login__submit"
              onClick={() => setCenterForm({ code: '', name: '', description: '', isActive: true })}
            >
              + Add center
            </button>
          ) : null
        }
      >
        <p className="admin-login__hint">Shared across Physical, Virtual and Hotdesk (e.g. S1, S2, S3).</p>
        {centerForm ? (
          <form className="admin-login__form" onSubmit={saveCenter} style={{ marginBottom: 12 }}>
            <div className="admin-grid-2">
              <label className="admin-field">
                <span>Code</span>
                <input required value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} placeholder="S1" />
              </label>
              <label className="admin-field">
                <span>Name</span>
                <input required value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} placeholder="Senate Centre 1" />
              </label>
            </div>
            <div className="admin-top__right" style={{ gap: 8 }}>
              <button type="button" onClick={() => setCenterForm(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-login__submit">
                Save center
              </button>
            </div>
          </form>
        ) : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {centers.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    {canEdit ? (
                      <div className="enq-row-actions">
                        <button type="button" onClick={() => setCenterForm({ ...c })}>
                          Edit
                        </button>
                        {c.isActive !== false ? (
                          <button type="button" className="enq-ghost enq-ghost--danger" onClick={() => removeCenter(c)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Product categories"
        actions={
          canEdit ? (
            <button
              type="button"
              className="admin-login__submit"
              onClick={() =>
                setCatForm({
                  name: '',
                  code: '',
                  forPhysical: true,
                  forVirtual: false,
                  forHotdesk: false,
                  isActive: true,
                })
              }
            >
              + Add category
            </button>
          ) : null
        }
      >
        <p className="admin-login__hint">
          Common categories (e.g. Chamber). Tick which product families can use them: Physical, Virtual, Hotdesk.
        </p>
        {catForm ? (
          <form className="admin-login__form" onSubmit={saveCategory} style={{ marginBottom: 12 }}>
            <div className="admin-grid-2">
              <label className="admin-field">
                <span>Name</span>
                <input required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Chamber" />
              </label>
              <label className="admin-field">
                <span>Code (optional)</span>
                <input value={catForm.code || ''} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} />
              </label>
              <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <span>Applies to</span>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
                  {[
                    ['forPhysical', 'Physical'],
                    ['forVirtual', 'Virtual'],
                    ['forHotdesk', 'Hotdesk'],
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(catForm[k])}
                        onChange={(e) => setCatForm({ ...catForm, [k]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </label>
            </div>
            <div className="admin-top__right" style={{ gap: 8 }}>
              <button type="button" onClick={() => setCatForm(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-login__submit">
                Save category
              </button>
            </div>
          </form>
        ) : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Physical</th>
                <th>Virtual</th>
                <th>Hotdesk</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.forPhysical ? 'Yes' : '—'}</td>
                  <td>{c.forVirtual ? 'Yes' : '—'}</td>
                  <td>{c.forHotdesk ? 'Yes' : '—'}</td>
                  <td>{c.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    {canEdit ? (
                      <div className="enq-row-actions">
                        <button type="button" onClick={() => setCatForm({ ...c })}>
                          Edit
                        </button>
                        {c.isActive !== false ? (
                          <button type="button" className="enq-ghost enq-ghost--danger" onClick={() => removeCategory(c)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
