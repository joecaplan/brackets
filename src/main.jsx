import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BracketApp from './Bracket.jsx'
import PhonePreview from './PhonePreview.jsx'

const isPreview = new URLSearchParams(window.location.search).get('preview') === 'phone';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPreview ? <PhonePreview /> : <BracketApp />}
  </StrictMode>,
)
