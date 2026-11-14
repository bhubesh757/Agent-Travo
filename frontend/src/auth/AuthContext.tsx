import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type AuthUser = { id: string; email: string; name: string; picture: string | null }

// 'unreachable' means the API did not answer, so we cannot tell whether a session exists.
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'unreachable'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  signInWithGoogle: (credential: string) => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

const API = '/api/v1/auth'
const AuthContext = createContext<AuthState | null>(null)

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail as string
  } catch { /* not JSON: the API is probably not running behind the proxy */ }
  return fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  const loadSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${API}/me`, { signal })
      if (response.ok) { setUser(await response.json()); setStatus('signedIn') }
      else if (response.status === 401) { setUser(null); setStatus('signedOut') }
      else setStatus('unreachable')
    } catch {
      if (!signal?.aborted) setStatus('unreachable')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadSession(controller.signal)
    return () => controller.abort()
  }, [loadSession])

  const signInWithGoogle = useCallback(async (credential: string) => {
    const response = await fetch(`${API}/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) })
    if (!response.ok) throw new Error(await errorMessage(response, 'Sign-in failed. Check that the API is running, then try again.'))
    setUser(await response.json())
    setStatus('signedIn')
  }, [])

  const signOut = useCallback(async () => {
    const response = await fetch(`${API}/logout`, { method: 'POST' })
    // The cookie is HttpOnly, so only the server can end the session; stay signed in if it did not.
    if (!response.ok) throw new Error(await errorMessage(response, 'Sign-out failed. Check that the API is running, then try again.'))
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
    setStatus('signedOut')
  }, [])

  const retry = useCallback(() => { setStatus('loading'); void loadSession() }, [loadSession])

  const value = useMemo(() => ({ status, user, signInWithGoogle, signOut, retry }), [status, user, signInWithGoogle, signOut, retry])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
