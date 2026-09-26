import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  auditApi,
  bookingApi,
  cmsApi,
  conferenceApi,
  contractApi,
  customerApi,
  inquiryApi,
  invoiceApi,
  kycApi,
  maintenanceApi,
  membershipApi,
  onboardingApi,
  paymentApi,
  productCatalogApi,
  reportApi,
  roleApi,
  settingsApi,
  userApi,
  hrmApi,
  virtualOfficeApi,
  workspaceApi,
} from '../services/api'
import { apiError, getAccessToken } from '../services/api/client'
import { useAuth } from '../context/AuthContext'
import { MemberKycTabs } from './MemberKycTabs'
import { CatalogSettingsPanels } from './ProductCatalogUI'
import MembershipKycPage from '../pages/MembershipKycPage'

function useList(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, page: 1 })
  const [q, setQ] = useState('')
  const reload = (page = 1) => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    loader({ page, limit: 12, q })
      .then((res) => {
        const d = res.data.data
        setState({
          loading: false,
          error: '',
          items: d.items || d.plans || d.categories || [],
          total: d.total || (d.items || []).length,
          page,
        })
      })
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err) })))
  }
  useEffect(() => {
    reload(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { ...state, q, setQ, reload }
}

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

function Pager({ page, total, limit = 12, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="admin-top__right" style={{ marginTop: 16, gap: 8 }}>
      <button type="button" className="admin-login__submit" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" className="admin-login__submit" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  )
}

function ProgressBars({ progress }) {
  if (!progress) return null
  const rows = [
    ['Profile', progress.profile],
    ['Business', progress.business ?? progress.company],
    ['Authority', progress.authority],
    ['KYC', progress.kyc],
  ].filter(([, pct]) => pct != null)
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
      {rows.map(([label, pct]) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{label}</span>
            <span>{pct || 0}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
            <div
              style={{
                width: `${Math.min(100, pct || 0)}%`,
                height: '100%',
                borderRadius: 99,
                background: 'linear-gradient(90deg,#c4b5a0,#f5f2ea)',
              }}
            />
          </div>
        </div>
      ))}
      <p className="admin-login__hint" style={{ margin: 0 }}>
        Agreement: {progress.agreement || 'Pending'} · Overall {progress.overall || 0}%
      </p>
    </div>
  )
}

function RelatedTable({ title, rows, columns }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 8px' }}>{title}</h4>
      {!rows?.length ? (
        <p className="admin-login__hint">No records.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || JSON.stringify(row)}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function MembersPage({ initialTab }) {
  const { can } = useAuth()
  const list = useList((p) => userApi.members(p))
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState(initialTab === 'kyc-review' ? 'kyc-review' : 'overview')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [showKycQueue, setShowKycQueue] = useState(initialTab === 'kyc-review')

  const openMember = async (u) => {
    setError('')
    setTab('overview')
    setShowKycQueue(false)
    try {
      const res = await userApi.member360(u.id)
      setDetail(res.data.data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const tabs = [
    'overview',
    'kyc',
    'bookings',
    'payments',
    'invoices',
    'services',
    'followups',
    'activity',
  ]

  const downloadMember = () => {
    if (!detail?.member) return
    const m = detail.member
    const lines = [
      `Member: ${m.fullName}`,
      `Member ID: ${m.memberProfile?.memberId || '—'}`,
      `Email: ${m.email}`,
      `Mobile: ${m.mobile || '—'}`,
      `Company: ${m.memberProfile?.companyName || '—'}`,
      `KYC: ${m.memberProfile?.kycStatus || '—'}`,
      `Membership: ${m.memberProfile?.membershipStatus || '—'}`,
      `Customer: ${detail.customer?.customerId || '—'}`,
      '',
      '--- Contracts / products ---',
      ...(detail.contracts || []).map(
        (c) => `${c.contractId} | ${c.kind} | ${c.productName || '—'} | ${c.status} | ${c.location || '—'}`,
      ),
      '',
      '--- Payments ---',
      ...(detail.payments || []).map((p) => `${p.id?.slice(-8)} | ${p.type} | ${p.amount} | ${p.status}`),
      '',
      '--- Invoices ---',
      ...(detail.invoices || []).map((i) => `${i.invoiceNumber} | ${i.total} | ${i.status}`),
      '',
      '--- Enquiries ---',
      ...(detail.inquiries || []).map((i) => `${i.enquiryId} | ${i.status} | ${i.source} | ${i.name}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${m.memberProfile?.memberId || m.fullName || 'member'}-360.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printMember = () => {
    const node = document.getElementById('member-360-print')
    if (!node) return
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!w) return
    w.document.write(
      `<!doctype html><html><head><title>Member 360</title><style>
        body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111}
        h1,h2,h3,h4{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
      </style></head><body>${node.innerHTML}</body></html>`,
    )
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <Panel
      title="Members"
      actions={
        can('kyc.view') || can('kyc.review') ? (
          <button
            type="button"
            className="admin-login__submit"
            onClick={() => {
              setDetail(null)
              setShowKycQueue(true)
            }}
          >
            KYC verification
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={msg} />
      {showKycQueue ? (
        <>
          <div className="admin-top__right" style={{ marginBottom: 12 }}>
            <button type="button" className="admin-login__submit" onClick={() => setShowKycQueue(false)}>
              Back to members
            </button>
          </div>
          <KycPage />
        </>
      ) : null}
      {!showKycQueue ? (
        <>
      <div className="admin-top__right" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="admin-field input"
          style={{ minWidth: 220 }}
          placeholder="Search name, email, member ID"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Member ID</th>
              <th>Company</th>
              <th>KYC</th>
              <th>Membership</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.loading ? (
              <tr>
                <td colSpan={8}>Loading…</td>
              </tr>
            ) : !list.items.length ? (
              <tr>
                <td colSpan={8}>No members found.</td>
              </tr>
            ) : (
              list.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.memberProfile?.memberId || '—'}</td>
                  <td>{u.memberProfile?.companyName || '—'}</td>
                  <td>{u.memberProfile?.kycStatus || '—'}</td>
                  <td>{u.memberProfile?.membershipStatus || '—'}</td>
                  <td>
                    <span className="admin-chip">{u.status}</span>
                  </td>
                  <td>
                    <button type="button" className="admin-login__submit" onClick={() => openMember(u)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />

      {detail
        ? createPortal(
            <div className="enq-modal" role="dialog" aria-modal="true">
              <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={() => setDetail(null)} />
              <div className="enq-modal__panel" style={{ width: 'min(980px, 96vw)', maxHeight: '92dvh' }}>
                <header className="enq-modal__head">
                  <div>
                    <p className="enq-modal__eyebrow">Member 360°</p>
                    <h3>
                      {detail.member?.fullName} · {detail.member?.memberProfile?.memberId}
                    </h3>
                    <p className="enq-modal__meta">
                      {detail.member?.email} · {detail.member?.mobile || '—'} · Customer{' '}
                      {detail.customer?.customerId || '—'}
                    </p>
                  </div>
                  <div className="enq-excel__actions">
                    <button type="button" className="enq-ghost" onClick={printMember}>
                      Print
                    </button>
                    <button type="button" className="enq-ghost" onClick={downloadMember}>
                      Download
                    </button>
                    <button type="button" className="enq-ghost" onClick={() => setDetail(null)}>
                      Close
                    </button>
                  </div>
                </header>

                <div className="enq-modal__body" id="member-360-print">
                  <ProgressBars progress={detail.progress} />

                  <div className="admin-top__right" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {tabs.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="admin-login__submit"
                        style={tab === t ? { outline: '2px solid #fff' } : { opacity: 0.7 }}
                        onClick={() => setTab(t)}
                      >
                        {t === 'kyc' ? 'Profile / KYC' : t}
                      </button>
                    ))}
                  </div>

                  {tab === 'overview' ? (
                    <div className="admin-grid-2">
                      <p>
                        <strong>Company:</strong> {detail.member?.memberProfile?.companyName || '—'}
                      </p>
                      <p>
                        <strong>Active bookings:</strong> {(detail.contracts || []).length}
                      </p>
                      <p>
                        <strong>Products:</strong>{' '}
                        {(detail.contracts || [])
                          .map((c) => c.productName)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </p>
                      <p>
                        <strong>Agreement:</strong> {detail.member?.memberProfile?.agreementStatus || '—'}
                      </p>
                      <p>
                        <strong>KYC:</strong> {detail.member?.memberProfile?.kycStatus}
                      </p>
                      <p>
                        <strong>Membership:</strong> {detail.member?.memberProfile?.membershipStatus}
                      </p>
                    </div>
                  ) : null}

                  {tab === 'kyc' && detail.member ? (
                    <MemberKycTabs
                      user={detail.member}
                      showOnboarding={false}
                      selfServeKyc={false}
                      contracts={detail.contracts || []}
                      readOnly={!can('users.update')}
                      updateUser={async (id, body) => {
                        await userApi.update(id, body)
                        setMsg('Member KYC updated')
                      }}
                      onSaved={() => openMember(detail.member)}
                    />
                  ) : null}

                  {tab === 'bookings' ? (
                    <RelatedTable
                      title="Bookings (contracts)"
                      rows={detail.contracts}
                      columns={[
                        { key: 'contractId', label: 'Booking' },
                        { key: 'kind', label: 'Type' },
                        { key: 'productName', label: 'Product' },
                        { key: 'status', label: 'Status' },
                        { key: 'location', label: 'Location' },
                      ]}
                    />
                  ) : null}
                  {tab === 'payments' ? (
                    <RelatedTable
                      title="Payments"
                      rows={detail.payments}
                      columns={[
                        { key: 'id', label: 'ID', render: (r) => r.id?.slice(-8) },
                        { key: 'type', label: 'Type' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'status', label: 'Status' },
                      ]}
                    />
                  ) : null}
                  {tab === 'invoices' ? (
                    <RelatedTable
                      title="Invoices"
                      rows={detail.invoices}
                      columns={[
                        { key: 'invoiceNumber', label: 'Invoice' },
                        { key: 'total', label: 'Total' },
                        { key: 'status', label: 'Status' },
                      ]}
                    />
                  ) : null}
                  {tab === 'services' ? (
                    <RelatedTable
                      title="Service / maintenance"
                      rows={detail.services}
                      columns={[
                        { key: 'ticketNumber', label: 'Ticket', render: (r) => r.ticketNumber || r.id?.slice(-6) },
                        { key: 'status', label: 'Status' },
                        { key: 'priority', label: 'Priority' },
                        { key: 'title', label: 'Title', render: (r) => r.title || r.description?.slice(0, 40) || '—' },
                      ]}
                    />
                  ) : null}
                  {tab === 'followups' ? (
                    <RelatedTable
                      title="Follow-ups"
                      rows={detail.followUps}
                      columns={[
                        { key: 'type', label: 'Type' },
                        { key: 'status', label: 'Status' },
                        { key: 'notes', label: 'Notes' },
                        { key: 'staff', label: 'Staff', render: (r) => r.staff?.fullName || '—' },
                      ]}
                    />
                  ) : null}
                  {tab === 'activity' ? (
                    <RelatedTable
                      title="Activity"
                      rows={detail.activity}
                      columns={[
                        { key: 'action', label: 'Action' },
                        { key: 'entity', label: 'Entity' },
                        {
                          key: 'createdAt',
                          label: 'When',
                          render: (r) => (r.createdAt ? String(r.createdAt).slice(0, 16).replace('T', ' ') : '—'),
                        },
                      ]}
                    />
                  ) : null}
                  {tab === 'overview' ? (
                    <RelatedTable
                      title="Linked enquiries"
                      rows={detail.inquiries}
                      columns={[
                        { key: 'enquiryId', label: 'Enquiry' },
                        { key: 'status', label: 'Status' },
                        { key: 'source', label: 'Source' },
                        { key: 'name', label: 'Name' },
                      ]}
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            document.querySelector('.admin-main') || document.body,
          )
        : null}
        </>
      ) : null}
    </Panel>
  )
}

export function CustomersPage() {
  const list = useList((p) => customerApi.list(p))
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('overview')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', company: '', city: '' })
  const [msg, setMsg] = useState('')

  const open = async (c) => {
    setError('')
    setTab('overview')
    try {
      const res = await customerApi.get(c.id)
      setDetail(res.data.data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const create = async (e) => {
    e.preventDefault()
    try {
      await customerApi.create(form)
      setMsg('Customer created')
      setCreating(false)
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title="Customers"
      actions={
        <button type="button" className="admin-login__submit" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Close' : 'Add customer'}
        </button>
      }
    >
      <Banner error={list.error || error} success={msg} />
      <div className="admin-top__right" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="admin-field input"
          style={{ minWidth: 220 }}
          placeholder="Search customer…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>
      {creating ? (
        <form className="admin-login__form" onSubmit={create} style={{ marginBottom: 16 }}>
          <div className="admin-grid-2">
            {Object.keys(form).map((k) => (
              <label className="admin-field" key={k}>
                <span>{k}</span>
                <input required={k === 'name'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <button type="submit" className="admin-login__submit">
            Save customer
          </button>
        </form>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Enquiries</th>
              <th>Members</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((c) => (
              <tr key={c.id}>
                <td>{c.customerId}</td>
                <td>{c.name}</td>
                <td>{c.company || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.mobile || '—'}</td>
                <td>{c.counts?.inquiries ?? 0}</td>
                <td>{c.counts?.members ?? 0}</td>
                <td>
                  <button type="button" className="admin-login__submit" onClick={() => open(c)}>
                    360°
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />

      {detail ? (
        <article className="dash-card" style={{ marginTop: 16 }}>
          <div className="admin-panel__head">
            <div>
              <h3 style={{ margin: 0 }}>
                {detail.customer?.name} · {detail.customer?.customerId}
              </h3>
              <p className="admin-login__hint">
                {detail.customer?.company || '—'} · {detail.customer?.email || '—'} · {detail.customer?.mobile || '—'}
              </p>
            </div>
            <button type="button" className="admin-login__submit" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <div className="admin-top__right" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['overview', 'enquiries', 'members', 'contracts', 'bookings', 'payments', 'services', 'activity'].map((t) => (
              <button
                key={t}
                type="button"
                className="admin-login__submit"
                style={tab === t ? { outline: '2px solid #fff' } : { opacity: 0.7 }}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'enquiries' || tab === 'overview' ? (
            <RelatedTable
              title="Enquiries"
              rows={detail.inquiries}
              columns={[
                { key: 'enquiryId', label: 'ID' },
                { key: 'status', label: 'Status' },
                { key: 'source', label: 'Source' },
                { key: 'name', label: 'Name' },
              ]}
            />
          ) : null}
          {tab === 'members' || tab === 'overview' ? (
            <RelatedTable
              title="Members"
              rows={detail.members}
              columns={[
                { key: 'memberId', label: 'Member' },
                { key: 'user', label: 'Name', render: (r) => r.user?.fullName || '—' },
                { key: 'kycStatus', label: 'KYC' },
                { key: 'membershipStatus', label: 'Membership' },
              ]}
            />
          ) : null}
          {tab === 'contracts' ? (
            <RelatedTable
              title="Contracts"
              rows={detail.contracts}
              columns={[
                { key: 'contractId', label: 'Contract' },
                { key: 'status', label: 'Status' },
                { key: 'location', label: 'Location' },
              ]}
            />
          ) : null}
          {tab === 'bookings' ? (
            <RelatedTable
              title="Bookings"
              rows={detail.bookings}
              columns={[
                { key: 'bookingNumber', label: 'Booking', render: (r) => r.bookingNumber || r.id?.slice(-6) },
                { key: 'status', label: 'Status' },
                { key: 'resourceType', label: 'Type' },
              ]}
            />
          ) : null}
          {tab === 'payments' ? (
            <RelatedTable
              title="Payments"
              rows={detail.payments}
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' },
              ]}
            />
          ) : null}
          {tab === 'services' ? (
            <RelatedTable
              title="Services"
              rows={detail.services}
              columns={[
                { key: 'ticketNumber', label: 'Ticket', render: (r) => r.ticketNumber || r.id?.slice(-6) },
                { key: 'status', label: 'Status' },
              ]}
            />
          ) : null}
          {tab === 'activity' ? (
            <RelatedTable
              title="Activity"
              rows={detail.activity}
              columns={[
                { key: 'action', label: 'Action' },
                { key: 'entity', label: 'Entity' },
                { key: 'createdAt', label: 'When', render: (r) => (r.createdAt ? String(r.createdAt).slice(0, 16).replace('T', ' ') : '—') },
              ]}
            />
          ) : null}
        </article>
      ) : null}
    </Panel>
  )
}

export function KycPage({ mine }) {
  const [status, setStatus] = useState('')
  const list = useList(
    (p) =>
      mine
        ? kycApi.mine().then((r) => ({ data: { data: { items: r.data.data.kyc ? [r.data.data.kyc] : [], total: r.data.data.kyc ? 1 : 0 } } }))
        : kycApi.list({ ...p, status: status || undefined }),
    [mine, status],
  )
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState('')
  const decide = async (id, next) => {
    try {
      await kycApi.decide(id, { status: next, remarks })
      setMsg(`KYC marked ${next}`)
      list.reload(list.page)
    } catch (err) {
      setMsg(apiError(err))
    }
  }
  return (
    <Panel title={mine ? 'My KYC status' : 'KYC review'}>
      <Banner success={msg} error={list.error} />
      {!mine ? (
        <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Search member…"
            value={list.q}
            onChange={(e) => list.setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
          />
          <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
            Search
          </button>
        </div>
      ) : null}
      {list.loading ? <p>Loading…</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>ID</th>
              <th>Status</th>
              <th>Docs</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(list.items || []).map((k) => (
              <tr key={k.id}>
                <td>
                  {k.user?.fullName || 'You'}
                  {k.user?.memberProfile?.memberId ? ` · ${k.user.memberProfile.memberId}` : ''}
                </td>
                <td>{k.identityNo || '—'}</td>
                <td>{k.status}</td>
                <td>
                  {(k.documents || []).map((d) => (
                    <a key={d.id} href={kycApi.documentUrl(d.id)} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>
                      {d.type || 'doc'}
                    </a>
                  ))}
                  {!k.documents?.length ? '—' : null}
                </td>
                <td>{k.submittedAt ? new Date(k.submittedAt).toLocaleString('en-IN') : '—'}</td>
                <td>
                  {mine ? (
                    k.remarks ? <small>{k.remarks}</small> : null
                  ) : (
                    <>
                      <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" />
                      <button type="button" onClick={() => decide(k.id, 'APPROVED')}>
                        Approve
                      </button>
                      <button type="button" onClick={() => decide(k.id, 'REJECTED')}>
                        Reject
                      </button>
                      <button type="button" onClick={() => decide(k.id, 'RESUBMISSION_REQUIRED')}>
                        Resubmit
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!mine ? <Pager page={list.page} total={list.total} onPage={list.reload} /> : null}
    </Panel>
  )
}

export function MemberKycForm() {
  const [identityNo, setIdentityNo] = useState('')
  const [documentType, setDocumentType] = useState('AADHAAR')
  const [file, setFile] = useState(null)
  const [current, setCurrent] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () =>
    kycApi
      .mine()
      .then((r) => setCurrent(r.data.data.kyc || null))
      .catch(() => setCurrent(null))

  useEffect(() => {
    reload()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData()
    form.append('identityNo', identityNo)
    form.append('documentType', documentType)
    if (file) form.append('documents', file)
    try {
      await kycApi.submit(form)
      setMsg('KYC submitted for review')
      setFile(null)
      reload()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  const locked = current?.status === 'APPROVED'

  return (
    <>
      <Panel title="Submit KYC">
        <Banner error={error} success={msg} />
        {current ? (
          <p style={{ marginBottom: 12 }}>
            Current status: <strong>{current.status}</strong>
            {current.remarks ? ` · ${current.remarks}` : ''}
          </p>
        ) : (
          <p style={{ marginBottom: 12 }}>No KYC on file yet. Upload a government ID to continue booking.</p>
        )}
        {!locked ? (
          <form className="admin-login__form" onSubmit={submit}>
            <div className="admin-grid-2">
              <label className="admin-field">
                <span>Document type</span>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  {['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'GST_CERTIFICATE', 'OTHER'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>ID number</span>
                <input value={identityNo} onChange={(e) => setIdentityNo(e.target.value)} required />
              </label>
              <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <span>Document (PDF or image)</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0])} required={!current?.documents?.length} />
              </label>
            </div>
            <button className="admin-login__submit" disabled={loading} type="submit">
              {loading ? 'Uploading…' : current ? 'Resubmit KYC' : 'Submit KYC'}
            </button>
          </form>
        ) : (
          <p>Your KYC is approved. Contact support if details need correction.</p>
        )}
      </Panel>
      <KycPage mine />
    </>
  )
}

export function BookingsPage({ canDesk, title = 'Bookings', resourceType: fixedType = '' }) {
  const { role } = useAuth()
  const isMember = role === 'MEMBER'
  const [resourceType, setResourceType] = useState(fixedType || '')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const clientLabel = (b) => {
    const notes = String(b?.notes || '')
    const company =
      notes.match(/company=([^·]+)/i)?.[1]?.trim() ||
      notes.match(/External:\s*([^·]+)/i)?.[1]?.trim()
    if (company) return company
    if (/client=EXTERNAL/i.test(notes)) return 'External client'
    return b?.user?.fullName || '—'
  }

  useEffect(() => {
    setResourceType(fixedType || '')
  }, [fixedType])

  const list = useList(
    (p) => bookingApi.list({ ...p, resourceType: resourceType || undefined }),
    [resourceType],
  )

  const act = async (fn) => {
    setError('')
    try {
      await fn()
      setMsg('Updated')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel title={title || (isMember ? 'My bookings' : 'Bookings')}>
      <Banner success={msg} error={list.error || error} />
      <p className="admin-login__hint">
        {isMember
          ? 'Only your bookings are listed here.'
          : 'Slot bookings (hotdesk / conference). Physical and virtual office leases are under Bookings · Physical / Virtual.'}
      </p>
      <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
        {!fixedType ? (
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            <option value="">All types</option>
            <option value="CONFERENCE_ROOM">Hotdesk</option>
            <option value="WORKSPACE">Workspace</option>
          </select>
        ) : null}
        {!isMember ? (
          <input
            className="admin-field input"
            style={{ minWidth: 180 }}
            placeholder="Search booking / member"
            value={list.q}
            onChange={(e) => list.setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
          />
        ) : null}
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Refresh
        </button>
      </div>
      {list.loading ? <p>Loading…</p> : null}
      {!list.loading && !list.items.length ? <p>{isMember ? 'You have no bookings yet.' : 'No bookings found.'}</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Type</th>
              {!isMember ? <th>Client</th> : null}
              <th>When</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((b) => (
              <tr key={b.id}>
                <td>{b.bookingNumber}</td>
                <td>{b.resourceType === 'CONFERENCE_ROOM' ? 'Hotdesk / Conference' : 'Workspace'}</td>
                {!isMember ? <td>{clientLabel(b)}</td> : null}
                <td>
                  {new Date(b.startAt).toLocaleString('en-IN')} – {new Date(b.endAt).toLocaleTimeString('en-IN')}
                </td>
                <td>{b.totalAmount != null ? `₹${b.totalAmount}` : '—'}</td>
                <td>
                  <span className="admin-status admin-status--new">{b.status}</span>
                </td>
                <td>
                  {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' ? (
                    <button type="button" onClick={() => act(() => bookingApi.cancel(b.id, 'Cancelled from console'))}>
                      Cancel
                    </button>
                  ) : null}
                  {canDesk && b.status === 'CONFIRMED' && !b.checkIns?.length ? (
                    <button type="button" onClick={() => act(() => bookingApi.checkIn(b.id))}>
                      Check-in
                    </button>
                  ) : null}
                  {canDesk && b.checkIns?.length && !b.checkOuts?.length ? (
                    <button type="button" onClick={() => act(() => bookingApi.checkOut(b.id))}>
                      Check-out
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />
    </Panel>
  )
}

export function BookingCreatePage() {
  const [workspaces, setWorkspaces] = useState([])
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({
    resourceType: 'CONFERENCE_ROOM',
    resourceId: '',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    durationMinutes: 60,
  })
  const [slots, setSlots] = useState(null)
  const [avail, setAvail] = useState(null)
  const [rules, setRules] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    workspaceApi.list({ limit: 50 }).then((r) => setWorkspaces(r.data.data.items || []))
    conferenceApi.list({ limit: 50 }).then((r) => setRooms(r.data.data.items || []))
    bookingApi.rules().then((r) => setRules(r.data.data.rules)).catch(() => {})
  }, [])

  const resources = form.resourceType === 'WORKSPACE' ? workspaces : rooms

  const loadSlots = async () => {
    if (!form.resourceId || !form.date) return
    setError('')
    try {
      const { data } = await bookingApi.slots({
        resourceType: form.resourceType,
        resourceId: form.resourceId,
        date: form.date,
        durationMinutes: form.durationMinutes,
      })
      setSlots(data.data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  useEffect(() => {
    if (form.resourceId && form.date) loadSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.resourceId, form.date, form.durationMinutes, form.resourceType])

  const check = async () => {
    setError('')
    try {
      const { data } = await bookingApi.availability(form)
      setAvail(data.data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const pickSlot = (slot) => {
    if (!slot.available) return
    setForm((f) => ({ ...f, startTime: slot.startTime, endTime: slot.endTime }))
    setAvail({ available: true, price: slot.price, reason: null })
  }

  const book = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')
    try {
      const { data } = await bookingApi.create(form)
      const paymentId = data.data.payment.id
      await paymentApi.sandboxConfirm(paymentId)
      setMsg(`Booking ${data.data.booking.bookingNumber} confirmed after payment verification.`)
      loadSlots()
    } catch (err) {
      setError(
        err.response?.status === 409
          ? 'This room is no longer available for the selected time. Please select another slot.'
          : apiError(err),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="New conference / workspace booking">
      <Banner error={error} success={msg} />
      {rules ? (
        <p style={{ marginBottom: 12, opacity: 0.85 }}>
          Hours {rules.hours?.start}–{rules.hours?.end} · Buffer {rules.bufferMinutes}m · Advance {rules.advanceDays} days ·
          Slot {rules.slotInterval}m
        </p>
      ) : null}
      <form className="admin-login__form" onSubmit={book}>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>Type</span>
            <select
              value={form.resourceType}
              onChange={(e) => setForm({ ...form, resourceType: e.target.value, resourceId: '' })}
            >
              <option value="CONFERENCE_ROOM">Conference room</option>
              <option value="WORKSPACE">Workspace</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Resource</span>
            <select value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} required>
              <option value="">Select</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.status}
                  {r.hourlyPrice != null ? ` · ₹${r.hourlyPrice}/hr` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label className="admin-field">
            <span>Duration (min)</span>
            <select
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            >
              {[30, 60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Start</span>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>End</span>
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </label>
        </div>

        {slots?.slots?.length ? (
          <div style={{ margin: '12px 0' }}>
            <strong>Available slots</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {slots.slots.map((s) => (
                <button
                  key={`${s.startTime}-${s.endTime}`}
                  type="button"
                  disabled={!s.available}
                  onClick={() => pickSlot(s)}
                  className={
                    form.startTime === s.startTime && form.endTime === s.endTime ? 'admin-login__submit' : undefined
                  }
                  style={{
                    opacity: s.available ? 1 : 0.4,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--admin-border, #ccc)',
                    cursor: s.available ? 'pointer' : 'not-allowed',
                    background:
                      form.startTime === s.startTime && form.endTime === s.endTime ? undefined : 'transparent',
                  }}
                  title={s.reason || 'Available'}
                >
                  {s.startTime}–{s.endTime}
                  {s.price ? ` · ₹${s.price.totalAmount}` : ''}
                </button>
              ))}
            </div>
            {slots.occupied?.length ? (
              <p style={{ marginTop: 8, fontSize: 13 }}>
                Occupied:{' '}
                {slots.occupied.map((o) => `${o.startTime}–${o.endTime} (${o.kind})`).join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="admin-top__right" style={{ gap: 8 }}>
          <button type="button" className="admin-login__submit" onClick={check}>
            Check availability
          </button>
          <button className="admin-login__submit" disabled={loading} type="submit">
            {loading ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
        {avail ? (
          <p style={{ marginTop: 12 }}>
            {avail.available ? 'Available' : 'Unavailable'} {avail.reason || ''}{' '}
            {avail.price ? `· ₹${avail.price.totalAmount}` : ''}
          </p>
        ) : null}
      </form>
    </Panel>
  )
}

const SPACE_STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'UNDER_MAINTENANCE', 'BLOCKED', 'INACTIVE']
const UNIT_TYPES = ['CHAMBER', 'CABIN', 'SEAT', 'DESK', 'OFFICE', 'WORKSTATION', 'OTHER']

export function SpacesPage() {
  const { can } = useAuth()
  const list = useList((p) => workspaceApi.list({ ...p, limit: 30 }))
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState(null)
  const [centreForm, setCentreForm] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [detail, setDetail] = useState(null)
  const canEdit = can('workspace.create') || can('workspace.update')

  useEffect(() => {
    Promise.all([
      workspaceApi.categories().then((r) => setCategories(r.data.data.categories || [])),
      workspaceApi.branches().then((r) => setBranches(r.data.data.items || r.data.data.branches || [])),
      workspaceApi.inventory().then((r) => setSummary(r.data.data.summary)).catch(() => null),
    ]).catch(() => {})
  }, [])

  const openCreate = () => {
    setForm({
      code: '',
      name: '',
      categoryId: categories[0]?.id || '',
      branchId: branches[0]?.id || '',
      unitType: 'CABIN',
      building: '',
      floor: '1',
      chamber: '',
      capacity: 1,
      price: 0,
      pricingType: 'MONTHLY',
      monthlyRent: '',
      securityDeposit: '',
      commitmentFee: '',
      tenureMonths: 11,
      noticePeriodDays: 30,
      status: 'AVAILABLE',
    })
  }

  const openEdit = (w) => {
    setForm({
      id: w.id,
      code: w.code,
      name: w.name,
      categoryId: w.categoryId || w.category?.id || '',
      branchId: w.branchId || w.branch?.id || '',
      unitType: w.unitType || 'WORKSTATION',
      building: w.building || '',
      floor: w.floor || '',
      chamber: w.chamber || '',
      capacity: w.capacity || 1,
      price: w.price ?? 0,
      pricingType: w.pricingType || 'MONTHLY',
      monthlyRent: w.monthlyRent ?? '',
      securityDeposit: w.securityDeposit ?? '',
      commitmentFee: w.commitmentFee ?? '',
      tenureMonths: w.tenureMonths ?? '',
      noticePeriodDays: w.noticePeriodDays ?? '',
      status: w.status || 'AVAILABLE',
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = { ...form }
      delete body.id
      if (form.id) await workspaceApi.update(form.id, body)
      else await workspaceApi.create(body)
      setMsg(form.id ? 'Space updated' : 'Space created')
      setForm(null)
      list.reload(1)
      workspaceApi.inventory().then((r) => setSummary(r.data.data.summary)).catch(() => null)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const setStatus = async (id, status) => {
    try {
      await workspaceApi.status(id, { status })
      setMsg(`Status → ${status}`)
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const openDetail = async (w) => {
    try {
      const res = await workspaceApi.get(w.id)
      setDetail(res.data.data.workspace)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const saveCentre = async (e) => {
    e.preventDefault()
    try {
      await workspaceApi.saveBranch(centreForm.id || null, centreForm)
      setMsg('Centre saved')
      setCentreForm(null)
      const r = await workspaceApi.branches()
      setBranches(r.data.data.items || r.data.data.branches || [])
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title="Physical office / spaces"
      actions={
        <div className="admin-top__right" style={{ gap: 8 }}>
          {can('centres.create') || can('workspace.create') ? (
            <button type="button" className="admin-login__submit" onClick={() => setCentreForm({ code: '', name: '', address: '', city: 'Chennai', building: '' })}>
              Add centre
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className="admin-login__submit" onClick={openCreate}>
              Add space
            </button>
          ) : null}
        </div>
      }
    >
      <Banner error={list.error || error} success={msg} />
      {summary ? (
        <div className="admin-grid-2" style={{ marginBottom: 14, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Total', summary.total],
            ['Available', summary.available],
            ['Occupied', summary.occupied],
            ['Reserved', summary.reserved],
            ['Maintenance', summary.maintenance],
          ].map(([label, n]) => (
            <div key={label} className="dash-card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
              <strong style={{ fontSize: 22 }}>{n}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {centreForm ? (
        <form className="admin-login__form" onSubmit={saveCentre} style={{ marginBottom: 16 }}>
          <h4>Centre / branch</h4>
          <div className="admin-grid-2">
            {['code', 'name', 'address', 'city', 'building', 'phone'].map((k) => (
              <label className="admin-field" key={k}>
                <span>{k}</span>
                <input required={['code', 'name', 'address'].includes(k)} value={centreForm[k] || ''} onChange={(e) => setCentreForm({ ...centreForm, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="button" className="admin-login__submit" onClick={() => setCentreForm(null)}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit">
              Save centre
            </button>
          </div>
        </form>
      ) : null}

      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 16 }}>
          <h4>{form.id ? 'Edit space' : 'New space'}</h4>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Code</span>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!form.id} />
            </label>
            <label className="admin-field">
              <span>Name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Centre</span>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Category</span>
              <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Unit type</span>
              <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {SPACE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {['building', 'floor', 'chamber', 'capacity', 'price', 'monthlyRent', 'securityDeposit', 'commitmentFee', 'tenureMonths', 'noticePeriodDays'].map((k) => (
              <label className="admin-field" key={k}>
                <span>{k}</span>
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit">
              Save space
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-top__right" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="admin-field input"
          style={{ minWidth: 220 }}
          placeholder="Search code, chamber, floor…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Centre</th>
              <th>Type</th>
              <th>Floor/Chamber</th>
              <th>Rent</th>
              <th>Deposit</th>
              <th>Availability</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.loading ? (
              <tr>
                <td colSpan={10}>Loading…</td>
              </tr>
            ) : !list.items.length ? (
              <tr>
                <td colSpan={10}>No spaces found.</td>
              </tr>
            ) : (
              list.items.map((w) => (
                <tr key={w.id}>
                  <td>{w.code}</td>
                  <td>{w.name}</td>
                  <td>{w.branch?.code || '—'}</td>
                  <td>{w.unitType || w.category?.name}</td>
                  <td>
                    {w.floor || '—'} / {w.chamber || '—'}
                  </td>
                  <td>{w.monthlyRent != null ? `₹${w.monthlyRent}` : `₹${w.price}`}</td>
                  <td>{w.securityDeposit != null ? `₹${w.securityDeposit}` : '—'}</td>
                  <td>
                    <span className="admin-chip">{w.availabilityStatus || w.status}</span>
                    {w.occupiedByContract ? (
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{w.occupiedByContract.company || w.occupiedByContract.contractId}</div>
                    ) : null}
                  </td>
                  <td>
                    <select value={w.status} onChange={(e) => setStatus(w.id, e.target.value)} disabled={!can('workspace.block') && !can('workspace.update')}>
                      {SPACE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="admin-login__submit" onClick={() => openDetail(w)}>
                      View
                    </button>{' '}
                    {canEdit ? (
                      <button type="button" className="admin-login__submit" onClick={() => openEdit(w)}>
                        Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} limit={30} onPage={list.reload} />

      {detail ? (
        <article className="dash-card" style={{ marginTop: 16 }}>
          <div className="admin-panel__head">
            <h3 style={{ margin: 0 }}>
              {detail.code} · {detail.name}
            </h3>
            <button type="button" className="admin-login__submit" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <p>
            Availability: <strong>{detail.availabilityStatus}</strong> · Centre {detail.branch?.name || '—'} · {detail.unitType}
          </p>
          <p>
            Rent ₹{detail.monthlyRent ?? detail.price} · Deposit ₹{detail.securityDeposit ?? '—'} · Commitment ₹{detail.commitmentFee ?? '—'}
          </p>
          {detail.occupiedByContract ? (
            <p>
              Active contract: {detail.occupiedByContract.contractId} · {detail.occupiedByContract.company} · ends{' '}
              {detail.occupiedByContract.endDate ? String(detail.occupiedByContract.endDate).slice(0, 10) : '—'}
            </p>
          ) : (
            <p className="admin-login__hint">No active long-term contract on this space.</p>
          )}
          <RelatedTable
            title="Recent bookings"
            rows={detail.recentBookings || []}
            columns={[
              { key: 'bookingNumber', label: 'Booking' },
              { key: 'status', label: 'Status' },
              { key: 'startsAt', label: 'Start', render: (r) => (r.startsAt ? String(r.startsAt).slice(0, 16).replace('T', ' ') : '—') },
            ]}
          />
          <RelatedTable
            title="Contracts"
            rows={detail.contracts || []}
            columns={[
              { key: 'contractId', label: 'Contract' },
              { key: 'status', label: 'Status' },
              { key: 'company', label: 'Company' },
            ]}
          />
        </article>
      ) : null}
    </Panel>
  )
}

export function RoomsPage() {
  const { can } = useAuth()
  const list = useList((p) => conferenceApi.list({ ...p, limit: 30 }))
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const canEdit = can('conference.create') || can('conference.update')

  useEffect(() => {
    workspaceApi.branches({ limit: 50 }).then((r) => setBranches(r.data.data.items || r.data.data.branches || [])).catch(() => {})
  }, [])

  const blank = () => ({
    code: '',
    name: '',
    number: '',
    branchId: '',
    capacity: 8,
    hourlyPrice: 999,
    minDurationMinutes: 60,
    maxDurationMinutes: 120,
    description: '',
    status: 'AVAILABLE',
    amenitiesText: 'Projector\nWhiteboard\nVideo Conferencing',
  })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = {
        code: form.code,
        name: form.name,
        number: form.number || undefined,
        branchId: form.branchId || undefined,
        capacity: Number(form.capacity),
        hourlyPrice: Number(form.hourlyPrice),
        minDurationMinutes: Number(form.minDurationMinutes),
        maxDurationMinutes: Number(form.maxDurationMinutes),
        description: form.description || undefined,
        status: form.status,
        amenities: form.amenitiesText
          ? form.amenitiesText.split('\n').map((t) => t.trim()).filter(Boolean)
          : [],
      }
      if (form.id) await conferenceApi.update(form.id, body)
      else await conferenceApi.create(body)
      setMsg(form.id ? 'Room updated' : 'Room created')
      setForm(null)
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const deactivate = async (row) => {
    if (!window.confirm(`Deactivate ${row.name}?`)) return
    try {
      await conferenceApi.remove(row.id)
      setMsg('Room deactivated')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title="Conference rooms (S1, S2…)"
      actions={
        canEdit ? (
          <button type="button" className="admin-login__submit" onClick={() => setForm(blank())}>
            Add room
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={msg} />
      <p className="admin-login__hint">
        Rooms appear as rows in Book conference (30-min slots, 1–2 hours). Use codes like S1, S2.
      </p>
      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 16 }}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={!!form.id} />
            </label>
            <label className="admin-field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>Room number</span>
              <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Centre</span>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Capacity</span>
              <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Hourly price (₹)</span>
              <input type="number" min="0" value={form.hourlyPrice} onChange={(e) => setForm({ ...form, hourlyPrice: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Min duration (min)</span>
              <input type="number" min="15" value={form.minDurationMinutes} onChange={(e) => setForm({ ...form, minDurationMinutes: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Max duration (min)</span>
              <input type="number" min="30" value={form.maxDurationMinutes} onChange={(e) => setForm({ ...form, maxDurationMinutes: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {SPACE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span>Description</span>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span>Amenities (one per line)</span>
              <textarea rows={4} value={form.amenitiesText} onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })} />
            </label>
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="submit" className="admin-login__submit">
              Save
            </button>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
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
              <th>Centre</th>
              <th>Capacity</th>
              <th>Hourly</th>
              <th>Duration</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>{r.name}</td>
                <td>{r.branch?.name || '—'}</td>
                <td>{r.capacity}</td>
                <td>₹{r.hourlyPrice}</td>
                <td>
                  {r.minDurationMinutes}–{r.maxDurationMinutes}m
                </td>
                <td>{r.status}</td>
                <td>
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            number: r.number || '',
                            branchId: r.branchId || '',
                            capacity: r.capacity,
                            hourlyPrice: r.hourlyPrice,
                            minDurationMinutes: r.minDurationMinutes,
                            maxDurationMinutes: r.maxDurationMinutes,
                            description: r.description || '',
                            status: r.status,
                            amenitiesText: (r.amenities || []).map((a) => a.name).join('\n'),
                          })
                        }
                      >
                        Edit
                      </button>{' '}
                      {can('conference.delete') ? (
                        <button type="button" onClick={() => deactivate(r)}>
                          Deactivate
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />
    </Panel>
  )
}

export { PackagesPage, CatalogSettingsPanels } from './ProductCatalogUI'
export { ConferenceBookingPage } from './ConferenceBooking'

export function VirtualOfficePage() {
  const { can } = useAuth()
  const list = useList((p) => virtualOfficeApi.list(p))
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const canEdit = can('membership.create') || can('membership.update') || can('products.create')

  const blank = () => ({
    companyName: '',
    customerName: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    voDeskNumber: '',
    aggregatorName: '',
    solutionType: 'Virtual Office',
    senateLocation: '',
    months: 12,
    amount: '',
    panNumber: '',
    paymentStatus: 'PENDING',
    voStatus: 'ACTIVE',
    tnGstin: '',
    gstinLegalName: '',
    gstinTradeName: '',
    agreementStartDate: '',
    agreementEndDate: '',
  })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (form.id) await virtualOfficeApi.update(form.id, form)
      else await virtualOfficeApi.create(form)
      setMsg(form.id ? 'VO updated' : 'VO created')
      setForm(null)
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const openDetail = async (row) => {
    try {
      const res = await virtualOfficeApi.get(row.id)
      setDetail(res.data.data)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const renew = async (row) => {
    if (!window.confirm(`Renew ${row.voNumber}?`)) return
    try {
      await virtualOfficeApi.renew(row.id, { months: row.months || 12 })
      setMsg('Renewal created')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title="Virtual Office"
      actions={
        canEdit ? (
          <button type="button" className="admin-login__submit" onClick={() => setForm(blank())}>
            Add VO member
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={msg} />
      <div className="admin-top__right" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="admin-field input"
          style={{ minWidth: 220 }}
          placeholder="Search company, PAN, GSTIN, desk…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>

      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 16 }}>
          <div className="admin-grid-2">
            {Object.keys(form)
              .filter((k) => k !== 'id')
              .map((k) => (
                <label className="admin-field" key={k}>
                  <span>{k}</span>
                  <input
                    type={k.includes('Date') ? 'date' : 'text'}
                    value={form[k] ?? ''}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              ))}
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit">
              Save
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>VO ID</th>
              <th>Company</th>
              <th>Customer</th>
              <th>Location</th>
              <th>Desk</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((r) => (
              <tr key={r.id}>
                <td>{r.voNumber}</td>
                <td>{r.companyName || '—'}</td>
                <td>{r.customerName || '—'}</td>
                <td>{r.senateLocation || '—'}</td>
                <td>{r.voDeskNumber || '—'}</td>
                <td>{r.amount != null ? `₹${r.amount}` : '—'}</td>
                <td>{r.paymentStatus || '—'}</td>
                <td>
                  <span className="admin-chip">{r.voStatus}</span>
                </td>
                <td>
                  <button type="button" className="admin-login__submit" onClick={() => openDetail(r)}>
                    View
                  </button>{' '}
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        className="admin-login__submit"
                        onClick={() =>
                          setForm({
                            id: r.id,
                            companyName: r.companyName || '',
                            customerName: r.customerName || '',
                            year: r.year || '',
                            month: r.month || '',
                            voDeskNumber: r.voDeskNumber || '',
                            aggregatorName: r.aggregatorName || '',
                            solutionType: r.solutionType || '',
                            senateLocation: r.senateLocation || '',
                            months: r.months || '',
                            amount: r.amount ?? '',
                            panNumber: r.panNumber || '',
                            paymentStatus: r.paymentStatus || '',
                            voStatus: r.voStatus || 'ACTIVE',
                            tnGstin: r.tnGstin || '',
                            gstinLegalName: r.gstinLegalName || '',
                            gstinTradeName: r.gstinTradeName || '',
                            agreementStartDate: r.agreementStartDate ? String(r.agreementStartDate).slice(0, 10) : '',
                            agreementEndDate: r.agreementEndDate ? String(r.agreementEndDate).slice(0, 10) : '',
                          })
                        }
                      >
                        Edit
                      </button>{' '}
                      <button type="button" className="admin-login__submit" onClick={() => renew(r)}>
                        Renew
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />

      {detail ? (
        <article className="dash-card" style={{ marginTop: 16 }}>
          <div className="admin-panel__head">
            <h3 style={{ margin: 0 }}>
              {detail.record?.voNumber} · {detail.record?.companyName}
            </h3>
            <button type="button" className="admin-login__submit" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <div className="admin-grid-2">
            <p>
              <strong>Customer:</strong> {detail.record?.customerName || '—'}
            </p>
            <p>
              <strong>PAN:</strong> {detail.record?.panNumber || '—'}
            </p>
            <p>
              <strong>TN GSTIN:</strong> {detail.record?.tnGstin || '—'}
            </p>
            <p>
              <strong>Agreement:</strong>{' '}
              {detail.record?.agreementStartDate ? String(detail.record.agreementStartDate).slice(0, 10) : '—'} →{' '}
              {detail.record?.agreementEndDate ? String(detail.record.agreementEndDate).slice(0, 10) : '—'}
            </p>
            <p>
              <strong>GST Legal:</strong> {detail.record?.gstinLegalName || '—'}
            </p>
            <p>
              <strong>Member:</strong> {detail.record?.user?.fullName || '—'}
            </p>
          </div>
          <RelatedTable
            title="Linked contracts"
            rows={detail.contracts || []}
            columns={[
              { key: 'contractId', label: 'Contract' },
              { key: 'status', label: 'Status' },
            ]}
          />
          <RelatedTable
            title="Payments"
            rows={detail.payments || []}
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'amount', label: 'Amount' },
              { key: 'status', label: 'Status' },
            ]}
          />
        </article>
      ) : null}
    </Panel>
  )
}

const CONTRACT_STATUSES = [
  'DRAFT',
  'SENT_TO_MEMBER',
  'MEMBER_DOWNLOADED',
  'MEMBER_UPLOADED',
  'STAFF_REVIEW',
  'STAFF_SIGNED',
  'CONFIRMED',
  'REJECTED',
  'EXPIRED',
  'TERMINATED',
]

export function ContractsPage({ kindFilter = '', title }) {
  const { can, role } = useAuth()
  const [status, setStatus] = useState('')
  const list = useList(
    (p) => contractApi.list({ ...p, status: status || undefined, kind: kindFilter || undefined }),
    [status, kindFilter],
  )
  const [form, setForm] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [signedFile, setSignedFile] = useState(null)
  const isMember = role === 'MEMBER'
  const canEdit = !isMember && (can('contracts.create') || can('contracts.update') || can('members.contract.request'))

  useEffect(() => {
    if (isMember) return
    contractApi.expiring({ days: 45 }).then((r) => setExpiring(r.data.data.items || [])).catch(() => {})
  }, [isMember])

  const blank = () => ({
    kind: kindFilter || 'PHYSICAL_OFFICE',
    company: '',
    productName: '',
    location: '',
    spaceLabel: '',
    startDate: '',
    endDate: '',
    tenureMonths: 12,
    rent: '',
    securityDeposit: '',
    commitmentFee: '',
    documentUrl: '',
    memberUserId: '',
    customerId: '',
  })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = {
        ...form,
        rent: form.rent === '' ? null : Number(form.rent),
        securityDeposit: form.securityDeposit === '' ? null : Number(form.securityDeposit),
        commitmentFee: form.commitmentFee === '' ? null : Number(form.commitmentFee),
        tenureMonths: Number(form.tenureMonths || 12),
      }
      if (form.id) await contractApi.update(form.id, body)
      else await contractApi.create(body)
      setMsg(form.id ? 'Booking updated' : 'Booking created')
      setForm(null)
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const transition = async (row, next) => {
    const remarks = window.prompt(`Remarks for ${next}?`, '')
    if (remarks == null) return
    try {
      await contractApi.transition(row.id, { status: next, remarks, documentUrl: row.documentUrl })
      setMsg(`Moved to ${next}`)
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const renew = async (row) => {
    if (!window.confirm(`Create renewal draft from ${row.contractId}?`)) return
    try {
      await contractApi.renew(row.id, { tenureMonths: row.tenureMonths || 12 })
      setMsg('Renewal draft created')
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const uploadSigned = async (row, roleName) => {
    if (!signedFile) {
      setError('Choose a signed PDF first')
      return
    }
    try {
      await contractApi.uploadSigned(row.id, signedFile, roleName)
      setSignedFile(null)
      setMsg('Signed document uploaded')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const pageTitle = title || (isMember ? 'My bookings' : 'Bookings')
  const isPhysical = kindFilter === 'PHYSICAL_OFFICE'

  return (
    <Panel
      title={pageTitle}
      actions={
        canEdit ? (
          <button type="button" className="admin-login__submit" onClick={() => setForm(blank())}>
            New booking
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={msg} />
      {!isMember && expiring.length ? (
        <p style={{ marginBottom: 12 }}>
          <strong>{expiring.length}</strong> booking(s) expiring within 45 days:{' '}
          {expiring
            .slice(0, 5)
            .map((c) => `${c.contractId} (${c.endDate ? new Date(c.endDate).toLocaleDateString('en-IN') : '—'})`)
            .join(', ')}
        </p>
      ) : null}
      <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {CONTRACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          placeholder="Search booking / company…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
        <input type="file" accept=".pdf,image/*" onChange={(e) => setSignedFile(e.target.files?.[0] || null)} />
      </div>

      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 16 }}>
          <div className="admin-grid-2">
            {[
              ...(kindFilter
                ? []
                : [
                    [
                      'kind',
                      'select',
                      ['PHYSICAL_OFFICE', 'VIRTUAL_OFFICE', 'CONFERENCE', 'RENEWAL', 'ADDENDUM', 'MULTI_LOCATION'],
                    ],
                  ]),
              ['company', 'text'],
              ['productName', 'text'],
              ['location', 'text'],
              ['spaceLabel', 'text'],
              ['startDate', 'date'],
              ['endDate', 'date'],
              ['tenureMonths', 'number'],
              ['rent', 'number'],
              ['securityDeposit', 'number'],
              ['commitmentFee', 'number'],
              ['documentUrl', 'text'],
              ['memberUserId', 'text'],
              ['customerId', 'text'],
            ].map(([k, type, opts]) => (
              <label className="admin-field" key={k}>
                <span>
                  {k === 'kind'
                    ? 'Type'
                    : k === 'productName'
                      ? 'Product'
                      : k === 'securityDeposit'
                        ? 'Deposit'
                        : k === 'commitmentFee'
                          ? 'Commitment fee'
                          : k}
                </span>
                {type === 'select' ? (
                  <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={form[k] ?? ''}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="submit" className="admin-login__submit">
              Save
            </button>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Company</th>
              {isPhysical ? <th>Category</th> : <th>Type</th>}
              <th>Product</th>
              <th>Period</th>
              <th>Rent</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((c) => (
              <tr key={c.id}>
                <td>{c.contractId}</td>
                <td>{c.company || c.customer?.name || '—'}</td>
                <td>
                  {isPhysical
                    ? c.categoryName || c.workspace?.category?.name || '—'
                    : c.kind}
                </td>
                <td>{c.productName || '—'}</td>
                <td>
                  {c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN') : '—'} →{' '}
                  {c.endDate ? new Date(c.endDate).toLocaleDateString('en-IN') : '—'}
                </td>
                <td>{c.rent != null ? `₹${c.rent}` : '—'}</td>
                <td>
                  {c.status}
                  {c.status === 'CONFIRMED' ? ' · Verified' : ''}
                </td>
                <td>
                  {canEdit && c.status === 'DRAFT' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const pack = await contractApi.generatePack(c.id)
                          const url = pack.data.data.packUrl || pack.data.data.contract?.documentUrl
                          await contractApi.transition(c.id, { status: 'SENT_TO_MEMBER', documentUrl: url })
                          setMsg('Pack generated and sent')
                          list.reload(list.page)
                        } catch (err) {
                          setError(apiError(err))
                        }
                      }}
                    >
                      Pack & send
                    </button>
                  ) : null}
                  {c.documentUrl ? (
                    <a href={c.documentUrl} target="_blank" rel="noreferrer">
                      Pack
                    </a>
                  ) : null}
                  {isMember && c.status === 'SENT_TO_MEMBER' ? (
                    <button type="button" onClick={() => transition(c, 'MEMBER_DOWNLOADED')}>
                      Downloaded
                    </button>
                  ) : null}
                  {isMember && ['SENT_TO_MEMBER', 'MEMBER_DOWNLOADED'].includes(c.status) ? (
                    <button type="button" onClick={() => uploadSigned(c, 'member')}>
                      Upload signed
                    </button>
                  ) : null}
                  {canEdit && c.status === 'MEMBER_UPLOADED' ? (
                    <button type="button" onClick={() => transition(c, 'STAFF_REVIEW')}>
                      Review
                    </button>
                  ) : null}
                  {canEdit && ['STAFF_REVIEW', 'MEMBER_UPLOADED'].includes(c.status) ? (
                    <button type="button" onClick={() => uploadSigned(c, 'staff')}>
                      Staff sign upload
                    </button>
                  ) : null}
                  {canEdit && c.status === 'STAFF_SIGNED' ? (
                    <button type="button" onClick={() => transition(c, 'CONFIRMED')}>
                      Confirm verified
                    </button>
                  ) : null}
                  {canEdit && ['CONFIRMED', 'EXPIRED'].includes(c.status) ? (
                    <button type="button" onClick={() => renew(c)}>
                      Renew
                    </button>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: c.id,
                          kind: c.kind,
                          company: c.company || '',
                          productName: c.productName || '',
                          location: c.location || '',
                          spaceLabel: c.spaceLabel || '',
                          startDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
                          endDate: c.endDate ? String(c.endDate).slice(0, 10) : '',
                          tenureMonths: c.tenureMonths || 12,
                          rent: c.rent ?? '',
                          securityDeposit: c.securityDeposit ?? '',
                          commitmentFee: c.commitmentFee ?? '',
                          documentUrl: c.documentUrl || '',
                          memberUserId: c.memberUserId || '',
                          customerId: c.customerId || '',
                        })
                      }
                    >
                      Edit
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />
    </Panel>
  )
}

export function PaymentsPage() {
  const { can } = useAuth()
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const list = useList((p) => paymentApi.list({ ...p, status: status || undefined, type: type || undefined }), [status, type])
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const canRecord = can('payment.create') || can('payment.update') || can('accounts.create')

  useEffect(() => {
    userApi.members({ limit: 100 }).then((r) => setMembers(r.data.data.items || [])).catch(() => {})
  }, [])

  const blank = () => ({
    userId: '',
    type: 'MONTHLY_RENT',
    amount: '',
    method: 'UPI',
    referenceNumber: '',
    notes: '',
    markAsPaid: true,
  })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await paymentApi.record({
        ...form,
        amount: Number(form.amount),
        markAsPaid: form.markAsPaid !== false,
      })
      setMsg('Payment recorded')
      setForm(null)
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const refund = async (row) => {
    const reason = window.prompt('Refund reason?', 'Customer request')
    if (reason == null) return
    try {
      await paymentApi.refund(row.id, { reason })
      setMsg('Refund processed')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel
      title="Payments"
      actions={
        canRecord ? (
          <button type="button" className="admin-login__submit" onClick={() => setForm(blank())}>
            Record payment
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={msg} />
      <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {[
            'MEMBERSHIP',
            'WORKSPACE_BOOKING',
            'CONFERENCE_ROOM_BOOKING',
            'SECURITY_DEPOSIT',
            'COMMITMENT_FEE',
            'MONTHLY_RENT',
            'VIRTUAL_OFFICE_FEE',
            'RENEWAL',
            'ADDITIONAL_SERVICE',
            'OTHER',
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          style={{ minWidth: 180 }}
          placeholder="Search…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>

      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 16 }}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Member</span>
              <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} · {m.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {[
                  'MONTHLY_RENT',
                  'SECURITY_DEPOSIT',
                  'COMMITMENT_FEE',
                  'MEMBERSHIP',
                  'VIRTUAL_OFFICE_FEE',
                  'RENEWAL',
                  'ADDITIONAL_SERVICE',
                  'OTHER',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Amount (₹)</span>
              <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>Method</span>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'GATEWAY'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Reference / UTR</span>
              <input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Notes</span>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <div className="admin-top__right" style={{ gap: 8 }}>
            <button type="submit" className="admin-login__submit">
              Save payment
            </button>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Member</th>
              <th>Type</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Ref</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleString('en-IN')}</td>
                <td>{p.user?.fullName || '—'}</td>
                <td>{p.type}</td>
                <td>{p.method || p.gateway || '—'}</td>
                <td>₹{p.amount}</td>
                <td>{p.status}</td>
                <td>{p.referenceNumber || p.gatewayOrderId?.slice(-8) || '—'}</td>
                <td>
                  {p.status === 'PAID' && can('payment.refund') ? (
                    <button type="button" onClick={() => refund(p)}>
                      Refund
                    </button>
                  ) : null}
                  {p.status === 'PENDING' && p.gateway === 'sandbox' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await paymentApi.sandboxConfirm(p.id)
                          setMsg('Confirmed')
                          list.reload(list.page)
                        } catch (err) {
                          setError(apiError(err))
                        }
                      }}
                    >
                      Sandbox confirm
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />
    </Panel>
  )
}

export function InvoicesPage() {
  const list = useList((p) => invoiceApi.list(p))
  return (
    <Panel title="Invoices">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((p) => (
              <tr key={p.id}>
                <td>{p.invoiceNumber}</td>
                <td>{p.customerName}</td>
                <td>₹{p.total}</td>
                <td>{p.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function MaintenancePage({ staff }) {
  const { can, role } = useAuth()
  const [status, setStatus] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const list = useList(
    (p) => maintenanceApi.list({ ...p, status: status || undefined, priority: priorityFilter || undefined }),
    [status, priorityFilter],
  )
  const [cats, setCats] = useState([])
  const [staffList, setStaffList] = useState([])
  const [contracts, setContracts] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'MEDIUM',
    productName: '',
    seatLabel: '',
    serviceType: '',
    contractId: '',
  })
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const canManage = !staff && (can('maintenance.assign') || can('maintenance.update') || role === 'SUPER_ADMIN' || role === 'ADMIN')
  const canComplete = canManage || staff || can('maintenance.update') || can('maintenance.close')
  const isMember = role === 'MEMBER'

  useEffect(() => {
    maintenanceApi.categories().then((r) => setCats(r.data.data.categories || [])).catch(() => {})
    if (canManage || staff) {
      // Prefer HRM staff profiles (assignment needs staffProfile.id)
      hrmApi
        .listStaff({ limit: 100 })
        .then((r) => setStaffList(r.data.data.items || []))
        .catch(() => {
          userApi.staff({ limit: 50 }).then((r) => setStaffList(r.data.data.items || [])).catch(() => {})
        })
    }
    if (isMember || canManage) {
      contractApi
        .list({ limit: 50 })
        .then((r) => setContracts(r.data.data.items || []))
        .catch(() => setContracts([]))
    }
  }, [canManage, isMember, staff])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v != null && v !== '') fd.append(k, v)
      })
      const cat = cats.find((c) => c.id === form.categoryId)
      if (!form.serviceType && cat) fd.set('serviceType', cat.name)
      for (const f of files) fd.append('files', f)
      await maintenanceApi.create(fd)
      setMsg('Request submitted — staff will be assigned and will complete it')
      setFiles([])
      setForm({
        title: '',
        description: '',
        categoryId: '',
        priority: 'MEDIUM',
        productName: '',
        seatLabel: '',
        serviceType: '',
        contractId: '',
      })
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const setTicketStatus = async (row, next) => {
    try {
      await maintenanceApi.status(row.id, { status: next })
      setMsg(`Ticket ${row.ticketNumber} → ${next}`)
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const assignSelect = async (row, staffId) => {
    if (!staffId) return
    try {
      await maintenanceApi.assign(row.id, { staffId })
      setMsg('Assigned')
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const onContractPick = (contractId) => {
    const c = contracts.find((x) => x.id === contractId)
    setForm((f) => ({
      ...f,
      contractId,
      productName: c?.productName || f.productName,
      seatLabel: c?.spaceLabel || c?.location || f.seatLabel,
    }))
  }

  return (
    <>
      {!staff ? (
        <Panel title="New service & maintenance request">
          <Banner error={error} success={msg} />
          <form className="admin-login__form" onSubmit={create}>
            <div className="admin-grid-2">
              <label className="admin-field">
                <span>Booking / contract</span>
                <select value={form.contractId} onChange={(e) => onContractPick(e.target.value)}>
                  <option value="">Select (optional)</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.contractId || c.id.slice(-6)) + ` · ${c.productName || c.kind || ''}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Product</span>
                <input
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  required={isMember}
                  placeholder="Which product"
                />
              </label>
              <label className="admin-field">
                <span>Seat / chamber / space</span>
                <input
                  value={form.seatLabel}
                  onChange={(e) => setForm({ ...form, seatLabel: e.target.value })}
                  required={isMember}
                  placeholder="Which seat"
                />
              </label>
              <label className="admin-field">
                <span>Service</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => {
                    const cat = cats.find((c) => c.id === e.target.value)
                    setForm({
                      ...form,
                      categoryId: e.target.value,
                      serviceType: cat?.name || form.serviceType,
                    })
                  }}
                  required
                >
                  <option value="">Select service</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Priority</span>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <span>Title</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </label>
              <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <span>Details</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </label>
              <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <span>Attach photos / files (optional)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => setFiles([...e.target.files])}
                />
              </label>
            </div>
            <button className="admin-login__submit" type="submit">
              Submit request
            </button>
          </form>
        </Panel>
      ) : null}
      <Panel title={staff ? 'My assigned tasks' : 'Service & maintenance'}>
        <Banner error={list.error || (!staff ? '' : error)} success={staff ? msg : ''} />
        <p className="admin-login__hint" style={{ marginBottom: 12 }}>
          {isMember
            ? 'Submit a request below. Staff will be assigned and will mark it complete when done.'
            : staff
              ? 'Tickets assigned to you. Start work, then mark Complete when finished.'
              : 'Assign an owner for each request. The assignee is responsible until Complete / Closed.'}
        </p>
        <div className="admin-top__right" style={{ gap: 8, marginBottom: 12 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All priorities</option>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Title</th>
                <th>Product</th>
                <th>Seat</th>
                <th>Service</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Responsible</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.items.map((m) => (
                <tr key={m.id}>
                  <td>{m.ticketNumber}</td>
                  <td>{m.title}</td>
                  <td>{m.productName || '—'}</td>
                  <td>{m.seatLabel || '—'}</td>
                  <td>{m.serviceType || m.category?.name || '—'}</td>
                  <td>{m.priority}</td>
                  <td>{m.status}</td>
                  <td>{m.assignments?.[0]?.staff?.user?.fullName || m.assignments?.[0]?.staff?.employeeId || 'Unassigned'}</td>
                  <td className="enq-row-actions">
                    {canManage && staffList.length && !['RESOLVED', 'CLOSED'].includes(m.status) ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          assignSelect(m, e.target.value)
                          e.target.value = ''
                        }}
                      >
                        <option value="">{m.assignments?.length ? 'Reassign…' : 'Assign…'}</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.user?.fullName || s.employeeId || s.id}
                            {s.department ? ` · ${s.department}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {canComplete && m.status === 'ASSIGNED' ? (
                      <button type="button" className="enq-ghost" onClick={() => setTicketStatus(m, 'IN_PROGRESS')}>
                        Start
                      </button>
                    ) : null}
                    {canComplete && ['ASSIGNED', 'IN_PROGRESS'].includes(m.status) ? (
                      <button type="button" className="admin-login__submit" onClick={() => setTicketStatus(m, 'RESOLVED')}>
                        Complete
                      </button>
                    ) : null}
                    {canManage && m.status === 'RESOLVED' ? (
                      <button type="button" className="enq-ghost" onClick={() => setTicketStatus(m, 'CLOSED')}>
                        Close
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!list.items.length ? (
                <tr>
                  <td colSpan={9}>{isMember ? 'No requests yet.' : 'No tickets match this filter.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pager page={list.page} total={list.total} onPage={list.reload} />
      </Panel>
    </>
  )
}

export function ReportsPage() {
  const [type, setType] = useState('members')
  const [rows, setRows] = useState([])
  const [sum, setSum] = useState(null)
  const [summary, setSummary] = useState(null)
  const [centerFilter, setCenterFilter] = useState('')
  const [error, setError] = useState('')
  const [memberDetail, setMemberDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const run = async () => {
    try {
      const params = {
        range: 'this_month',
        limit: 100,
        ...(centerFilter && (type === 'occupancy' || type === 'products')
          ? { center: centerFilter.trim() }
          : {}),
      }
      const { data } = await reportApi.run(type, params)
      setRows(data.data.items || [])
      setSum(data.data.sum ?? null)
      setSummary(data.data.summary || null)
    } catch (err) {
      setError(apiError(err))
    }
  }
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, centerFilter])

  const exportCsv = async () => {
    try {
      const params = {
        range: 'this_month',
        limit: 5000,
        ...(centerFilter && (type === 'occupancy' || type === 'products')
          ? { center: centerFilter.trim() }
          : {}),
      }
      const res = await reportApi.export(type, params)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}${centerFilter ? `-${centerFilter}` : ''}-report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const openMember = async (row) => {
    if (!row?.userId && !row?.memberId) return
    setDetailLoading(true)
    setError('')
    try {
      const id = row.userId || row.memberId
      const res = await userApi.member360(id)
      setMemberDetail(res.data.data)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const memberCols = [
    'memberId',
    'fullName',
    'companyName',
    'whatsappGroup',
    'year',
    'dateOfLogin',
    'addendum',
    'contactPerson',
    'contactNo',
    'emailIds',
    'allocatedChamber',
    'numberOfSeats',
    'commitmentFee',
    'securityDeposit',
    'modeOfPayment',
    'signageStatus',
    'invoice',
    'agreementStatus',
    'noticePeriod',
    'tenureMonths',
    'status',
    'begin',
    'expiry',
    'alert',
    'exitDate',
    'aadhaarNumber',
    'panCard',
    'companyProof',
    'gstNumber',
    'regDocuments',
    'regAddress',
    'remarks',
  ]

  const d = memberDetail
  const u = d?.member
  const p = u?.memberProfile || {}

  return (
    <Panel
      title="Reports"
      actions={
        <div className="admin-top__right" style={{ gap: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              'members',
              'occupancy',
              'products',
              'staff_hrm',
              'users',
              'kyc',
              'memberships',
              'bookings',
              'cancellations',
              'payments',
              'revenue',
              'rent',
              'contracts',
              'enquiries',
              'maintenance',
            ].map((t) => (
              <option key={t} value={t}>
                {t === 'occupancy'
                  ? 'Occupancy · vacant / available'
                  : t === 'products'
                    ? 'Products · seats booked / vacant'
                    : t === 'staff_hrm'
                      ? 'HRM · staff salary & leave'
                      : t}
              </option>
            ))}
          </select>
          {type === 'occupancy' || type === 'products' ? (
            <input
              type="text"
              placeholder="Centre e.g. S1"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              style={{ width: 130 }}
            />
          ) : null}
          <button type="button" className="admin-login__submit" onClick={exportCsv}>
            Export Excel / CSV
          </button>
        </div>
      }
    >
      <Banner error={error} />
      <p>
        {rows.length} rows
        {type !== 'members' && type !== 'occupancy' && type !== 'products' && type !== 'staff_hrm' ? ' (this month)' : ''}
        {sum != null ? ` · total ₹${sum}` : ''}
        {type === 'members' ? ' · click a row for full member profile' : ''}
        {type === 'occupancy' || type === 'products'
          ? ` · seats booked ${summary?.seatsBooked ?? 0} / vacant ${summary?.seatsVacant ?? 0} (total ${summary?.seatsTotal ?? 0})`
          : ''}
        {type === 'staff_hrm' ? ' · staff salary structure & pending leave' : ''}
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {type === 'members' ? (
                memberCols.slice(0, 8).map((c) => <th key={c}>{c}</th>)
              ) : type === 'occupancy' || type === 'products' ? (
                <>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Centre</th>
                  <th>Status</th>
                  <th>Seats</th>
                  <th>Booked</th>
                  <th>Vacant</th>
                  <th>Current client</th>
                </>
              ) : type === 'staff_hrm' ? (
                <>
                  <th>Emp</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Dept</th>
                  <th>Gross</th>
                  <th>Pending leave</th>
                  <th>Payslip</th>
                </>
              ) : (
                <>
                  <th>ID</th>
                  <th>Summary</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {type === 'members'
              ? rows.map((r) => (
                  <tr
                    key={r.userId || r.memberId || r.emailIds}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openMember(r)}
                    title="View full member info"
                  >
                    {memberCols.slice(0, 8).map((c) => (
                      <td key={c}>
                        {r[c] == null
                          ? '—'
                          : typeof r[c] === 'object'
                            ? String(r[c]).slice(0, 10)
                            : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))
              : type === 'occupancy' || type === 'products'
                ? rows.map((r) => (
                    <tr key={`${r.kind}-${r.id}`}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.category || r.productCategory}</td>
                      <td>{r.centre}</td>
                      <td>{r.vacant === true ? 'VACANT' : r.vacant === false ? 'OCCUPIED' : r.status}</td>
                      <td>{r.seatsTotal ?? '—'}</td>
                      <td>{r.seatsBooked ?? '—'}</td>
                      <td>{r.seatsVacant ?? '—'}</td>
                      <td>{r.currentClient || '—'}</td>
                    </tr>
                  ))
                : type === 'staff_hrm'
                  ? rows.map((r) => (
                      <tr key={r.employeeId}>
                        <td>{r.employeeId}</td>
                        <td>{r.fullName}</td>
                        <td>{r.role}</td>
                        <td>{r.department || '—'}</td>
                        <td>{r.gross != null ? `₹${Number(r.gross).toLocaleString('en-IN')}` : '—'}</td>
                        <td>{r.pendingLeaves}</td>
                        <td>{r.latestPayslip}</td>
                      </tr>
                    ))
                  : rows.map((r) => (
                      <tr key={r.id || r.contractId || r.bookingNumber || r.ticketNumber}>
                        <td>{r.id}</td>
                        <td>{r.bookingNumber || r.invoiceNumber || r.email || r.title || r.companyName || r.status}</td>
                      </tr>
                    ))}
          </tbody>
        </table>
      </div>
      {type === 'members' ? (
        <p className="admin-login__hint" style={{ marginTop: 10 }}>
          Full column set (including GST, Aadhaar, PAN, seats, fees, agreement) is in CSV export. Click any row for
          360° member detail.
        </p>
      ) : null}

      {detailLoading ? <p className="admin-login__hint">Loading member…</p> : null}

      {d ? (
        <div className="enq-modal product-modal" role="dialog" aria-modal="true">
          <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={() => setMemberDetail(null)} />
          <div className="enq-modal__panel product-modal__panel" style={{ width: 'min(720px, 96vw)' }}>
            <header className="enq-modal__head">
              <div>
                <p className="enq-modal__eyebrow">Member report</p>
                <h3>
                  {u?.fullName || p.contactPerson || 'Member'} · {p.memberId || '—'}
                </h3>
              </div>
              <button type="button" className="enq-ghost" onClick={() => setMemberDetail(null)}>
                Close
              </button>
            </header>
            <div className="enq-modal__body">
              <div className="admin-grid-2">
                {[
                  ['Email', u?.email],
                  ['Mobile', u?.mobile],
                  ['Company', p.companyName || p.legalCompanyName],
                  ['KYC', p.kycStatus],
                  ['Membership', p.membershipStatus],
                  ['Chamber', p.allocatedChamber],
                  ['Seats', p.numberOfSeats],
                  ['Deposit', p.securityDeposit],
                  ['GST', p.gstNumber],
                  ['PAN', p.panNumber || p.companyPan],
                  ['Begin', p.beginDate ? String(p.beginDate).slice(0, 10) : null],
                  ['Expiry', p.expiryDate ? String(p.expiryDate).slice(0, 10) : null],
                  ['Address', p.registeredAddress || p.address],
                ].map(([label, val]) => (
                  <p key={label} style={{ margin: 0 }}>
                    <strong>{label}:</strong> {val == null || val === '' ? '—' : String(val)}
                  </p>
                ))}
              </div>
              {d.memberships?.length ? (
                <>
                  <h4>Memberships</h4>
                  <ul>
                    {d.memberships.slice(0, 8).map((m) => (
                      <li key={m.id}>
                        {m.plan?.name || m.planId} · {m.status}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {d.bookings?.length ? (
                <>
                  <h4>Bookings</h4>
                  <ul>
                    {d.bookings.slice(0, 8).map((b) => (
                      <li key={b.id}>
                        {b.bookingNumber} · {b.status} · {String(b.startAt).slice(0, 16)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {d.payments?.length ? (
                <>
                  <h4>Payments</h4>
                  <ul>
                    {d.payments.slice(0, 8).map((pay) => (
                      <li key={pay.id}>
                        ₹{pay.amount} · {pay.status} · {pay.type || ''}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {d.contracts?.length ? (
                <>
                  <h4>Contracts</h4>
                  <ul>
                    {d.contracts.slice(0, 8).map((c) => (
                      <li key={c.id}>
                        {c.contractNumber || c.id} · {c.status} · {c.kind || ''}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testTo, setTestTo] = useState('')
  const BOOKING_KEYS = [
    'BOOKING_HOURS_START',
    'BOOKING_HOURS_END',
    'BOOKING_BUFFER_MINUTES',
    'BOOKING_ADVANCE_DAYS',
    'BOOKING_SLOT_INTERVAL_MINUTES',
    'REQUIRE_KYC_FOR_BOOKING',
    'ONBOARDING_DEADLINE_HOURS',
  ]
  const MAIL_KEYS = ['SMTP_ENABLED', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_SECURE', 'CLIENT_MAIL_COPY_TO']
  const MAIL_LABELS = {
    SMTP_ENABLED: 'Enable outbound email',
    SMTP_HOST: 'SMTP host',
    SMTP_PORT: 'SMTP port',
    SMTP_USER: 'Mail ID / username',
    SMTP_PASSWORD: 'App password',
    SMTP_FROM: 'From name & email',
    SMTP_SECURE: 'Use SSL (port 465)',
    CLIENT_MAIL_COPY_TO: 'Client mail copy (BCC)',
  }

  const parseCopyEmailList = (raw) => {
    if (Array.isArray(raw)) return raw.map((e) => String(e || '').trim()).filter(Boolean)
    const text = String(raw || '').trim()
    if (!text) return ['senatescmo@gmail.com', 'senateprime@gmail.com']
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.map((e) => String(e || '').trim()).filter(Boolean)
    } catch {
      /* comma list */
    }
    return text.split(/[,;\n]+/).map((e) => e.trim()).filter(Boolean)
  }

  useEffect(() => {
    settingsApi
      .get()
      .then((r) => {
        const settings = { ...(r.data.data.settings || {}) }
        const defaults = {
          BOOKING_HOURS_START: '08:00',
          BOOKING_HOURS_END: '20:00',
          BOOKING_BUFFER_MINUTES: '15',
          BOOKING_ADVANCE_DAYS: '60',
          BOOKING_SLOT_INTERVAL_MINUTES: '30',
          REQUIRE_KYC_FOR_BOOKING: 'true',
          ONBOARDING_DEADLINE_HOURS: '72',
          SMTP_ENABLED: 'false',
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: '587',
          SMTP_USER: '',
          SMTP_PASSWORD: '',
          SMTP_FROM: 'Senate Space <noreply@senatespace.local>',
          SMTP_SECURE: 'false',
          CLIENT_MAIL_COPY_TO: 'senatescmo@gmail.com, senateprime@gmail.com',
        }
        for (const k of [...BOOKING_KEYS, ...MAIL_KEYS]) {
          if (settings[k] == null) settings[k] = defaults[k]
        }
        if (settings.CLIENT_MAIL_COPY_TO != null) {
          settings.CLIENT_MAIL_COPY_TO = parseCopyEmailList(settings.CLIENT_MAIL_COPY_TO).join(', ')
        }
        setRows(settings)
        setTestTo(user?.email || settings.SMTP_USER || '')
      })
      .catch((e) => setError(apiError(e)))
  }, [user?.email])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      const payload = { ...rows }
      delete payload.SMTP_PASSWORD_SET
      await settingsApi.update(payload)
      setMsg('Settings saved — mail config is live for new emails')
      if (rows.SMTP_PASSWORD && rows.SMTP_PASSWORD !== '********') {
        setRows((r) => ({ ...r, SMTP_PASSWORD: '********', SMTP_PASSWORD_SET: 'true' }))
      }
    } catch (err) {
      setError(apiError(err))
    }
  }

  const sendTest = async () => {
    setTesting(true)
    setError('')
    setMsg('')
    try {
      if (/gmail\.com/i.test(rows.SMTP_HOST || '') && String(rows.SMTP_PORT) === '1025') {
        setError('Gmail cannot use port 1025. Change to 587 (STARTTLS) or 465 (SSL), save, then retry.')
        return
      }
      // Save current form first so test uses latest values
      const payload = { ...rows }
      delete payload.SMTP_PASSWORD_SET
      await settingsApi.update(payload)
      const res = await settingsApi.testMail({ to: testTo })
      const result = res.data?.data?.result
      if (result && result.sent === false) {
        setError(result.error || result.reason || res.data.message || 'Email not sent')
        return
      }
      setMsg(res.data.message || `Test mail sent to ${testTo}`)
      if (rows.SMTP_PASSWORD && rows.SMTP_PASSWORD !== '********') {
        setRows((r) => ({ ...r, SMTP_PASSWORD: '********', SMTP_PASSWORD_SET: 'true' }))
      }
    } catch (err) {
      setError(apiError(err))
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <CatalogSettingsPanels />
      <Panel title="Settings">
      <Banner error={error} success={msg} />
      <form className="admin-login__form" onSubmit={save}>
        <h3 style={{ margin: '8px 0' }}>Mail / SMTP</h3>
        <p className="admin-login__hint" style={{ marginBottom: 12 }}>
          For Gmail use host <strong>smtp.gmail.com</strong>, port <strong>587</strong> (STARTTLS) or{' '}
          <strong>465</strong> (SSL), plus a Google <strong>App Password</strong>. Port 1025 is only for local
          MailHog — it will time out with Gmail. Leave app password as ******** to keep the saved one.
        </p>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_ENABLED}</span>
            <select
              value={String(rows.SMTP_ENABLED ?? 'false')}
              onChange={(e) => setRows({ ...rows, SMTP_ENABLED: e.target.value })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_SECURE}</span>
            <select
              value={String(rows.SMTP_SECURE ?? 'false')}
              onChange={(e) => {
                const secure = e.target.value
                setRows({
                  ...rows,
                  SMTP_SECURE: secure,
                  SMTP_PORT: secure === 'true' ? '465' : '587',
                })
              }}
            >
              <option value="false">STARTTLS (587)</option>
              <option value="true">SSL (465)</option>
            </select>
          </label>
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_HOST}</span>
            <input value={rows.SMTP_HOST ?? ''} onChange={(e) => setRows({ ...rows, SMTP_HOST: e.target.value })} placeholder="smtp.gmail.com" />
          </label>
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_PORT}</span>
            <input value={rows.SMTP_PORT ?? ''} onChange={(e) => setRows({ ...rows, SMTP_PORT: e.target.value })} placeholder="587" />
          </label>
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_USER}</span>
            <input
              type="email"
              value={rows.SMTP_USER ?? ''}
              onChange={(e) => setRows({ ...rows, SMTP_USER: e.target.value })}
              placeholder="your@gmail.com"
            />
          </label>
          <label className="admin-field">
            <span>{MAIL_LABELS.SMTP_PASSWORD}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={rows.SMTP_PASSWORD ?? ''}
              onChange={(e) => setRows({ ...rows, SMTP_PASSWORD: e.target.value })}
              placeholder={rows.SMTP_PASSWORD_SET === 'true' ? '******** (saved)' : 'App password'}
            />
          </label>
          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span>{MAIL_LABELS.SMTP_FROM}</span>
            <input
              value={rows.SMTP_FROM ?? ''}
              onChange={(e) => setRows({ ...rows, SMTP_FROM: e.target.value })}
              placeholder="Senate Space <your@gmail.com>"
            />
          </label>
          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span>{MAIL_LABELS.CLIENT_MAIL_COPY_TO}</span>
            <textarea
              rows={2}
              value={rows.CLIENT_MAIL_COPY_TO ?? ''}
              onChange={(e) => setRows({ ...rows, CLIENT_MAIL_COPY_TO: e.target.value })}
              placeholder="senatescmo@gmail.com, senateprime@gmail.com"
            />
            <span className="admin-login__hint" style={{ marginTop: 6, display: 'block' }}>
              Every email sent to a client is also BCC’d here. Add or remove addresses (comma-separated). Admins can
              change this list anytime.
            </span>
          </label>
        </div>
        <div className="admin-top__right" style={{ gap: 8, margin: '12px 0 20px', flexWrap: 'wrap' }}>
          <input
            className="admin-field"
            style={{ minWidth: 220, minHeight: 44, padding: '0.65rem 0.9rem' }}
            placeholder="Test to email…"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <button type="button" className="enq-ghost" disabled={testing || !testTo} onClick={sendTest}>
            {testing ? 'Sending…' : 'Send test mail'}
          </button>
        </div>

        <h3 style={{ margin: '8px 0' }}>Booking & onboarding</h3>
        <div className="admin-grid-2">
          {BOOKING_KEYS.map((k) => (
            <label className="admin-field" key={k}>
              <span>{k.replaceAll('_', ' ')}</span>
              <input value={rows[k] ?? ''} onChange={(e) => setRows({ ...rows, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <h3 style={{ margin: '16px 0 8px' }}>Other settings</h3>
        {Object.entries(rows)
          .filter(([k]) => !BOOKING_KEYS.includes(k) && !MAIL_KEYS.includes(k) && k !== 'SMTP_PASSWORD_SET')
          .map(([k, v]) => (
            <label className="admin-field" key={k}>
              <span>{k}</span>
              <input value={v} onChange={(e) => setRows({ ...rows, [k]: e.target.value })} />
            </label>
          ))}
        <button className="admin-login__submit" type="submit">
          Save settings
        </button>
      </form>
    </Panel>
    </>
  )
}

export function AuditPage() {
  const list = useList((p) => auditApi.list(p))
  return (
    <Panel title="Audit log">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString('en-IN')}</td>
                <td>{a.action}</td>
                <td>
                  {a.entity} {a.entityId || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

const ENQUIRY_TYPES = [
  { value: 'COWORKING_DESK', label: 'Coworking Desk' },
  { value: 'PRIVATE_CABIN', label: 'Private Cabin' },
  { value: 'HOT_DESK', label: 'Hot Desk' },
  { value: 'VIRTUAL_OFFICE', label: 'Virtual Office' },
  { value: 'CONFERENCE', label: 'Conference Room / Meeting Room' },
  { value: 'OTHER_SERVICE', label: 'Others' },
]

/** Map Product categories (Settings) → Inquiry productType enum used by convert/onboarding. */
function categoryToProductType(cat) {
  const n = `${cat?.name || ''} ${cat?.code || ''}`.toLowerCase()
  if (n.includes('virtual')) return 'VIRTUAL_OFFICE'
  if (n.includes('conference') || n.includes('meeting')) return 'CONFERENCE'
  if (n.includes('hot')) return 'HOT_DESK'
  if (n.includes('cabin') || n.includes('chamber') || n.includes('private')) return 'PRIVATE_CABIN'
  if (n.includes('cowork') || n.includes('co-work') || n.includes('co work')) return 'COWORKING_DESK'
  if (cat?.forHotdesk && !cat?.forPhysical) return 'CONFERENCE'
  if (cat?.forVirtual && !cat?.forPhysical) return 'VIRTUAL_OFFICE'
  if (cat?.forPhysical) return 'PHYSICAL_OFFICE'
  return 'OTHER_SERVICE'
}

const ENQUIRY_REPORTS = [
  { value: '', label: '— Select lead status —' },
  { value: 'IRRELEVANT', label: 'Irrelevant' },
  { value: 'TAKE_TIME', label: 'Take Time' },
  { value: 'SENATE_MEMBER', label: 'Senate Member' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'INTEREST', label: 'Interest' },
]

const ENQUIRY_WORKING_HOURS = [
  { value: 'GENERAL (9AM TO 6PM)', label: 'GENERAL (9AM TO 6PM)' },
  { value: 'EXTRA GENERAL (9AM TO 9PM)', label: 'EXTRA GENERAL (9AM TO 9PM)' },
  { value: 'NIGHT SHIFT', label: 'NIGHT SHIFT' },
  { value: 'OTHER', label: 'OTHER' },
]

const ENQUIRY_DATE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format ISO / Date → 05-Jan-2026 */
function formatEnquiryDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(raw)) return raw
  const iso = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return raw
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return raw
  return `${String(d).padStart(2, '0')}-${ENQUIRY_DATE_MONTHS[m - 1]}-${y}`
}

/** Parse 05-Jan-2026 or YYYY-MM-DD → YYYY-MM-DD */
function parseEnquiryDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const mon = ENQUIRY_DATE_MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase())
  const year = Number(m[3])
  if (mon < 0 || day < 1 || day > 31) return ''
  return `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function EnquiryDateField({ label, value, onChange, required }) {
  const iso = parseEnquiryDate(value) || (String(value || '').slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/) ? String(value).slice(0, 10) : '')
  const display = iso ? formatEnquiryDate(iso) : String(value || '')
  return (
    <label className="admin-field">
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          required={required}
          placeholder="05-Jan-2026"
          value={display}
          onChange={(e) => {
            const typed = e.target.value
            const parsed = parseEnquiryDate(typed)
            onChange(parsed || typed)
          }}
          onBlur={(e) => {
            const parsed = parseEnquiryDate(e.target.value)
            if (parsed) onChange(parsed)
          }}
          style={{ flex: 1 }}
        />
        <input
          type="date"
          aria-label={`Pick ${label}`}
          value={iso || ''}
          onChange={(e) => onChange(e.target.value || '')}
          style={{ width: 44, minWidth: 44, padding: '0.55rem 0.2rem', cursor: 'pointer' }}
          title="Pick date"
        />
      </div>
    </label>
  )
}

const ENQUIRY_SOURCES = [
  'DIRECT',
  'WEBSITE',
  'CONTACT_FORM',
  'PHONE',
  'WHATSAPP',
  'EMAIL',
  'REFERRAL',
  'EXCEL_IMPORT',
  'OTHER',
]

const blankEnquiryForm = () => ({
  name: '',
  email: '',
  mobile: '',
  company: '',
  city: '',
  source: 'DIRECT',
  productType: 'COWORKING_DESK',
  productId: '',
  productName: '',
  numberOfSeats: '',
  budget: '',
  businessType: '',
  workingHours: '',
  occupation: '',
  remarks: '',
  visitOn: '',
  report: '',
  message: '',
  nextFollowUpDate: '',
  nextFollowUpTime: '10:00',
  followUpRemark: '',
  followUpReminder: '',
})

function enquiryToForm(row) {
  return {
    ...blankEnquiryForm(),
    ...row,
    visitOn: row.visitOn ? String(row.visitOn).slice(0, 10) : '',
    numberOfSeats: row.numberOfSeats ?? '',
    budget: row.budget ?? '',
    occupation: row.occupation
      ? parseEnquiryDate(row.occupation) || String(row.occupation)
      : '',
    workingHours: row.workingHours || '',
    report: row.report || '',
    message: row.message || row.requirement || '',
    nextFollowUpDate: '',
    nextFollowUpTime: '10:00',
    followUpRemark: '',
    followUpReminder: '',
  }
}

function downloadCsv(filename, rows) {
  const headers = [
    'Enquiry ID',
    'Name',
    'Email',
    'Mobile',
    'Company name',
    'City',
    'Source',
    'Product',
    'Seats',
    'Budget (per seat)',
    'Lead status',
    'Assignee',
    'Created',
  ]
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    headers.join(','),
    ...rows.map((i) =>
      [
        i.enquiryId,
        i.name,
        i.email,
        i.mobile,
        i.company,
        i.city,
        i.source,
        i.productType || i.workspaceType,
        i.numberOfSeats,
        i.budget,
        i.report,
        i.assignee?.fullName,
        i.createdAt ? String(i.createdAt).slice(0, 19) : '',
      ]
        .map(escape)
        .join(','),
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function InquiriesPage() {
  const { can, user } = useAuth()
  const [filters, setFilters] = useState({ report: '', productType: '', source: '' })
  const [showFilters, setShowFilters] = useState(false)
  const list = useList(
    (p) =>
      inquiryApi.list({
        ...p,
        limit: 50,
        report: filters.report || undefined,
        productType: filters.productType || undefined,
        source: filters.source || undefined,
      }),
    [filters.report, filters.productType, filters.source],
  )
  const [view, setView] = useState('table')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [depositModal, setDepositModal] = useState(null)
  const [depositForm, setDepositForm] = useState({
    amount: '',
    commitmentFee: '',
    noticePeriodDays: '',
    tenureMonths: '',
    numberOfSeats: '',
    beginDate: '',
    expiryDate: '',
    allocatedChamber: '',
    planId: '',
    modeOfPayment: '',
    addendum: '',
    hours: '72',
  })
  const [catalogPlans, setCatalogPlans] = useState([])
  const [productCategories, setProductCategories] = useState([])
  const [form, setForm] = useState(blankEnquiryForm())
  const [saving, setSaving] = useState(false)
  const [followUps, setFollowUps] = useState({ items: [], loading: false, filter: 'overdue' })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const excelInputRef = useRef(null)

  useEffect(() => {
    productCatalogApi
      .categories()
      .then((res) => setProductCategories(res.data.data.items || res.data.data || []))
      .catch(() => setProductCategories([]))
  }, [])

  const productOptions = productCategories.length
    ? productCategories.map((c) => ({
        value: categoryToProductType(c),
        label: c.name,
        categoryId: c.id,
        categoryName: c.name,
      }))
    : ENQUIRY_TYPES

  const typeLabel = (v) =>
    productOptions.find((t) => t.value === v)?.label ||
    ENQUIRY_TYPES.find((t) => t.value === v)?.label ||
    v ||
    '—'

  const loadFollowUps = (filter = 'overdue') => {
    setFollowUps((s) => ({ ...s, loading: true, filter }))
    inquiryApi
      .followUps({ filter, limit: 40 })
      .then((res) => setFollowUps({ items: res.data.data.items || [], loading: false, filter }))
      .catch(() => setFollowUps({ items: [], loading: false, filter }))
  }

  useEffect(() => {
    if (view === 'followups') loadFollowUps(followUps.filter || 'overdue')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  useEffect(() => {
    if (!depositModal) return undefined
    membershipApi
      .plans()
      .then((res) => setCatalogPlans(res.data.data.plans || res.data.data.items || []))
      .catch(() => setCatalogPlans([]))
    return undefined
  }, [depositModal])

  useEffect(() => {
    if (!modal) return undefined
    const main = document.querySelector('.admin-main')
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    main?.classList.add('is-modal-open')
    return () => {
      document.body.style.overflow = prevBody
      main?.classList.remove('is-modal-open')
    }
  }, [modal])

  const addMonthsToDate = (isoDate, months) => {
    if (!isoDate || !months || Number(months) <= 0) return ''
    const d = new Date(`${isoDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return ''
    d.setMonth(d.getMonth() + Number(months))
    return d.toISOString().slice(0, 10)
  }

  const patchDepositForm = (patch) => {
    setDepositForm((prev) => {
      const next = { ...prev, ...patch }
      if (Object.prototype.hasOwnProperty.call(patch, 'commitmentFee')) {
        const rent = Number(patch.commitmentFee)
        if (Number.isFinite(rent) && rent > 0) next.amount = String(rent * 2)
        else if (patch.commitmentFee === '') next.amount = ''
      }
      const start = Object.prototype.hasOwnProperty.call(patch, 'beginDate') ? patch.beginDate : next.beginDate
      const tenure = Object.prototype.hasOwnProperty.call(patch, 'tenureMonths') ? patch.tenureMonths : next.tenureMonths
      if (
        Object.prototype.hasOwnProperty.call(patch, 'beginDate') ||
        Object.prototype.hasOwnProperty.call(patch, 'tenureMonths')
      ) {
        const end = addMonthsToDate(start, tenure)
        if (end) next.expiryDate = end
      }
      return next
    })
  }

  const applyPlanToDeposit = (planId) => {
    const plan = catalogPlans.find((p) => p.id === planId)
    if (!plan) {
      patchDepositForm({ planId: '', allocatedChamber: '' })
      return
    }
    const rent = plan.price != null ? Number(plan.price) : ''
    // Deposit is always 2× rent (editable by user) — do not fetch product depositAmount
    const deposit = Number.isFinite(rent) && rent > 0 ? rent * 2 : ''
    const tenure = plan.durationUnit === 'MONTH' && plan.duration != null ? String(plan.duration) : ''
    const chamber = plan.chamberCode || plan.name || ''
    setDepositForm((prev) => {
      const beginDate = prev.beginDate
      const tenureVal = tenure || prev.tenureMonths
      const expiryDate = beginDate && tenureVal ? addMonthsToDate(beginDate, tenureVal) : prev.expiryDate
      return {
        ...prev,
        planId: plan.id,
        allocatedChamber: chamber,
        commitmentFee: rent !== '' ? String(rent) : prev.commitmentFee,
        amount: deposit !== '' ? String(deposit) : prev.amount,
        numberOfSeats: plan.numberOfSeats != null ? String(plan.numberOfSeats) : prev.numberOfSeats,
        tenureMonths: tenureVal,
        expiryDate: expiryDate || prev.expiryDate,
      }
    })
    setDepositModal((m) =>
      m
        ? {
            ...m,
            productName: plan.name,
            productType: plan.productCategory || m.productType,
          }
        : m,
    )
  }

  const closeModal = () => {
    setModal(null)
    setForm(blankEnquiryForm())
    setError('')
    setImportResult(null)
    if (excelInputRef.current) excelInputRef.current.value = ''
  }

  const openCreate = () => {
    setError('')
    setMsg('')
    setImportResult(null)
    setForm(blankEnquiryForm())
    setModal({ mode: 'create' })
  }

  const openEdit = async (row) => {
    setError('')
    setMsg('')
    try {
      const res = await inquiryApi.get(row.id)
      const inquiry = res.data.data.inquiry
      setForm(enquiryToForm(inquiry))
      setModal({ mode: 'edit', inquiry })
    } catch (err) {
      setError(apiError(err))
      setForm(enquiryToForm(row))
      setModal({ mode: 'edit', inquiry: row })
    }
  }

  const convert = async (row) => {
    if (!window.confirm(`Convert ${row.enquiryId || row.name} to Senate Member?`)) return false
    setError('')
    try {
      const res = await inquiryApi.convert(row.id, {
        productType: row.productType || form.productType || 'PHYSICAL_OFFICE',
      })
      const data = res.data.data
      const links = data.conversion?.links
      setMsg(`Converted → Customer ${links?.customerId || ''} · Member ${links?.memberId || ''}. Send deposit next.`)
      list.reload(list.page)
      if (data.conversion?.needsDeposit) {
        closeModal()
        const terms = row.commercialTerms || {}
        const rent = terms.commitmentFee ?? row.budget ?? ''
        const rentN = Number(rent)
        const deposit =
          terms.securityDeposit != null && terms.securityDeposit !== ''
            ? terms.securityDeposit
            : Number.isFinite(rentN) && rentN > 0
              ? rentN * 2
              : ''
        const beginDate = terms.beginDate || (row.expectedStartDate ? String(row.expectedStartDate).slice(0, 10) : '')
        const tenure = terms.tenureMonths ?? ''
        const expiry =
          terms.expiryDate ||
          (beginDate && tenure ? addMonthsToDate(beginDate, tenure) : '')
        setDepositForm({
          amount: deposit !== '' ? String(deposit) : '',
          commitmentFee: rent !== '' && rent != null ? String(rent) : '',
          noticePeriodDays: terms.noticePeriodDays != null ? String(terms.noticePeriodDays) : '',
          tenureMonths: tenure !== '' && tenure != null ? String(tenure) : '',
          numberOfSeats:
            terms.numberOfSeats != null
              ? String(terms.numberOfSeats)
              : row.numberOfSeats != null
                ? String(row.numberOfSeats)
                : '',
          beginDate,
          expiryDate: expiry,
          allocatedChamber: terms.allocatedChamber || row.location || '',
          planId: terms.planId || row.productId || '',
          modeOfPayment: '',
          addendum: '',
          hours: '72',
        })
        setDepositModal({
          enquiryId: data.inquiry?.id || row.id,
          userId: data.conversion.userId,
          name: data.inquiry?.name || row.name,
          email: data.inquiry?.email || row.email,
          memberId: links?.memberId,
          productName: terms.productName || row.productName || form.productName,
          productType: terms.productType || row.productType || form.productType || 'PHYSICAL_OFFICE',
        })
      }
      return data.inquiry
    } catch (err) {
      setError(apiError(err))
      return null
    }
  }

  const submitDeposit = async (e) => {
    e.preventDefault()
    if (!depositModal) return
    setError('')
    setSaving(true)
    try {
      const res = await inquiryApi.sendDeposit(depositModal.enquiryId, {
        userId: depositModal.userId,
        enquiryId: depositModal.enquiryId,
        amount: Number(depositForm.amount),
        hours: Number(depositForm.hours || 72),
        commitmentFee: depositForm.commitmentFee || undefined,
        rent: depositForm.commitmentFee || undefined,
        noticePeriodDays: depositForm.noticePeriodDays || undefined,
        tenureMonths: depositForm.tenureMonths || undefined,
        numberOfSeats: depositForm.numberOfSeats || undefined,
        beginDate: depositForm.beginDate || undefined,
        expiryDate: depositForm.expiryDate || undefined,
        allocatedChamber: depositForm.allocatedChamber || undefined,
        planId: depositForm.planId || undefined,
        modeOfPayment: depositForm.modeOfPayment || undefined,
        addendum: depositForm.addendum || undefined,
        productName: depositModal.productName,
        productType: depositModal.productType,
      })
      const d = res.data.data
      setMsg(
        `Payment link emailed to ${depositModal.email}${d.contract?.contractId ? ` · Contract ${d.contract.contractId}` : ''} · ${d.payLink || ''}`,
      )
      setDepositModal(null)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const onReportChange = async (value) => {
    if (value === 'SENATE_MEMBER' && modal?.mode === 'edit' && modal.inquiry) {
      if (modal.inquiry.status === 'CONVERTED' && modal.inquiry.memberId) {
        setForm((f) => ({ ...f, report: 'SENATE_MEMBER' }))
        return
      }
      const updated = await convert(modal.inquiry)
      if (updated) {
        setForm(enquiryToForm(updated))
        setModal({ mode: 'edit', inquiry: updated })
      } else {
        setForm((f) => ({ ...f, report: f.report === 'SENATE_MEMBER' ? '' : f.report }))
      }
      return
    }
    setForm((f) => ({ ...f, report: value }))
  }

  const setReportInline = async (row, report) => {
    if (report === 'SENATE_MEMBER') {
      await convert(row)
      return
    }
    setError('')
    try {
      await inquiryApi.update(row.id, { report: report || null })
      setMsg(
        report
          ? `Lead status → ${ENQUIRY_REPORTS.find((r) => r.value === report)?.label || report}`
          : 'Lead status cleared',
      )
      list.reload(list.page)
      if (report === 'FOLLOWUP') openEdit(row)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return
    try {
      await inquiryApi.remove(id)
      setMsg('Deleted')
      if (modal?.inquiry?.id === id) closeModal()
      list.reload(1)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const buildBody = () => ({
    name: form.name,
    email: form.email,
    mobile: form.mobile || null,
    company: form.company || null,
    city: form.city || null,
    source: form.source || 'DIRECT',
    productType: form.productType || null,
    productId: form.productId || null,
    productName: form.productName || null,
    numberOfSeats: form.numberOfSeats === '' || form.numberOfSeats == null ? null : Number(form.numberOfSeats),
    budget: form.budget === '' || form.budget == null ? null : Number(form.budget),
    businessType: form.businessType || null,
    workingHours: form.workingHours || null,
    occupation: form.occupation
      ? formatEnquiryDate(parseEnquiryDate(form.occupation) || form.occupation) || form.occupation
      : null,
    remarks: form.remarks || null,
    visitOn: parseEnquiryDate(form.visitOn) || form.visitOn || null,
    report: form.report || null,
    message: form.message || null,
    requirement: form.message || null,
  })

  const saveFollowUpIfNeeded = async (enquiryId) => {
    if (form.report !== 'FOLLOWUP' || !form.nextFollowUpDate) return
    await inquiryApi.addFollowUp(enquiryId, {
      type: 'CALL',
      date: form.followUpReminder || form.nextFollowUpDate,
      notes: form.followUpRemark || null,
      nextFollowUpDate: form.nextFollowUpDate,
      nextFollowUpTime: form.nextFollowUpTime || '10:00',
    })
  }

  const saveEnquiry = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (form.report === 'SENATE_MEMBER' && modal?.mode === 'create') {
        const created = await inquiryApi.create(buildBody())
        const inquiry = created.data.data.inquiry
        const converted = await convert(inquiry)
        if (!converted) {
          setMsg('Enquiry created — convert when ready')
          closeModal()
          list.reload(1)
          return
        }
        setMsg('Enquiry created and converted to member')
        closeModal()
        list.reload(1)
        return
      }

      if (modal?.mode === 'create') {
        const res = await inquiryApi.create(buildBody())
        const inquiry = res.data.data.inquiry
        await saveFollowUpIfNeeded(inquiry.id)
        setMsg('Enquiry created')
        closeModal()
        list.reload(1)
        return
      }

      const id = modal?.inquiry?.id
      if (!id) return
      const res = await inquiryApi.update(id, buildBody())
      await saveFollowUpIfNeeded(id)
      setMsg('Enquiry updated')
      closeModal()
      list.reload(list.page)
      return res
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await inquiryApi.list({
        page: 1,
        limit: 2000,
        q: list.q || undefined,
        report: filters.report || undefined,
        productType: filters.productType || undefined,
        source: filters.source || undefined,
      })
      const items = res.data.data.items || []
      downloadCsv(`enquiries-${new Date().toISOString().slice(0, 10)}.csv`, items)
      setMsg(`Exported ${items.length} enquiries`)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setExporting(false)
    }
  }

  const downloadSampleExcel = async () => {
    setError('')
    try {
      const res = await inquiryApi.sampleExcel()
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'enquiry-import-sample.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(apiError(err, 'Could not download sample Excel'))
    }
  }

  const onExcelSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError('')
    setImportResult(null)
    try {
      const res = await inquiryApi.importExcel(file)
      const data = res.data.data || {}
      setImportResult(data)
      setMsg(
        `Imported ${data.created || 0} enquir${data.created === 1 ? 'y' : 'ies'}${
          data.failed ? ` · ${data.failed} failed` : ''
        }`,
      )
      list.reload(1)
    } catch (err) {
      setError(apiError(err, 'Excel import failed'))
    } finally {
      setImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }

  const reportLabel = (v) => ENQUIRY_REPORTS.find((r) => r.value === v)?.label || v || '—'
  const reportTone = (v) => {
    if (v === 'SENATE_MEMBER') return 'is-member'
    if (v === 'FOLLOWUP') return 'is-followup'
    if (v === 'IRRELEVANT') return 'is-muted'
    if (v === 'INTEREST') return 'is-interest'
    if (v === 'TAKE_TIME') return 'is-wait'
    return ''
  }

  const kanbanColumns = ENQUIRY_REPORTS.filter((r) => r.value).map((r) => r.value)

  return (
    <Panel
      title="Enquiries / CRM"
      actions={
        <div className="enq-toolbar">
          <div className="enq-tabs">
            {[
              ['table', 'List'],
              ['kanban', 'Board'],
              ['followups', 'Follow-ups'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`enq-tab${view === id ? ' is-active' : ''}`}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {(can('enquiry.create') || can('inquiry.update')) && (
            <button type="button" className="admin-login__submit" onClick={openCreate}>
              New enquiry
            </button>
          )}
        </div>
      }
    >
      <Banner error={error || list.error} success={msg} />

      <div className="enq-bar">
        <div className="enq-bar__search">
          <input
            placeholder="Search name, email, company, ID…"
            value={list.q}
            onChange={(e) => list.setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
          />
          <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
            Search
          </button>
        </div>
        <div className="enq-bar__actions">
          <button
            type="button"
            className={`enq-ghost${showFilters ? ' is-active' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filter
          </button>
          <button type="button" className="enq-ghost" disabled={exporting} onClick={exportData}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="enq-filters">
          <label className="admin-field">
            <span>Lead status</span>
            <select
              value={filters.report}
              onChange={(e) => setFilters((f) => ({ ...f, report: e.target.value }))}
            >
              <option value="">All lead statuses</option>
              {ENQUIRY_REPORTS.filter((r) => r.value).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Product</span>
            <select
              value={filters.productType}
              onChange={(e) => setFilters((f) => ({ ...f, productType: e.target.value }))}
            >
              <option value="">All products</option>
              {productOptions.map((t) => (
                <option key={t.categoryId || t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Source</span>
            <select
              value={filters.source}
              onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
            >
              <option value="">All sources</option>
              {ENQUIRY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="enq-ghost"
            onClick={() => setFilters({ report: '', productType: '', source: '' })}
          >
            Clear
          </button>
        </div>
      ) : null}

      {view === 'followups' ? (
        <div className="enq-followups">
          <div className="enq-tabs" style={{ marginBottom: 12 }}>
            {['overdue', 'today', 'tomorrow'].map((f) => (
              <button
                key={f}
                type="button"
                className={`enq-tab${followUps.filter === f ? ' is-active' : ''}`}
                onClick={() => loadFollowUps(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {followUps.loading ? (
            <p>Loading follow-ups…</p>
          ) : followUps.items.length === 0 ? (
            <p className="admin-login__hint">No follow-ups in this filter.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Enquiry</th>
                    <th>Type</th>
                    <th>Follow-up by</th>
                    <th>Notes</th>
                    <th>Response</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {followUps.items.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nextFollowUpAt ? String(f.nextFollowUpAt).slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td>{f.enquiry?.enquiryId || f.enquiry?.name || '—'}</td>
                      <td>{f.type}</td>
                      <td>{f.staff?.fullName || '—'}</td>
                      <td>{f.notes || '—'}</td>
                      <td>{f.customerResponse || '—'}</td>
                      <td>
                        {f.enquiry ? (
                          <button type="button" className="enq-ghost" onClick={() => openEdit(f.enquiry)}>
                            Edit
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {view === 'kanban' ? (
        <div className="enq-board">
          {kanbanColumns.map((report) => {
            const cards = list.items.filter((i) => i.report === report)
            return (
              <div key={report} className="enq-board__col">
                <header>
                  <span className={`enq-pill ${reportTone(report)}`}>{reportLabel(report)}</span>
                  <small>{cards.length}</small>
                </header>
                <div className="enq-board__cards">
                  {cards.map((i) => (
                    <button key={i.id} type="button" className="enq-board__card" onClick={() => openEdit(i)}>
                      <strong>{i.name}</strong>
                      <span>{i.company || i.email}</span>
                      <em>
                        {i.enquiryId || ''} · {i.source || ''}
                      </em>
                    </button>
                  ))}
                  {!cards.length ? <p className="enq-board__empty">No leads</p> : null}
                </div>
              </div>
            )
          })}
          <div className="enq-board__col">
            <header>
              <span className="enq-pill">Unassigned</span>
              <small>{list.items.filter((i) => !i.report).length}</small>
            </header>
            <div className="enq-board__cards">
              {list.items
                .filter((i) => !i.report)
                .map((i) => (
                  <button key={i.id} type="button" className="enq-board__card" onClick={() => openEdit(i)}>
                    <strong>{i.name}</strong>
                    <span>{i.company || i.email}</span>
                    <em>
                      {i.enquiryId || ''} · {i.source || ''}
                    </em>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === 'table' ? (
        <>
          <div className="admin-table-wrap enq-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Company name</th>
                  <th>Source</th>
                  <th>Product</th>
                  <th>Seats</th>
                  <th>Lead status</th>
                  <th>Assignee</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.loading ? (
                  <tr>
                    <td colSpan={9}>Loading…</td>
                  </tr>
                ) : list.items.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No enquiries found.</td>
                  </tr>
                ) : (
                  list.items.map((i) => (
                    <tr key={i.id}>
                      <td data-label="ID">{i.enquiryId || i.id.slice(-6)}</td>
                      <td data-label="Name">
                        <button type="button" className="enq-link" onClick={() => openEdit(i)}>
                          {i.name}
                        </button>
                      </td>
                      <td data-label="Company name">{i.company || '—'}</td>
                      <td data-label="Source">{i.source || '—'}</td>
                      <td data-label="Product">{typeLabel(i.productType || i.workspaceType)}</td>
                      <td data-label="Seats">{i.numberOfSeats ?? '—'}</td>
                      <td data-label="Lead status">
                        <select
                          className={`enq-report-select ${reportTone(i.report)}`}
                          value={i.report || ''}
                          onChange={(e) => setReportInline(i, e.target.value)}
                        >
                          {ENQUIRY_REPORTS.map((r) => (
                            <option key={r.value || 'none'} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Assignee">{i.assignee?.fullName || '—'}</td>
                      <td className="enq-row-actions">
                        <button type="button" className="enq-ghost" onClick={() => openEdit(i)}>
                          Edit
                        </button>
                        <button type="button" className="enq-ghost enq-ghost--danger" onClick={() => remove(i.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager page={list.page} total={list.total} limit={50} onPage={list.reload} />
        </>
      ) : null}

      {modal
        ? createPortal(
            <div className="enq-modal" role="dialog" aria-modal="true" aria-labelledby="enq-modal-title">
              <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={closeModal} />
              <div className="enq-modal__panel">
                <header className="enq-modal__head">
                  <div>
                    <p className="enq-modal__eyebrow">{modal.mode === 'create' ? 'New lead' : 'Edit enquiry'}</p>
                    <h3 id="enq-modal-title">
                      {modal.mode === 'create'
                        ? 'Add enquiry'
                        : `${modal.inquiry?.enquiryId || 'Enquiry'} · ${form.name || '—'}`}
                    </h3>
                    {modal.mode === 'edit' ? (
                      <p className="enq-modal__meta">
                        {form.email} · {form.mobile || '—'} · Customer:{' '}
                        {modal.inquiry?.customer?.customerId || '—'}
                        {modal.inquiry?.memberId ? ` · Member: ${modal.inquiry.memberId}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <button type="button" className="enq-ghost" onClick={closeModal}>
                    Close
                  </button>
                </header>

                <form className="enq-modal__form" onSubmit={saveEnquiry}>
                  <div className="enq-modal__body">
                    <Banner error={error} />
                    {modal.mode === 'create' ? (
                      <div className="enq-excel">
                        <div className="enq-excel__copy">
                          <strong>Bulk import from Excel</strong>
                          <p>Download the sample sheet, fill rows, then upload to create multiple enquiries.</p>
                        </div>
                        <div className="enq-excel__actions">
                          <button type="button" className="enq-ghost" onClick={downloadSampleExcel}>
                            Download sample Excel
                          </button>
                          <label className={`enq-excel__upload${importing ? ' is-busy' : ''}`}>
                            <input
                              ref={excelInputRef}
                              type="file"
                              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              hidden
                              disabled={importing}
                              onChange={onExcelSelected}
                            />
                            {importing ? 'Importing…' : 'Upload Excel'}
                          </label>
                        </div>
                        {importResult ? (
                          <p className="enq-excel__result">
                            Created {importResult.created || 0}
                            {importResult.failed
                              ? ` · ${importResult.failed} row${importResult.failed === 1 ? '' : 's'} failed`
                              : ''}
                            {importResult.errors?.length ? (
                              <span className="enq-excel__errors">
                                {' '}
                                (
                                {importResult.errors
                                  .slice(0, 3)
                                  .map((x) => `row ${x.row}: ${x.error}`)
                                  .join('; ')}
                                {importResult.errors.length > 3 ? '…' : ''})
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="admin-grid-2">
                      {[
                        ['name', 'Name'],
                        ['email', 'Email'],
                        ['mobile', 'Mobile'],
                        ['company', 'Company name'],
                        ['city', 'City'],
                      ].map(([k, label]) => (
                        <label className="admin-field" key={k}>
                          <span>{label}</span>
                          <input
                            required={k === 'name' || k === 'email'}
                            value={form[k] || ''}
                            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                          />
                        </label>
                      ))}
                      <label className="admin-field">
                        <span>Source</span>
                        <select
                          value={form.source || 'DIRECT'}
                          onChange={(e) => setForm({ ...form, source: e.target.value })}
                        >
                          {ENQUIRY_SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Lead status</span>
                        <select value={form.report || ''} onChange={(e) => onReportChange(e.target.value)}>
                          {ENQUIRY_REPORTS.map((r) => (
                            <option key={r.value || 'none'} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {form.report === 'FOLLOWUP' ? (
                      <div className="enq-follow-block">
                        <h4>Follow-up details</h4>
                        <p>Recorded by {user?.fullName || 'you'}</p>
                        <div className="admin-grid-2">
                          <label className="admin-field">
                            <span>Next date</span>
                            <input
                              type="date"
                              required
                              value={form.nextFollowUpDate || ''}
                              onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                            />
                          </label>
                          <label className="admin-field">
                            <span>Time</span>
                            <input
                              type="time"
                              value={form.nextFollowUpTime || '10:00'}
                              onChange={(e) => setForm({ ...form, nextFollowUpTime: e.target.value })}
                            />
                          </label>
                          <label className="admin-field">
                            <span>Follow-up reminder</span>
                            <input
                              type="date"
                              value={form.followUpReminder || ''}
                              onChange={(e) => setForm({ ...form, followUpReminder: e.target.value })}
                            />
                          </label>
                        </div>
                        <label className="admin-field">
                          <span>Remark</span>
                          <textarea
                            rows={2}
                            value={form.followUpRemark || ''}
                            onChange={(e) => setForm({ ...form, followUpRemark: e.target.value })}
                            placeholder="What to follow up on"
                          />
                        </label>
                      </div>
                    ) : null}

                    {form.report === 'SENATE_MEMBER' && modal.mode === 'edit' && modal.inquiry?.memberId ? (
                      <p className="enq-converted-note">Already converted · Member {modal.inquiry.memberId}</p>
                    ) : null}

                    <div className="admin-grid-2">
                      <label className="admin-field">
                        <span>Product</span>
                        <select
                          value={form.productType || ''}
                          onChange={(e) => {
                            const opt = productOptions.find(
                              (t) => t.value === e.target.value && (!form.productName || t.label === form.productName),
                            ) || productOptions.find((t) => t.value === e.target.value)
                            setForm({
                              ...form,
                              productType: e.target.value,
                              productId: opt?.categoryId || '',
                              productName: opt?.categoryName || opt?.label || '',
                            })
                          }}
                        >
                          <option value="">Select product category</option>
                          {productOptions.map((t) => (
                            <option key={t.categoryId || t.value + t.label} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>No. of seats</span>
                        <input
                          type="number"
                          min="0"
                          value={form.numberOfSeats ?? ''}
                          onChange={(e) => setForm({ ...form, numberOfSeats: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Budget (per seat)</span>
                        <input
                          type="number"
                          min="0"
                          value={form.budget ?? ''}
                          onChange={(e) => setForm({ ...form, budget: e.target.value })}
                          placeholder="₹ per seat"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Business nature</span>
                        <input
                          value={form.businessType || ''}
                          onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                          placeholder="e.g. IT / Consulting / Trading"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Working hours</span>
                        <select
                          value={form.workingHours || ''}
                          onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                        >
                          <option value="">— Select working hours —</option>
                          {ENQUIRY_WORKING_HOURS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <EnquiryDateField
                        label="Occupation Date / Tenure Date"
                        value={form.occupation || ''}
                        onChange={(v) => setForm({ ...form, occupation: v })}
                      />
                      <EnquiryDateField
                        label="OFFICE VISIT ON"
                        value={form.visitOn || ''}
                        onChange={(v) => setForm({ ...form, visitOn: v })}
                      />
                    </div>

                    <label className="admin-field">
                      <span>Remarks</span>
                      <textarea
                        rows={2}
                        value={form.remarks || ''}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      />
                    </label>
                    <label className="admin-field">
                      <span>ANY SPECIFIC REQUIREMENT</span>
                      <textarea
                        rows={3}
                        value={form.message || ''}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                      />
                    </label>

                    {modal.mode === 'edit' && modal.inquiry?.followUps?.length ? (
                      <div className="enq-history">
                        <h4>Follow-up history</h4>
                        <ul>
                          {modal.inquiry.followUps.map((f) => (
                            <li key={f.id}>
                              <strong>{f.type}</strong> · {f.staff?.fullName || 'Staff'} ·{' '}
                              {f.nextFollowUpAt
                                ? String(f.nextFollowUpAt).slice(0, 16).replace('T', ' ')
                                : f.date
                                  ? new Date(f.date).toLocaleDateString('en-IN')
                                  : '—'}
                              {f.notes ? ` — ${f.notes}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <footer className="enq-modal__foot">
                    <button type="button" className="enq-ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="admin-login__submit" disabled={saving}>
                      {saving ? 'Saving…' : modal.mode === 'create' ? 'Create enquiry' : 'Save changes'}
                    </button>
                  </footer>
                </form>
              </div>
            </div>,
            document.querySelector('.admin-main') || document.body,
          )
        : null}

      {depositModal
        ? createPortal(
            <div className="enq-modal" role="dialog" aria-modal="true" aria-labelledby="deposit-modal-title">
              <button type="button" className="enq-modal__scrim" aria-label="Close" onClick={() => setDepositModal(null)} />
              <div className="enq-modal__panel" style={{ maxWidth: 640, height: 'auto', maxHeight: '90dvh' }}>
                <header className="enq-modal__head">
                  <div>
                    <p className="enq-modal__eyebrow">Senate Member</p>
                    <h3 id="deposit-modal-title">Send for payment</h3>
                    <p className="enq-modal__meta">
                      {depositModal.name} · {depositModal.email}
                      {depositModal.memberId ? ` · ${depositModal.memberId}` : ''}
                    </p>
                  </div>
                  <button type="button" className="enq-ghost" onClick={() => setDepositModal(null)}>
                    Close
                  </button>
                </header>
                <form className="enq-modal__form" onSubmit={submitDeposit}>
                  <div className="enq-modal__body">
                    <p className="admin-login__hint">
                      Capture commercial terms, then email the deposit payment link. After payment, login credentials
                      are sent and a document deadline starts. Terms are saved on the member profile and a draft MMC
                      contract for this period.
                    </p>
                    <div className="admin-grid-2">
                      <label className="admin-field">
                        <span>Commitment fee / rent (₹)</span>
                        <input
                          type="number"
                          min="0"
                          value={depositForm.commitmentFee}
                          onChange={(e) => patchDepositForm({ commitmentFee: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Security deposit (₹) — auto 2× rent (editable)</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={depositForm.amount}
                          onChange={(e) => patchDepositForm({ amount: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Tenure (months)</span>
                        <input
                          type="number"
                          min="1"
                          value={depositForm.tenureMonths}
                          onChange={(e) => patchDepositForm({ tenureMonths: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Contract start</span>
                        <input
                          type="date"
                          value={depositForm.beginDate}
                          onChange={(e) => patchDepositForm({ beginDate: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Contract end — auto from start + tenure</span>
                        <input
                          type="date"
                          value={depositForm.expiryDate}
                          onChange={(e) => patchDepositForm({ expiryDate: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Notice period (days)</span>
                        <input
                          type="number"
                          min="0"
                          value={depositForm.noticePeriodDays}
                          onChange={(e) => patchDepositForm({ noticePeriodDays: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>No. of seats</span>
                        <input
                          type="number"
                          min="0"
                          value={depositForm.numberOfSeats}
                          onChange={(e) => patchDepositForm({ numberOfSeats: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Allocated chamber / product</span>
                        <select
                          value={depositForm.planId}
                          onChange={(e) => applyPlanToDeposit(e.target.value)}
                          required
                        >
                          <option value="">Select product / chamber</option>
                          {catalogPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {[p.chamberCode, p.name, p.center?.code || p.center?.name]
                                .filter(Boolean)
                                .join(' · ')}
                              {p.price != null ? ` — ₹${p.price}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Mode of payment</span>
                        <input
                          value={depositForm.modeOfPayment}
                          onChange={(e) => patchDepositForm({ modeOfPayment: e.target.value })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Addendum (if any)</span>
                        <input
                          value={depositForm.addendum}
                          onChange={(e) => patchDepositForm({ addendum: e.target.value })}
                          placeholder="e.g. Addendum-1"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Onboarding time limit (hours)</span>
                        <input
                          type="number"
                          min="1"
                          value={depositForm.hours}
                          onChange={(e) => patchDepositForm({ hours: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                  <footer className="enq-modal__foot">
                    <button type="button" className="enq-ghost" onClick={() => setDepositModal(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="admin-login__submit" disabled={saving}>
                      {saving ? 'Sending…' : 'Send payment link'}
                    </button>
                  </footer>
                </form>
              </div>
            </div>,
            document.querySelector('.admin-main') || document.body,
          )
        : null}
    </Panel>
  )
}

export function ProfilePage({ user, onSave }) {
  const [liveUser, setLiveUser] = useState(user)
  const [progress, setProgress] = useState(user?.memberProfile?.profileProgress || null)
  const [memberships, setMemberships] = useState([])
  const [showKycWizard, setShowKycWizard] = useState(false)

  const reload = () => {
    if (!user?.id) return
    userApi
      .member360(user.id)
      .then((res) => {
        setProgress(res.data.data.progress)
        setMemberships(res.data.data.memberships || [])
        if (res.data.data.member) setLiveUser(res.data.data.member)
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLiveUser(user)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const profile = liveUser?.memberProfile || user?.memberProfile
  const kycPending =
    !profile?.profileProgress?.kycForm?.submittedAt &&
    String(profile?.agreementStatus || '').toUpperCase() !== 'KYC_SUBMITTED' &&
    profile?.onboardingStage !== 'COMPLETE'

  useEffect(() => {
    if (kycPending) setShowKycWizard(true)
  }, [kycPending, user?.id])

  if (showKycWizard && kycPending) {
    return (
      <Panel title="Membership Contract & KYC">
        <p className="admin-login__hint" style={{ marginBottom: 12 }}>
          Complete the Membership KYC form (same flow shared after deposit payment). You can return here anytime from
          Profile / KYC until it is submitted.
        </p>
        <MembershipKycPage
          embedded
          onComplete={() => {
            setShowKycWizard(false)
            reload()
            onSave?.()
          }}
        />
        <button type="button" className="enq-ghost" style={{ marginTop: 12 }} onClick={() => setShowKycWizard(false)}>
          Skip for now — edit profile tabs
        </button>
      </Panel>
    )
  }

  return (
    <Panel title="Profile / KYC">
      {kycPending ? (
        <div className="enq-follow-block" style={{ marginBottom: 16 }}>
          <strong>Membership KYC incomplete</strong>
          <p className="admin-login__hint">
            Finish the post-payment KYC form so your contract pack can be prepared. Data is saved to your member profile.
          </p>
          <button type="button" className="admin-login__submit" onClick={() => setShowKycWizard(true)}>
            Open Membership KYC form
          </button>{' '}
          <a className="enq-ghost" href="/kyc" style={{ display: 'inline-block', padding: '10px 14px' }}>
            Open full-page form
          </a>
        </div>
      ) : null}
      <ProgressBars progress={progress} />
      {memberships.length ? (
        <div style={{ marginBottom: 16 }}>
          <strong>Plans</strong>
          <ul>
            {memberships.map((m) => (
              <li key={m.id}>
                {m.plan?.name || 'Plan'} · {m.status}
                {m.expiresAt ? ` · until ${new Date(m.expiresAt).toLocaleDateString('en-IN')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <MemberKycTabs
        user={liveUser || user}
        showOnboarding
        selfServeKyc
        onSaved={() => {
          reload()
          onSave?.()
        }}
      />
    </Panel>
  )
}

export function StaffPage() {
  const { can, isSuperAdmin } = useAuth()
  const list = useList((p) => userApi.staff(p))
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const canCreate = can('staff.create') || isSuperAdmin
  const canUpdate = can('staff.update') || isSuperAdmin

  const loadRoles = () =>
    roleApi
      .list()
      .then((res) => setRoles((res.data.data.items || []).filter((r) => r.code !== 'MEMBER' && r.status !== 'INACTIVE')))
      .catch(() => setRoles([]))

  useEffect(() => {
    loadRoles()
  }, [])

  const openCreate = () => {
    setError('')
    setSuccess('')
    loadRoles()
    setForm({
      fullName: '',
      email: '',
      mobile: '',
      username: '',
      password: '',
      confirmPassword: '',
      roleCode: 'FRONT_DESK',
      department: '',
      centreName: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
    })
  }

  const openEdit = (s) => {
    setError('')
    setSuccess('')
    loadRoles()
    setForm({
      id: s.user?.id,
      fullName: s.user?.fullName || '',
      email: s.user?.email || '',
      mobile: s.user?.mobile || '',
      username: s.username || '',
      password: '',
      confirmPassword: '',
      roleCode: s.user?.role?.code || 'FRONT_DESK',
      department: s.department || '',
      centreName: s.centreName || '',
      joiningDate: s.joiningDate ? String(s.joiningDate).slice(0, 10) : '',
      status: s.status || s.user?.status || 'ACTIVE',
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (form.id) {
        const body = { ...form }
        if (!body.password) {
          delete body.password
          delete body.confirmPassword
        }
        await userApi.updateStaff(form.id, body)
        setSuccess('Staff updated')
      } else {
        await userApi.createStaff(form)
        setSuccess('Staff created')
      }
      setForm(null)
      list.reload(list.page)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      title="Staff management"
      actions={
        canCreate ? (
          <button type="button" className="admin-login__submit" onClick={openCreate}>
            Add staff
          </button>
        ) : null
      }
    >
      <Banner error={list.error || error} success={success} />
      <div className="admin-top__right" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="admin-field input"
          style={{ minWidth: 220 }}
          placeholder="Search staff…"
          value={list.q}
          onChange={(e) => list.setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.reload(1)}
        />
        <button type="button" className="admin-login__submit" onClick={() => list.reload(1)}>
          Search
        </button>
      </div>
      {form ? (
        <form className="admin-login__form" onSubmit={save} style={{ marginBottom: 20 }}>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>Name</span>
              <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Email</span>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Mobile</span>
              <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Username</span>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Role</span>
              <select value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} required>
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id || r.code} value={r.code}>
                    {r.name} ({r.code}) · {(r.permissions || []).length} perms
                  </option>
                ))}
              </select>
              {!roles.length ? (
                <small style={{ opacity: 0.7 }}>No roles loaded. Create roles under Roles &amp; permissions first.</small>
              ) : (
                <small style={{ opacity: 0.75, display: 'block', marginTop: 6 }}>
                  Module access is set on <strong>Roles &amp; permissions</strong> (Edit the role → tick View/Add/Edit…).
                  This dropdown only assigns which role the employee uses.
                  {form.roleCode
                    ? ` Selected “${roles.find((r) => r.code === form.roleCode)?.name || form.roleCode}” has ${(roles.find((r) => r.code === form.roleCode)?.permissions || []).length} permissions.`
                    : ''}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Department</span>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Assigned centre</span>
              <input value={form.centreName} onChange={(e) => setForm({ ...form, centreName: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Joining date</span>
              <input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
            <label className="admin-field">
              <span>{form.id ? 'New password (optional)' : 'Password'}</span>
              <input
                type="password"
                required={!form.id}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Confirm password</span>
              <input
                type="password"
                required={!form.id || !!form.password}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-top__right" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" className="admin-login__submit" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="submit" className="admin-login__submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save staff'}
            </button>
          </div>
        </form>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Department</th>
              <th>Centre</th>
              <th>Status</th>
              <th>Last login</th>
              {canUpdate ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {list.loading ? (
              <tr>
                <td colSpan={10}>Loading…</td>
              </tr>
            ) : list.items.length === 0 ? (
              <tr>
                <td colSpan={10}>No staff found.</td>
              </tr>
            ) : (
              list.items.map((s) => (
                <tr key={s.id}>
                  <td data-label="Staff ID">{s.employeeId}</td>
                  <td data-label="Name">{s.user?.fullName}</td>
                  <td data-label="Email">{s.user?.email}</td>
                  <td data-label="Mobile">{s.user?.mobile}</td>
                  <td data-label="Role">{s.user?.role?.name || s.user?.role?.code}</td>
                  <td data-label="Department">{s.department || '—'}</td>
                  <td data-label="Centre">{s.centreName || '—'}</td>
                  <td data-label="Status">
                    <span className="admin-chip">{s.status || s.user?.status}</span>
                  </td>
                  <td data-label="Last login">{s.user?.lastLoginAt ? String(s.user.lastLoginAt).slice(0, 16).replace('T', ' ') : '—'}</td>
                  {canUpdate ? (
                    <td data-label="Actions">
                      <button type="button" className="admin-login__submit" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={list.page} total={list.total} onPage={list.reload} />
    </Panel>
  )
}

const MATRIX_ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Add' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'import', label: 'Import' },
  { key: 'export', label: 'Export' },
  { key: 'approve', label: 'Approve' },
  { key: 'assign', label: 'Assign' },
  { key: 'self', label: 'Self only' },
]

const MODULE_LABELS = {
  dashboard: 'Dashboard / Admin',
  enquiry: 'Enquiries / CRM',
  inquiry: 'Inquiries (legacy)',
  followup: 'Follow-ups',
  users: 'Users / Customers',
  members: 'Members',
  customers: 'Customers',
  kyc: 'KYC',
  booking: 'Bookings',
  workspace: 'Physical office',
  centres: 'Centres / Locations',
  conference: 'Conference / Meeting rooms',
  membership: 'Memberships',
  products: 'Products / Membership types',
  contracts: 'Contracts',
  accounts: 'Accounts / Rent collection',
  payment: 'Payments',
  maintenance: 'Maintenance',
  services: 'Services',
  staff: 'Staff / Employees',
  hrm: 'HRM (work · attendance · leave · salary)',
  roles: 'Roles & module access',
  cms: 'Website CMS',
  website: 'Website',
  reports: 'Reports',
  import: 'Imports',
  export: 'Exports',
  settings: 'Settings',
  audit: 'Audit',
  announcement: 'Announcements',
  notifications: 'Notifications',
}

const ACTION_ALIASES = {
  view: ['view'],
  create: ['create', 'add', 'run', 'attendance', 'leave', 'payslip'],
  update: ['update', 'edit', 'manage', 'close', 'block', 'cancel', 'salary'],
  delete: ['delete', 'remove'],
  import: ['import'],
  export: ['export'],
  approve: ['approve', 'review', 'confirm', 'reject'],
  assign: ['assign', 'followup', 'convert', 'checkin', 'checkout', 'refund', 'payment'],
  self: ['self'],
}

function codesForModuleAction(module, action, permissions) {
  const variants = ACTION_ALIASES[action] || [action]
  return (permissions || [])
    .filter((p) => p.module === module)
    .filter((p) => {
      const parts = String(p.code).split('.')
      const actionPart = parts.slice(1).join('.')
      return variants.some((v) => actionPart === v || actionPart.endsWith(`.${v}`) || actionPart.startsWith(`${v}`))
    })
    .map((p) => p.code)
}

export function RolesPage() {
  const { can, isSuperAdmin } = useAuth()
  const [roles, setRoles] = useState([])
  const [catalog, setCatalog] = useState({ permissions: [], modules: [] })
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const canManage = can('roles.manage') || can('roles.update') || can('roles.create') || isSuperAdmin
  const canCreate = can('roles.create') || isSuperAdmin
  const canEditPerms =
    isSuperAdmin ||
    can('roles.manage') ||
    can('roles.update') ||
    (!selected?.id && canCreate) ||
    (selected?.id && selected.code !== 'SUPER_ADMIN' && (can('roles.update') || can('roles.manage') || canCreate))

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [r, c] = await Promise.all([roleApi.list(), roleApi.catalog()])
      setRoles(r.data.data.items || [])
      setCatalog(c.data.data || { permissions: [], modules: [] })
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectRole = async (role) => {
    setError('')
    setSuccess('')
    setSelected(role)
    setName(role.name || '')
    setDescription(role.description || '')
    setStatus(role.status || 'ACTIVE')
    setChecked(Array.isArray(role.permissions) ? role.permissions : [])
    // Always re-fetch so permission codes are fresh (list can be stale after create)
    if (role?.id) {
      try {
        const res = await roleApi.get(role.id)
        const full = res.data.data.role
        setSelected(full)
        setName(full.name || '')
        setDescription(full.description || '')
        setStatus(full.status || 'ACTIVE')
        setChecked(Array.isArray(full.permissions) ? [...full.permissions] : [])
      } catch (err) {
        setError(apiError(err))
      }
    }
  }

  const startCreate = () => {
    setSelected({ id: null, code: '', isSystem: false })
    setName('')
    setDescription('')
    setStatus('ACTIVE')
    setChecked([])
    setError('')
    setSuccess('')
  }

  const applyTemplate = (code) => {
    const template = roles.find((r) => r.code === code)
    if (!template) return
    setChecked([...(template.permissions || [])])
    setSuccess(`Copied ${template.permissions?.length || 0} permissions from ${template.name}`)
  }

  const toggleCode = (code) => {
    setChecked((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  const moduleHas = (module, action) => codesForModuleAction(module, action, catalog.permissions).length > 0

  const moduleChecked = (module, action) => {
    const codes = codesForModuleAction(module, action, catalog.permissions)
    return codes.length > 0 && codes.every((c) => checked.includes(c))
  }

  const modulePartial = (module, action) => {
    const codes = codesForModuleAction(module, action, catalog.permissions)
    const n = codes.filter((c) => checked.includes(c)).length
    return n > 0 && n < codes.length
  }

  const toggleModuleAction = (module, action) => {
    const codes = codesForModuleAction(module, action, catalog.permissions)
    if (!codes.length) return
    const allOn = codes.every((c) => checked.includes(c))
    setChecked((prev) => {
      if (allOn) return prev.filter((c) => !codes.includes(c))
      return [...new Set([...prev, ...codes])]
    })
  }

  const setModuleAll = (module, on) => {
    const codes = (catalog.permissions || []).filter((p) => p.module === module).map((p) => p.code)
    setChecked((prev) => {
      if (on) return [...new Set([...prev, ...codes])]
      return prev.filter((c) => !codes.includes(c))
    })
  }

  const selectAllModules = () => {
    setChecked((catalog.permissions || []).map((p) => p.code))
  }

  const clearAll = () => setChecked([])

  const save = async (e) => {
    e.preventDefault()
    if (!canManage && !canCreate) return
    if (!name.trim()) {
      setError('Role name is required')
      return
    }
    if (!checked.length) {
      setError('Select at least one permission (or use “Copy from role…”) before saving')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (selected?.id) {
        const res = await roleApi.update(selected.id, { name, description, status, permissions: checked })
        setSuccess('Role updated')
        await load()
        selectRole(res.data.data.role)
      } else {
        const res = await roleApi.create({ name, description, status, permissions: checked })
        setSuccess('Role created — assign it to staff from Staff management')
        await load()
        selectRole(res.data.data.role)
      }
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role) => {
    if (!can('roles.delete') && !isSuperAdmin) return
    if (!window.confirm(`Delete role ${role.name}?`)) return
    try {
      await roleApi.remove(role.id)
      setSuccess('Role deleted')
      if (selected?.id === role.id) setSelected(null)
      await load()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const modules = (catalog.modules?.length
    ? catalog.modules
    : [...new Set((catalog.permissions || []).map((p) => p.module))]
  ).filter(Boolean)

  return (
    <Panel
      title="Roles & permissions"
      actions={
        canCreate ? (
          <button type="button" className="admin-login__submit" onClick={startCreate}>
            New role
          </button>
        ) : null
      }
    >
      <Banner error={error} success={success} />
      <p style={{ marginBottom: 12, opacity: 0.85 }}>
        Create roles with View / Add / Edit / Delete (and Import / Export / Approve / Assign) per admin module
        (Dashboard, Enquiries, Members, Products, HRM, Staff, etc.), then assign that role when creating an employee
        under Staff. Each employee only sees modules granted by their role.
      </p>
      <div className="admin-grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Code</th>
                  <th>Users</th>
                  <th>Perms</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Loading roles…</td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      No roles found. Click <strong>New role</strong> to create one
                      {isSuperAdmin ? ', or re-run seed to restore system roles.' : '.'}
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id} style={selected?.id === r.id ? { outline: '1px solid rgba(255,255,255,0.35)' } : undefined}>
                      <td>{r.name}</td>
                      <td>{r.code}</td>
                      <td>{r.userCount ?? 0}</td>
                      <td>{(r.permissions || []).length}</td>
                      <td>
                        <span className="admin-chip">{r.status}</span>
                      </td>
                      <td>
                        <button type="button" className="admin-login__submit" onClick={() => selectRole(r)}>
                          {r.code === 'SUPER_ADMIN' ? 'View' : 'Edit'}
                        </button>
                        {!r.isSystem && (can('roles.delete') || isSuperAdmin) ? (
                          <button type="button" className="admin-login__submit" style={{ marginLeft: 6 }} onClick={() => remove(r)}>
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected ? (
          <form className="admin-login__form" onSubmit={save}>
            <h3 style={{ marginTop: 0 }}>{selected.id ? `Edit ${selected.code}` : 'Create role'}</h3>
            {selected.code === 'SUPER_ADMIN' ? (
              <p className="admin-login__hint">Super Admin always has unrestricted access and cannot be modified.</p>
            ) : (
              <>
                <label className="admin-field">
                  <span>Role name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={selected.isSystem && selected.code !== 'ADMIN'}
                    placeholder="e.g. Sales Executive"
                  />
                </label>
                <label className="admin-field">
                  <span>Description</span>
                  <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role can do" />
                </label>
                <label className="admin-field">
                  <span>Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                {canEditPerms ? (
                  <div className="admin-top__right" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="admin-login__submit" onClick={selectAllModules}>
                      Select all modules
                    </button>
                    <button type="button" className="admin-login__submit" onClick={clearAll}>
                      Clear all
                    </button>
                    {!selected.id ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) applyTemplate(e.target.value)
                          e.target.value = ''
                        }}
                        title="Copy permissions from an existing role"
                      >
                        <option value="">Copy from role…</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.code}>
                            {r.name} ({(r.permissions || []).length})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <span style={{ opacity: 0.75, fontSize: 13 }}>{checked.length} permissions selected</span>
                  </div>
                ) : null}

                {checked.length ? (
                  <p className="admin-login__hint" style={{ marginBottom: 8 }}>
                    Granted: {checked.slice(0, 12).join(', ')}
                    {checked.length > 12 ? ` · +${checked.length - 12} more` : ''}
                  </p>
                ) : (
                  <p className="admin-login__hint" style={{ marginBottom: 8, color: '#ffb4a8' }}>
                    No permissions selected yet — tick modules below or use “Copy from role…”, then Save.
                  </p>
                )}

                <div className="admin-table-wrap" style={{ marginTop: 8, maxHeight: 420, overflow: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Module</th>
                        {MATRIX_ACTIONS.map((a) => (
                          <th key={a.key}>{a.label}</th>
                        ))}
                        <th>All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.length === 0 ? (
                        <tr>
                          <td colSpan={MATRIX_ACTIONS.length + 2}>Permission catalog empty — check API /roles/catalog</td>
                        </tr>
                      ) : (
                        modules.map((mod) => {
                          const modPerms = (catalog.permissions || []).filter((p) => p.module === mod)
                          const allOn = modPerms.length > 0 && modPerms.every((p) => checked.includes(p.code))
                          return (
                            <tr key={mod}>
                              <td>
                                <strong>{MODULE_LABELS[mod] || mod}</strong>
                                <div style={{ fontSize: 11, opacity: 0.65 }}>{modPerms.length} codes</div>
                              </td>
                              {MATRIX_ACTIONS.map((a) => (
                                <td key={a.key}>
                                  {moduleHas(mod, a.key) ? (
                                    <input
                                      type="checkbox"
                                      checked={moduleChecked(mod, a.key)}
                                      ref={(el) => {
                                        if (el) el.indeterminate = modulePartial(mod, a.key)
                                      }}
                                      onChange={() => toggleModuleAction(mod, a.key)}
                                      disabled={!canEditPerms}
                                      title={codesForModuleAction(mod, a.key, catalog.permissions).join(', ')}
                                    />
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              ))}
                              <td>
                                {modPerms.length ? (
                                  <input
                                    type="checkbox"
                                    checked={allOn}
                                    onChange={(e) => setModuleAll(mod, e.target.checked)}
                                    disabled={!canEditPerms}
                                    title="Toggle all permissions for this module"
                                  />
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <details style={{ marginTop: 12 }} open={!modules.length}>
                  <summary>All permission codes ({(catalog.permissions || []).length})</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
                    {(catalog.permissions || []).map((p) => (
                      <label key={p.code} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                        <input type="checkbox" checked={checked.includes(p.code)} onChange={() => toggleCode(p.code)} disabled={!canEditPerms} />
                        <span>
                          {p.code}
                          <span style={{ opacity: 0.55 }}> · {p.module}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </details>

                {canManage || (!selected.id && canCreate) ? (
                  <button type="submit" className="admin-login__submit" style={{ marginTop: 12 }} disabled={saving}>
                    {saving ? 'Saving…' : selected.id ? 'Save role' : 'Create role'}
                  </button>
                ) : null}
              </>
            )}
          </form>
        ) : (
          <div>
            <p className="admin-login__hint">Select a role to edit permissions, or create a new role.</p>
            {canCreate ? (
              <button type="button" className="admin-login__submit" onClick={startCreate}>
                New role
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  )
}

export function downloadKyc(id) {
  const token = getAccessToken()
  window.open(`${kycApi.documentUrl(id)}?access=${token}`, '_blank')
}

function ImageUrlField({ value, onChange }) {
  return (
    <label className="admin-field">
      <span>Image URL</span>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/media/… or /uploads/cms/…" />
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const res = await cmsApi.upload(file)
          onChange(res.data.data.url)
        }}
      />
    </label>
  )
}

export function CmsSitePage() {
  const [form, setForm] = useState({
    footerBlurb: '',
    tickerText: '',
    contactsJson: '',
    slidesJson: '',
    statsJson: '',
    amenitiesText: '',
    searchCitiesText: '',
    metaTitle: '',
    metaDescription: '',
  })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    cmsApi.adminSiteGet().then((res) => {
      const s = res.data.data.site || {}
      const amenities = Array.isArray(s.amenities)
        ? s.amenities.map((a) => (typeof a === 'string' ? a : a.label || a.name || '')).filter(Boolean)
        : []
      setForm({
        footerBlurb: s.footerBlurb || '',
        tickerText: (s.ticker || []).join('\n'),
        contactsJson: JSON.stringify(s.contacts || {}, null, 2),
        slidesJson: JSON.stringify(s.slides || [], null, 2),
        statsJson: JSON.stringify(s.stats || [], null, 2),
        amenitiesText: amenities.join('\n'),
        searchCitiesText: (s.searchCities || []).join(', '),
        metaTitle: s.metaTitle || '',
        metaDescription: s.metaDescription || '',
      })
    })
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await cmsApi.adminSiteSave({
        footerBlurb: form.footerBlurb,
        ticker: form.tickerText.split('\n').map((t) => t.trim()).filter(Boolean),
        contacts: JSON.parse(form.contactsJson || '{}'),
        slides: JSON.parse(form.slidesJson || '[]'),
        stats: JSON.parse(form.statsJson || '[]'),
        amenities: form.amenitiesText.split('\n').map((t) => t.trim()).filter(Boolean),
        searchCities: form.searchCitiesText.split(',').map((t) => t.trim()).filter(Boolean),
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        published: true,
      })
      setMsg('Site settings saved — homepage will use these values')
    } catch (err) {
      setError(apiError(err) || 'Invalid JSON / save failed')
    }
  }

  return (
    <Panel title="Website · Homepage & settings">
      <Banner error={error} success={msg} />
      <p className="admin-login__hint" style={{ marginBottom: 12 }}>
        These settings drive the public homepage (`/`), header ticker, contacts, hero, stats, and amenities. Partners, gallery,
        solutions, and blog are managed in the other Website tabs. Website contact forms create CRM enquiries automatically.
      </p>
      <form className="admin-login__form" onSubmit={save}>
        <label className="admin-field">
          <span>Brand / footer blurb</span>
          <input value={form.footerBlurb} onChange={(e) => setForm({ ...form, footerBlurb: e.target.value })} />
        </label>
        <div className="admin-grid-2">
          <label className="admin-field">
            <span>Meta title (SEO)</span>
            <input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>Meta description (SEO)</span>
            <input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
          </label>
        </div>
        <label className="admin-field">
          <span>Ticker (one line per item)</span>
          <textarea rows={5} value={form.tickerText} onChange={(e) => setForm({ ...form, tickerText: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Search cities (comma separated)</span>
          <input value={form.searchCitiesText} onChange={(e) => setForm({ ...form, searchCitiesText: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Amenities (one per line)</span>
          <textarea rows={6} value={form.amenitiesText} onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Contacts JSON</span>
          <textarea rows={8} value={form.contactsJson} onChange={(e) => setForm({ ...form, contactsJson: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Hero slides JSON</span>
          <textarea rows={8} value={form.slidesJson} onChange={(e) => setForm({ ...form, slidesJson: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Stats JSON</span>
          <textarea rows={6} value={form.statsJson} onChange={(e) => setForm({ ...form, statsJson: e.target.value })} />
        </label>
        <button className="admin-login__submit" type="submit">
          Save website settings
        </button>
      </form>
    </Panel>
  )
}

export function WebsiteModule() {
  const [tab, setTab] = useState('site')
  const tabs = [
    { id: 'site', label: 'Homepage & SEO' },
    { id: 'pages', label: 'Pages' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'partners', label: 'Partners' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'blog', label: 'Blog' },
  ]
  return (
    <div>
      <div className="admin-top__right" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="admin-login__submit"
            style={tab === t.id ? { outline: '2px solid #fff' } : { opacity: 0.75 }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <a className="admin-login__submit" href="/" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          View site
        </a>
      </div>
      {tab === 'site' ? <CmsSitePage /> : null}
      {tab === 'pages' ? <CmsPagesPage /> : null}
      {tab === 'solutions' ? <CmsSolutionsPage /> : null}
      {tab === 'partners' ? <CmsPartnersPage /> : null}
      {tab === 'gallery' ? <CmsGalleryPage /> : null}
      {tab === 'blog' ? <CmsBlogPage /> : null}
    </div>
  )
}

export function CmsPagesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ key: 'about', title: '', subtitle: '', body: '', sectionsJson: '{}' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const reload = () => cmsApi.adminPages().then((r) => setItems(r.data.data.items || []))
  useEffect(() => {
    reload()
  }, [])

  const edit = (p) =>
    setForm({
      key: p.key,
      title: p.title || '',
      subtitle: p.subtitle || '',
      body: p.body || '',
      sectionsJson: JSON.stringify(p.sections || {}, null, 2),
    })

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await cmsApi.adminPageSave(form.key, {
        title: form.title,
        subtitle: form.subtitle,
        body: form.body,
        sections: JSON.parse(form.sectionsJson || '{}'),
        published: true,
      })
      setMsg('Page saved')
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel title="Website · Pages">
      <Banner error={error} success={msg} />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Title</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.key}</td>
                <td>{p.title}</td>
                <td>
                  <button type="button" className="admin-login__submit" onClick={() => edit(p)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="admin-login__form" onSubmit={save} style={{ marginTop: 16 }}>
        <label className="admin-field">
          <span>Key</span>
          <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
        </label>
        <label className="admin-field">
          <span>Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label className="admin-field">
          <span>Subtitle</span>
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Body</span>
          <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Sections JSON</span>
          <textarea rows={5} value={form.sectionsJson} onChange={(e) => setForm({ ...form, sectionsJson: e.target.value })} />
        </label>
        <button className="admin-login__submit" type="submit">
          Save page
        </button>
      </form>
    </Panel>
  )
}

function CmsCollectionPage({
  title,
  load,
  create,
  update,
  remove,
  emptyForm,
  fields,
}) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const reload = () => load().then((r) => setItems(r.data.data.items || []))
  useEffect(() => {
    reload().catch((err) => setError(apiError(err)))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder || 0),
        published: form.published === true || form.published === 'true',
      }
      if (editingId) await update(editingId, payload)
      else await create(payload)
      setMsg('Saved')
      setForm(emptyForm)
      setEditingId(null)
      reload()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel title={title}>
      <Banner error={error} success={msg} />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title || item.name}</td>
                <td>{String(item.published)}</td>
                <td>
                  <button
                    type="button"
                    className="admin-login__submit"
                    onClick={() => {
                      setEditingId(item.id)
                      const next = { ...emptyForm }
                      Object.keys(emptyForm).forEach((k) => {
                        if (item[k] != null) next[k] = typeof emptyForm[k] === 'boolean' ? !!item[k] : String(item[k])
                      })
                      if ('featureListText' in emptyForm && Array.isArray(item.featureList)) {
                        next.featureListText = item.featureList.join('\n')
                      }
                      setForm(next)
                    }}
                  >
                    Edit
                  </button>{' '}
                  <button
                    type="button"
                    className="admin-login__submit"
                    onClick={async () => {
                      await remove(item.id)
                      reload()
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="admin-login__form" onSubmit={save} style={{ marginTop: 16 }}>
        {fields({ form, setForm })}
        <button className="admin-login__submit" type="submit">
          {editingId ? 'Update' : 'Create'}
        </button>
        {editingId && (
          <button
            type="button"
            className="admin-login__submit"
            onClick={() => {
              setEditingId(null)
              setForm(emptyForm)
            }}
          >
            Cancel
          </button>
        )}
      </form>
    </Panel>
  )
}

export function CmsBlogPage() {
  return (
    <CmsCollectionPage
      title="Website · Blog"
      load={cmsApi.adminBlog}
      create={cmsApi.adminBlogCreate}
      update={cmsApi.adminBlogUpdate}
      remove={cmsApi.adminBlogDelete}
      emptyForm={{ slug: '', title: '', tag: '', excerpt: '', body: '', coverImageUrl: '', published: true, sortOrder: '0' }}
      fields={({ form, setForm }) => (
        <>
          {['slug', 'title', 'tag', 'excerpt', 'sortOrder'].map((k) => (
            <label className="admin-field" key={k}>
              <span>{k}</span>
              <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === 'slug' || k === 'title'} />
            </label>
          ))}
          <label className="admin-field">
            <span>body</span>
            <textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <ImageUrlField value={form.coverImageUrl} onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })} />
          <label className="admin-field">
            <span>published</span>
            <select value={String(form.published)} onChange={(e) => setForm({ ...form, published: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        </>
      )}
    />
  )
}

export function CmsGalleryPage() {
  return (
    <CmsCollectionPage
      title="Website · Gallery"
      load={cmsApi.adminGallery}
      create={cmsApi.adminGalleryCreate}
      update={cmsApi.adminGalleryUpdate}
      remove={cmsApi.adminGalleryDelete}
      emptyForm={{ title: '', imageUrl: '', sortOrder: '0', published: true }}
      fields={({ form, setForm }) => (
        <>
          <label className="admin-field">
            <span>title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <ImageUrlField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <label className="admin-field">
            <span>sortOrder</span>
            <input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
        </>
      )}
    />
  )
}

export function CmsPartnersPage() {
  return (
    <CmsCollectionPage
      title="Website · Partners"
      load={cmsApi.adminPartners}
      create={cmsApi.adminPartnersCreate}
      update={cmsApi.adminPartnersUpdate}
      remove={cmsApi.adminPartnersDelete}
      emptyForm={{ name: '', logoUrl: '', sortOrder: '0', published: true }}
      fields={({ form, setForm }) => (
        <>
          <label className="admin-field">
            <span>name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <ImageUrlField value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
          <label className="admin-field">
            <span>sortOrder</span>
            <input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
        </>
      )}
    />
  )
}

export function CmsSolutionsPage() {
  return (
    <CmsCollectionPage
      title="Website · Solutions"
      load={cmsApi.adminSolutions}
      create={cmsApi.adminSolutionsCreate}
      update={cmsApi.adminSolutionsUpdate}
      remove={cmsApi.adminSolutionsDelete}
      emptyForm={{ slug: '', title: '', summary: '', body: '', imageUrl: '', sortOrder: '0', published: true }}
      fields={({ form, setForm }) => (
        <>
          {['slug', 'title', 'summary', 'sortOrder'].map((k) => (
            <label className="admin-field" key={k}>
              <span>{k}</span>
              <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === 'slug' || k === 'title'} />
            </label>
          ))}
          <label className="admin-field">
            <span>body</span>
            <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <ImageUrlField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
        </>
      )}
    />
  )
}

