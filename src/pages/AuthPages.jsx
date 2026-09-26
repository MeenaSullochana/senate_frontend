import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Hyperspeed from '../Hyperspeed'
import senateLogo from '../assets/senate-logo.png'
import { ADMIN_LOGIN_HYPERSPEED } from '../hyperspeedPresets'
import { useAuth, homeForRole } from '../context/AuthContext'
import { apiError } from '../services/api/client'
import { authApi, onboardingApi } from '../services/api'
import '../admin/Admin.css'

function EyeIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9.5 4.5 10.5 6-.4.6-1 1.5-1.9 2.5M6.1 6.1C4.1 7.5 2.7 9.3 1.5 11c1.2 1.8 3.3 4.3 6.2 5.7 1.4.7 2.8 1 4.3 1 1.1 0 2.1-.2 3.1-.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function AuthLayout({ title, lead, children, footer }) {
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])
  return (
    <div className="admin-login">
      <div className="admin-login__hyperspeed" aria-hidden="true">
        {reduceMotion ? null : <Hyperspeed effectOptions={ADMIN_LOGIN_HYPERSPEED} />}
      </div>
      <div className="admin-login__glow" aria-hidden="true" />
      <Link to="/" className="admin-login__back">
        ← Back to site
      </Link>
      <div className="admin-login__stage">
        <div className="admin-login__card">
          <div className="admin-login__brand">
            <img src={senateLogo} alt="" />
            <p className="admin-login__name">
              SENATE<span>Space</span>
            </p>
            <p className="admin-login__tag">Member access</p>
          </div>
          <h1>{title}</h1>
          <p className="admin-login__lead">{lead}</p>
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [search] = useState(() => new URLSearchParams(window.location.search))
  const nextPath = search.get('next') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReactivation, setShowReactivation] = useState(false)
  const [reactivationNote, setReactivationNote] = useState('')

  const goAfterLogin = (u) => {
    if (nextPath && nextPath.startsWith('/') && u?.role?.code === 'MEMBER') {
      navigate(nextPath, { replace: true })
      return
    }
    navigate(homeForRole(u?.role?.code))
  }

  useEffect(() => {
    if (user) goAfterLogin(user)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    setLoading(true)
    try {
      const u = await login(email.trim().toLowerCase(), password)
      goAfterLogin(u)
    } catch (err) {
      const message = apiError(err, 'Invalid credentials')
      setError(message)
      if (/locked|reactivation|deactivated|deposit/i.test(message)) setShowReactivation(true)
    } finally {
      setLoading(false)
    }
  }

  const requestReactivation = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      await onboardingApi.requestReactivationPublic({
        email: email.trim().toLowerCase(),
        note: reactivationNote,
      })
      setMsg('Reactivation requested. Admin will review and notify you.')
      setShowReactivation(false)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <AuthLayout title="Welcome back" lead="Sign in to manage your membership, bookings, and workspace.">
      <form className="admin-login__form" onSubmit={onSubmit} noValidate>
        <label className="admin-field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <div className="admin-field__password">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="admin-field__toggle" onClick={() => setShowPassword((v) => !v)}>
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </label>
        {error ? <p className="admin-login__error">{error}</p> : null}
        {msg ? <p className="admin-login__hint">{msg}</p> : null}
        <button type="submit" className="admin-login__submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {showReactivation ? (
        <form className="admin-login__form" onSubmit={requestReactivation} style={{ marginTop: 16 }}>
          <p className="admin-login__hint">
            Account held for re-verification? Request admin reactivation below.
          </p>
          <label className="admin-field">
            <span>Note for admin</span>
            <textarea rows={2} value={reactivationNote} onChange={(e) => setReactivationNote(e.target.value)} />
          </label>
          <button type="submit" className="admin-login__submit">
            Request reactivation
          </button>
        </form>
      ) : null}
      <p className="admin-login__hint">
        <Link to="/register">Create an account</Link> · <Link to="/forgot-password">Forgot password</Link>
      </p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate(homeForRole(user.role?.code), { replace: true })
  }, [user, navigate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    if (!form.fullName || !form.email || !form.mobile || !form.password) {
      setError('Please fill all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords must match' })
      return
    }
    setLoading(true)
    try {
      const u = await register({ ...form, email: form.email.trim().toLowerCase() })
      navigate(homeForRole(u.role?.code))
    } catch (err) {
      setFieldErrors(err.response?.data?.errors || {})
      setError(apiError(err, 'Could not register'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Join Senate Space" lead="Create your member account. KYC is required before bookings.">
      <form className="admin-login__form" onSubmit={onSubmit} noValidate>
        {[
          ['fullName', 'Full name', 'text'],
          ['email', 'Email', 'email'],
          ['mobile', 'Mobile', 'tel'],
          ['password', 'Password', 'password'],
          ['confirmPassword', 'Confirm password', 'password'],
        ].map(([k, label, type]) => (
          <label className="admin-field" key={k}>
            <span>{label}</span>
            <input type={type} value={form[k]} onChange={set(k)} />
            {fieldErrors[k] ? <small className="admin-login__error">{fieldErrors[k]}</small> : null}
          </label>
        ))}
        {error ? <p className="admin-login__error">{error}</p> : null}
        <button type="submit" className="admin-login__submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="admin-login__hint">
        Already a member? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.forgot(email)
      setMessage('If the account exists, a reset email was queued.')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthLayout title="Forgot password" lead="We will email a reset link if the account exists.">
      <form className="admin-login__form" onSubmit={onSubmit}>
        <label className="admin-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {error ? <p className="admin-login__error">{error}</p> : null}
        {message ? <p className="admin-login__hint">{message}</p> : null}
        <button type="submit" className="admin-login__submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  )
}

export function ResetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.reset({ token: params.get('token'), password, confirmPassword })
      navigate('/login')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthLayout title="Reset password" lead="Choose a strong new password.">
      <form className="admin-login__form" onSubmit={onSubmit}>
        <label className="admin-field">
          <span>New password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Confirm password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>
        {error ? <p className="admin-login__error">{error}</p> : null}
        <button type="submit" className="admin-login__submit" disabled={loading}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}
