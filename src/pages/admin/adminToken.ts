import { createContext, useContext } from 'react'

/**
 * Admin token za sve podstranice. Zivi u contextu, ne u propsu, jer ga trazi
 * svaki poziv prema /api/admin, a podstranice su tri nivoa duboko.
 */
export const AdminTokenContext = createContext<string>('')

export function useAdminToken(): string {
  return useContext(AdminTokenContext)
}

export const TOKEN_KEY = 'la-familia:admin-token'

/** sessionStorage baca u privatnom prozoru i kad su kolacici blokirani. */
export function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeToken(value: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, value)
  } catch {
    /* privatni prozor - admin radi, samo ne prezivi refresh */
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nedostupan */
  }
}
