import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLogin from './admin/AdminLogin'
import AdminDashboard from './admin/AdminDashboard'
import { AuthProvider, useAuth, homeForRole, isStaffRole } from './context/AuthContext'
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from './pages/AuthPages'
import PayDepositPage from './pages/PayDepositPage'
import MembershipKycPage from './pages/MembershipKycPage'
import {
  AboutPage,
  BlogDetailPage,
  BlogPage,
  ContactPage,
  GalleryPage,
  PackagesPage,
  PartnersPage,
  SolutionDetailPage,
  SolutionsPage,
} from './pages/site/SitePages'
import SiteLayout from './site/SiteLayout'
import { SiteCmsProvider } from './site/SiteCmsContext'
import LegacyHome from './LegacyHome'

function Guard({ roles, staffOnly, children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="admin-login" style={{ color: '#fff', padding: 40 }}>Loading…</div>
  if (!user) {
    return <Navigate to={staffOnly ? '/admin/login' : '/login'} replace />
  }
  if (staffOnly && !isStaffRole(user.role?.code)) {
    return <Navigate to={homeForRole(user.role?.code)} replace />
  }
  if (roles && !roles.includes(user.role?.code)) {
    return <Navigate to={homeForRole(user.role?.code)} replace />
  }
  return children
}

function AuthRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to={homeForRole(user.role?.code)} replace />
  return <LoginPage />
}

function RootRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <SiteCmsProvider>
          <LegacyHome />
        </SiteCmsProvider>
      } />

      {/* Other marketing pages share SiteLayout */}
      <Route element={<SiteLayout />}>
        <Route path="/about" element={<AboutPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/solutions/:slug" element={<SolutionDetailPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route path="/login" element={<AuthRedirect />} />
      <Route path="/pay/:id" element={<PayDepositPage />} />
      <Route path="/kyc" element={<MembershipKycPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPage />} />
      <Route path="/reset-password" element={<ResetPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/*"
        element={
          <Guard staffOnly>
            <AdminDashboard />
          </Guard>
        }
      />
      <Route
        path="/app/*"
        element={
          <Guard roles={['MEMBER']}>
            <AdminDashboard />
          </Guard>
        }
      />
      {/* Legacy staff paths → unified admin console */}
      <Route path="/desk/*" element={<Navigate to="/admin" replace />} />
      <Route path="/maintenance/*" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
