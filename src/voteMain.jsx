import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PhoneVote from './PhoneVote.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PhoneVote />
  </StrictMode>,
)
