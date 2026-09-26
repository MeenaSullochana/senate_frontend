import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000,
})

let accessToken = sessionStorage.getItem('ss-access') || ''
let refreshing = null

export function setAccessToken(token) {
  accessToken = token || ''
  if (token) sessionStorage.setItem('ss-access', token)
  else sessionStorage.removeItem('ss-access')
}

export function getAccessToken() {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    if (status !== 401 || original?._retry || original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }
    original._retry = true
    try {
      if (!refreshing) {
        refreshing = api.post('/auth/refresh', {
          refreshToken: sessionStorage.getItem('ss-refresh') || undefined,
        })
      }
      const { data } = await refreshing
      refreshing = null
      const token = data?.data?.accessToken
      if (!token) throw error
      setAccessToken(token)
      if (data.data.refreshToken) sessionStorage.setItem('ss-refresh', data.data.refreshToken)
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    } catch (err) {
      refreshing = null
      setAccessToken('')
      sessionStorage.removeItem('ss-refresh')
      sessionStorage.removeItem('senate-admin-auth')
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
        window.location.assign('/login')
      }
      return Promise.reject(err)
    }
  },
)

export function apiError(err, fallback = 'Something went wrong') {
  return err.response?.data?.message || err.message || fallback
}
