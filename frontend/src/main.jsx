import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const raiz = createRoot(document.getElementById('root'))

// Las variables de entorno se meten en la app al construirla (en Vercel, en cada deploy).
// Si falta alguna, se muestra qué falta en vez de una pantalla en blanco.
const necesarias = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
if (import.meta.env.PROD) necesarias.push('VITE_API_URL')
const faltan = necesarias.filter((nombre) => !import.meta.env[nombre])

if (faltan.length > 0) {
  raiz.render(
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md bg-bg-primary border border-red-border rounded-2xl px-6 py-5 text-sm text-text-primary">
        <p className="font-semibold text-red-text mb-2">Falta configurar la aplicación</p>
        <p className="mb-2">Estas variables de entorno no están definidas:</p>
        <ul className="list-disc pl-5 mb-3 font-mono text-xs">
          {faltan.map((nombre) => (
            <li key={nombre}>{nombre}</li>
          ))}
        </ul>
        <p className="text-xs text-text-secondary">
          En la compu van en <code>frontend/.env</code>. En Vercel van en Settings → Environment Variables, y
          después hay que hacer Redeploy para que se apliquen.
        </p>
      </div>
    </div>,
  )
} else {
  // App se carga recién acá: el cliente de Supabase falla si se crea sin sus variables
  import('./App.jsx').then(({ default: App }) => {
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
