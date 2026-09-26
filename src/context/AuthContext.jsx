import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/api'
import { getAccessToken, setAccessToken } from '../services/api/client'

const AuthContext = createContext(null)

function takeKycAccessTokenFromUrl() {
  try {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('t') || url.searchParams.get('access')
    if (!token) return ''
    url.searchParams.delete('t')
    url.searchParams.delete('access')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    return token
  } catch {
    return ''
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const applySession = useCallback((data) => {
    if (data?.accessToken) setAccessToken(data.accessToken)
    if (data?.refreshToken) sessionStorage.setItem('ss-refresh', data.refreshToken)
    if (data?.user) {
      setUser(data.user)
      sessionStorage.setItem('senate-admin-auth', '1')
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout(sessionStorage.getItem('ss-refresh'))
    } catch {
      /* ignore */
    }
    setAccessToken('')
    sessionStorage.removeItem('ss-refresh')
    sessionStorage.removeItem('senate-admin-auth')
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const kycToken = takeKycAccessTokenFromUrl()
      if (kycToken) {
        try {
          const { data } = await authApi.kycAccess(kycToken)
          if (!cancelled) applySession(data.data)
        } catch {
          if (!cancelled) {
            setUser(null)
            setAccessToken('')
          }
        } finally {
          if (!cancelled) setReady(true)
        }
        return
      }

      const token = getAccessToken()
      if (!token) {
        if (!cancelled) setReady(true)
        return
      }
      try {
        const res = await authApi.me()
        if (!cancelled) setUser(res.data.data.user)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [applySession])

  const login = useCallback(
    async (email, password) => {
      const { data } = await authApi.login({ email, password })
      applySession(data.data)
      return data.data.user
    },
    [applySession],
  )

  const register = useCallback(
    async (body) => {
      const { data } = await authApi.register(body)
      applySession(data.data)
      return data.data.user
    },
    [applySession],
  )

  const permissions = user?.permissions || []
  const isSuperAdmin = user?.role?.code === 'SUPER_ADMIN'

  const can = useCallback(
    (code) => {
      if (!code) return false
      if (isSuperAdmin) return true
      return permissions.includes(code)
    },
    [isSuperAdmin, permissions],
  )

  const canAny = useCallback(
    (...codes) => {
      if (isSuperAdmin) return true
      return codes.some((c) => permissions.includes(c))
    },
    [isSuperAdmin, permissions],
  )

  const canAll = useCallback(
    (...codes) => {
      if (isSuperAdmin) return true
      return codes.every((c) => permissions.includes(c))
    },
    [isSuperAdmin, permissions],
  )

  const refresh = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return null
    try {
      const res = await authApi.me()
      const next = res.data.data.user
      setUser(next)
      return next
    } catch {
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      refresh,
      setUser,
      role: user?.role?.code,
      permissions,
      isSuperAdmin,
      can,
      canAny,
      canAll,
    }),
    [user, ready, login, register, logout, refresh, permissions, isSuperAdmin, can, canAny, canAll],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function usePermission(code) {
  const { can } = useAuth()
  return can(code)
}

/** Members → member app; every other role (staff / custom) → admin console. */
export function homeForRole(role) {
  if (!role) return '/'
  if (role === 'MEMBER') return '/app'
  return '/admin'
}

export function isStaffRole(role) {
  return Boolean(role) && role !== 'MEMBER'
}
