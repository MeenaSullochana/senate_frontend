import { useEffect, useMemo, useState } from 'react'
import { accountsApi } from '../services/api'
import { apiError } from '../services/api/client'
import { useAuth } from '../context/AuthContext'

const COLUMNS = [
  ['month', 'Month'],
  ['centre', 'Centre'],
  ['company', 'Company'],
  ['dateOfLogin', 'Date Of Login'],
  ['expiryDate', 'Expiry Date'],
  ['contact', 'Contact'],
  ['contactNo', 'Contact No.'],
  ['className', 'Class'],
  ['costPerSeat', 'Cost/Seat'],
  ['quantity', 'Qnty'],
  ['oneMonth', '1Mo'],
  ['td', 'TD'],
  ['usgPerDay', 'Usg/day'],
  ['usg', 'Usg'],
  ['rent', 'Rent'],
  ['rrScheme', 'RR Scheme'],
  ['tds', '(TDS)'],
  ['gst', 'GST'],
  ['rentPlusGstMinusTds', 'Rent + Gst (-TDS)'],
  ['balancePending', 'Balance Pending'],
  ['totalAmount', 'Total Amount'],
  ['adjustments', 'Adjustments'],
  ['receivables', 'Receivables'],
  ['invoice', 'Invoice'],
  ['invoiceDate', 'Invoice Date'],
  ['receivedAmount', 'Received Amount'],
  ['pending', 'Pending'],
  ['paymentStatus', 'Payment Status'],
  ['paidOn', 'Paid On'],
  ['paymentMode', 'Payment Mode'],
  ['payToAccount', 'Pay to - Account'],
  ['followUpBy', 'Follow-up By'],
  ['remarks', 'Remarks'],
  ['bookingRef', 'Booking'],
]

function monthDefault() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function money(n) {
  if (n == null || n === '') return '—'
  return `₹${Number(n).toLocaleString('en-IN')}`
}

export function AccountsPage() {
  const { can } = useAuth()
  const [month, setMonth] = useState(monthDefault())
  const [status, setStatus] = useState('')
  const [centre, setCentre] = useState('')
  const [q, setQ] = useState('')
  const [rawItems, setRawItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [edit, setEdit] = useState(null)
  const canEdit = can('accounts.update') || can('accounts.create') || can('accounts.payment')
  const canExport = can('accounts.export') || can('accounts.view') || can('reports.export')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await accountsApi.rentCollection({
        month,
        status: status || undefined,
        q: q || undefined,
        limit: 500,
      })
      setRawItems(res.data.data.items || [])
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, status])

  const centres = useMemo(() => {
    const set = new Set(rawItems.map((r) => r.centre).filter(Boolean))
    return [...set].sort()
  }, [rawItems])

  const items = useMemo(() => {
    if (!centre) return rawItems
    const c = centre.toLowerCase()
    return rawItems.filter((r) => String(r.centre || '').toLowerCase().includes(c))
  }, [rawItems, centre])

  const exportCsv = () => {
    const header = COLUMNS.map(([, label]) => label).join(',')
    const body = items
      .map((row) =>
        COLUMNS.map(([k]) => {
          const v = row[k] ?? ''
          const s = String(v).replaceAll('"', '""')
          return /[",\n]/.test(s) ? `"${s}"` : s
        }).join(','),
      )
      .join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rent-collection-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = useMemo(() => {
    return items.reduce(
      (acc, r) => {
        acc.rent += Number(r.rent || 0)
        acc.received += Number(r.receivedAmount || 0)
        acc.pending += Number(r.pending || 0)
        return acc
      },
      { rent: 0, received: 0, pending: 0 },
    )
  }, [items])

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!edit?.contractId) return
    setMsg('')
    try {
      await accountsApi.saveRentRow({ ...edit, month: edit.month || month })
      setMsg('Rent collection row saved')
      setEdit(null)
      await load()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <article className="dash-card admin-rise">
      <div className="admin-panel__head">
        <div>
          <h2>Accounts · Rent Collection Tracker</h2>
          <p className="admin-login__hint" style={{ margin: '6px 0 0' }}>
            Built from bookings/contracts, member profile, invoices and monthly rent payments. Edit overrides save to
            Accounts for the selected month.
          </p>
        </div>
      </div>

      {error ? <p className="admin-login__error">{error}</p> : null}
      {msg ? <p className="admin-login__hint">{msg}</p> : null}

      <div className="admin-toolbar" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <label className="admin-field" style={{ margin: 0, minWidth: 140 }}>
          <span>Month</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="admin-field" style={{ margin: 0, minWidth: 140 }}>
          <span>Payment status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
        <label className="admin-field" style={{ margin: 0, minWidth: 140 }}>
          <span>Centre</span>
          <select value={centre} onChange={(e) => setCentre(e.target.value)}>
            <option value="">All centres</option>
            {centres.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <span>Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Company / booking / centre"
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </label>
        <button type="button" className="enq-ghost" onClick={load} style={{ alignSelf: 'end' }}>
          Refresh
        </button>
        {canExport ? (
          <button type="button" className="admin-login__submit" onClick={exportCsv} style={{ alignSelf: 'end' }}>
            Export CSV
          </button>
        ) : null}
      </div>

      <div className="admin-grid-3" style={{ marginBottom: 14 }}>
        <div className="dash-metric">
          <span>Rent billed</span>
          <strong>{money(totals.rent)}</strong>
        </div>
        <div className="dash-metric">
          <span>Received</span>
          <strong>{money(totals.received)}</strong>
        </div>
        <div className="dash-metric">
          <span>Pending</span>
          <strong>{money(totals.pending)}</strong>
        </div>
      </div>

      <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ minWidth: 2200 }}>
          <thead>
            <tr>
              {COLUMNS.map(([k, label]) => (
                <th key={k}>{label}</th>
              ))}
              {canEdit ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1}>Loading…</td>
              </tr>
            ) : null}
            {!loading && !items.length ? (
              <tr>
                <td colSpan={COLUMNS.length + 1}>No booking/contract rows for this month.</td>
              </tr>
            ) : null}
            {items.map((row) => (
              <tr key={row.id}>
                {COLUMNS.map(([k]) => (
                  <td key={k}>
                    {[
                      'costPerSeat',
                      'oneMonth',
                      'rent',
                      'tds',
                      'gst',
                      'rentPlusGstMinusTds',
                      'balancePending',
                      'totalAmount',
                      'adjustments',
                      'receivables',
                      'receivedAmount',
                      'pending',
                    ].includes(k)
                      ? money(row[k])
                      : row[k] ?? '—'}
                  </td>
                ))}
                {canEdit ? (
                  <td>
                    <button type="button" className="enq-ghost" onClick={() => setEdit({ ...row })}>
                      Edit
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit ? (
        <form className="admin-modal-card" onSubmit={saveEdit} style={{ marginTop: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Edit · {edit.company || edit.bookingRef}</h3>
          <div className="admin-grid-3">
            {[
              ['centre', 'Centre'],
              ['company', 'Company'],
              ['contact', 'Contact'],
              ['contactNo', 'Contact No.'],
              ['className', 'Class'],
              ['rrScheme', 'RR Scheme'],
              ['paymentStatus', 'Payment Status'],
              ['paymentMode', 'Payment Mode'],
              ['payToAccount', 'Pay to - Account'],
              ['followUpBy', 'Follow-up By'],
              ['invoice', 'Invoice'],
              ['remarks', 'Remarks'],
            ].map(([k, label]) => (
              <label key={k} className="admin-field">
                <span>{label}</span>
                <input value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </label>
            ))}
            {[
              ['rent', 'Rent'],
              ['tds', 'TDS'],
              ['gst', 'GST'],
              ['adjustments', 'Adjustments'],
              ['receivedAmount', 'Received Amount'],
              ['pending', 'Pending'],
              ['quantity', 'Qnty'],
              ['costPerSeat', 'Cost/Seat'],
            ].map(([k, label]) => (
              <label key={k} className="admin-field">
                <span>{label}</span>
                <input
                  type="number"
                  value={edit[k] ?? ''}
                  onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                />
              </label>
            ))}
            <label className="admin-field">
              <span>Paid On</span>
              <input
                type="date"
                value={edit.paidOn || ''}
                onChange={(e) => setEdit({ ...edit, paidOn: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Invoice Date</span>
              <input
                type="date"
                value={edit.invoiceDate || ''}
                onChange={(e) => setEdit({ ...edit, invoiceDate: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-top__right" style={{ marginTop: 12, gap: 8 }}>
            <button type="button" className="enq-ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit">
              Save
            </button>
          </div>
        </form>
      ) : null}
    </article>
  )
}
