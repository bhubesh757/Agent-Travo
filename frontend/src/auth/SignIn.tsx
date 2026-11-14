import { useEffect, useRef, useState } from 'react'
import { Check, Compass } from 'lucide-react'
import { useAuth } from './AuthContext'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

let gsiScript: Promise<void> | null = null
function loadGoogleIdentity() {
  gsiScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { gsiScript = null; script.remove(); reject(new Error('Could not load Google sign-in')) }
    document.head.appendChild(script)
  })
  return gsiScript
}

// Google allows one initialize() per page, so it gets a stable callback that forwards to the mounted screen.
let initializedClientId: string | null = null
let onCredential: (credential: string) => void = () => {}

type Setup = { state: 'loading' } | { state: 'ready'; clientId: string } | { state: 'notConfigured' } | { state: 'error'; message: string }

export default function SignIn() {
  const { status, signInWithGoogle, retry } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [setup, setSetup] = useState<Setup>({ state: 'loading' })
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'signedOut') return
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/v1/auth/config')
        if (!response.ok) throw new Error('The API did not return the sign-in settings.')
        const { google_client_id: clientId } = await response.json() as { google_client_id: string }
        if (cancelled) return
        if (!clientId) { setSetup({ state: 'notConfigured' }); return }
        await loadGoogleIdentity()
        if (!cancelled) setSetup({ state: 'ready', clientId })
      } catch (cause) {
        if (!cancelled) setSetup({ state: 'error', message: cause instanceof Error ? cause.message : 'Could not set up sign-in.' })
      }
    })()
    return () => { cancelled = true }
  }, [status])

  useEffect(() => {
    if (setup.state !== 'ready' || !buttonRef.current || !window.google) return
    onCredential = async credential => {
      setError(null)
      setSigningIn(true)
      try { await signInWithGoogle(credential) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.'); setSigningIn(false) }
    }
    if (initializedClientId !== setup.clientId) {
      window.google.accounts.id.initialize({
        client_id: setup.clientId,
        callback: response => { if (response.credential) onCredential(response.credential) },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      initializedClientId = setup.clientId
    }
    window.google.accounts.id.renderButton(buttonRef.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left', width: 280 })
    return () => { onCredential = () => {} }
  }, [setup, signInWithGoogle])

  return <div className="auth-screen">
    <div className="auth-card">
      <div className="brand auth-brand"><span className="brand-mark"><Compass size={21}/></span><span>travel<span className="brand-light">forge</span><i>•</i></span></div>
      <h1>Welcome.<br/><em>Let’s plan something good.</em></h1>
      <p className="auth-intro">Sign in to plan trips and keep your journeys in one place.</p>

      {status === 'loading' && <p className="auth-status" role="status">Checking your session…</p>}

      {status === 'unreachable' && <div className="auth-message" role="alert">
        <strong>Can’t reach the TravelForge API.</strong>
        <span>Start the backend on port 8000, then try again.</span>
        <button type="button" className="auth-retry" onClick={retry}>Try again</button>
      </div>}

      {status === 'signedOut' && <>
        {setup.state === 'loading' && <p className="auth-status" role="status">Loading sign-in…</p>}
        {setup.state === 'notConfigured' && <div className="auth-message" role="alert">
          <strong>Google sign-in isn’t set up yet.</strong>
          <span>Set <code>GOOGLE_OAUTH_CLIENT_ID</code> in <code>backend/.env</code> and restart the API. Steps are in <code>docs/AUTHENTICATION.md</code>.</span>
        </div>}
        {setup.state === 'error' && <div className="auth-message" role="alert">
          <strong>Sign-in couldn’t load.</strong>
          <span>{setup.message}</span>
          <button type="button" className="auth-retry" onClick={() => window.location.reload()}>Reload</button>
        </div>}
        {setup.state === 'ready' && <div className="auth-google" aria-busy={signingIn}>
          <div ref={buttonRef} className={signingIn ? 'auth-google-button is-busy' : 'auth-google-button'}/>
          {signingIn && <p className="auth-status" role="status">Signing you in…</p>}
        </div>}
        {error && <div className="auth-message" role="alert"><strong>Sign-in didn’t work.</strong><span>{error}</span></div>}
      </>}

      <div className="privacy-note auth-privacy"><span className="privacy-dot"><Check size={11}/></span>We only use your Google name, email, and photo.</div>
    </div>
  </div>
}
