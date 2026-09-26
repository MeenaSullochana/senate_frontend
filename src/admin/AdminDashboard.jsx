import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MoltenMetal from '../MoltenMetal'
import senateLogo from '../assets/senate-logo.png'
import { useAuth } from '../context/AuthContext'
import { dashboardApi } from '../services/api'
import { apiError } from '../services/api/client'
import {
  AuditPage,
  InquiriesPage,
  InvoicesPage,
  MaintenancePage,
  MembersPage,
  PackagesPage,
  PaymentsPage,
  ProfilePage,
  ReportsPage,
  RoomsPage,
  SettingsPage,
  SpacesPage,
  StaffPage,
  RolesPage,
  WebsiteModule,
  CustomersPage,
  VirtualOfficePage,
  ContractsPage,
  BookingsPage,
} from './AdminPages'
import { HrmPage } from './HrmPage'
import { AccountsPage } from './AccountsPage'
import './Admin.css'

function CountUp({ value, duration = 1100, pad = 0 }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setN(value)
      return undefined
    }
    let start
    let frame
    const tick = (t) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - (1 - p) ** 3
      setN(Math.round(value * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  const text = pad ? String(n).padStart(pad, '0') : String(n)
  return text
}

const ADMIN_MENU = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    perms: ['dashboard.admin', 'dashboard.front_desk', 'dashboard.maintenance'],
  },
  { id: 'inquiries', label: 'Enquiries', perms: ['inquiry.view', 'enquiry.view'] },
  { id: 'members', label: 'Members', perms: ['users.view', 'members.view'] },
  {
    id: 'bookings',
    label: 'Bookings',
    perms: ['booking.view', 'contracts.view'],
    children: [
      { id: 'bookings-physical', label: 'Physical', perms: ['booking.view', 'contracts.view'] },
      { id: 'bookings-virtual', label: 'Virtual', perms: ['booking.view', 'contracts.view'] },
      { id: 'bookings-conference', label: 'Conference / Meeting', perms: ['booking.view', 'contracts.view'] },
      { id: 'bookings-hotdesk', label: 'Hotdesk', perms: ['booking.view', 'contracts.view'] },
    ],
  },
  {
    id: 'packages',
    label: 'Products',
    perms: ['membership.view', 'products.view'],
    children: [
      { id: 'products-physical', label: 'Physical', perms: ['membership.view', 'products.view'] },
      { id: 'products-virtual', label: 'Virtual', perms: ['membership.view', 'products.view'] },
      { id: 'products-hotdesk', label: 'Hotdesk', perms: ['membership.view', 'products.view'] },
      { id: 'products-conference', label: 'Conference / Meeting', perms: ['membership.view', 'products.view'] },
    ],
  },
  { id: 'payments', label: 'Payments', perms: ['payment.view', 'accounts.view'] },
  { id: 'accounts', label: 'Accounts', perms: ['accounts.view', 'accounts.reports'] },
  { id: 'maintenance', label: 'Service & Maintenance', perms: ['maintenance.view', 'services.view'] },
  { id: 'staff', label: 'Staff', perms: ['staff.view'] },
  {
    id: 'hrm',
    label: 'HRM',
    perms: ['hrm.view', 'hrm.self', 'hrm.attendance', 'hrm.leave', 'hrm.salary', 'hrm.payslip'],
    children: [
      { id: 'hrm-directory', label: 'Staff directory', perms: ['hrm.view', 'staff.view'] },
      { id: 'hrm-work', label: 'Work info', perms: ['hrm.view', 'hrm.update', 'hrm.self'] },
      { id: 'hrm-attendance', label: 'Attendance', perms: ['hrm.view', 'hrm.attendance', 'hrm.self'] },
      { id: 'hrm-leave', label: 'Leave', perms: ['hrm.view', 'hrm.leave', 'hrm.self'] },
      { id: 'hrm-payslip', label: 'Payslip / Salary', perms: ['hrm.view', 'hrm.payslip', 'hrm.salary', 'hrm.self'] },
      { id: 'hrm-pending', label: 'Pending work', perms: ['hrm.view', 'hrm.leave', 'hrm.payslip'] },
    ],
  },
  // Temporarily hidden — Roles page was timing out on heavy permission sync.
  // Re-enable when ready: { id: 'roles', label: 'Roles & permissions', perms: ['roles.view'] },
  { id: 'reports', label: 'Reports', perms: ['reports.view'] },
  { id: 'website', label: 'Website', perms: ['cms.view', 'website.view'] },
  { id: 'settings', label: 'Settings', perms: ['settings.view', 'centres.view'] },
  { id: 'audit', label: 'Audit', perms: ['audit.view'] },
]

const MEMBER_MENU = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'Profile / KYC' },
  {
    id: 'packages',
    label: 'Products',
    children: [
      { id: 'products-physical', label: 'Physical' },
      { id: 'products-virtual', label: 'Virtual' },
      { id: 'products-hotdesk', label: 'Hotdesk' },
      { id: 'products-conference', label: 'Conference / Meeting' },
    ],
  },
  {
    id: 'bookings',
    label: 'Bookings',
    children: [
      { id: 'bookings-physical', label: 'Physical' },
      { id: 'bookings-virtual', label: 'Virtual' },
      { id: 'bookings-conference', label: 'Conference / Meeting' },
      { id: 'bookings-hotdesk', label: 'Hotdesk' },
    ],
  },
  { id: 'payments', label: 'Payments' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'maintenance', label: 'Service & Maintenance' },
]

/** Staff nav is driven only by role permissions (Roles & permissions page). */
function menuFor(role, can, canAny) {
  const allowed = (item) => {
    if (item.perms?.length) return canAny(...item.perms)
    if (item.perm) return can(item.perm)
    return true
  }
  const filterPerm = (items) =>
    items
      .filter(allowed)
      .map((item) =>
        item.children ? { ...item, children: item.children.filter(allowed) } : item,
      )
      .filter((item) => !item.children || item.children.length)

  if (role === 'MEMBER') return MEMBER_MENU
  return filterPerm(ADMIN_MENU)
}

function Icon({ name }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  const paths = {
    dashboard: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...p} />
        <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" {...p} />
        <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" {...p} />
        <rect x="3.5" y="13" width="7" height="7.5" rx="1.5" {...p} />
      </>
    ),
    inquiries: (
      <>
        <path d="M5 5h14v11H8l-3 3V5Z" {...p} />
        <path d="M8 9h8M8 12h5" {...p} />
      </>
    ),
    members: (
      <>
        <circle cx="9" cy="8" r="2.4" {...p} />
        <circle cx="16" cy="9" r="2" {...p} />
        <path d="M4.5 18c.4-2.6 2.4-4 4.6-4s4.2 1.4 4.6 4M13.5 18c.2-1.6 1.3-2.7 2.7-2.7 1.5 0 2.6 1 2.8 2.7" {...p} />
      </>
    ),
    bookings: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" {...p} />
        <path d="M8 3.5V7M16 3.5V7M4 10h16" {...p} />
      </>
    ),
    spaces: (
      <>
        <path d="M4 20V8l8-4 8 4v12" {...p} />
        <path d="M10 20v-6h4v6" {...p} />
      </>
    ),
    packages: (
      <>
        <path d="M4 8.5 12 4l8 4.5v9L12 22 4 17.5v-9Z" {...p} />
        <path d="M12 12v10M4 8.5l8 3.5 8-3.5" {...p} />
      </>
    ),
    gallery: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2" {...p} />
        <circle cx="9" cy="10" r="1.5" {...p} />
        <path d="M3.8 16.5 9 12.5l3.5 3 3-2.5 4.7 3.5" {...p} />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" {...p} />
        <path
          d="M12 3.5v2.2M12 18.3V20.5M4.8 6.5l1.6 1.6M17.6 15.9l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.8 17.5l1.6-1.6M17.6 8.1l1.6-1.6"
          {...p}
        />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" {...p} />
        <path d="M10 12h9M16 8.5 19.5 12 16 15.5" {...p} />
      </>
    ),
    site: (
      <>
        <circle cx="12" cy="12" r="8" {...p} />
        <path d="M3.5 12h17M12 4c2.4 2.5 3.7 5.2 3.7 8S14.4 17.5 12 20c-2.4-2.5-3.7-5.2-3.7-8S9.6 6.5 12 4Z" {...p} />
      </>
    ),
    seats: (
      <>
        <path d="M5 14V8.5A3.5 3.5 0 0 1 8.5 5h7A3.5 3.5 0 0 1 19 8.5V14" {...p} />
        <path d="M4 14h16v2.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5V14Z" {...p} />
      </>
    ),
    wallet: (
      <>
        <rect x="3.5" y="7" width="17" height="12" rx="2" {...p} />
        <path d="M3.5 10h17M16 14h2.5" {...p} />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="8" {...p} />
        <path d="M3.5 12h17M12 4c2.4 2.5 3.7 5.2 3.7 8S14.4 17.5 12 20c-2.4-2.5-3.7-5.2-3.7-8S9.6 6.5 12 4Z" {...p} />
      </>
    ),
    cart: (
      <>
        <path d="M4 6h2l2.2 10h9.3L20 8H7" {...p} />
        <circle cx="10" cy="19" r="1.2" {...p} />
        <circle cx="17" cy="19" r="1.2" {...p} />
      </>
    ),
  }
  const aliases = {
    kyc: 'inquiries',
    rooms: 'spaces',
    'new-booking': 'bookings',
    'bookings-physical': 'bookings',
    'bookings-virtual': 'bookings',
    'bookings-conference': 'bookings',
    'bookings-hotdesk': 'bookings',
    'products-physical': 'packages',
    'products-virtual': 'packages',
    'products-conference': 'packages',
    'products-hotdesk': 'packages',
    'conference-book': 'bookings',
    packages: 'packages',
    'virtual-office': 'globe',
    contracts: 'bookings',
    payments: 'wallet',
    invoices: 'wallet',
    maintenance: 'settings',
    customers: 'members',
    staff: 'members',
    hrm: 'members',
    roles: 'settings',
    website: 'globe',
    reports: 'dashboard',
    audit: 'settings',
    profile: 'members',
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] || paths[aliases[name]] || paths.dashboard}
    </svg>
  )
}

function kpisFromMetrics(m = {}) {
  return [
    { id: 'seats', label: "Today's occupancy", value: m.occupiedWorkspaces ?? 0, suffix: ' seats', delta: `${m.occupancyRate ?? 0}%`, up: true, icon: 'wallet', featured: true },
    { id: 'members', label: 'Registered users', value: m.totalUsers ?? 0, suffix: '', delta: `${m.activeMemberships ?? 0} active`, up: true, icon: 'globe' },
    { id: 'bookings', label: "Today's bookings", value: m.todayBookings ?? 0, suffix: '', delta: `${m.upcomingBookings ?? 0} upcoming`, up: true, icon: 'bookings' },
    { id: 'inquiries', label: 'KYC pending', value: m.kycPending ?? 0, suffix: '', delta: `${m.pendingMaintenance ?? 0} maint.`, up: false, icon: 'cart' },
  ]
}

const OCC_TREND = [58, 62, 70, 66, 74, 71, 78, 80, 76, 82, 85, 81]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const USER_BARS = [42, 68, 50, 88, 60, 95, 72, 55, 80]
const USER_STATS = [
  { label: 'Check-ins', value: '1,284' },
  { label: 'Tours', value: '48' },
  { label: 'Day pass', value: '96' },
  { label: 'Cabins', value: '32' },
]

const PROJECTS = [
  { name: 'S1 · Anna Nagar 3rd Ave', type: 'Workstations', occ: 86, status: 'Working' },
  { name: 'S2 · Western Extn.', type: 'Mixed floor', occ: 72, status: 'Working' },
  { name: 'S3 · W 115 1st Floor', type: 'Private cabin', occ: 64, status: 'Done' },
  { name: 'S4 · Ravilla Towers', type: 'Premium suite', occ: 91, status: 'Working' },
  { name: 'S5 · Gokulam Building', type: 'Open desk', occ: 58, status: 'Done' },
]

function LineChart({ values }) {
  const w = 560
  const h = 188
  const padX = 12
  const padY = 22
  const pts = values.map((v, i) => {
    const x = padX + (i * (w - padX * 2)) / (values.length - 1)
    const y = h - padY - (v / 100) * (h - padY * 2)
    return [x, y]
  })
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `${padX},${h - padY} ${line} ${w - padX},${h - padY}`
  return (
    <svg className="dash-line" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#occFill)" />
      <polyline points={line} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function BarChart({ values }) {
  const max = Math.max(...values)
  return (
    <div className="dash-bars" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} style={{ '--h': `${(v / max) * 100}%`, '--i': i }} />
      ))}
    </div>
  )
}

function SemiGauge({ value }) {
  const r = 58
  const c = Math.PI * r
  const dash = (value / 100) * c
  return (
    <svg className="dash-gauge dash-gauge--semi" viewBox="0 0 160 100" aria-hidden="true">
      <path d="M22 90 A 58 58 0 0 1 138 90" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M22 90 A 58 58 0 0 1 138 90"
        fill="none"
        stroke="#ffffff"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  )
}

function RingGauge({ value, max = 10 }) {
  const r = 46
  const c = 2 * Math.PI * r
  const dash = (value / max) * c
  return (
    <svg className="dash-gauge dash-gauge--ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 60 60)"
      />
    </svg>
  )
}

function Overview({ onGo, metrics = {}, activities = [], userName = 'Admin' }) {
  const KPIS = kpisFromMetrics(metrics)
  const occupancy = metrics.occupancyRate ?? 0
  return (
    <>
      <section className="dash-kpis">
        {KPIS.map((item, i) => (
          <div key={item.id} className="admin-rise" style={{ '--i': i }}>
            <article
              className={`dash-kpi dash-kpi--${item.id}${item.featured ? ' is-featured' : ''}`}
              data-icon={item.icon}
            >
              <div>
                <p className="dash-kpi__label">{item.label}</p>
                <p className="dash-kpi__value">
                  <span className="dash-kpi__num">
                    <CountUp value={item.value} duration={1100 + i * 90} />
                    {item.suffix}
                  </span>
                  <span className={`dash-kpi__delta ${item.up ? 'is-up' : 'is-down'}`}>
                    {item.delta}
                  </span>
                </p>
              </div>
              <div className="dash-kpi__icon">
                <Icon name={item.icon} />
              </div>
            </article>
          </div>
        ))}
      </section>

      <section className="dash-hero">
        <article className="dash-welcome admin-rise" style={{ '--i': 4 }}>
          <p>Welcome back,</p>
          <h2>{userName}</h2>
          <p className="dash-welcome__copy">
            Live occupancy, KYC, bookings and maintenance from the Senate Space database.
          </p>
          <button type="button" onClick={() => onGo('bookings')}>
            View bookings →
          </button>
        </article>

        <article className="dash-card dash-card--center admin-rise" style={{ '--i': 5 }}>
          <h3>Occupancy rate</h3>
          <div className="dash-gauge-wrap">
            <SemiGauge value={occupancy} />
            <div className="dash-gauge__label">
              <strong>{occupancy}%</strong>
              <span>Based on workspaces</span>
            </div>
          </div>
          <p className="dash-card__foot">
            {metrics.occupiedWorkspaces ?? 0} of { (metrics.availableWorkspaces || 0) + (metrics.occupiedWorkspaces || 0) } workspaces occupied
          </p>
        </article>

        <article className="dash-card dash-card--center admin-rise" style={{ '--i': 6 }}>
          <h3>Revenue</h3>
          <div className="dash-gauge-wrap dash-gauge-wrap--ring">
            <RingGauge value={Math.min(10, (metrics.paymentsCount || 0) / 2)} />
            <div className="dash-gauge__label">
              <strong>₹{Math.round(metrics.revenue || 0)}</strong>
              <span>Paid total</span>
            </div>
          </div>
          <div className="dash-score">
            <div>
              <span>KYC approved</span>
              <strong>{metrics.kycApproved ?? 0}</strong>
            </div>
            <div>
              <span>Active plans</span>
              <strong>{metrics.activeMemberships ?? 0}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dash-charts">
        <article className="dash-card admin-rise" style={{ '--i': 7 }}>
          <div className="admin-panel__head">
            <div>
              <h2>Occupancy overview</h2>
              <p>
                <em className="is-up">(+12%)</em> more fill than last year
              </p>
            </div>
          </div>
          <LineChart values={OCC_TREND} />
          <div className="dash-months">
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </article>

        <article className="dash-card admin-rise" style={{ '--i': 8 }}>
          <div className="admin-panel__head">
            <div>
              <h2>Active users</h2>
              <p>
                <em className="is-up">(+8%)</em> than last week
              </p>
            </div>
          </div>
          <BarChart values={USER_BARS} />
          <div className="dash-user-stats">
            {USER_STATS.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dash-bottom">
        <article className="dash-card admin-rise" style={{ '--i': 9 }}>
          <div className="admin-panel__head">
            <div>
              <h2>Branches</h2>
              <p>Live seat fill across Senate Space floors</p>
            </div>
            <span className="admin-chip">5 locations</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>Fill</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTS.map((row) => (
                  <tr key={row.name}>
                    <td data-label="Branch">{row.name}</td>
                    <td data-label="Type">{row.type}</td>
                    <td data-label="Fill">
                      <div className="dash-mini-bar" style={{ '--w': `${row.occ}%` }}>
                        <span />
                        <em>{row.occ}%</em>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status ${row.status === 'Done' ? 'admin-status--closed' : 'admin-status--new'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dash-card admin-rise" style={{ '--i': 10 }}>
          <div className="admin-panel__head">
            <div>
              <h2>Orders overview</h2>
              <p>
                <em className="is-up">+24%</em> this month
              </p>
            </div>
          </div>
          <ul className="dash-timeline">
            {(activities.length ? activities : []).map((item, i) => (
              <li key={item.id || `${item.action}-${i}`} style={{ '--i': i }}>
                <span className="dash-timeline__dot" />
                <div>
                  <p>
                    <strong>{item.user?.fullName || item.action}</strong> {item.entity}
                  </p>
                  <span>
                    {item.action} · {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : ''}
                  </span>
                </div>
              </li>
            ))}
            {!activities.length ? <li>No recent activity yet.</li> : null}
          </ul>
        </article>
      </section>
    </>
  )
}

function MemberOverview({ onGo, metrics = {}, bookings = [], payments = [], userName = 'Member' }) {
  const kycOk = metrics.kycStatus === 'APPROVED'
  return (
    <>
      <section className="dash-hero admin-rise">
        <div>
          <p className="dash-eyebrow">Member portal</p>
          <h2>Welcome back, {userName.split(' ')[0]}</h2>
          <p>
            {metrics.memberId ? `ID ${metrics.memberId}` : 'Complete your profile'} ·{' '}
            {metrics.membershipPlan || 'No active plan'}
            {metrics.membershipExpires
              ? ` · expires ${new Date(metrics.membershipExpires).toLocaleDateString('en-IN')}`
              : ''}
          </p>
        </div>
        <div className="admin-top__right" style={{ gap: 8 }}>
          <button type="button" className="admin-login__submit" onClick={() => onGo('products-conference')}>
            Book hotdesk
          </button>
          <button type="button" className="admin-login__submit" onClick={() => onGo('profile')}>
            Profile
          </button>
          {!kycOk ? (
            <button type="button" className="admin-login__submit" onClick={() => onGo('kyc')}>
              Complete KYC
            </button>
          ) : null}
        </div>
      </section>
      <section className="dash-kpis">
        {[
          { label: 'Upcoming bookings', value: metrics.upcomingBookings ?? 0, go: 'bookings-physical' },
          { label: 'KYC', value: metrics.kycStatus || '—', go: 'profile' },
          { label: 'Open services', value: metrics.pendingMaintenance ?? 0, go: 'maintenance' },
          { label: 'Profile', value: `${metrics.profileProgress ?? 0}%`, go: 'profile' },
        ].map((k) => (
          <button key={k.label} type="button" className="dash-kpi admin-rise" onClick={() => onGo(k.go)}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
          </button>
        ))}
      </section>
      <section className="admin-grid-2" style={{ marginTop: 16 }}>
        <article className="dash-card admin-rise">
          <h3>Recent bookings</h3>
          {!bookings.length ? <p>No bookings yet.</p> : null}
          <ul>
            {bookings.slice(0, 5).map((b) => (
              <li key={b.id}>
                {b.bookingNumber} · {new Date(b.startAt).toLocaleString('en-IN')} · {b.status}
              </li>
            ))}
          </ul>
          <button type="button" className="admin-login__submit" onClick={() => onGo('bookings-physical')}>
            View all
          </button>
        </article>
        <article className="dash-card admin-rise">
          <h3>Recent payments</h3>
          {!payments.length ? <p>No payments yet.</p> : null}
          <ul>
            {payments.slice(0, 5).map((p) => (
              <li key={p.id}>
                {p.type} · ₹{p.amount} · {p.status}
              </li>
            ))}
          </ul>
          <button type="button" className="admin-login__submit" onClick={() => onGo('payments')}>
            View payments
          </button>
        </article>
      </section>
    </>
  )
}

const COLLAPSE_KEY = 'senate-admin-sidebar'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function isMobileNav() {
  return window.matchMedia('(max-width: 860px)').matches
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout, role, can, canAny } = useAuth()
  const MENU = useMemo(() => menuFor(role, can, canAny), [role, can, canAny])
  const [page, setPage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [openGroups, setOpenGroups] = useState({ bookings: true, packages: true })
  const [metrics, setMetrics] = useState({})
  const [activities, setActivities] = useState([])
  const [memberBookings, setMemberBookings] = useState([])
  const [memberPayments, setMemberPayments] = useState([])
  const [dashError, setDashError] = useState('')

  useEffect(() => {
    if (!MENU.length) return
    const ids = MENU.flatMap((m) => [m.id, ...(m.children || []).map((c) => c.id)])
    if (!ids.includes(page)) setPage(MENU[0].children?.[0]?.id || MENU[0].id)
  }, [MENU, page])

  useEffect(() => {
    document.body.classList.add('admin-body')
    return () => document.body.classList.remove('admin-body')
  }, [])

  useEffect(() => {
    const syncSide = () => {
      const mobile = window.matchMedia('(max-width: 860px)').matches
      const w = mobile ? '0px' : collapsed ? '78px' : '260px'
      document.documentElement.style.setProperty('--side-w', w)
      document.documentElement.style.setProperty('--admin-side-w', w)
    }
    syncSide()
    window.addEventListener('resize', syncSide)
    return () => {
      window.removeEventListener('resize', syncSide)
      document.documentElement.style.removeProperty('--side-w')
      document.documentElement.style.removeProperty('--admin-side-w')
    }
  }, [collapsed])

  useEffect(() => {
    if (!user) return undefined
    if (role === 'MEMBER') {
      dashboardApi
        .member()
        .then((res) => {
          const d = res.data.data
          setMetrics(
            d.metrics || {
              todayBookings: d.bookings?.length || 0,
              upcomingBookings: d.upcoming?.length || 0,
              totalUsers: 1,
            },
          )
          setActivities(d.recentActivities || d.notifications || [])
          setMemberBookings(d.bookings || [])
          setMemberPayments(d.payments || [])
        })
        .catch((err) => setDashError(apiError(err)))
      return undefined
    }

    // Staff without dashboard permission: skip metrics API
    if (!canAny('dashboard.admin', 'dashboard.front_desk', 'dashboard.maintenance')) {
      setMetrics({})
      setActivities([])
      return undefined
    }

    const load = can('dashboard.admin')
      ? dashboardApi.admin()
      : can('dashboard.front_desk')
        ? dashboardApi.frontDesk()
        : dashboardApi.maintenance()

    load
      .then((res) => {
        const d = res.data.data
        setMetrics(
          d.metrics || {
            todayBookings: d.today?.length || d.bookings?.length || 0,
            upcomingBookings: d.upcoming?.length || 0,
            totalUsers: 1,
          },
        )
        setActivities(d.recentActivities || d.notifications || [])
        setMemberBookings(d.bookings || [])
        setMemberPayments(d.payments || [])
      })
      .catch((err) => setDashError(apiError(err)))
  }, [user, role, can, canAny])

  const onLogout = async () => {
    await logout()
    navigate(role === 'MEMBER' ? '/login' : '/admin/login')
  }

  const go = (id) => {
    setPage(id)
    setMobileOpen(false)
  }

  const toggleGroup = (id) => {
    setOpenGroups((g) => ({ ...g, [id]: !g[id] }))
  }

  const isGroupActive = (item) =>
    page === item.id || (item.children || []).some((c) => c.id === page)

  const toggleSidebar = () => {
    if (isMobileNav()) {
      setMobileOpen((v) => !v)
      return
    }
    setCollapsed((v) => {
      const next = !v
      writeCollapsed(next)
      return next
    })
  }

  const renderPage = () => {
    if (page === 'dashboard') {
      return (
        <>
          {dashError ? <p className="admin-login__error">{dashError}</p> : null}
          {role === 'MEMBER' ? (
            <MemberOverview
              onGo={go}
              metrics={metrics}
              bookings={memberBookings}
              payments={memberPayments}
              userName={user?.fullName || 'Member'}
            />
          ) : (
            <Overview onGo={go} metrics={metrics} activities={activities} userName={user?.fullName || 'Admin'} />
          )}
        </>
      )
    }
    if (page === 'members') return <MembersPage />
    if (page === 'customers') return <CustomersPage />
    if (page === 'kyc') return role === 'MEMBER' ? <ProfilePage user={user} /> : <MembersPage initialTab="kyc-review" />
    if (page === 'bookings' || page === 'bookings-physical') {
      return <ContractsPage kindFilter="PHYSICAL_OFFICE" title={role === 'MEMBER' ? 'My bookings · Physical' : 'Bookings · Physical'} />
    }
    if (page === 'bookings-virtual') {
      return <ContractsPage kindFilter="VIRTUAL_OFFICE" title={role === 'MEMBER' ? 'My bookings · Virtual' : 'Bookings · Virtual'} />
    }
    if (page === 'bookings-conference') {
      return (
        <BookingsPage
          resourceType="CONFERENCE_ROOM"
          title={role === 'MEMBER' ? 'My bookings · Conference' : 'Bookings · Conference / Meeting'}
          canDesk={role === 'FRONT_DESK' || role === 'ADMIN' || role === 'SUPER_ADMIN'}
        />
      )
    }
    if (page === 'bookings-hotdesk') {
      return (
        <BookingsPage
          resourceType="CONFERENCE_ROOM"
          title={role === 'MEMBER' ? 'My bookings · Hotdesk' : 'Bookings · Hotdesk'}
          canDesk={role === 'FRONT_DESK' || role === 'ADMIN' || role === 'SUPER_ADMIN'}
        />
      )
    }
    if (page === 'conference-book' || page === 'new-booking') {
      return <PackagesPage initialCategory="CONFERENCE" title="Products · Conference / Meeting" />
    }
    if (page === 'spaces') return <SpacesPage />
    if (page === 'rooms') return <RoomsPage />
    if (page === 'packages') return <PackagesPage initialCategory="" title="Products / Membership types" />
    if (page === 'products-physical') return <PackagesPage initialCategory="PHYSICAL_OFFICE" title="Products · Physical" />
    if (page === 'products-virtual') return <PackagesPage initialCategory="VIRTUAL_OFFICE" title="Products · Virtual" />
    if (page === 'products-hotdesk') return <PackagesPage initialCategory="HOT_DESK" title="Products · Hotdesk" />
    if (page === 'products-conference') return <PackagesPage initialCategory="CONFERENCE" title="Products · Conference / Meeting" />
    if (page === 'virtual-office') return <VirtualOfficePage />
    if (page === 'contracts') return <ContractsPage kindFilter="" title="Bookings" />
    if (page === 'payments') return <PaymentsPage />
    if (page === 'accounts') return <AccountsPage />
    if (page === 'invoices') return <InvoicesPage />
    if (page === 'maintenance') return <MaintenancePage staff={!can('maintenance.assign') && can('maintenance.update')} />
    if (page === 'staff') return <StaffPage />
    if (page === 'hrm') return <HrmPage />
    if (page === 'roles') return <RolesPage />
    if (page === 'reports') return <ReportsPage />
    if (page === 'settings') return <SettingsPage />
    if (page === 'audit') return <AuditPage />
    if (page === 'inquiries') return <InquiriesPage />
    if (page === 'hrm' || page === 'hrm-directory') return <HrmPage module="directory" />
    if (page === 'hrm-work') return <HrmPage module="work" />
    if (page === 'hrm-attendance') return <HrmPage module="attendance" />
    if (page === 'hrm-leave') return <HrmPage module="leave" />
    if (page === 'hrm-payslip') return <HrmPage module="payslip" />
    if (page === 'hrm-pending') return <HrmPage module="pending" />
    if (page === 'profile') return <ProfilePage user={user} />
    return <MembersPage />
  }

  return (
    <div
      className={`admin${collapsed ? ' admin--collapsed' : ''}${mobileOpen ? ' admin--nav-open' : ''}`}
    >
      <div className="admin__metal" aria-hidden="true">
        <MoltenMetal
          color1="#5227FF"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={0.3}
          opacity={1}
        />
      </div>
      <div className="admin__veil" aria-hidden="true" />
      <button
        type="button"
        className="admin-backdrop"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside className="admin-side">
        <div className="admin-side__brand">
          <img src={senateLogo} alt="" />
          <div className="admin-side__brand-text">
            <p>
              SENATE<span>Space</span>
            </p>
            <small>{role === 'MEMBER' ? 'Member' : user?.role?.name || role || 'Staff'}</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {!MENU.length ? (
            <p className="admin-login__hint" style={{ padding: '12px 16px', margin: 0 }}>
              No modules assigned to your role. Ask an admin to update Roles &amp; permissions.
            </p>
          ) : null}
          {MENU.map((item) =>
            item.children?.length ? (
              <div key={item.id} className={`admin-nav-group${isGroupActive(item) ? ' is-active-group' : ''}`}>
                <button
                  type="button"
                  className={isGroupActive(item) ? 'is-active' : ''}
                  data-label={item.label}
                  onClick={() => {
                    toggleGroup(item.id)
                    if (!openGroups[item.id]) go(item.children[0].id)
                  }}
                >
                  <span className="admin-nav__icon">
                    <Icon name={item.id} />
                  </span>
                  <span className="admin-nav__label">{item.label}</span>
                </button>
                {openGroups[item.id] || isGroupActive(item) ? (
                  <div className="admin-nav-sub">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={page === child.id ? 'is-active' : ''}
                        data-label={child.label}
                        onClick={() => go(child.id)}
                      >
                        <span className="admin-nav__label">{child.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                className={page === item.id ? 'is-active' : ''}
                data-label={item.label}
                onClick={() => go(item.id)}
              >
                <span className="admin-nav__icon">
                  <Icon name={item.id} />
                </span>
                <span className="admin-nav__label">{item.label}</span>
              </button>
            ),
          )}
        </nav>

        <div className="admin-side__foot">
          <button type="button" data-label="View website" onClick={() => navigate('/')}>
            <span className="admin-nav__icon">
              <Icon name="site" />
            </span>
            <span className="admin-nav__label">View website</span>
          </button>
          <button
            type="button"
            className="admin-side__logout"
            data-label="Sign out"
            onClick={onLogout}
          >
            <span className="admin-nav__icon">
              <Icon name="logout" />
            </span>
            <span className="admin-nav__label">Sign out</span>
          </button>
        </div>

        <button
          type="button"
          className="admin-side__edge"
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
          onClick={toggleSidebar}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-top">
          <div className="admin-top__bar">
            <div className="admin-top__left">
              <button
                type="button"
                className={`admin-menu-btn${mobileOpen ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
                aria-label={
                  isMobileNav()
                    ? mobileOpen
                      ? 'Close menu'
                      : 'Open menu'
                    : collapsed
                      ? 'Open sidebar'
                      : 'Close sidebar'
                }
                onClick={toggleSidebar}
              >
                <span />
                <span />
                <span />
              </button>
              <div className="admin-top__title">
                <p className="admin-top__eyebrow">Senate Space</p>
                <h1>
                  {(() => {
                    if (page === 'dashboard') return 'Dashboard'
                    for (const m of MENU) {
                      if (m.id === page) return m.label
                      const child = (m.children || []).find((c) => c.id === page)
                      if (child) return `${m.label} · ${child.label}`
                    }
                    return 'Workspace'
                  })()}
                </h1>
              </div>
            </div>
            <div className="admin-top__right">
              <p className="admin-top__date">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <span className="admin-top__live">
                <i />
                Live
              </span>
              <div className="admin-top__user">
                <span className="admin-top__user-meta">
                  <strong>{user?.fullName || 'Admin'}</strong>
                  <small>{role || 'Workspace'}</small>
                </span>
                <span className="admin-top__avatar">{(user?.fullName || 'A').slice(0, 1)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">{renderPage()}</div>
      </div>
    </div>
  )
}

