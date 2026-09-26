const AUTH_KEY = 'senate-admin-auth'

export function isAdminAuthed() {
  try {
    return sessionStorage.getItem(AUTH_KEY) === '1'
  } catch {
    return false
  }
}

export function setAdminAuthed(value) {
  try {
    if (value) sessionStorage.setItem(AUTH_KEY, '1')
    else sessionStorage.removeItem(AUTH_KEY)
  } catch {
    /* ignore private-mode storage errors */
  }
}

export const DEMO_ADMIN = {
  email: 'admin@senatespace.com',
  password: 'senate123',
}
