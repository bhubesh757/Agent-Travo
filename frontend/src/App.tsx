import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Compass, Globe2, LogOut, MapPin, Menu, Plus, Sparkles, Users, Wallet, X } from 'lucide-react'
import { createTrip, decideTrip, getTrip, listTrips, startPlanning } from './api/trips'
import type { Trip } from './api/trips'
import { useAuth } from './auth/AuthContext'
import type { AuthUser } from './auth/AuthContext'

const destinations = [
  { name: 'Kyoto, Japan', tag: 'Culture · 5 days', img: 'photo-1493976040374-85c8e12f0c0e', price: '₹68,400', tint: 'peach' },
  { name: 'Amalfi Coast, Italy', tag: 'Coast · 7 days', img: 'photo-1533105079780-92b9be482077', price: '₹1,12,800', tint: 'blue' },
  { name: 'Marrakech, Morocco', tag: 'City · 4 days', img: 'photo-1539020140153-e479b8c22e70', price: '₹54,200', tint: 'sand' },
]

const budgets = [
  { label: 'Under ₹50,000', amount: '50000' },
  { label: '₹50,000 – ₹1,00,000', amount: '100000' },
  { label: '₹1,00,000 – ₹2,00,000', amount: '200000' },
  { label: '₹2,00,000+', amount: '300000' },
  { label: 'Flexible', amount: '0' },
]

function Avatar({ user, small }: { user: AuthUser; small?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  return <span className={small ? 'avatar avatar-small' : 'avatar'} aria-hidden="true">
    {user.picture && !imageFailed ? <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)}/> : user.name.charAt(0).toUpperCase()}
  </span>
}

function formatDate(value: string | null) {
  if (!value) return 'Dates to be confirmed'
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
}

export default function App() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('Chennai')
  const [destination, setDestination] = useState('Bali, Indonesia')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [travelers, setTravelers] = useState('2')
  const [budgetIndex, setBudgetIndex] = useState('1')
  const [interests, setInterests] = useState('Local food, beaches, sightseeing')
  const [menuOpen, setMenuOpen] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripsError, setTripsError] = useState<string | null>(null)
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [decisionPending, setDecisionPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null)

  const refreshTrips = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await listTrips(signal)
      setTrips(data)
      setTripsError(null)
    } catch (cause) {
      if (!signal?.aborted) setTripsError(cause instanceof Error ? cause.message : 'Could not load your journeys.')
    } finally {
      if (!signal?.aborted) setTripsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refreshTrips(controller.signal)
    return () => controller.abort()
  }, [refreshTrips])

  const handleSignOut = async () => {
    setSignOutError(null)
    setSigningOut(true)
    try { await signOut() }
    catch (cause) { setSignOutError(cause instanceof Error ? cause.message : 'Sign-out failed.'); setSigningOut(false) }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)
    if (!startDate || !endDate) { setFormError('Choose both travel dates so we can build the right plan.'); return }
    if (endDate < startDate) { setFormError('Your return date must be after your departure date.'); return }
    const budget = budgets[Number(budgetIndex)]
    setCreating(true)
    try {
      const trip = await createTrip({
        origin: origin.trim(),
        destination: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        travelers: Number(travelers),
        budget: { amount: budget.amount, currency: 'INR' },
        interests: interests.split(',').map(item => item.trim()).filter(Boolean),
        booking_requires_approval: true,
      })
      setTrips(current => [trip, ...current.filter(item => item.id !== trip.id)])
      setActiveTrip(trip)
      setNotice({ kind: 'success', text: `Your trip to ${trip.destination} is saved.` })
      try {
        await startPlanning(trip.id)
        const latest = await getTrip(trip.id).catch(() => trip)
        setActiveTrip(latest)
        setTrips(current => current.map(item => item.id === latest.id ? latest : item))
        setNotice({ kind: 'success', text: `Planning started for ${trip.destination}. You’ll see its progress in My journeys.` })
      } catch (cause) {
        setNotice({ kind: 'warning', text: `Your trip was saved, but planning did not start: ${cause instanceof Error ? cause.message : 'Please try again from My journeys.'}` })
      }
      void refreshTrips()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'We could not save this trip. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const openTrip = async (trip: Trip) => {
    setLoadingTripId(trip.id)
    setNotice(null)
    try { setActiveTrip(await getTrip(trip.id)) }
    catch (cause) { setNotice({ kind: 'warning', text: cause instanceof Error ? cause.message : 'Could not load trip details.' }) }
    finally { setLoadingTripId(null) }
  }

  const submitDecision = async (decision: 'approve' | 'reject') => {
    if (!activeTrip || !activeTrip.proposal_version) return
    const reviewedVersion = activeTrip.proposal_version
    setDecisionPending(true)
    setNotice(null)
    try {
      const updated = await decideTrip(activeTrip.id, decision, reviewedVersion)
      setActiveTrip(updated)
      setTrips(current => current.map(item => item.id === updated.id ? updated : item))
      setNotice({ kind: 'success', text: decision === 'approve' ? `Proposal v${reviewedVersion} approved. Booking still requires a separate action.` : `Proposal v${reviewedVersion} rejected.` })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your decision.'
      setNotice({ kind: 'warning', text: message })
      if (message.toLowerCase().includes('proposal changed') || message.toLowerCase().includes('latest version')) {
        const fresh = await getTrip(activeTrip.id).catch(() => null)
        if (fresh) {
          setActiveTrip(fresh)
          setTrips(current => current.map(item => item.id === fresh.id ? fresh : item))
        }
      }
    } finally {
      setDecisionPending(false)
    }
  }

  if (!user) return null
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-mark"><Compass size={21}/></span><span>travel<span className="brand-light">forge</span><i>•</i></span></a>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav"><a className="nav-item active" href="#home"><span className="nav-icon"><Sparkles size={17}/></span>Plan a trip</a><a className="nav-item" href="#trips"><span className="nav-icon"><MapPin size={17}/></span>My journeys <span className="nav-count">{trips.length}</span></a><a className="nav-item" href="#discover"><span className="nav-icon"><Globe2 size={17}/></span>Discover</a></nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16}/></div><strong>A little more you.</strong><p>Tell us what makes a trip feel like yours.</p><button onClick={() => document.querySelector<HTMLInputElement>('#notes')?.focus()}>Set preferences <ArrowRight size={13}/></button></div><div className="profile"><Avatar user={user}/><div><strong>{user.name}</strong><small title={user.email}>{user.email}</small></div><button type="button" className="sign-out" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={handleSignOut}><LogOut size={15}/></button></div>{signOutError && <p className="sign-out-error" role="alert">{signOutError}</p>}</div>
    </aside>
    <main id="home" className="main-area">
      <header className="topbar"><div className="breadcrumb">Your space <span>/</span> <b>Plan a trip</b></div><div className="top-actions"><span className="status-pill"><span/>Signed in</span><button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button><Avatar user={user} small/></div></header>
      {menuOpen && <div className="mobile-panel"><a href="#home">Plan a trip</a><a href="#trips">My journeys</a><a href="#discover">Discover</a><button type="button" disabled={signingOut} onClick={handleSignOut}>Sign out</button>{signOutError && <p className="sign-out-error" role="alert">{signOutError}</p>}</div>}
      <div className="page-content">
        <section className="welcome"><div><div className="eyebrow"><span className="eyebrow-line"/>YOUR NEXT CHAPTER STARTS HERE</div><h1>Go somewhere<br/><em>that stays with you.</em></h1><p className="intro">A good trip begins with a feeling. Tell us yours, and we’ll shape the details around it.</p></div><div className="welcome-note"><span className="note-spark">✳</span><span>Thoughtfully planned.<br/><b>Always yours to approve.</b></span></div></section>
        <section className="planner-card"><div className="card-top"><div><div className="step-label"><span>01</span> &nbsp; THE STARTING POINT</div><h2>Where are we going?</h2><p>We’ll take it from here. Change anything as you go.</p></div><span className="draft-badge"><span/> NEW PLAN</span></div>
            <form onSubmit={submit}><div className="form-grid trip-form-grid"><label className="field"><span className="field-label">FROM</span><span className="input-wrap"><MapPin size={17}/><input value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Your home city" required/></span></label><label className="field"><span className="field-label">DESTINATION</span><span className="input-wrap"><MapPin size={17}/><input id="destination" value={destination} onChange={event => setDestination(event.target.value)} placeholder="Where to?" required/><ChevronDown size={15} className="field-end"/></span></label><label className="field"><span className="field-label">DEPART</span><span className="input-wrap"><CalendarDays size={17}/><input aria-label="Departure date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required/></span></label><label className="field"><span className="field-label">RETURN</span><span className="input-wrap"><CalendarDays size={17}/><input aria-label="Return date" type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} required/></span></label><label className="field"><span className="field-label">TRAVELERS</span><span className="input-wrap"><Users size={17}/><select aria-label="Travelers" value={travelers} onChange={event => setTravelers(event.target.value)}>{[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} {count === 1 ? 'traveler' : 'travelers'}</option>)}</select><ChevronDown size={15} className="field-end"/></span></label><label className="field"><span className="field-label">BUDGET <small>· TOTAL INR</small></span><span className="input-wrap"><Wallet size={17}/><select aria-label="Budget" value={budgetIndex} onChange={event => setBudgetIndex(event.target.value)}>{budgets.map((budget, index) => <option value={index} key={budget.label}>{budget.label}</option>)}</select><ChevronDown size={15} className="field-end"/></span></label></div>
            <label className="field notes-field" id="notes"><span className="field-label">WHAT WOULD MAKE THIS TRIP FEEL LIKE YOURS? <small>· SEPARATE WITH COMMAS</small></span><span className="input-wrap notes-wrap"><Sparkles size={16}/><input value={interests} onChange={event => setInterests(event.target.value)} placeholder="Slow mornings, local food, a little adventure…"/><button className="add-note" type="button" aria-label="Clear interests" onClick={() => setInterests('')}><X size={15}/></button></span></label>
            {formError && <div className="api-message error-message" role="alert">{formError}</div>}
            <div className="form-bottom"><div className="privacy-note"><span className="privacy-dot"><Check size={11}/></span>Nothing gets booked without your approval.</div><button className="submit-button" type="submit" disabled={creating}>{creating ? <>Saving your trip… <span className="mini-spinner"/></> : <>Build my trip <ArrowRight size={16}/></>}</button></div>
          </form>
          {notice && <div className={`api-message ${notice.kind === 'warning' ? 'warning-message' : 'success-message'}`} role="status"><Sparkles size={15}/>{notice.text}</div>}
        </section>

        <section id="trips" className="journeys-section"><div className="section-head"><div><div className="eyebrow section-eyebrow">YOUR TRAVEL SPACE</div><h2>My journeys</h2></div><button className="refresh-trips" type="button" onClick={() => { setTripsLoading(true); void refreshTrips() }} disabled={tripsLoading}>{tripsLoading ? 'Refreshing…' : 'Refresh'} <ArrowDown size={13}/></button></div>
          {tripsError && <div className="api-message error-message" role="alert">Couldn’t load your journeys. {tripsError}</div>}
          {tripsLoading && <div className="journey-empty" role="status"><span className="mini-spinner"/> Loading your journeys…</div>}
          {!tripsLoading && !tripsError && trips.length === 0 && <div className="journey-empty"><MapPin size={17}/> Your saved trips will show up here.</div>}
          {trips.length > 0 && <div className="journeys-list">{trips.map(trip => <button className={`journey-row ${activeTrip?.id === trip.id ? 'selected' : ''}`} key={trip.id} onClick={() => void openTrip(trip)} disabled={loadingTripId === trip.id}><span className="journey-pin"><MapPin size={16}/></span><span className="journey-info"><strong>{trip.origin} <span>→</span> {trip.destination}</strong><small>{formatDate(trip.start_date)} – {formatDate(trip.end_date)} · {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</small></span><span className="journey-status">{loadingTripId === trip.id ? <span className="mini-spinner"/> : statusLabel(trip.status)}</span><ArrowRight size={15} className="journey-arrow"/></button>)}</div>}
          {activeTrip && <div className="trip-detail-panel">
            <div className="trip-detail-heading"><div><span className="field-label">SELECTED JOURNEY</span><strong>{activeTrip.destination}</strong><small>{statusLabel(activeTrip.status)} · {formatDate(activeTrip.start_date ?? '')} – {formatDate(activeTrip.end_date ?? '')}</small></div><button type="button" aria-label="Close journey detail" onClick={() => setActiveTrip(null)}><X size={16}/></button></div>
            {activeTrip.proposal && <div className="proposal-review">
              <div className="proposal-title-row"><div><span className="field-label">TRIP PROPOSAL · VERSION {activeTrip.proposal.version}</span><h3>{activeTrip.proposal.destination} at your pace</h3></div><span className="mock-status"><span/> MOCK PREVIEW</span></div>
              <p className="mock-disclosure"><Sparkles size={14}/>{activeTrip.proposal.label}. Suggestions and prices are illustrative and are not live travel data.</p>
              <div className="proposal-budget"><div><span className="field-label">BUDGET NOTES</span><strong>{activeTrip.proposal.budget.range || (activeTrip.proposal.budget.amount ? `${activeTrip.proposal.budget.currency} ${activeTrip.proposal.budget.amount}` : 'Flexible budget')}</strong><small>{activeTrip.proposal.budget.estimated_total ? `Illustrative estimate: ${activeTrip.proposal.budget.currency} ${activeTrip.proposal.budget.estimated_total}` : 'No total estimated yet.'}</small></div><p>{activeTrip.proposal.budget.note}</p></div>
              <div className="day-outline"><span className="field-label">DAY-BY-DAY OUTLINE</span>{activeTrip.proposal.days.map((day, index) => <article className="outline-day" key={`${day.date}-${index}`}><span className="day-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{day.title}</strong><small>{formatDate(day.date)}</small><ul>{day.ideas.map((idea, ideaIndex) => <li key={ideaIndex}>{idea}</li>)}</ul></div></article>)}</div>
              {activeTrip.status === 'awaiting_approval' && <div className="decision-panel"><div><strong>Review this exact version</strong><small>Your choice applies to proposal v{activeTrip.proposal.version}. Any updated proposal needs a fresh decision.</small></div><div className="decision-actions"><button type="button" className="reject-button" disabled={decisionPending} onClick={() => void submitDecision('reject')}>Reject</button><button type="button" className="approve-button" disabled={decisionPending} onClick={() => void submitDecision('approve')}>{decisionPending ? <><span className="mini-spinner"/> Saving…</> : <>Approve proposal <Check size={14}/></>}</button></div><small className="no-booking-note">Approval records your review only. No booking or payment is made.</small></div>}
              {activeTrip.approval_decision && <div className="decision-result" role="status">Proposal v{activeTrip.proposal.version} {activeTrip.approval_decision === 'approve' ? 'approved' : 'rejected'}.</div>}
            </div>}
            {!activeTrip.proposal && <p className="no-proposal">No planning preview is available yet. Start a trip plan to generate one.</p>}
          </div>}
        </section>

        <section id="discover" className="inspiration"><div className="section-head"><div><div className="eyebrow section-eyebrow">A LITTLE INSPIRATION</div><h2>Somewhere to begin</h2></div><a href="#discover" className="see-all">Explore all places <ArrowUpRight size={15}/></a></div><div className="destination-grid">{destinations.map((place, i) => <article className={`destination-card ${place.tint}`} key={place.name}><div className="destination-image" style={{ backgroundImage: `url(https://images.unsplash.com/${place.img}?auto=format&fit=crop&w=900&q=82)` }}><span className="image-index">0{i+1}</span><button className="save-place" aria-label={`Use ${place.name} as destination`} onClick={() => { setDestination(place.name); document.querySelector<HTMLInputElement>('#destination')?.focus() }}><Plus size={17}/></button></div><div className="destination-meta"><div><span>{place.tag}</span><h3>{place.name}</h3></div><div className="estimate"><small>EST. FROM</small><strong>{place.price}</strong></div></div></article>)}</div></section>
        <footer className="page-footer"><span>Made for the way you want to travel.</span><span>Prices shown are illustrative estimates <span className="footer-sep">·</span> <a href="#sources">How planning works <ArrowUpRight size={11}/></a></span></footer>
      </div>
    </main>
  </div>
}
