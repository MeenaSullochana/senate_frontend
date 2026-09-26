import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { onboardingApi } from '../services/api'
import { apiError } from '../services/api/client'
import '../admin/Admin.css'

export default function PayDepositPage() {
  const { id } = useParams()
  const [payment, setPayment] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [kycUrl, setKycUrl] = useState('')

  useEffect(() => {
    if (!id) return
    onboardingApi
      .publicPayment(id)
      .then((res) => setPayment(res.data.data.payment))
      .catch((err) => setError(apiError(err)))
  }, [id])

  const isBookingPay =
    payment?.type === 'CONFERENCE_ROOM_BOOKING' || payment?.type === 'WORKSPACE_BOOKING'

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await onboardingApi.publicPay(id)
      setPayment(res.data.data.payment)
      if (isBookingPay || res.data.data.payment?.bookingNumber) {
        setMsg(
          `Payment successful. Booking ${res.data.data.payment?.bookingNumber || payment?.bookingNumber || ''} is confirmed.`,
        )
      } else {
        const link = `${window.location.origin}/kyc`
        setKycUrl(link)
        setMsg('Payment successful. Check your email for login credentials, then complete the Membership KYC form.')
      }
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login" style={{ minHeight: '100svh' }}>
      <div className="admin-login__stage">
        <div className="admin-login__card" style={{ textAlign: 'left' }}>
          <p className="admin-login__tag">Senate Space</p>
          <h1>{isBookingPay ? 'Booking payment' : 'Deposit payment'}</h1>
          {error ? <p className="admin-login__error">{error}</p> : null}
          {msg ? <p className="admin-login__hint">{msg}</p> : null}
          {!payment && !error ? <p>Loading…</p> : null}
          {payment ? (
            <>
              <p>
                {isBookingPay ? 'Client' : 'Payee'}: <strong>{payment.payee || 'Member'}</strong>
              </p>
              {payment.bookingNumber ? (
                <p>
                  Booking: <strong>{payment.bookingNumber}</strong>
                </p>
              ) : null}
              <p>
                Amount:{' '}
                <strong>
                  {payment.currency || 'INR'} {payment.amount}
                </strong>
              </p>
              <p>
                Status: <strong>{payment.status}</strong>
              </p>
              {payment.status === 'PENDING' ? (
                <button type="button" className="admin-login__submit" disabled={busy} onClick={pay} style={{ marginTop: 16 }}>
                  {busy ? 'Processing…' : isBookingPay ? 'Pay & confirm booking' : 'Pay deposit now'}
                </button>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <p className="admin-login__hint">
                    {isBookingPay ? 'Paid — booking confirmed.' : 'Already paid.'}
                  </p>
                  {!isBookingPay ? (
                    <p>
                      <Link to="/login">Go to member login</Link>
                      {' · '}
                      <Link to={kycUrl || '/kyc'}>Open Membership KYC form</Link>
                    </p>
                  ) : (
                    <p>
                      <Link to="/login">Go to dashboard</Link>
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
