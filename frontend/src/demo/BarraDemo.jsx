// Barra del prototipo: avisa que son datos de ejemplo y deja ver la app como la líder o como cada
// asesor, o volver los datos al inicio. Va abajo al centro para no tapar el menú ni el botón "+".
import { useState } from 'react'
import { USUARIOS, reiniciarDatos } from './datos'
import { entrarComo, usuarioActual } from './supabaseDemo'

export default function BarraDemo() {
  const [abierta, setAbierta] = useState(false)
  const actual = usuarioActual()

  function verComo(id) {
    entrarComo(id)
    window.location.reload()
  }

  function reiniciar() {
    reiniciarDatos()
    try {
      sessionStorage.clear()
    } catch {
      // nada que borrar
    }
    window.location.reload()
  }

  const boton = 'text-[11px] px-2.5 py-1 rounded-full border transition-colors'

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-24px)]">
      {abierta ? (
        <div
          className="flex flex-wrap items-center gap-1.5 bg-bg-primary border border-border-secondary rounded-2xl px-3 py-2 text-text-secondary"
          style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)' }}
        >
          <span className="text-[11px] font-semibold text-text-primary mr-1">Prototipo · ver como</span>
          {USUARIOS.map((u) => (
            <button
              key={u.id}
              onClick={() => verComo(u.id)}
              className={`${boton} ${
                actual === u.id ? 'bg-accent text-white border-accent' : 'bg-bg-primary border-border-secondary hover:text-text-primary'
              }`}
            >
              {u.nombre.split(' ')[0]} {u.rol === 'lider' ? '(líder)' : '(asesor)'}
            </button>
          ))}
          <button onClick={reiniciar} className={`${boton} border-border-secondary hover:text-red-text`} title="Vuelve todo al inicio">
            Reiniciar datos
          </button>
          <button
            onClick={() => setAbierta(false)}
            className="text-[13px] leading-none px-1.5 hover:text-text-primary"
            aria-label="Ocultar"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAbierta(true)}
          className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-text-primary text-bg-primary"
          style={{ boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18)' }}
        >
          Prototipo con datos de ejemplo · cambiar usuario
        </button>
      )}
    </div>
  )
}
