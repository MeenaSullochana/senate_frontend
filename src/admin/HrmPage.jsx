import { useEffect, useState } from 'react'
import { hrmApi } from '../services/api'
import { apiError } from '../services/api/client'
import { useAuth } from '../context/AuthContext'

function Panel({ title, actions, children }) {
  return (
    <article className="dash-card admin-rise">
      <div className="admin-panel__head">
        <div>
          <h2>{title}</h2>
        </div>
        {actions ? <div className="admin-top__right">{actions}</div> : null}
      </div>
      {children}
    </article>
  )
}

export function HrmPage({ module: moduleProp = 'directory' }) {
  const { can, canAny } = useAuth()
  const selfOnly = can('hrm.self') && !canAny('hrm.view', 'hrm.update', 'hrm.attendance', 'hrm.leave', 'hrm.salary', 'staff.view')
  const module = selfOnly ? (moduleProp === 'pending' || moduleProp === 'directory' ? 'work' : moduleProp) : moduleProp
  const [hub, setHub] = useState(
    selfOnly ? 'employee' : module === 'directory' ? 'directory' : module === 'pending' ? 'pending' : 'employee',
  )
  const [tab, setTab] = useState(
    selfOnly
      ? module === 'attendance'
        ? 'attendance'
        : module === 'leave'
          ? 'leave'
          : module === 'payslip'
            ? 'payslip'
            : 'staff'
      : module === 'attendance'
        ? 'attendance'
        : module === 'leave'
          ? 'leave'
          : module === 'payslip'
            ? 'payslip'
            : module === 'work'
              ? 'staff'
              : 'staff',
  )
  const [staff, setStaff] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [leaves, setLeaves] = useState([])
  const [payslips, setPayslips] = useState([])
  const [pending, setPending] = useState(null)
  const [workStats, setWorkStats] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [workForm, setWorkForm] = useState({})
  const [attForm, setAttForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    status: 'PRESENT',
    checkInAt: '09:30',
    checkOutAt: '18:30',
  })
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL',
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: '',
  })
  const [payForm, setPayForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    deductions: 0,
    status: 'DRAFT',
  })

  const canEditWork = !selfOnly && canAny('hrm.update', 'hrm.salary', 'staff.update')
  const canAttendance = !selfOnly && canAny('hrm.attendance', 'hrm.create')
  const canLeave = can('hrm.self') || canAny('hrm.leave', 'hrm.create')
  const canDecideLeave = !selfOnly && canAny('hrm.leave', 'hrm.update')
  const canPayslip = !selfOnly && canAny('hrm.payslip', 'hrm.salary', 'hrm.create')
  const MODULES = selfOnly
    ? [
        { id: 'staff', label: 'My profile' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'salary', label: 'Salary' },
      ]
    : [
        { id: 'staff', label: 'Work info' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leave', label: 'Leave' },
        { id: 'salary', label: 'Salary' },
      ]

  const loadPending = async () => {
    if (selfOnly) {
      setPending(null)
      return
    }
    try {
      const res = await hrmApi.pending()
      setPending(res.data.data)
    } catch {
      setPending(null)
    }
  }

  const loadStaff = async () => {
    try {
      const res = await hrmApi.listStaff({ limit: 100 })
      const items = res.data.data.items || []
      setStaff(items)
      if (selfOnly && items[0]) {
        setSelectedId(items[0].userId || items[0].id)
        setHub('employee')
      }
    } catch (err) {
      setError(apiError(err))
    }
  }

  const loadDetail = async (id) => {
    if (!id) {
      setDetail(null)
      setWorkStats(null)
      return
    }
    setError('')
    try {
      const res = await hrmApi.getStaff(id)
      const s = res.data.data.staff
      setDetail(s)
      setWorkForm({
        department: s.department || '',
        designation: s.designation || '',
        phone: s.phone || '',
        address: s.address || '',
        centreName: s.centreName || '',
        joiningDate: s.joiningDate ? String(s.joiningDate).slice(0, 10) : '',
        salaryBasic: s.salaryBasic ?? '',
        salaryHra: s.salaryHra ?? '',
        salaryOther: s.salaryOther ?? '',
        bankAccount: s.bankAccount || '',
        bankIfsc: s.bankIfsc || '',
        bankName: s.bankName || '',
        panNumber: s.panNumber || '',
        aadhaarNumber: s.aadhaarNumber || '',
      })
      const [a, l, p, stats] = await Promise.all([
        hrmApi.listAttendance({ staffProfileId: s.id, limit: 40 }),
        hrmApi.listLeaves({ staffProfileId: s.id, limit: 40 }),
        hrmApi.listPayslips({ staffProfileId: s.id, limit: 24 }),
        hrmApi.workStats(s.id).catch(() => null),
      ])
      setAttendance(a.data.data.items || [])
      setLeaves(l.data.data.items || [])
      setPayslips(p.data.data.items || [])
      setWorkStats(stats?.data?.data || null)
    } catch (err) {
      setError(apiError(err))
    }
  }

  useEffect(() => {
    if (selfOnly) {
      setHub('employee')
      setTab(
        module === 'attendance'
          ? 'attendance'
          : module === 'leave'
            ? 'leave'
            : module === 'payslip'
              ? 'payslip'
              : 'staff',
      )
      return
    }
    if (module === 'directory') {
      setHub('directory')
    } else if (module === 'pending') {
      setHub('pending')
    } else {
      setHub('employee')
      setTab(
        module === 'attendance'
          ? 'attendance'
          : module === 'leave'
            ? 'leave'
            : module === 'payslip'
              ? 'payslip'
              : 'staff',
      )
    }
  }, [module, selfOnly])

  useEffect(() => {
    loadStaff()
    loadPending()
  }, [])

  useEffect(() => {
    loadDetail(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const openStaff = (staffUserId, nextTab = 'staff') => {
    setSelectedId(staffUserId)
    setHub('employee')
    setTab(nextTab)
  }

  const saveWork = async (e) => {
    e.preventDefault()
    if (!selectedId || !canEditWork) return
    setMsg('')
    try {
      await hrmApi.updateWorkInfo(selectedId, workForm)
      setMsg('Work info saved')
      await loadDetail(selectedId)
      await loadStaff()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const saveAttendance = async (e) => {
    e.preventDefault()
    if (!detail?.id || !canAttendance) return
    try {
      const date = attForm.date
      const checkInAt = attForm.checkInAt ? `${date}T${attForm.checkInAt}:00` : undefined
      const checkOutAt = attForm.checkOutAt ? `${date}T${attForm.checkOutAt}:00` : undefined
      await hrmApi.upsertAttendance({
        staffProfileId: detail.id,
        date,
        status: attForm.status,
        checkInAt,
        checkOutAt,
      })
      setMsg('Attendance saved')
      await loadDetail(selectedId)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const downloadStaffReport = () => {
    if (!detail) return
    const gross =
      Number(workForm.salaryBasic || 0) + Number(workForm.salaryHra || 0) + Number(workForm.salaryOther || 0)
    const lines = [
      `Employee: ${detail.user?.fullName || '—'} (${detail.employeeId})`,
      `Email: ${detail.user?.email || '—'}`,
      `Role: ${detail.user?.role?.name || '—'}`,
      `Department: ${workForm.department || '—'}`,
      `Designation: ${workForm.designation || '—'}`,
      `Centre: ${workForm.centreName || '—'}`,
      `Phone: ${workForm.phone || '—'}`,
      `Joining: ${workForm.joiningDate || '—'}`,
      `Salary basic: ${workForm.salaryBasic || 0}`,
      `Salary HRA: ${workForm.salaryHra || 0}`,
      `Salary other: ${workForm.salaryOther || 0}`,
      `Gross: ${gross}`,
      '',
      workStats?.summary
        ? `--- Work performance (${workStats.summary.label}) ---`
        : '--- Work performance ---',
      ...(workStats?.metrics || []).map(
        (m) => `${m.label}: ${m.currency ? `₹${m.value}` : m.value}${m.hint ? ` (${m.hint})` : ''}`,
      ),
      '',
      '--- Attendance ---',
      ...attendance.map(
        (a) =>
          `${String(a.date).slice(0, 10)} | ${a.status} | in ${a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString('en-IN') : '—'} | out ${a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString('en-IN') : '—'}`,
      ),
      '',
      '--- Leave ---',
      ...leaves.map(
        (l) =>
          `${l.leaveType} | ${String(l.fromDate).slice(0, 10)}→${String(l.toDate).slice(0, 10)} | ${l.days}d | ${l.status}`,
      ),
      '',
      '--- Payslips ---',
      ...payslips.map((p) => `${p.month}/${p.year} | net ₹${p.netPay || 0} | ${p.status}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hrm-${detail.employeeId || 'staff'}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveLeave = async (e) => {
    e.preventDefault()
    if (!detail?.id || !canLeave) return
    try {
      await hrmApi.createLeave({ ...leaveForm, staffProfileId: detail.id })
      setMsg('Leave requested')
      await loadDetail(selectedId)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const decideLeave = async (id, status) => {
    if (!canDecideLeave) return
    try {
      await hrmApi.decideLeave(id, { status })
      setMsg(`Leave ${status.toLowerCase()}`)
      await loadDetail(selectedId)
      await loadPending()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const savePayslip = async (e) => {
    e.preventDefault()
    if (!detail?.id || !canPayslip) return
    try {
      await hrmApi.upsertPayslip({
        staffProfileId: detail.id,
        ...payForm,
        basic: workForm.salaryBasic,
        hra: workForm.salaryHra,
        otherEarnings: workForm.salaryOther,
      })
      setMsg('Payslip saved')
      await loadDetail(selectedId)
    } catch (err) {
      setError(apiError(err))
    }
  }

  const [deptFilter, setDeptFilter] = useState('')
  const filteredStaff = staff.filter((s) => {
    if (!deptFilter) return true
    return String(s.department || '').toLowerCase() === deptFilter.toLowerCase()
  })
  const departments = [...new Set(staff.map((s) => s.department).filter(Boolean))].sort()

  const titles = {
    directory: 'HRM · Staff directory',
    pending: 'HRM · Pending work',
    work: 'HRM · Work info',
    attendance: 'HRM · Attendance',
    leave: 'HRM · Leave',
    payslip: 'HRM · Payslip / Salary',
  }

  return (
    <Panel
      title={selfOnly ? 'My HRM' : titles[module] || 'HRM'}
      actions={
        detail ? (
          <button type="button" className="enq-ghost" onClick={downloadStaffReport}>
            Download report
          </button>
        ) : null
      }
    >
      {error ? <p className="admin-login__error">{error}</p> : null}
      {msg ? <p className="admin-login__hint">{msg}</p> : null}

      <p className="admin-login__hint">
        {selfOnly
          ? 'Your work profile, attendance (in/out), leave, and salary. Other employees are hidden.'
          : module === 'directory'
            ? 'Click View on a staff row to open their work info, attendance, leave, and salary.'
            : 'Filter by department, select a staff member, then manage this module. Super Admin sees everyone; other roles see what their permissions allow.'}
      </p>

      {/* Side-nav already splits modules — hide the old hub tabs except when browsing directory/pending */}
      {!selfOnly && (module === 'directory' || module === 'pending') ? (
        <div className="enq-tabs" style={{ marginBottom: 16 }}>
          {[
            ['pending', 'Pending work'],
            ['directory', 'All staff'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={hub === id ? 'is-active' : ''} onClick={() => setHub(id)}>
              {label}
              {id === 'pending' && pending?.pendingLeaveCount ? ` (${pending.pendingLeaveCount})` : ''}
            </button>
          ))}
        </div>
      ) : null}

      {hub === 'pending' && !selfOnly ? (
        <div className="admin-grid-2" style={{ alignItems: 'start' }}>
          <div className="enq-follow-block">
            <h4 style={{ marginTop: 0 }}>
              Snapshot · {pending?.staffCount ?? '—'} staff · {pending?.todayAttendanceMarked ?? 0} marked today
            </h4>
            <p className="admin-login__hint">
              Pending leaves: <strong>{pending?.pendingLeaveCount ?? 0}</strong> · Draft payslips:{' '}
              <strong>{pending?.draftPayslipCount ?? 0}</strong>
            </p>
          </div>
          <div />
          <div>
            <h4>Pending leave approvals</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(pending?.pendingLeaves || []).map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.staffProfile?.user?.fullName || '—'}
                        <div className="admin-login__hint">{l.staffProfile?.employeeId}</div>
                      </td>
                      <td>{l.leaveType}</td>
                      <td>
                        {String(l.fromDate).slice(0, 10)} → {String(l.toDate).slice(0, 10)}
                      </td>
                      <td>
                        {canAny('hrm.leave', 'hrm.update') ? (
                          <>
                            <button type="button" className="enq-ghost" onClick={() => decideLeave(l.id, 'APPROVED').then(loadPending)}>
                              Approve
                            </button>{' '}
                            <button type="button" className="enq-ghost" onClick={() => decideLeave(l.id, 'REJECTED').then(loadPending)}>
                              Reject
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="enq-ghost"
                          onClick={() => openStaff(l.staffProfile?.userId || l.staffProfile?.id, 'leave')}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!pending?.pendingLeaves?.length ? (
                    <tr>
                      <td colSpan={4}>No pending leaves</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4>Draft payslips</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Net</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(pending?.draftPayslips || []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.staffProfile?.user?.fullName || '—'}</td>
                      <td>
                        {p.month}/{p.year}
                      </td>
                      <td>₹{p.netPay || 0}</td>
                      <td>
                        <button
                          type="button"
                          className="enq-ghost"
                          onClick={() => openStaff(p.staffProfile?.userId || p.staffProfile?.id, 'payslip')}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!pending?.draftPayslips?.length ? (
                    <tr>
                      <td colSpan={4}>No draft payslips</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {hub === 'directory' ? (
        <div>
          <div className="admin-toolbar" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="admin-field" style={{ margin: 0, minWidth: 180 }}>
              <span>Department</span>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <p className="admin-login__hint" style={{ alignSelf: 'end', margin: 0 }}>
              {filteredStaff.length} staff
            </p>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Dept</th>
                  <th>Designation</th>
                  <th>Centre</th>
                  <th>Gross salary</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s) => {
                  const gross =
                    Number(s.salaryBasic || 0) + Number(s.salaryHra || 0) + Number(s.salaryOther || 0)
                  return (
                    <tr key={s.id}>
                      <td>{s.employeeId}</td>
                      <td>
                        {s.user?.fullName || '—'}
                        <div className="admin-login__hint">{s.user?.email}</div>
                      </td>
                      <td>{s.user?.role?.name || '—'}</td>
                      <td>{s.department || '—'}</td>
                      <td>{s.designation || '—'}</td>
                      <td>{s.centreName || '—'}</td>
                      <td>{gross ? `₹${gross.toLocaleString('en-IN')}` : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-login__submit"
                          onClick={() => openStaff(s.id, 'staff')}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!filteredStaff.length ? (
                  <tr>
                    <td colSpan={8}>No staff match this filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {hub === 'employee' || selfOnly || ['work', 'attendance', 'leave', 'payslip'].includes(module) ? (
      <div className="admin-grid-2" style={{ alignItems: 'start' }}>
        <div>
          {!selfOnly ? (
            <>
              <div className="admin-toolbar" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <label className="admin-field" style={{ margin: 0, minWidth: 160 }}>
                  <span>Department</span>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="admin-field">
                <span>Select staff</span>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">— Choose employee —</option>
                  {filteredStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.employeeId} · {s.user?.fullName || '—'} · {s.user?.role?.name || s.department || ''}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          {!staff.length ? (
            <p className="admin-login__hint">No staff profiles yet. Create staff under Staff first, then assign Roles &amp; permissions.</p>
          ) : null}

          {detail ? (
            <>
              {/* When opened from a specific side-nav module, lock to that tab */}
              {module === 'directory' || selfOnly ? (
                <div className="enq-tabs" style={{ marginTop: 12 }}>
                  {MODULES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={tab === id || (id === 'salary' && tab === 'payslip') ? 'is-active' : ''}
                      onClick={() => setTab(id === 'salary' ? 'payslip' : id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <h4 style={{ marginTop: 12 }}>
                  {detail.user?.fullName} · {detail.employeeId}
                </h4>
              )}

              {tab === 'staff' ? (
                <form className="enq-follow-block" onSubmit={saveWork} style={{ marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>
                    {detail.user?.fullName} · {detail.employeeId}
                  </h4>
                  <p className="admin-login__hint">
                    Login role: <strong>{detail.user?.role?.name || '—'}</strong>
                    {detail.department ? ` · Dept ${detail.department}` : ''}
                  </p>

                  {workStats?.summary ? (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ margin: '0 0 8px' }}>{workStats.summary.label}</h4>
                      <div className="admin-grid-2" style={{ gap: 10, marginBottom: 10 }}>
                        <div className="enq-follow-block" style={{ margin: 0, padding: '12px 14px' }}>
                          <p className="admin-login__hint" style={{ margin: 0 }}>
                            {workStats.summary.completedLabel}
                          </p>
                          <strong style={{ fontSize: '1.35rem' }}>
                            {workStats.summary.isCurrency
                              ? `₹${Number(workStats.summary.completed || 0).toLocaleString('en-IN')}`
                              : workStats.summary.completed}
                          </strong>
                        </div>
                        <div className="enq-follow-block" style={{ margin: 0, padding: '12px 14px' }}>
                          <p className="admin-login__hint" style={{ margin: 0 }}>
                            {workStats.summary.pendingLabel}
                          </p>
                          <strong style={{ fontSize: '1.35rem' }}>
                            {workStats.summary.isCurrency
                              ? `₹${Number(workStats.summary.pending || 0).toLocaleString('en-IN')}`
                              : workStats.summary.pending}
                          </strong>
                        </div>
                      </div>
                      {(workStats.metrics || []).length ? (
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Metric</th>
                                <th>Value</th>
                                <th>Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {workStats.metrics.map((m) => (
                                <tr key={m.key}>
                                  <td>{m.label}</td>
                                  <td>
                                    {m.currency
                                      ? `₹${Number(m.value || 0).toLocaleString('en-IN')}`
                                      : m.value}
                                  </td>
                                  <td className="admin-login__hint">{m.hint || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                      <p className="admin-login__hint" style={{ marginTop: 8 }}>
                        {workStats.summary.track === 'SERVICE'
                          ? 'Service staff: completed vs pending tickets assigned to them.'
                          : workStats.summary.track === 'SALES'
                            ? 'Sales: converted enquiries / confirmed bookings vs open pipeline.'
                            : workStats.summary.track === 'ACCOUNTS'
                              ? 'Accounts: rent & payments collected this month vs still pending.'
                              : 'Based on this employee’s role and department.'}
                      </p>
                    </div>
                  ) : detail ? (
                    <p className="admin-login__hint">No role performance data yet for this staff.</p>
                  ) : null}

                  <h4>Profile &amp; salary structure</h4>
                  <div className="admin-grid-2">
                    {[
                      ['department', 'Department'],
                      ['designation', 'Designation'],
                      ['phone', 'Phone'],
                      ['centreName', 'Centre'],
                      ['joiningDate', 'Joining date', 'date'],
                      ['salaryBasic', 'Basic salary'],
                      ['salaryHra', 'HRA'],
                      ['salaryOther', 'Other earnings'],
                      ['bankName', 'Bank'],
                      ['bankAccount', 'Account no'],
                      ['bankIfsc', 'IFSC'],
                      ['panNumber', 'PAN'],
                      ['aadhaarNumber', 'Aadhaar'],
                    ].map(([key, label, type]) => (
                      <label key={key} className="admin-field">
                        <span>{label}</span>
                        <input
                          type={type || 'text'}
                          value={workForm[key] ?? ''}
                          disabled={!canEditWork}
                          onChange={(e) => setWorkForm({ ...workForm, [key]: e.target.value })}
                        />
                      </label>
                    ))}
                    <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                      <span>Address</span>
                      <textarea
                        rows={2}
                        value={workForm.address || ''}
                        disabled={!canEditWork}
                        onChange={(e) => setWorkForm({ ...workForm, address: e.target.value })}
                      />
                    </label>
                  </div>
                  {canEditWork ? (
                    <button type="submit" className="admin-login__submit" style={{ marginTop: 10 }}>
                      Save work info
                    </button>
                  ) : null}
                </form>
              ) : null}

              {tab === 'attendance' ? (
                <div style={{ marginTop: 12 }}>
                  {canAttendance ? (
                    <form className="enq-follow-block" onSubmit={saveAttendance}>
                      <div className="admin-grid-2">
                        <label className="admin-field">
                          <span>Date</span>
                          <input
                            type="date"
                            value={attForm.date}
                            onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
                            required
                          />
                        </label>
                        <label className="admin-field">
                          <span>Status</span>
                          <select
                            value={attForm.status}
                            onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
                          >
                            {['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEK_OFF'].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>In time</span>
                          <input
                            type="time"
                            value={attForm.checkInAt}
                            onChange={(e) => setAttForm({ ...attForm, checkInAt: e.target.value })}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Out time</span>
                          <input
                            type="time"
                            value={attForm.checkOutAt}
                            onChange={(e) => setAttForm({ ...attForm, checkOutAt: e.target.value })}
                          />
                        </label>
                      </div>
                      <button type="submit" className="admin-login__submit" style={{ marginTop: 10 }}>
                        Mark attendance
                      </button>
                    </form>
                  ) : null}
                  <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>In</th>
                          <th>Out</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((a) => (
                          <tr key={a.id}>
                            <td>{String(a.date).slice(0, 10)}</td>
                            <td>{a.status}</td>
                            <td>{a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td>{a.notes || '—'}</td>
                          </tr>
                        ))}
                        {!attendance.length ? (
                          <tr>
                            <td colSpan={5}>No attendance yet</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {tab === 'leave' ? (
                <div style={{ marginTop: 12 }}>
                  {canLeave ? (
                    <form className="enq-follow-block" onSubmit={saveLeave}>
                      <div className="admin-grid-2">
                        <label className="admin-field">
                          <span>Type</span>
                          <select
                            value={leaveForm.leaveType}
                            onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                          >
                            {['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          <span>From</span>
                          <input
                            type="date"
                            value={leaveForm.fromDate}
                            onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                            required
                          />
                        </label>
                        <label className="admin-field">
                          <span>To</span>
                          <input
                            type="date"
                            value={leaveForm.toDate}
                            onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                            required
                          />
                        </label>
                        <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                          <span>Reason</span>
                          <input
                            value={leaveForm.reason}
                            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                          />
                        </label>
                      </div>
                      <button type="submit" className="admin-login__submit" style={{ marginTop: 10 }}>
                        Request leave
                      </button>
                    </form>
                  ) : null}
                  <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map((l) => (
                          <tr key={l.id}>
                            <td>{l.leaveType}</td>
                            <td>
                              {String(l.fromDate).slice(0, 10)} → {String(l.toDate).slice(0, 10)}
                            </td>
                            <td>{l.days}</td>
                            <td>{l.status}</td>
                            <td>
                              {l.status === 'PENDING' && canDecideLeave ? (
                                <>
                                  <button type="button" className="enq-ghost" onClick={() => decideLeave(l.id, 'APPROVED')}>
                                    Approve
                                  </button>{' '}
                                  <button type="button" className="enq-ghost" onClick={() => decideLeave(l.id, 'REJECTED')}>
                                    Reject
                                  </button>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                        {!leaves.length ? (
                          <tr>
                            <td colSpan={5}>No leave records</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {tab === 'payslip' ? (
                <div style={{ marginTop: 12 }}>
                  {canPayslip ? (
                    <form className="enq-follow-block" onSubmit={savePayslip}>
                      <p className="admin-login__hint">
                        Uses saved basic / HRA / other from work info. Net = earnings − deductions.
                      </p>
                      <div className="admin-grid-2">
                        <label className="admin-field">
                          <span>Month</span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={payForm.month}
                            onChange={(e) => setPayForm({ ...payForm, month: Number(e.target.value) })}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Year</span>
                          <input
                            type="number"
                            value={payForm.year}
                            onChange={(e) => setPayForm({ ...payForm, year: Number(e.target.value) })}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Deductions</span>
                          <input
                            type="number"
                            value={payForm.deductions}
                            onChange={(e) => setPayForm({ ...payForm, deductions: Number(e.target.value) })}
                          />
                        </label>
                        <label className="admin-field">
                          <span>Status</span>
                          <select
                            value={payForm.status}
                            onChange={(e) => setPayForm({ ...payForm, status: e.target.value })}
                          >
                            {['DRAFT', 'FINAL', 'PAID'].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button type="submit" className="admin-login__submit" style={{ marginTop: 10 }}>
                        Save payslip
                      </button>
                    </form>
                  ) : null}
                  <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Gross</th>
                          <th>Deductions</th>
                          <th>Net</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payslips.map((p) => (
                          <tr key={p.id}>
                            <td>
                              {p.month}/{p.year}
                            </td>
                            <td>₹{(p.basic || 0) + (p.hra || 0) + (p.otherEarnings || 0)}</td>
                            <td>₹{p.deductions || 0}</td>
                            <td>₹{p.netPay || 0}</td>
                            <td>{p.status}</td>
                          </tr>
                        ))}
                        {!payslips.length ? (
                          <tr>
                            <td colSpan={5}>No payslips yet</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="admin-login__hint" style={{ marginTop: 16 }}>
              Select a staff member to manage work info, attendance, leave, and payslips.
            </p>
          )}
        </div>
      </div>
      ) : null}
    </Panel>
  )
}


export default HrmPage

