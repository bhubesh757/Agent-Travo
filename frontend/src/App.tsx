import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Compass, Globe2, LogOut, MapPin, Menu, Plus, Sparkles, Users, Wallet } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import type { AuthUser } from './auth/AuthContext'

const destinations = [
  { name: 'Kyoto, Japan', tag: 'Culture · 5 days', img: 'photo-1493976040374-85c8e12f0c0e', price: '₹68,400', tint: 'peach' },
  { name: 'Amalfi Coast, Italy', tag: 'Coast · 7 days', img: 'photo-1533105079780-92b9be482077', price: '₹1,12,800', tint: 'blue' },
  { name: 'Marrakech, Morocco', tag: 'City · 4 days', img: 'photo-1539020140153-e479b8c22e70', price: '₹54,200', tint: 'sand' },
]

function Avatar({ user, small }: { user: AuthUser; small?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  return <span className={small ? 'avatar avatar-small' : 'avatar'} aria-hidden="true">
    {user.picture && !imageFailed ? <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)}/> : user.name.charAt(0).toUpperCase()}
  </span>
}

export default function App() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const handleSignOut = async () => {
    setSignOutError(null)
    setSigningOut(true)
    try { await signOut() }
    catch (cause) { setSignOutError(cause instanceof Error ? cause.message : 'Sign-out failed.'); setSigningOut(false) }
  }
  const [destination, setDestination] = useState('Bali, Indonesia')
  const [submitted, setSubmitted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(true) }
  if (!user) return null
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-mark"><Compass size={21}/></span><span>travel<span className="brand-light">forge</span><i>•</i></span></a>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav"><a className="nav-item active" href="#home"><span className="nav-icon"><Sparkles size={17}/></span>Plan a trip</a><a className="nav-item" href="#trips"><span className="nav-icon"><MapPin size={17}/></span>My journeys <span className="nav-count">2</span></a><a className="nav-item" href="#saved"><span className="nav-icon"><Globe2 size={17}/></span>Discover</a></nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16}/></div><strong>A little more you.</strong><p>Tell us what makes a trip feel like yours.</p><button onClick={() => document.querySelector<HTMLInputElement>('#notes')?.focus()}>Set preferences <ArrowRight size={13}/></button></div><div className="profile"><Avatar user={user}/><div><strong>{user.name}</strong><small title={user.email}>{user.email}</small></div><button type="button" className="sign-out" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={handleSignOut}><LogOut size={15}/></button></div>{signOutError && <p className="sign-out-error" role="alert">{signOutError}</p>}</div>
    </aside>
    <main id="home" className="main-area">
      <header className="topbar"><div className="breadcrumb">Your space <span>/</span> <b>Plan a trip</b></div><div className="top-actions"><span className="status-pill"><span/>All systems ready</span><button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button><Avatar user={user} small/></div></header>
      {menuOpen && <div className="mobile-panel"><a href="#home">Plan a trip</a><a href="#trips">My journeys</a><a href="#discover">Discover</a><button type="button" disabled={signingOut} onClick={handleSignOut}>Sign out</button>{signOutError && <p className="sign-out-error" role="alert">{signOutError}</p>}</div>}
      <div className="page-content">
        <section className="welcome"><div><div className="eyebrow"><span className="eyebrow-line"/>YOUR NEXT CHAPTER STARTS HERE</div><h1>Go somewhere<br/><em>that stays with you.</em></h1><p className="intro">A good trip begins with a feeling. Tell us yours, and we’ll shape the details around it.</p></div><div className="welcome-note"><span className="note-spark">✳</span><span>Thoughtfully planned.<br/><b>Always yours to approve.</b></span></div></section>
        <section className="planner-card"><div className="card-top"><div><div className="step-label"><span>01</span> &nbsp; THE STARTING POINT</div><h2>Where are we going?</h2><p>We’ll take it from here. Change anything as you go.</p></div><span className="draft-badge"><span/> NEW PLAN</span></div>
          <form onSubmit={submit}><div className="form-grid"><label className="field"><span className="field-label">DESTINATION</span><span className="input-wrap"><MapPin size={17}/><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Where to?" required/><ChevronDown size={15} className="field-end"/></span></label><label className="field"><span className="field-label">WHEN</span><span className="input-wrap"><CalendarDays size={17}/><input aria-label="Travel dates" type="text" placeholder="Add your dates" onFocus={e => e.currentTarget.type='date'}/><ArrowDown size={14} className="field-end"/></span></label><label className="field"><span className="field-label">TRAVELERS</span><span className="input-wrap"><Users size={17}/><select aria-label="Travelers" defaultValue="2 travelers"><option>1 traveler</option><option>2 travelers</option><option>3 travelers</option><option>4 travelers</option><option>5+ travelers</option></select><ChevronDown size={15} className="field-end"/></span></label><label className="field"><span className="field-label">BUDGET <small>· TOTAL</small></span><span className="input-wrap"><Wallet size={17}/><select aria-label="Budget" defaultValue="₹50,000 – ₹1,00,000"><option>Under ₹50,000</option><option>₹50,000 – ₹1,00,000</option><option>₹1,00,000 – ₹2,00,000</option><option>₹2,00,000+</option><option>Flexible</option></select><ChevronDown size={15} className="field-end"/></span></label></div>
            <label className="field notes-field" id="notes"><span className="field-label">WHAT WOULD MAKE THIS TRIP FEEL LIKE YOURS? <small>· OPTIONAL</small></span><span className="input-wrap notes-wrap"><Sparkles size={16}/><input placeholder="Slow mornings, local food, a little adventure…"/><button className="add-note" type="button" aria-label="Add note"><Plus size={16}/></button></span></label>
            <div className="form-bottom"><div className="privacy-note"><span className="privacy-dot"><Check size={11}/></span>Nothing gets booked without your approval.</div><button className="submit-button" type="submit">{submitted ? <>Plan started <Check size={16}/></> : <>Build my trip <ArrowRight size={16}/></>}</button></div>
          </form>{submitted && <div className="success-note"><Sparkles size={15}/> Your {destination || 'trip'} plan is ready to take shape. Connect the planning service to see live recommendations.</div>}
        </section>
        <section id="discover" className="inspiration"><div className="section-head"><div><div className="eyebrow section-eyebrow">A LITTLE INSPIRATION</div><h2>Somewhere to begin</h2></div><a href="#discover" className="see-all">Explore all places <ArrowUpRight size={15}/></a></div><div className="destination-grid">{destinations.map((place, i) => <article className={`destination-card ${place.tint}`} key={place.name}><div className="destination-image" style={{ backgroundImage: `url(https://images.unsplash.com/${place.img}?auto=format&fit=crop&w=900&q=82)` }}><span className="image-index">0{i+1}</span><button className="save-place" aria-label={`Save ${place.name}`}><Plus size={17}/></button></div><div className="destination-meta"><div><span>{place.tag}</span><h3>{place.name}</h3></div><div className="estimate"><small>EST. FROM</small><strong>{place.price}</strong></div></div></article>)}</div></section>
        <footer className="page-footer"><span>Made for the way you want to travel.</span><span>Prices shown are illustrative estimates <span className="footer-sep">·</span> <a href="#sources">How planning works <ArrowUpRight size={11}/></a></span></footer>
      </div>
    </main>
  </div>
}
