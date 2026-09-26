import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Hyperspeed from '../Hyperspeed'
import senateLogo from '../assets/senate-logo.png'
import { ADMIN_LOGIN_HYPERSPEED } from '../hyperspeedPresets'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../services/api/client'
import './Admin.css'

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

export default function AdminLogin() {
  const { login, logout, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role?.code === 'MEMBER') {
      navigate('/app', { replace: true })
      return
    }
    navigate('/admin', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const mail = email.trim().toLowerCase()
    if (!mail || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    setLoading(true)
    try {
      const u = await login(mail, password)
      if (u.role?.code === 'MEMBER') {
        await logout()
        setError('Members sign in at the member login (/login), not the staff console.')
        return
      }
      navigate('/admin')
    } catch (err) {
      setError(apiError(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

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
            <p className="admin-login__tag">Staff console</p>
          </div>

          <h1>Welcome back</h1>
          <p className="admin-login__lead">Sign in with your staff account. Modules follow your role permissions.</p>

          <form className="admin-login__form" onSubmit={onSubmit} noValidate>
            <label className="admin-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                placeholder="admin@senatespace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Password</span>
              <div className="admin-field__password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-field__toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </label>

            {error ? <p className="admin-login__error">{error}</p> : null}

            <button type="submit" className="admin-login__submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
