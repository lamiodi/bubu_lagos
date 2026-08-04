import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Automatically reload page if Vite fails to preload dynamic imports after a deployment
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const pageHasBeenReloaded = sessionStorage.getItem('bubu_chunk_reload');
  if (!pageHasBeenReloaded) {
    sessionStorage.setItem('bubu_chunk_reload', 'true');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

