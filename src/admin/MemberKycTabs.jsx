import { useEffect, useMemo, useState } from 'react'
import { contractApi, docsApi, kycApi, onboardingApi, userApi } from '../services/api'
import { apiError } from '../services/api/client'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'business', label: 'Business' },
  { id: 'authority', label: 'Authority' },
  { id: 'mmc', label: 'MMC Agreement' },
]

const ENTITY_TYPES = [
  'Private Limited',
  'Public Limited',
  'LLP',
  'Partnership',
  'Proprietorship',
  'OPC',
  'Others',
]

const ID_TYPES = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER']

function d10(v) {
  return v ? String(v).slice(0, 10) : ''
}

function emptyBusiness() {
  return {
    companyName: '',
    legalCompanyName: '',
    entityType: '',
    tradeName: '',
    designation: '',
    registeredAddress: '',
    communicationAddressSame: true,
    communicationAddress: '',
    gstRegistered: false,
    gstNumber: '',
    companyPan: '',
    companyPanUrl: '',
    gstCertificateUrl: '',
    incorporationCertUrl: '',
    companyProofUrl: '',
    regDocumentsUrl: '',
    businessDocUrl: '',
  }
}

function emptyAuthority() {
  return {
    signatoryName: '',
    signatoryDesignation: '',
    signatoryEmail: '',
    signatoryMobile: '',
    signatoryAltMobile: '',
    signatoryIdType: 'AADHAAR',
    signatoryIdUrl: '',
    signatoryPan: '',
    signatoryPanUrl: '',
    authorityDocUrl: '',
  }
}

export function memberFormFromUser(user) {
  const p = user?.memberProfile || {}
  return {
    fullName: user?.fullName || '',
    mobile: user?.mobile || '',
    contactPerson: p.contactPerson || user?.fullName || '',
    alternateEmail: p.alternateEmail || '',
    alternateMobile: p.alternateMobile || '',
    whatsappGroup: ['Yes', 'No'].includes(p.whatsappGroup)
      ? p.whatsappGroup
      : /^(yes|y|true|1)$/i.test(String(p.whatsappGroup || ''))
        ? 'Yes'
        : /^(no|n|false|0)$/i.test(String(p.whatsappGroup || ''))
          ? 'No'
          : '',
    year: p.year || '',
    signageStatus: p.signageStatus || '',
    alertNote: p.alertNote || '',
    aadhaarNumber: p.aadhaarNumber || '',
    panNumber: p.panNumber || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    pincode: p.pincode || '',
    emergencyContact: p.emergencyContact || '',
    remarks: p.remarks || '',
    agreementStatus: p.agreementStatus || '',
    invoiceNote: p.invoiceNote || '',
  }
}

function businessFromSources(contract, profile) {
  const fromContract = contract?.businessDocs && typeof contract.businessDocs === 'object' ? contract.businessDocs : null
  if (fromContract && Object.keys(fromContract).length) {
    return { ...emptyBusiness(), ...fromContract, communicationAddressSame: fromContract.communicationAddressSame !== false }
  }
  const p = profile || {}
  return {
    ...emptyBusiness(),
    companyName: p.companyName || '',
    legalCompanyName: p.legalCompanyName || p.companyName || '',
    entityType: p.entityType || '',
    tradeName: p.tradeName || '',
    designation: p.designation || '',
    registeredAddress: p.registeredAddress || '',
    communicationAddressSame: p.communicationAddressSame !== false,
    communicationAddress: p.communicationAddress || '',
    gstRegistered: p.gstRegistered == null ? Boolean(p.gstNumber) : Boolean(p.gstRegistered),
    gstNumber: p.gstNumber || '',
    companyPan: p.companyPan || '',
    companyPanUrl: p.companyPanUrl || '',
    gstCertificateUrl: p.gstCertificateUrl || '',
    incorporationCertUrl: p.incorporationCertUrl || '',
    companyProofUrl: p.companyProofUrl || '',
    regDocumentsUrl: p.regDocumentsUrl || '',
    businessDocUrl: p.businessDocUrl || '',
  }
}

function authorityFromSources(contract, profile) {
  const fromContract = contract?.authorityDocs && typeof contract.authorityDocs === 'object' ? contract.authorityDocs : null
  if (fromContract && Object.keys(fromContract).length) {
    return { ...emptyAuthority(), ...fromContract }
  }
  const p = profile || {}
  return {
    ...emptyAuthority(),
    signatoryName: p.signatoryName || '',
    signatoryDesignation: p.signatoryDesignation || '',
    signatoryEmail: p.signatoryEmail || '',
    signatoryMobile: p.signatoryMobile || '',
    signatoryAltMobile: p.signatoryAltMobile || '',
    signatoryIdType: p.signatoryIdType || 'AADHAAR',
    signatoryIdUrl: p.signatoryIdUrl || '',
    signatoryPan: p.signatoryPan || '',
    signatoryPanUrl: p.signatoryPanUrl || '',
    authorityDocUrl: p.authorityDocUrl || '',
  }
}

function Field({ label, children, wide }) {
  return (
    <label className="admin-field" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function DocImageField({ label, value, onChange, disabled }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isImage = value && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(value)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || disabled) return
    setBusy(true)
    setErr('')
    try {
      const res = await docsApi.upload(file)
      onChange(res.data.data.url)
    } catch (ex) {
      setErr(apiError(ex))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <Field label={label} wide>
      <div style={{ display: 'grid', gap: 8 }}>
        {value ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {isImage ? (
              <img src={value} alt="" style={{ maxWidth: 160, maxHeight: 100, objectFit: 'cover', borderRadius: 6 }} />
            ) : (
              <a href={value} target="_blank" rel="noreferrer">
                View file
              </a>
            )}
            {!disabled ? (
              <button type="button" onClick={() => onChange('')}>
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
        <input type="file" accept="image/*,.pdf" onChange={onFile} disabled={disabled || busy} />
        {busy ? <small>Uploading…</small> : null}
        {err ? <small className="admin-login__error">{err}</small> : null}
      </div>
    </Field>
  )
}

/**
 * Profile (common) + Business / Authority / MMC per selected contract.
 */
export function MemberKycTabs({
  user,
  updateUser,
  onSaved,
  readOnly = false,
  showOnboarding = true,
  selfServeKyc = true,
  contracts: contractsProp,
}) {
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState(() => memberFormFromUser(user))
  const [business, setBusiness] = useState(() => businessFromSources(null, user?.memberProfile))
  const [authority, setAuthority] = useState(() => authorityFromSources(null, user?.memberProfile))
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [onboarding, setOnboarding] = useState(null)
  const [contracts, setContracts] = useState(contractsProp || [])
  const [selectedContractId, setSelectedContractId] = useState('')
  const [kyc, setKyc] = useState(null)
  const [kycFile, setKycFile] = useState(null)
  const [kycIdentity, setKycIdentity] = useState('')
  const [signedFile, setSignedFile] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setBiz = (k, v) => setBusiness((f) => ({ ...f, [k]: v }))
  const setAuth = (k, v) => setAuthority((f) => ({ ...f, [k]: v }))

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) || null,
    [contracts, selectedContractId],
  )

  useEffect(() => {
    setForm(memberFormFromUser(user))
  }, [user])

  useEffect(() => {
    if (contractsProp) setContracts(contractsProp)
  }, [contractsProp])

  useEffect(() => {
    if (!contracts.length) {
      setSelectedContractId('')
      return
    }
    setSelectedContractId((prev) => (prev && contracts.some((c) => c.id === prev) ? prev : contracts[0].id))
  }, [contracts])

  useEffect(() => {
    setBusiness(businessFromSources(selectedContract, user?.memberProfile))
    setAuthority(authorityFromSources(selectedContract, user?.memberProfile))
    setSignedFile(null)
  }, [selectedContract, user?.memberProfile])

  useEffect(() => {
    if (!user?.id) return undefined
    if (showOnboarding) {
      onboardingApi
        .mine()
        .then((r) => setOnboarding(r.data.data))
        .catch(() => setOnboarding(null))
    }
    if (!contractsProp) {
      contractApi
        .list({ limit: 50 })
        .then((r) => {
          const items = r.data.data.items || []
          setContracts(items.filter((c) => !c.memberUserId || c.memberUserId === user.id))
        })
        .catch(() => setContracts([]))
    }
    if (selfServeKyc) {
      kycApi
        .mine()
        .then((r) => {
          const row = r.data.data.kyc || null
          setKyc(row)
          if (row?.identityNo) setKycIdentity(row.identityNo)
        })
        .catch(() => setKyc(null))
    }
    return undefined
  }, [user?.id, showOnboarding, selfServeKyc, contractsProp])

  const refreshContracts = async () => {
    if (contractsProp) {
      onSaved?.()
      return
    }
    const r = await contractApi.list({ limit: 50 })
    const items = r.data.data.items || []
    setContracts(items.filter((c) => !c.memberUserId || c.memberUserId === user.id))
  }

  const save = async (e) => {
    e.preventDefault()
    if (readOnly) return
    setSaving(true)
    setError('')
    setMsg('')
    try {
      if (tab === 'profile' || tab === 'mmc') {
        const payload = { ...form }
        if (updateUser) await updateUser(user.id, payload)
        else await userApi.updateMe(payload)
      }

      if ((tab === 'business' || tab === 'authority') && selectedContract) {
        const body =
          tab === 'business'
            ? {
                businessDocs: {
                  ...business,
                  communicationAddressSame: Boolean(business.communicationAddressSame),
                  gstRegistered: Boolean(business.gstRegistered),
                },
                company: business.companyName || business.legalCompanyName || selectedContract.company,
              }
            : { authorityDocs: { ...authority } }
        await contractApi.update(selectedContract.id, body)
        await refreshContracts()
      } else if ((tab === 'business' || tab === 'authority') && !selectedContract) {
        // Fallback: no contract yet — keep on shared profile for first onboarding
        const payload =
          tab === 'business'
            ? {
                ...business,
                communicationAddressSame: Boolean(business.communicationAddressSame),
                gstRegistered: Boolean(business.gstRegistered),
              }
            : { ...authority }
        if (updateUser) await updateUser(user.id, payload)
        else await userApi.updateMe(payload)
        await onboardingApi
          .saveDocs({
            businessDocUrl: business.businessDocUrl,
            authorityDocUrl: authority.authorityDocUrl,
            address: form.address,
            city: form.city,
            companyName: business.companyName || business.legalCompanyName,
            gstNumber: business.gstNumber,
            panNumber: form.panNumber || business.companyPan,
            designation: business.designation || authority.signatoryDesignation,
          })
          .catch(() => {})
      }

      if (selfServeKyc && kycFile && tab === 'authority') {
        const fd = new FormData()
        fd.append('identityNo', kycIdentity || form.aadhaarNumber || authority.signatoryPan || 'NA')
        fd.append('documentType', authority.signatoryIdType || 'AADHAAR')
        fd.append('documents', kycFile)
        await kycApi.submit(fd)
        setKycFile(null)
        const kr = await kycApi.mine().catch(() => null)
        if (kr) setKyc(kr.data.data.kyc || null)
      }

      setMsg('Saved')
      onSaved?.()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const generatePack = async () => {
    if (!selectedContract) return
    setError('')
    try {
      const res = await contractApi.generatePack(selectedContract.id)
      setMsg('Combined MMC PDF generated')
      await refreshContracts()
      const url = res.data.data.packUrl || res.data.data.contract?.documentUrl
      if (url) window.open(url, '_blank')
    } catch (err) {
      setError(apiError(err))
    }
  }

  const markDownloaded = async () => {
    if (!selectedContract) return
    try {
      await contractApi.transition(selectedContract.id, { status: 'MEMBER_DOWNLOADED' })
      setMsg('Marked as downloaded')
      await refreshContracts()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const uploadSigned = async (role) => {
    if (!selectedContract || !signedFile) {
      setError('Choose a signed PDF first')
      return
    }
    setError('')
    try {
      await contractApi.uploadSigned(selectedContract.id, signedFile, role)
      setSignedFile(null)
      setMsg(role === 'member' ? 'Member signed PDF uploaded' : 'Staff signed PDF uploaded — contract verified pending confirm')
      await refreshContracts()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const confirmVerified = async () => {
    if (!selectedContract) return
    try {
      await contractApi.transition(selectedContract.id, {
        status: 'CONFIRMED',
        documentUrl: selectedContract.staffSignedUrl || selectedContract.finalContractUrl,
      })
      setMsg('Contract verified / confirmed')
      await refreshContracts()
    } catch (err) {
      setError(apiError(err))
    }
  }

  const contractPicker =
    tab !== 'profile' ? (
      <div className="enq-follow-block" style={{ marginBottom: 14 }}>
        <h4 style={{ marginTop: 0 }}>Contract for this section</h4>
        <p className="admin-login__hint" style={{ marginTop: 0 }}>
          Basic profile is shared. Business, authority, fees/deposit and MMC are per contract / product period.
        </p>
        {!contracts.length ? (
          <p className="admin-login__hint">No contract yet. Complete deposit conversion to create one.</p>
        ) : (
          <select value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.contractId || c.id?.slice(-8)) +
                  ` · ${c.kind || '—'} · ${c.productName || c.company || 'Product'} · ${c.status}`}
              </option>
            ))}
          </select>
        )}
        {selectedContract ? (
          <div className="admin-grid-2" style={{ marginTop: 10 }}>
            <p>
              <strong>Membership type:</strong> {selectedContract.productName || '—'}
            </p>
            <p>
              <strong>Space:</strong> {selectedContract.spaceLabel || selectedContract.location || '—'}
            </p>
            <p>
              <strong>Rent / fee:</strong> {selectedContract.rent != null ? `₹${selectedContract.rent}` : '—'}
            </p>
            <p>
              <strong>Deposit:</strong>{' '}
              {selectedContract.securityDeposit != null ? `₹${selectedContract.securityDeposit}` : '—'}
            </p>
            <p>
              <strong>Commitment:</strong>{' '}
              {selectedContract.commitmentFee != null ? `₹${selectedContract.commitmentFee}` : '—'}
            </p>
            <p>
              <strong>Period:</strong>{' '}
              {selectedContract.startDate || selectedContract.endDate
                ? `${selectedContract.startDate ? d10(selectedContract.startDate) : '—'} → ${
                    selectedContract.endDate ? d10(selectedContract.endDate) : '—'
                  }`
                : '—'}
            </p>
          </div>
        ) : null}
      </div>
    ) : null

  return (
    <div className="member-kyc">
      {error ? <p className="admin-login__error">{error}</p> : null}
      {msg ? <p className="admin-login__hint">{msg}</p> : null}

      {showOnboarding && onboarding ? (
        <div className="enq-follow-block" style={{ marginBottom: 16 }}>
          <h4>Onboarding checklist</h4>
          <p>
            Stage: <strong>{onboarding.stage || '—'}</strong>
            {onboarding.deadlineAt
              ? ` · Deadline: ${String(onboarding.deadlineAt).slice(0, 16).replace('T', ' ')}`
              : ''}
            {onboarding.overdue ? ' · OVERDUE' : ''}
          </p>
          <ul>
            {TABS.map((t) => {
              const key = t.id === 'mmc' ? 'mmc' : t.id
              const ok = onboarding.checklist?.[key]
              return (
                <li key={t.id}>
                  {ok ? '✓' : '○'} {t.label}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="enq-bar" style={{ marginBottom: 14 }}>
        <div className="enq-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={`enq-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="admin-login__hint" style={{ margin: 0 }}>
          Member ID: <strong>{user?.memberProfile?.memberId || '—'}</strong> · KYC{' '}
          <strong>{user?.memberProfile?.kycStatus || kyc?.status || '—'}</strong> · Status{' '}
          <strong>{user?.memberProfile?.membershipStatus || '—'}</strong>
        </p>
      </div>

      {contractPicker}

      <form className="admin-login__form" onSubmit={save}>
        {tab === 'profile' ? (
          <div className="admin-grid-2">
            <Field label="Contact person">
              <input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Full name">
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Contact no.">
              <input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Alternate mobile">
              <input value={form.alternateMobile} onChange={(e) => set('alternateMobile', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="e-mail ID (login)">
              <input value={user?.email || ''} disabled />
            </Field>
            <Field label="Alternate e-mail">
              <input value={form.alternateEmail} onChange={(e) => set('alternateEmail', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="WhatsApp joined">
              <select value={form.whatsappGroup || ''} onChange={(e) => set('whatsappGroup', e.target.value)} disabled={readOnly}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Year">
              <input value={form.year} onChange={(e) => set('year', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Signage status">
              <input value={form.signageStatus} onChange={(e) => set('signageStatus', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Alert">
              <input value={form.alertNote} onChange={(e) => set('alertNote', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Aadhaar number">
              <input value={form.aadhaarNumber} onChange={(e) => set('aadhaarNumber', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="PAN card">
              <input value={form.panNumber} onChange={(e) => set('panNumber', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Registered / mailing address" wide>
              <textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={(e) => set('city', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => set('state', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Pincode">
              <input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Emergency contact">
              <input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Remarks" wide>
              <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        ) : null}

        {tab === 'business' ? (
          <div className="admin-grid-2">
            <Field label="Company name">
              <input value={business.companyName} onChange={(e) => setBiz('companyName', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Legal name of company">
              <input
                value={business.legalCompanyName}
                onChange={(e) => setBiz('legalCompanyName', e.target.value)}
                placeholder="Use capital letters"
                disabled={readOnly}
              />
            </Field>
            <Field label="Entity type">
              <select value={business.entityType} onChange={(e) => setBiz('entityType', e.target.value)} disabled={readOnly}>
                <option value="">Select</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trade / brand name">
              <input value={business.tradeName} onChange={(e) => setBiz('tradeName', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Designation">
              <input value={business.designation} onChange={(e) => setBiz('designation', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Company PAN">
              <input value={business.companyPan} onChange={(e) => setBiz('companyPan', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Registered office address" wide>
              <textarea
                rows={2}
                value={business.registeredAddress}
                onChange={(e) => setBiz('registeredAddress', e.target.value)}
                placeholder="Use capital letters"
                disabled={readOnly}
              />
            </Field>
            <Field label="Communication address different?">
              <select
                value={business.communicationAddressSame ? 'no' : 'yes'}
                onChange={(e) => setBiz('communicationAddressSame', e.target.value === 'no')}
                disabled={readOnly}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
            {!business.communicationAddressSame ? (
              <Field label="Communication address" wide>
                <textarea
                  rows={2}
                  value={business.communicationAddress}
                  onChange={(e) => setBiz('communicationAddress', e.target.value)}
                  disabled={readOnly}
                />
              </Field>
            ) : null}
            <Field label="Registered under GST?">
              <select
                value={business.gstRegistered ? 'yes' : 'no'}
                onChange={(e) => setBiz('gstRegistered', e.target.value === 'yes')}
                disabled={readOnly}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            {business.gstRegistered ? (
              <Field label="GST number">
                <input value={business.gstNumber} onChange={(e) => setBiz('gstNumber', e.target.value)} disabled={readOnly} />
              </Field>
            ) : null}
            <DocImageField
              label="Company PAN card (image)"
              value={business.companyPanUrl}
              onChange={(v) => setBiz('companyPanUrl', v)}
              disabled={readOnly}
            />
            {business.gstRegistered ? (
              <DocImageField
                label="GST certificate (image)"
                value={business.gstCertificateUrl}
                onChange={(v) => setBiz('gstCertificateUrl', v)}
                disabled={readOnly}
              />
            ) : null}
            <DocImageField
              label="Incorporation / registration certificate (image)"
              value={business.incorporationCertUrl}
              onChange={(v) => setBiz('incorporationCertUrl', v)}
              disabled={readOnly}
            />
            <DocImageField
              label="Company proof (image)"
              value={business.companyProofUrl}
              onChange={(v) => setBiz('companyProofUrl', v)}
              disabled={readOnly}
            />
            <DocImageField
              label="Reg. documents (image)"
              value={business.regDocumentsUrl}
              onChange={(v) => setBiz('regDocumentsUrl', v)}
              disabled={readOnly}
            />
            <DocImageField
              label="Business document (image)"
              value={business.businessDocUrl}
              onChange={(v) => setBiz('businessDocUrl', v)}
              disabled={readOnly}
            />
          </div>
        ) : null}

        {tab === 'authority' ? (
          <div className="admin-grid-2">
            <Field label="Authorized signatory – full name">
              <input value={authority.signatoryName} onChange={(e) => setAuth('signatoryName', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Designation">
              <input
                value={authority.signatoryDesignation}
                onChange={(e) => setAuth('signatoryDesignation', e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Official email">
              <input
                type="email"
                value={authority.signatoryEmail}
                onChange={(e) => setAuth('signatoryEmail', e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Mobile number">
              <input value={authority.signatoryMobile} onChange={(e) => setAuth('signatoryMobile', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Alternate mobile">
              <input
                value={authority.signatoryAltMobile}
                onChange={(e) => setAuth('signatoryAltMobile', e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Identity proof type">
              <select
                value={authority.signatoryIdType}
                onChange={(e) => setAuth('signatoryIdType', e.target.value)}
                disabled={readOnly}
              >
                {ID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <DocImageField
              label="Identity proof (image)"
              value={authority.signatoryIdUrl}
              onChange={(v) => setAuth('signatoryIdUrl', v)}
              disabled={readOnly}
            />
            <Field label="Authorised signatory PAN">
              <input value={authority.signatoryPan} onChange={(e) => setAuth('signatoryPan', e.target.value)} disabled={readOnly} />
            </Field>
            <DocImageField
              label="Signatory PAN card (image)"
              value={authority.signatoryPanUrl}
              onChange={(v) => setAuth('signatoryPanUrl', v)}
              disabled={readOnly}
            />
            <DocImageField
              label="Authority letter (image)"
              value={authority.authorityDocUrl}
              onChange={(v) => setAuth('authorityDocUrl', v)}
              disabled={readOnly}
            />
            {selfServeKyc ? (
              <>
                <Field label="KYC ID number (for upload)">
                  <input value={kycIdentity} onChange={(e) => setKycIdentity(e.target.value)} disabled={readOnly} />
                </Field>
                <Field label="Upload identity proof (KYC verification)" wide>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                    disabled={readOnly || kyc?.status === 'APPROVED'}
                  />
                </Field>
              </>
            ) : null}
            {kyc ? (
              <p style={{ gridColumn: '1 / -1' }}>
                KYC status: <strong>{kyc.status}</strong>
                {kyc.remarks ? ` · ${kyc.remarks}` : ''}
              </p>
            ) : (
              <p style={{ gridColumn: '1 / -1' }} className="admin-login__hint">
                KYC status: {user?.memberProfile?.kycStatus || '—'}
              </p>
            )}
          </div>
        ) : null}

        {tab === 'mmc' ? (
          <div className="admin-grid-2">
            <Field label="Agreement status (no agreement number)">
              <input value={form.agreementStatus} onChange={(e) => set('agreementStatus', e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Invoice">
              <input value={form.invoiceNote} onChange={(e) => set('invoiceNote', e.target.value)} disabled={readOnly} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              {!selectedContract ? (
                <p className="admin-login__hint">
                  No MMC for this member yet. After enquiry conversion + deposit, a draft contract is created per product
                  period.
                </p>
              ) : (
                <>
                  <h4 style={{ margin: '8px 0' }}>
                    MMC · {selectedContract.contractId} · {selectedContract.status}
                    {selectedContract.status === 'CONFIRMED' || selectedContract.status === 'STAFF_SIGNED' ? (
                      <span style={{ marginLeft: 8 }}>· Verified</span>
                    ) : null}
                  </h4>
                  <p className="admin-login__hint">
                    Generate a combined PDF (profile + this contract’s business & authority). Member downloads, signs
                    locally, uploads. Admin downloads, signs, re-uploads — then confirm to mark verified.
                  </p>
                  <div className="admin-top__right" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button type="button" className="admin-login__submit" onClick={generatePack}>
                      Generate / download MMC pack
                    </button>
                    {selectedContract.documentUrl ? (
                      <a className="admin-login__submit" href={selectedContract.documentUrl} target="_blank" rel="noreferrer">
                        Open pack PDF
                      </a>
                    ) : null}
                    {selectedContract.memberSignedUrl ? (
                      <a
                        className="admin-login__submit"
                        href={selectedContract.memberSignedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Member signed
                      </a>
                    ) : null}
                    {selectedContract.staffSignedUrl || selectedContract.finalContractUrl ? (
                      <a
                        className="admin-login__submit"
                        href={selectedContract.staffSignedUrl || selectedContract.finalContractUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Final signed
                      </a>
                    ) : null}
                  </div>
                  <div className="admin-grid-2">
                    <Field label="Upload signed PDF" wide>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
                        disabled={readOnly}
                      />
                    </Field>
                  </div>
                  <div className="admin-top__right" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {selfServeKyc && ['SENT_TO_MEMBER', 'MEMBER_DOWNLOADED', 'DRAFT'].includes(selectedContract.status) ? (
                      <button type="button" onClick={markDownloaded}>
                        Mark downloaded
                      </button>
                    ) : null}
                    {selfServeKyc &&
                    ['SENT_TO_MEMBER', 'MEMBER_DOWNLOADED'].includes(selectedContract.status) &&
                    signedFile ? (
                      <button type="button" className="admin-login__submit" onClick={() => uploadSigned('member')}>
                        Upload member signed PDF
                      </button>
                    ) : null}
                    {!selfServeKyc &&
                    ['MEMBER_UPLOADED', 'STAFF_REVIEW'].includes(selectedContract.status) &&
                    signedFile ? (
                      <button type="button" className="admin-login__submit" onClick={() => uploadSigned('staff')}>
                        Upload staff signed PDF
                      </button>
                    ) : null}
                    {!selfServeKyc && selectedContract.status === 'STAFF_SIGNED' ? (
                      <button type="button" className="admin-login__submit" onClick={confirmVerified}>
                        Confirm verified
                      </button>
                    ) : null}
                    {!selfServeKyc && selectedContract.status === 'DRAFT' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await contractApi.generatePack(selectedContract.id)
                            await contractApi.transition(selectedContract.id, {
                              status: 'SENT_TO_MEMBER',
                              documentUrl: selectedContract.documentUrl,
                            })
                            setMsg('Pack generated and sent to member')
                            await refreshContracts()
                          } catch (err) {
                            setError(apiError(err))
                          }
                        }}
                      >
                        Generate pack & send
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              <h4 style={{ margin: '16px 0 8px' }}>All contracts for this member</h4>
              {!contracts.length ? (
                <p className="admin-login__hint">No contracts listed.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Contract</th>
                        <th>Kind</th>
                        <th>Product</th>
                        <th>Status</th>
                        <th>Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr
                          key={c.id}
                          style={c.id === selectedContractId ? { outline: '1px solid #888' } : undefined}
                          onClick={() => setSelectedContractId(c.id)}
                        >
                          <td>{c.contractId || c.id?.slice(-8)}</td>
                          <td>{c.kind || '—'}</td>
                          <td>{c.productName || '—'}</td>
                          <td>{c.status}</td>
                          <td>
                            {c.startDate || c.endDate
                              ? `${c.startDate ? d10(c.startDate) : '—'} → ${c.endDate ? d10(c.endDate) : '—'}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {!readOnly && tab !== 'mmc' ? (
          <button className="admin-login__submit" type="submit" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? 'Saving…' : tab === 'profile' ? 'Save profile' : 'Save for this contract'}
          </button>
        ) : null}
        {!readOnly && tab === 'mmc' ? (
          <button className="admin-login__submit" type="submit" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? 'Saving…' : 'Save agreement notes'}
          </button>
        ) : null}
      </form>
    </div>
  )
}
