// Ventana para confirmar una acción importante (desactivar a alguien, cambiar de equipo).
import { useEffect } from 'react'

export default function Confirmacion({
  titulo,
  children,
  textoConfirmar,
  peligro = false,
  ocupado = false,
  error,
  onConfirmar,
  onCancelar,
}) {
  // Escape cierra, salvo mientras se está guardando
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && !ocupado && onCancelar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [ocupado, onCancelar])

  return (
    <div
      className="ventana-fondo fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--color-overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onCancelar()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        className="ventana bg-bg-primary rounded-2xl w-full max-w-[420px] px-5 py-5"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)' }}
      >
        <h2 id="confirmacion-titulo" className="text-[15px] font-semibold text-text-primary mb-2">
          {titulo}
        </h2>
        <div className="text-[13px] leading-relaxed text-text-secondary space-y-2">{children}</div>
        {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancelar}
            disabled={ocupado}
            className="text-xs px-4 py-2 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={ocupado}
            className={`text-xs font-medium px-4 py-2 rounded-md text-white disabled:opacity-60 ${
              peligro ? 'bg-red-border hover:opacity-90' : 'bg-accent hover:bg-accent-dark'
            }`}
          >
            {ocupado ? 'Un momento...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
