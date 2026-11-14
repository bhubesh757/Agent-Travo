import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider, useAuth } from './auth/AuthContext'
import SignIn from './auth/SignIn'
import './styles.css'

function Root() {
  const { status } = useAuth()
  return status === 'signedIn' ? <App /> : <SignIn />
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><Root /></AuthProvider></React.StrictMode>)
