import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bookingApi, paymentApi, userApi } from '../services/api'
import { apiError } from '../services/api/client'
import { useAuth } from '../context/AuthContext'

function formatSlotLabel(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = ((h + 11) % 12) + 1
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Longest contiguous available run from startIdx (no artificial max hours) */
function reachableEnd(slots, startIdx, maxSlots = 999) {
  let end = startIdx
  for (let i = startIdx; i < slots.length && i - startIdx + 1 <= maxSlots; i += 1) {
    if (slots[i].status !== 'available') break
    end = i
  }
  return end
}

/**
 * Ticket-style hotdesk / conference booking grid.
 * Staff must pick a member before confirming.
 * Past times are not bookable; selection capped at max duration.
 */
export function ConferenceBookingPage({
  productId = null,
  product = null,
  centerId = null,
  center = null,
  hotdeskType = null,
  preferredSeats = null,
  initialDate = null,
  clientKind = 'INHOUSE',
  externalCompany = '',
  embedded = false,
  onClose = null,
  onBack = null,
}) {
  const { role } = useAuth()
  const isStaff = role && role !== 'MEMBER'
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(initialDate || today)
  const [grid, setGrid] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(null)
  const [paying, setPaying] = useState(false)
  const [members, setMembers] = useState([])
  const [memberQ, setMemberQ] = useState('')
  const [memberId, setMemberId] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [kind, setKind] = useState(clientKind || 'INHOUSE')
  const [extCompany, setExtCompany] = useState(externalCompany || '')
  const gridWrapRef = useRef(null)

  const typeLabel = hotdeskType === 'MEETING' ? 'Meeting' : hotdeskType === 'CONFERENCE' ? 'Conference' : null
  const title = product
    ? `Book · ${product.code || product.name}`
    : center
      ? `Book · ${center.code || center.name}${typeLabel ? ` · ${typeLabel}` : ''}`
      : productId
        ? 'Book hotdesk'
        : 'Book conference room'

  const loadMembers = async (q = '') => {
    if (!isStaff) return
    setMembersLoading(true)
    try {
      const res = await userApi.members({ page: 1, limit: 50, q: q || undefined })
      setMembers(res.data.data.items || [])
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (isStaff) loadMembers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff])

  const load = async (d = date) => {
    setLoading(true)
    setError('')
    try {
      const res = await bookingApi.conferenceGrid({
        date: d,
        ...(productId ? { productId } : {}),
        ...(centerId ? { centerId, hotdeskType: hotdeskType || 'CONFERENCE' } : {}),
      })
      setGrid(res.data.data)
      setSel(null)
    } catch (err) {
      setError(apiError(err))
      setGrid(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, productId, centerId, hotdeskType])

  // Scroll to first bookable slot so past times don't leave an empty-looking left gap
  useEffect(() => {
    if (!grid?.rooms?.[0]?.slots?.length || !gridWrapRef.current) return
    if (date !== today) return
    const firstAvail = grid.rooms[0].slots.findIndex((s) => s.status === 'available')
    if (firstAvail <= 0) return
    const wrap = gridWrapRef.current
    const cell = wrap.querySelector(`tbody tr td:nth-child(${firstAvail + 2})`)
    if (cell) {
      wrap.scrollTo({ left: Math.max(0, cell.offsetLeft - 120), behavior: 'smooth' })
    }
  }, [grid, date, today])

  const interval = grid?.intervalMinutes || 30
  const minMinutes = grid?.minMinutes || 60
  // No max hours — only limited by contiguous free slots until close
  const maxMinutes = grid?.maxMinutes || 24 * 60
  const minSlots = Math.max(1, Math.ceil(minMinutes / interval))
  const maxSlots = Math.max(minSlots, Math.floor(maxMinutes / interval))

  const room = grid?.rooms?.find((r) => r.id === sel?.roomId)
  const selectedSlots =
    room && sel
      ? room.slots.slice(Math.min(sel.startIdx, sel.endIdx), Math.max(sel.startIdx, sel.endIdx) + 1)
      : []
  const durationMin = selectedSlots.length * interval
  const durationHours = durationMin / 60
  const validDuration = durationMin >= minMinutes
  const seatsForCredits = Number(preferredSeats || room?.capacity || product?.numberOfSeats || 4) || 4
  const freeHours = 5 * seatsForCredits
  const graceHours = 2 * seatsForCredits
  const creditHours = freeHours + graceHours
  const withinCredits = kind === 'INHOUSE' && durationHours <= creditHours
  const chargeExternal = kind === 'EXTERNAL' || !withinCredits
  const priceEstimate =
    room && validDuration
      ? chargeExternal
        ? Math.round((room.hourlyPrice || 0) * durationHours * 100) / 100
        : 0
      : null
  const memberReady = kind === 'EXTERNAL' ? Boolean(extCompany.trim()) : !isStaff || Boolean(memberId)
  const canConfirm = Boolean(validDuration && priceEstimate != null && selectedSlots.length && memberReady && !paying)
  const selectedMember = members.find((m) => m.id === memberId)

  const onSlotClick = (roomId, idx, slot) => {
    if (slot.status !== 'available') {
      if (slot.status === 'past') setError('Cannot book a past time — pick a later slot')
      return
    }
    setMsg('')
    setError('')
    const slots = grid.rooms.find((r) => r.id === roomId)?.slots || []
    const reach = reachableEnd(slots, idx, maxSlots)
    const span = reach - idx + 1

    // New selection: start here, auto-fill min duration when possible
    if (!sel || sel.roomId !== roomId || idx < sel.startIdx) {
      if (span < minSlots) {
        setError(
          `Need at least ${Math.round(minMinutes / 60)}h free from this time (only ${span * interval} min left before close/booked)`,
        )
        setSel(null)
        return
      }
      setSel({ roomId, startIdx: idx, endIdx: Math.min(reach, idx + minSlots - 1) })
      return
    }

    // Extend / adjust end within free contiguous run (no max hour cap)
    const fromStart = reachableEnd(slots, sel.startIdx, maxSlots)
    if (idx > fromStart) {
      setError('Only free contiguous slots can be selected')
      return
    }
    setSel({ roomId, startIdx: sel.startIdx, endIdx: Math.min(idx, fromStart) })
  }

  const bookAndPay = async () => {
    const bookRoom = room || grid?.rooms?.find((r) => r.id === sel?.roomId)
    if (!canConfirm || !bookRoom) {
      if (kind === 'EXTERNAL' && !extCompany.trim()) setError('Enter external company name')
      else if (isStaff && kind === 'INHOUSE' && !memberId) setError('Select an in-house member')
      else setError(`Select at least ${Math.round(minMinutes / 60)} hour(s) of contiguous slots`)
      return
    }
    if (selectedSlots.some((s) => s.status !== 'available')) {
      setError('Selection includes a past or unavailable slot')
      return
    }
    setPaying(true)
    setError('')
    try {
      const startAt = selectedSlots[0].startAt
      const endAt = selectedSlots[selectedSlots.length - 1].endAt
      const noteParts = [
        `client=${kind}`,
        kind === 'EXTERNAL' ? `company=${extCompany.trim()}` : null,
        `seats=${seatsForCredits}`,
        `credits=${creditHours}h`,
        chargeExternal ? 'pricing=EXTERNAL' : 'pricing=INHOUSE_CREDIT',
      ].filter(Boolean)
      const res = await bookingApi.create({
        resourceType: 'CONFERENCE_ROOM',
        resourceId: bookRoom.id,
        startAt,
        endAt,
        notes: noteParts.join(' · '),
        clientKind: kind,
        externalCompany: kind === 'EXTERNAL' ? extCompany.trim() : undefined,
        ...(isStaff && kind === 'INHOUSE' ? { userId: memberId } : {}),
      })
      const payment = res.data.data.payment
      const booking = res.data.data.booking
      const who =
        kind === 'EXTERNAL'
          ? extCompany.trim()
          : selectedMember?.fullName || selectedMember?.email || 'member'

      // In-house within credits: confirmed immediately + notify. Payment only when charged.
      if (payment?.id && Number(payment.amount) > 0) {
        setMsg(`Booking ${booking?.bookingNumber || ''} created for ${who}. Redirecting to payment…`)
        setSel(null)
        window.location.href = `/pay/${payment.id}`
        return
      }
      setMsg(
        `Booked ${bookRoom.code || bookRoom.name} for ${who} · covered by in-house credits · confirmed (notified)`,
      )
      setSel(null)
      await load(date)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setPaying(false)
    }
  }

  // Hide past slots on today so the grid starts at the next bookable time
  const hidePast = date === today
  const times = (grid?.rooms?.[0]?.slots || [])
    .filter((s) => !(hidePast && s.status === 'past'))
    .map((s) => s.startTime)
  const hoursLabel = grid?.hours ? `${grid.hours.start}–${grid.hours.end}` : ''

  const visibleSlotsFor = (slots) => {
    if (!hidePast) return slots.map((s, idx) => ({ slot: s, idx }))
    return slots.map((s, idx) => ({ slot: s, idx })).filter(({ slot }) => slot.status !== 'past')
  }

  const body = (
    <>
      {error ? <p className="admin-login__error">{error}</p> : null}
      {msg ? <p className="admin-login__hint">{msg}</p> : null}

      {isStaff ? (
        <div className="enq-follow-block" style={{ marginBottom: 14 }}>
          <h4 style={{ marginTop: 0 }}>Client</h4>
          <div className="admin-grid-2" style={{ alignItems: 'end' }}>
            <label className="admin-field">
              <span>Client type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="INHOUSE">In-house client</option>
                <option value="EXTERNAL">External client</option>
              </select>
            </label>
            {kind === 'INHOUSE' ? (
              <p className="admin-login__hint" style={{ margin: 0 }}>
                Credits: {freeHours}h free + {graceHours}h grace ({creditHours}h) for {seatsForCredits} seats. Over grace →
                external rate.
              </p>
            ) : (
              <label className="admin-field">
                <span>Company name</span>
                <input
                  required
                  value={extCompany}
                  onChange={(e) => setExtCompany(e.target.value)}
                  placeholder="External company"
                />
              </label>
            )}
            {kind === 'INHOUSE' ? (
              <>
                <label className="admin-field">
                  <span>Search member</span>
                  <input
                    value={memberQ}
                    placeholder="Name, email, member ID"
                    onChange={(e) => setMemberQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadMembers(memberQ)}
                  />
                </label>
                <button type="button" className="enq-ghost" onClick={() => loadMembers(memberQ)} disabled={membersLoading}>
                  {membersLoading ? 'Searching…' : 'Search'}
                </button>
                <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Member name</span>
                  <select required value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    <option value="">— Select member —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                        {m.memberProfile?.memberId ? ` · ${m.memberProfile.memberId}` : ''}
                        {m.email ? ` · ${m.email}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="admin-login__hint">
        Select continuous {interval}-minute boxes (minimum {Math.round(minMinutes / 60)}h — no maximum; book any free
        span until close
        {hoursLabel ? ` · ${hoursLabel}` : ''}). Past times are hidden for today and cannot be booked.
      </p>
      <div className="admin-top__right" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {onBack ? (
          <button type="button" className="enq-ghost" onClick={onBack}>
            Back
          </button>
        ) : null}
        <label className="admin-field" style={{ margin: 0 }}>
          <span>Date</span>
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="button" className="admin-login__submit" onClick={() => load(date)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {!grid?.rooms?.length && !loading ? (
        <p className="admin-login__hint">
          No rooms for this selection. Add Hotdesk products for this center (with code, seats, timing), then try again.
        </p>
      ) : null}

      {grid?.rooms?.length ? (
        <div className="ticket-grid-wrap" ref={gridWrapRef}>
          <table className="ticket-grid">
            <thead>
              <tr>
                <th className="ticket-grid__room">Room</th>
                {times.map((t) => (
                  <th key={t}>{formatSlotLabel(t)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rooms.map((r) => (
                <tr key={r.id}>
                  <td className="ticket-grid__room">
                    <strong>{r.code || r.name}</strong>
                    <small>
                      {r.capacity} seats · ₹{r.hourlyPrice}/hr
                    </small>
                  </td>
                  {visibleSlotsFor(r.slots).map(({ slot, idx }) => {
                    const inSel =
                      sel?.roomId === r.id &&
                      idx >= Math.min(sel.startIdx, sel.endIdx) &&
                      idx <= Math.max(sel.startIdx, sel.endIdx)
                    const cls = ['ticket-slot', `ticket-slot--${slot.status}`, inSel ? 'is-selected' : '']
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <td key={`${r.id}-${slot.startTime}`}>
                        <button
                          type="button"
                          className={cls}
                          disabled={slot.status !== 'available'}
                          title={`${formatSlotLabel(slot.startTime)}–${formatSlotLabel(slot.endTime)} · ${slot.status}`}
                          onClick={() => onSlotClick(r.id, idx, slot)}
                        >
                          {slot.status === 'booked' || slot.status === 'locked'
                            ? '●'
                            : slot.status === 'past'
                              ? '·'
                              : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ticket-legend">
            <span>
              <i className="ticket-slot ticket-slot--available" /> Available
            </span>
            <span>
              <i className="ticket-slot ticket-slot--booked" /> Booked / paid
            </span>
            <span>
              <i className="ticket-slot ticket-slot--locked" /> Locked (pending pay)
            </span>
            <span>
              <i className="ticket-slot is-selected" /> Your selection
            </span>
            {!hidePast ? (
              <span>
                <i className="ticket-slot ticket-slot--past" /> Past
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {sel && selectedSlots.length ? (
        <div className="enq-follow-block" style={{ marginTop: 16 }}>
          <h4 style={{ marginTop: 0 }}>
            {(room || grid?.rooms?.find((r) => r.id === sel.roomId))?.code || 'Room'} ·{' '}
            {formatSlotLabel(selectedSlots[0]?.startTime)} →{' '}
            {formatSlotLabel(selectedSlots[selectedSlots.length - 1]?.endTime)}
          </h4>
          <p>
            Duration: <strong>{durationMin} min</strong>
            {!validDuration ? (
              <span style={{ color: '#ffb4a8' }}>
                {' '}
                — need at least {minMinutes} min (no maximum)
              </span>
            ) : null}
            {validDuration && priceEstimate != null ? (
              <>
                {' '}
                · Amount:{' '}
                <strong>{priceEstimate === 0 ? '₹0 (in-house credit)' : `₹${priceEstimate}`}</strong>
                {kind === 'INHOUSE' && chargeExternal ? ' · over grace → external rate' : ''}
              </>
            ) : null}
            {kind === 'EXTERNAL' && extCompany ? (
              <>
                {' '}
                · Company: <strong>{extCompany}</strong>
              </>
            ) : null}
            {kind === 'INHOUSE' && isStaff && selectedMember ? (
              <>
                {' '}
                · Member: <strong>{selectedMember.fullName}</strong>
              </>
            ) : null}
            {kind === 'INHOUSE' && isStaff && !memberId ? (
              <span style={{ color: '#ffb4a8' }}> — select a member above</span>
            ) : null}
            {kind === 'EXTERNAL' && !extCompany.trim() ? (
              <span style={{ color: '#ffb4a8' }}> — enter company name</span>
            ) : null}
          </p>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="button" className="enq-ghost" onClick={() => setSel(null)}>
              Clear
            </button>
            <button
              type="button"
              className="admin-login__submit"
              disabled={!canConfirm}
              title={
                !memberReady
                  ? kind === 'EXTERNAL'
                    ? 'Enter company name'
                    : 'Select a member'
                  : !validDuration
                    ? `Select at least ${minMinutes} minutes`
                    : paying
                      ? 'Booking…'
                      : priceEstimate === 0
                        ? 'Confirm with credits'
                        : `Pay ₹${priceEstimate} to confirm`
              }
              onClick={bookAndPay}
            >
              {paying
                ? 'Booking…'
                : !memberReady
                  ? kind === 'EXTERNAL'
                    ? 'Enter company'
                    : 'Select member'
                  : !validDuration
                    ? `Need at least ${Math.round(minMinutes / 60)}h`
                    : priceEstimate === 0
                      ? 'Book with credits'
                      : `Book & pay · ₹${priceEstimate}`}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )

  if (embedded) {
    return createPortal(
      <div className="enq-modal product-modal" role="dialog" aria-modal="true">
        <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={onClose} />
        <div className="enq-modal__panel product-modal__panel product-modal__panel--booking">
          <header className="enq-modal__head">
            <div>
              <p className="enq-modal__eyebrow">Hotdesk booking</p>
              <h3>{title}</h3>
            </div>
            <button type="button" className="enq-ghost" onClick={onClose}>
              Close
            </button>
          </header>
          <div className="enq-modal__body">{body}</div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <article className="dash-card admin-rise">
      <div className="admin-panel__head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {body}
    </article>
  )
}

/** Wizard: date → seats → centre → client type → slot grid */
export function HotdeskBookWizard({ centers, onClose, mode = 'conference' }) {
  const [step, setStep] = useState('date')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [seats, setSeats] = useState(4)
  const [center, setCenter] = useState(null)
  const [clientKind, setClientKind] = useState('INHOUSE')
  const [externalCompany, setExternalCompany] = useState('')
  const [hotdeskType, setHotdeskType] = useState(mode === 'hotdesk' ? 'DAYPASS' : 'CONFERENCE')
  const activeCenters = (centers || []).filter((c) => c.isActive !== false)
  const today = new Date().toISOString().slice(0, 10)

  if (step === 'slots' && center) {
    return (
      <ConferenceBookingPage
        centerId={center.id}
        center={center}
        hotdeskType={hotdeskType || 'CONFERENCE'}
        preferredSeats={Number(seats) || 4}
        initialDate={date}
        clientKind={clientKind}
        externalCompany={externalCompany}
        embedded
        onClose={onClose}
        onBack={() => setStep('client')}
      />
    )
  }

  return createPortal(
    <div className="enq-modal product-modal" role="dialog" aria-modal="true">
      <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={onClose} />
      <div className="enq-modal__panel product-modal__panel" style={{ width: 'min(520px, 96vw)', height: 'auto' }}>
        <header className="enq-modal__head">
          <div>
            <p className="enq-modal__eyebrow">{mode === 'hotdesk' ? 'Hotdesk' : 'Conference / Meeting'}</p>
            <h3>Book {mode === 'hotdesk' ? 'hotdesk' : 'room'}</h3>
          </div>
          <button type="button" className="enq-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="enq-modal__body">
          {step === 'date' ? (
            <>
              <p className="admin-login__hint">1 · Choose date</p>
              <label className="admin-field">
                <span>Date</span>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              {mode === 'conference' ? (
                <label className="admin-field" style={{ marginTop: 10 }}>
                  <span>Room kind</span>
                  <select value={hotdeskType} onChange={(e) => setHotdeskType(e.target.value)}>
                    <option value="CONFERENCE">Conference</option>
                    <option value="MEETING">Meeting</option>
                  </select>
                </label>
              ) : null}
              <div className="admin-top__right" style={{ marginTop: 16 }}>
                <button type="button" className="admin-login__submit" onClick={() => setStep('seats')}>
                  Next · seats
                </button>
              </div>
            </>
          ) : null}

          {step === 'seats' ? (
            <>
              <p className="admin-login__hint">2 · Number of seats</p>
              <div className="enq-excel__actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {[4, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="admin-login__submit"
                    onClick={() => {
                      setSeats(n)
                      setStep('center')
                    }}
                  >
                    {n} seater
                  </button>
                ))}
              </div>
              <div className="admin-top__right" style={{ marginTop: 16 }}>
                <button type="button" className="enq-ghost" onClick={() => setStep('date')}>
                  Back
                </button>
              </div>
            </>
          ) : null}

          {step === 'center' ? (
            <>
              <p className="admin-login__hint">
                3 · Centre · {seats} seater · {date}
              </p>
              {!activeCenters.length ? (
                <p className="admin-login__error">No centers found. Add centers under Settings first.</p>
              ) : (
                <div className="enq-excel__actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {activeCenters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="admin-login__submit"
                      onClick={() => {
                        setCenter(c)
                        setStep('client')
                      }}
                    >
                      {c.code} — {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="admin-top__right" style={{ marginTop: 16 }}>
                <button type="button" className="enq-ghost" onClick={() => setStep('seats')}>
                  Back
                </button>
              </div>
            </>
          ) : null}

          {step === 'client' ? (
            <>
              <p className="admin-login__hint">4 · Client type (then pick time slots)</p>
              <div className="enq-excel__actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <button type="button" className="admin-login__submit" onClick={() => setClientKind('INHOUSE')}>
                  In-house client {clientKind === 'INHOUSE' ? '✓' : ''}
                </button>
                <button type="button" className="admin-login__submit" onClick={() => setClientKind('EXTERNAL')}>
                  External client {clientKind === 'EXTERNAL' ? '✓' : ''}
                </button>
              </div>
              {clientKind === 'INHOUSE' ? (
                <p className="admin-login__hint" style={{ marginTop: 10 }}>
                  Free hours = 5 × seats, plus grace 2 × seats. Over grace → external pricing.
                  For {seats} seats: {5 * seats}h free + {2 * seats}h grace = {7 * seats}h credits.
                </p>
              ) : (
                <label className="admin-field" style={{ marginTop: 10 }}>
                  <span>Company name</span>
                  <input
                    required
                    value={externalCompany}
                    onChange={(e) => setExternalCompany(e.target.value)}
                    placeholder="External company"
                  />
                </label>
              )}
              <div className="admin-top__right" style={{ marginTop: 16, gap: 8 }}>
                <button type="button" className="enq-ghost" onClick={() => setStep('center')}>
                  Back
                </button>
                <button
                  type="button"
                  className="admin-login__submit"
                  disabled={clientKind === 'EXTERNAL' && !externalCompany.trim()}
                  onClick={() => setStep('slots')}
                >
                  Next · time slots
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConferenceBookingPage
