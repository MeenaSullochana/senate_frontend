import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { contractApi, docsApi, onboardingApi, userApi } from '../services/api'
import { apiError } from '../services/api/client'
import { useAuth } from '../context/AuthContext'
import { buildTextPdf, downloadBlob } from '../utils/textPdf'
import '../admin/Admin.css'
import './MembershipKyc.css'

const ENTITY_TYPES = [
  'Private Limited',
  'Public Limited',
  'LLP',
  'Partnership',
  'Proprietorship',
  'OPC',
  'Others',
]

const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Other']
const DESIGNATIONS = ['Director', 'Partner', 'Proprietor', 'Authorized Signatory', 'CEO', 'CFO', 'Manager', 'Other']

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'review', label: 'Membership' },
  { id: 'company', label: 'A. Company' },
  { id: 'business', label: 'B. Business' },
  { id: 'signatory', label: 'C. Signatory' },
  { id: 'summary', label: 'D. Review' },
  { id: 'draft', label: 'Agreement draft' },
  { id: 'done', label: 'Done' },
]

function money(n) {
  if (n == null || n === '') return '—'
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function d10(v) {
  return v ? String(v).slice(0, 10) : '—'
}

async function uploadFile(file) {
  if (!file) return ''
  const res = await docsApi.upload(file)
  return res.data.data?.url || res.data.data?.path || ''
}

function blankForm(user) {
  const p = user?.memberProfile || {}
  const kyc = p.profileProgress?.kycForm || {}
  return {
    membershipAcknowledged: Boolean(kyc.membershipAcknowledged),
    legalCompanyName: p.legalCompanyName || p.companyName || '',
    entityType: p.entityType || '',
    tradeName: p.tradeName || '',
    registeredAddress: p.registeredAddress || '',
    communicationAddressSame: p.communicationAddressSame !== false,
    communicationAddress: p.communicationAddress || '',
    natureOfBusiness: kyc.natureOfBusiness || p.remarks || '',
    companyWebsite: kyc.companyWebsite || '',
    companyPan: p.companyPan || p.panNumber || '',
    companyPanUrl: p.companyPanUrl || '',
    gstRegistered: p.gstRegistered == null ? Boolean(p.gstNumber) : Boolean(p.gstRegistered),
    gstNumber: p.gstNumber || '',
    gstCertificateUrl: p.gstCertificateUrl || '',
    entityRegistrationDetails: kyc.entityRegistrationDetails || '',
    incorporationCertUrl: p.incorporationCertUrl || '',
    companyProofUrl: p.companyProofUrl || '',
    regDocumentsUrl: p.regDocumentsUrl || '',
    signatoryName: p.signatoryName || '',
    signatoryDesignation: p.signatoryDesignation || '',
    signatoryEmail: p.signatoryEmail || user?.email || '',
    signatoryMobile: p.signatoryMobile || user?.mobile || '',
    signatoryAltMobile: p.signatoryAltMobile || '',
    signatoryIdType: p.signatoryIdType || 'Aadhaar',
    signatoryIdUrl: p.signatoryIdUrl || '',
    signatoryPan: p.signatoryPan || '',
    signatoryPanUrl: p.signatoryPanUrl || '',
    declarationAccepted: Boolean(kyc.declarationAccepted),
  }
}

export default function MembershipKycPage({ embedded = false, onComplete }) {
  const { user, ready, refresh } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => blankForm(user))
  const [contracts, setContracts] = useState([])
  const [onboarding, setOnboarding] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState('')

  const profile = user?.memberProfile
  const alreadyDone =
    profile?.profileProgress?.kycForm?.submittedAt ||
    ['COMPLETE', 'KYC_SUBMITTED'].includes(String(profile?.agreementStatus || '').toUpperCase()) ||
    profile?.onboardingStage === 'COMPLETE'

  useEffect(() => {
    if (user) setForm(blankForm(user))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    onboardingApi.mine().then((r) => setOnboarding(r.data.data)).catch(() => setOnboarding(null))
    contractApi
      .list({ limit: 20 })
      .then((r) => {
        const items = r.data.data.items || []
        setContracts(items.filter((c) => !c.memberUserId || c.memberUserId === user.id))
      })
      .catch(() => setContracts([]))
  }, [user?.id])

  const contract = contracts[0]
  const membershipRows = useMemo(
    () => [
      ['Sales Executive', contract?.staff?.fullName || '—'],
      ['Senate Space Centre', profile?.city || contract?.location || 'Chennai'],
      ['Allocated Space', profile?.allocatedChamber || contract?.spaceLabel || '—'],
      ['Number of Seats', profile?.numberOfSeats ?? '—'],
      ['Tenure (months)', profile?.tenureMonths ?? contract?.tenureMonths ?? '—'],
      ['Contract Start Date', d10(profile?.beginDate || contract?.startDate)],
      ['Contract End Date', d10(profile?.expiryDate || contract?.endDate)],
      ['Monthly Commitment Fee', money(profile?.commitmentFee ?? contract?.commitmentFee ?? contract?.rent)],
      ['Security Deposit', money(profile?.securityDeposit ?? contract?.securityDeposit)],
      ['Membership Type', contract?.productName || contract?.kind || '—'],
    ],
    [profile, contract],
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onUpload = async (key, file) => {
    if (!file) return
    setUploading(key)
    setError('')
    try {
      const url = await uploadFile(file)
      if (url) set(key, url)
    } catch (err) {
      setError(apiError(err, 'Upload failed'))
    } finally {
      setUploading('')
    }
  }

  const persistPartial = async (extra = {}) => {
    const payload = {
      legalCompanyName: form.legalCompanyName,
      companyName: form.legalCompanyName || form.tradeName,
      entityType: form.entityType,
      tradeName: form.tradeName,
      registeredAddress: form.registeredAddress,
      communicationAddressSame: form.communicationAddressSame,
      communicationAddress: form.communicationAddressSame ? form.registeredAddress : form.communicationAddress,
      remarks: form.natureOfBusiness,
      companyPan: form.companyPan,
      companyPanUrl: form.companyPanUrl,
      gstRegistered: form.gstRegistered,
      gstNumber: form.gstRegistered ? form.gstNumber : '',
      gstCertificateUrl: form.gstCertificateUrl,
      incorporationCertUrl: form.incorporationCertUrl,
      companyProofUrl: form.companyProofUrl,
      regDocumentsUrl: form.regDocumentsUrl,
      businessDocUrl: form.companyProofUrl || form.regDocumentsUrl || form.gstCertificateUrl,
      signatoryName: form.signatoryName,
      signatoryDesignation: form.signatoryDesignation,
      signatoryEmail: form.signatoryEmail,
      signatoryMobile: form.signatoryMobile,
      signatoryAltMobile: form.signatoryAltMobile,
      signatoryIdType: String(form.signatoryIdType || '').toUpperCase().replace(/\s+/g, '_'),
      signatoryIdUrl: form.signatoryIdUrl,
      signatoryPan: form.signatoryPan,
      signatoryPanUrl: form.signatoryPanUrl,
      authorityDocUrl: form.signatoryIdUrl,
      kycForm: {
        natureOfBusiness: form.natureOfBusiness,
        companyWebsite: form.companyWebsite,
        entityRegistrationDetails: form.entityRegistrationDetails,
        membershipAcknowledged: form.membershipAcknowledged,
        declarationAccepted: form.declarationAccepted,
        ...extra,
      },
    }
    await userApi.updateMe(payload)
    if (contract?.id) {
      try {
        await contractApi.update(contract.id, {
          businessDocs: {
            legalCompanyName: form.legalCompanyName,
            entityType: form.entityType,
            tradeName: form.tradeName,
            registeredAddress: form.registeredAddress,
            communicationAddressSame: form.communicationAddressSame,
            communicationAddress: form.communicationAddress,
            gstRegistered: form.gstRegistered,
            gstNumber: form.gstNumber,
            companyPan: form.companyPan,
            companyPanUrl: form.companyPanUrl,
            gstCertificateUrl: form.gstCertificateUrl,
            incorporationCertUrl: form.incorporationCertUrl,
            companyProofUrl: form.companyProofUrl,
            regDocumentsUrl: form.regDocumentsUrl,
            natureOfBusiness: form.natureOfBusiness,
            companyWebsite: form.companyWebsite,
          },
          authorityDocs: {
            signatoryName: form.signatoryName,
            signatoryDesignation: form.signatoryDesignation,
            signatoryEmail: form.signatoryEmail,
            signatoryMobile: form.signatoryMobile,
            signatoryAltMobile: form.signatoryAltMobile,
            signatoryIdType: form.signatoryIdType,
            signatoryIdUrl: form.signatoryIdUrl,
            signatoryPan: form.signatoryPan,
            signatoryPanUrl: form.signatoryPanUrl,
          },
        })
      } catch {
        /* contract update optional */
      }
    }
    await refresh?.()
  }

  const next = async () => {
    setError('')
    const id = STEPS[step].id
    if (id === 'review' && !form.membershipAcknowledged) {
      setError('Please acknowledge the membership details to continue.')
      return
    }
    if (id === 'company') {
      if (!form.legalCompanyName || !form.entityType || !form.registeredAddress) {
        setError('Legal name, entity type and registered address are required.')
        return
      }
    }
    if (id === 'business') {
      if (!form.natureOfBusiness || form.gstRegistered == null) {
        setError('Nature of business and GST registration answer are required.')
        return
      }
    }
    if (id === 'signatory') {
      if (!form.signatoryName || !form.signatoryDesignation || !form.signatoryEmail) {
        setError('Signatory name, designation and email are required.')
        return
      }
    }
    if (id === 'draft' && !form.declarationAccepted) {
      setError('Please confirm the declaration before proceeding.')
      return
    }
    setBusy(true)
    try {
      if (['company', 'business', 'signatory', 'summary'].includes(id)) {
        await persistPartial()
      }
      if (id === 'draft') {
        await persistPartial({
          submittedAt: new Date().toISOString(),
          declarationAccepted: true,
          membershipAcknowledged: true,
        })
        await userApi.updateMe({ agreementStatus: 'KYC_SUBMITTED' })
        try {
          await onboardingApi.saveDocs({
            businessDocUrl: form.companyProofUrl || form.gstCertificateUrl || form.regDocumentsUrl,
            authorityDocUrl: form.signatoryIdUrl,
          })
        } catch {
          /* ignore */
        }
        await refresh?.()
        setStep(STEPS.findIndex((s) => s.id === 'done'))
        onComplete?.()
        return
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    } catch (err) {
      setError(apiError(err, 'Could not save'))
    } finally {
      setBusy(false)
    }
  }

  const back = () => setStep((s) => Math.max(0, s - 1))

  const downloadDraft = () => {
    const blob = buildTextPdf({
      brand: 'SENATE SPACE',
      title: 'Membership Contract & KYC',
      subtitle: 'Agreement Draft for review',
      meta: [
        `Member: ${user?.fullName || '-'}`,
        profile?.memberId ? `Member ID: ${profile.memberId}` : '',
        `Prepared: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      ].filter(Boolean),
      sections: [
        { heading: '1. Membership details', rows: membershipRows },
        {
          heading: '2. Company details',
          rows: [
            ['Legal Name', form.legalCompanyName || ''],
            ['Entity Type', form.entityType || ''],
            ['Trade Name', form.tradeName || ''],
            ['Registered Address', form.registeredAddress || ''],
            [
              'Communication Address',
              form.communicationAddressSame
                ? form.registeredAddress || 'Same as registered'
                : form.communicationAddress || '',
            ],
          ],
        },
        {
          heading: '3. Business details',
          rows: [
            ['Nature of Business', form.natureOfBusiness || ''],
            ['Website', form.companyWebsite || ''],
            ['Company PAN', form.companyPan || ''],
            ['GST Registered', form.gstRegistered ? 'Yes' : 'No'],
            ['GST Number', form.gstRegistered ? form.gstNumber || '' : 'N/A'],
            ['Entity Registration', form.entityRegistrationDetails || ''],
          ],
        },
        {
          heading: '4. Authorized signatory',
          rows: [
            ['Name', form.signatoryName || ''],
            ['Designation', form.signatoryDesignation || ''],
            ['Email', form.signatoryEmail || ''],
            ['Mobile', form.signatoryMobile || ''],
            ['Alternate Mobile', form.signatoryAltMobile || ''],
            ['ID Type', form.signatoryIdType || ''],
            ['Signatory PAN', form.signatoryPan || ''],
          ],
        },
      ],
      footer:
        'This draft is for review only. Original documents will be prepared for physical signing. Data submitted through this form is saved to your Senate Space member profile.',
    })
    downloadBlob(blob, `SenateSpace-Agreement-Draft-${profile?.memberId || 'KYC'}.pdf`)
  }

  if (!ready) return <div className="mkyc">Loading…</div>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent('/kyc')}`} replace />
  if (user.role?.code !== 'MEMBER' && !embedded) {
    return <Navigate to="/app" replace />
  }

  const sid = STEPS[step]?.id

  return (
    <div className={`mkyc${embedded ? ' mkyc--embedded' : ''}`}>
      <div className="mkyc__shell">
        <header className="mkyc__brand">
          <div className="mkyc__logo" aria-hidden>
            ◆
          </div>
          <div>
            <p className="mkyc__co">Senate Space (India) Private Limited</p>
            <h1>Membership Contract &amp; KYC</h1>
          </div>
        </header>

        {onboarding?.deadlineAt && sid !== 'done' ? (
          <p className="mkyc__deadline">
            Complete by {String(onboarding.deadlineAt).replace('T', ' ').slice(0, 16)} · Stage:{' '}
            {onboarding.stage || '—'}
          </p>
        ) : null}

        {error ? <p className="admin-login__error">{error}</p> : null}

        {sid === 'welcome' ? (
          <section className="mkyc__card">
            <p>Welcome to Senate Space.</p>
            <p>
              Please complete this form to provide the information and KYC documents required for preparation of your
              Co-working Membership Contract.
            </p>
            <p>
              The information submitted will be used for membership onboarding, agreement preparation, KYC verification
              and related administrative purposes.
            </p>
            <p>Please ensure that all information provided is accurate and that the documents uploaded are clear and valid.</p>
            {alreadyDone ? (
              <p className="mkyc__ok">You already submitted KYC. You can review and update details below.</p>
            ) : null}
            <button type="button" className="mkyc__btn" onClick={() => setStep(1)}>
              Continue
            </button>
          </section>
        ) : null}

        {sid === 'review' ? (
          <section className="mkyc__card">
            <div className="mkyc__callout">
              Dear Client, please review the membership details below as confirmed by our Sales Executive. If the
              information is correct, please tick the acknowledgment checkbox and proceed to complete your KYC details.
            </div>
            <ul className="mkyc__kv">
              {membershipRows.map(([k, v]) => (
                <li key={k}>
                  <strong>{k}:</strong> {v}
                </li>
              ))}
            </ul>
            <label className="mkyc__check">
              <input
                type="checkbox"
                checked={form.membershipAcknowledged}
                onChange={(e) => set('membershipAcknowledged', e.target.checked)}
              />
              <span>
                I acknowledge and agree that the above membership details are correct and accurate to my knowledge. I
                wish to proceed with the KYC submission. *
              </span>
            </label>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                Proceed
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'company' ? (
          <section className="mkyc__card">
            <h2>A. Company Details</h2>
            <label className="admin-field">
              <span>Legal Name of Company</span>
              <input
                value={form.legalCompanyName}
                onChange={(e) => set('legalCompanyName', e.target.value.toUpperCase())}
                placeholder="Use Capital Letters"
              />
            </label>
            <label className="admin-field">
              <span>What type of entity are you</span>
              <select value={form.entityType} onChange={(e) => set('entityType', e.target.value)}>
                <option value="">Select</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Trade / Brand Name</span>
              <input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Registered Office Address</span>
              <textarea
                rows={3}
                value={form.registeredAddress}
                onChange={(e) => set('registeredAddress', e.target.value.toUpperCase())}
                placeholder="Use Capital Letters"
              />
            </label>
            <fieldset className="mkyc__radios">
              <legend>Communication Address Different</legend>
              <label>
                <input
                  type="radio"
                  checked={form.communicationAddressSame === false}
                  onChange={() => set('communicationAddressSame', false)}
                />{' '}
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.communicationAddressSame === true}
                  onChange={() => set('communicationAddressSame', true)}
                />{' '}
                No
              </label>
            </fieldset>
            {!form.communicationAddressSame ? (
              <label className="admin-field">
                <span>Communication Address</span>
                <textarea
                  rows={3}
                  value={form.communicationAddress}
                  onChange={(e) => set('communicationAddress', e.target.value.toUpperCase())}
                />
              </label>
            ) : null}
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                Next →
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'business' ? (
          <section className="mkyc__card">
            <h2>B. Business &amp; Statutory Details</h2>
            <label className="admin-field">
              <span>Nature of Business *</span>
              <textarea
                rows={3}
                value={form.natureOfBusiness}
                onChange={(e) => set('natureOfBusiness', e.target.value)}
                placeholder="Please briefly describe the nature of your company's business activities."
              />
            </label>
            <label className="admin-field">
              <span>Company Website</span>
              <input
                type="url"
                value={form.companyWebsite}
                onChange={(e) => set('companyWebsite', e.target.value)}
                placeholder="https://"
              />
            </label>
            <label className="admin-field">
              <span>Company PAN</span>
              <input value={form.companyPan} onChange={(e) => set('companyPan', e.target.value.toUpperCase())} />
            </label>
            <label className="admin-field">
              <span>Upload Company PAN Card</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload('companyPanUrl', e.target.files?.[0])}
              />
              {uploading === 'companyPanUrl' ? <small>Uploading…</small> : null}
              {form.companyPanUrl ? <small className="mkyc__ok">Uploaded</small> : null}
            </label>
            <fieldset className="mkyc__radios">
              <legend>Is the company registered under GST? *</legend>
              <label>
                <input type="radio" checked={form.gstRegistered === true} onChange={() => set('gstRegistered', true)} />{' '}
                Yes
              </label>
              <label>
                <input type="radio" checked={form.gstRegistered === false} onChange={() => set('gstRegistered', false)} />{' '}
                No
              </label>
            </fieldset>
            {form.gstRegistered ? (
              <>
                <label className="admin-field">
                  <span>GST Number</span>
                  <input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value.toUpperCase())} />
                </label>
                <label className="admin-field">
                  <span>Upload GST Registration Certificate</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => onUpload('gstCertificateUrl', e.target.files?.[0])}
                  />
                  {form.gstCertificateUrl ? <small className="mkyc__ok">Uploaded</small> : null}
                </label>
              </>
            ) : null}
            <label className="admin-field">
              <span>Entity Registration Details</span>
              <textarea
                rows={2}
                value={form.entityRegistrationDetails}
                onChange={(e) => set('entityRegistrationDetails', e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Certificate of Incorporation / Registration / Entity Proof</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload('incorporationCertUrl', e.target.files?.[0])}
              />
              {form.incorporationCertUrl ? <small className="mkyc__ok">Uploaded</small> : null}
            </label>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                Next →
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'signatory' ? (
          <section className="mkyc__card">
            <h2>C. Authorized Signatory</h2>
            <label className="admin-field">
              <span>Authorized Signatory - Full Name</span>
              <input value={form.signatoryName} onChange={(e) => set('signatoryName', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Designation *</span>
              <select value={form.signatoryDesignation} onChange={(e) => set('signatoryDesignation', e.target.value)}>
                <option value="">Select</option>
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Official Email Address *</span>
              <input
                type="email"
                value={form.signatoryEmail}
                onChange={(e) => set('signatoryEmail', e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Mobile number</span>
              <input value={form.signatoryMobile} onChange={(e) => set('signatoryMobile', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Alternate Mobile number</span>
              <input value={form.signatoryAltMobile} onChange={(e) => set('signatoryAltMobile', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Identity Proof Type</span>
              <select value={form.signatoryIdType} onChange={(e) => set('signatoryIdType', e.target.value)}>
                {ID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Upload Identity Proof</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload('signatoryIdUrl', e.target.files?.[0])}
              />
              {form.signatoryIdUrl ? <small className="mkyc__ok">Uploaded</small> : null}
            </label>
            <label className="admin-field">
              <span>Authorised Signatory PAN</span>
              <input value={form.signatoryPan} onChange={(e) => set('signatoryPan', e.target.value.toUpperCase())} />
            </label>
            <label className="admin-field">
              <span>Upload Pan Card</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUpload('signatoryPanUrl', e.target.files?.[0])}
              />
              {form.signatoryPanUrl ? <small className="mkyc__ok">Uploaded</small> : null}
            </label>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                Next →
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'summary' ? (
          <section className="mkyc__card">
            <h2>D. Review Membership Details</h2>
            <p className="admin-login__hint">
              Please review carefully. Use Back to make changes before the final declaration and signature.
            </p>
            <ul className="mkyc__kv">
              <li>
                <strong>Legal Name of Company:</strong> {form.legalCompanyName}
              </li>
              <li>
                <strong>Entity:</strong> {form.entityType}
              </li>
              <li>
                <strong>Trade / Brand Name:</strong> {form.tradeName || '—'}
              </li>
              <li>
                <strong>Registered Office Address:</strong> {form.registeredAddress}
              </li>
              <li>
                <strong>Communication Address Different:</strong> {form.communicationAddressSame ? 'No' : 'Yes'}
              </li>
              <li>
                <strong>Nature of Business:</strong> {form.natureOfBusiness}
              </li>
              <li>
                <strong>Company Website:</strong> {form.companyWebsite || '—'}
              </li>
              <li>
                <strong>Company PAN:</strong> {form.companyPan || '—'}
              </li>
              <li>
                <strong>GST:</strong> {form.gstRegistered ? form.gstNumber || 'Yes' : 'No'}
              </li>
              <li>
                <strong>Authorized Signatory:</strong> {form.signatoryName} · {form.signatoryDesignation}
              </li>
              <li>
                <strong>Email / Mobile:</strong> {form.signatoryEmail} · {form.signatoryMobile}
              </li>
              <li>
                <strong>Identity Proof:</strong> {form.signatoryIdType} {form.signatoryIdUrl ? '(uploaded)' : ''}
              </li>
              <li>
                <strong>Signatory PAN:</strong> {form.signatoryPan || '—'}
              </li>
            </ul>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                Next →
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'draft' ? (
          <section className="mkyc__card">
            <h2>Download Agreement Draft</h2>
            <div className="mkyc__callout">
              Please download the agreement draft below and review it carefully. Once you are satisfied, submit the form.
              We will then prepare the original document for physical signing.
            </div>
            <label className="mkyc__check">
              <input
                type="checkbox"
                checked={form.declarationAccepted}
                onChange={(e) => set('declarationAccepted', e.target.checked)}
              />
              <span>
                I hereby confirm that all information provided in this form is true, accurate and complete to the best of
                my knowledge. I am duly authorised to submit this application on behalf of the company/entity named above.
                I understand that this information will be used for the preparation of the Membership Agreement and KYC
                verification. *
              </span>
            </label>
            <button type="button" className="enq-ghost" style={{ marginBottom: 12 }} onClick={downloadDraft}>
              Download Agreement Draft
            </button>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={back}>
                Back
              </button>
              <button type="button" className="mkyc__btn" disabled={busy} onClick={next}>
                {busy ? 'Submitting…' : 'I acknowledge that the draft is in order and shall proceed with the signing.'}
              </button>
            </div>
          </section>
        ) : null}

        {sid === 'done' ? (
          <section className="mkyc__card mkyc__card--success">
            <h2 className="mkyc__success-title">Membership KYC Submitted Successfully!</h2>
            <p>
              Thank you for submitting your Membership KYC. Our Senate Space team will review the details and get in
              touch with you shortly for the next steps.
            </p>
            <div className="mkyc__check-icon" aria-hidden>
              ✓
            </div>
            <h3>Thank you</h3>
            <p>for choosing Senate Space Coworking..!</p>
            <div className="mkyc__nav">
              <button type="button" className="enq-ghost" onClick={downloadDraft}>
                Download draft again
              </button>
              <button
                type="button"
                className="mkyc__btn"
                onClick={() => (embedded ? onComplete?.() : navigate('/app?page=profile'))}
              >
                Go to Profile / KYC
              </button>
            </div>
            {!embedded ? (
              <p className="admin-login__hint" style={{ marginTop: 12 }}>
                <Link to="/app">Open member dashboard</Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
