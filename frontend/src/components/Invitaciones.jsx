// Invitaciones de otros equipos (RF53): la pantalla de quien fue desactivado y el aviso para quien
// está en un equipo y lo invitan a otro. Al aceptar, la cuenta pasa al equipo nuevo; lo que hizo en
// el anterior queda ahí, a su nombre.
import { useState } from 'react'
import { apiFetch } from '../lib/api'
import Confirmacion from './Confirmacion'
import Logo from './Logo'

const comoRol = (rol) => (rol === 'lider' ? 'líder' : 'asesor')

async function aceptar(id) {
  await apiFetch(`/api/me/invitaciones/${id}/aceptar`, { method: 'POST' })
  // cambia todo (equipo, configuración, leads): lo más seguro es empezar de cero
  window.location.reload()
}

export function CuentaDesactivada({ equipo, invitaciones = [], onCrearEquipo, onCerrarSesion }) {
  const [ocupado, setOcupado] = useState(null)
  const [error, setError] = useState(null)

  async function unirme(id) {
    setOcupado(id)
    setError(null)
    try {
      await aceptar(id)
    } catch (e) {
      setError(e.message)
      setOcupado(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-bg-secondary">
      <div className="w-full max-w-[420px] bg-bg-primary border border-border-tertiary rounded-2xl px-7 py-8">
        <Logo alto="h-7" />
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-text-primary mt-6">Tu acceso a {equipo} fue desactivado</h1>
        <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
          Si creés que es un error, hablá con quien lidera el equipo. Lo que cargaste sigue ahí, a tu nombre.
        </p>

        {invitaciones.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] font-medium text-text-primary mb-2">Te invitaron a otro equipo</p>
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 border border-border-tertiary rounded-lg px-3 py-2.5 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text-primary truncate">{inv.equipo}</div>
                  <div className="text-[11px] text-text-tertiary">Como {comoRol(inv.rol)}</div>
                </div>
                <button
                  onClick={() => unirme(inv.id)}
                  disabled={!!ocupado}
                  className="text-xs font-medium px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
                >
                  {ocupado === inv.id ? 'Uniéndote...' : 'Unirme'}
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mt-2">{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-7 text-[13px]">
          <button onClick={onCrearEquipo} className="text-accent font-medium hover:underline">
            Crear mi propio equipo
          </button>
          <button onClick={onCerrarSesion} className="text-text-secondary hover:text-text-primary">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

// franja arriba de la app cuando otro equipo te invitó
export function AvisoInvitaciones({ invitaciones = [], equipoActual, onRechazada }) {
  const [abierta, setAbierta] = useState(null)
  const [estado, setEstado] = useState({ ocupado: false, error: null })

  if (invitaciones.length === 0) return null
  const inv = invitaciones[0]

  async function rechazar(id) {
    try {
      await apiFetch(`/api/me/invitaciones/${id}`, { method: 'DELETE' })
      onRechazada(id)
    } catch (e) {
      setEstado({ ocupado: false, error: e.message })
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-2 bg-purple-bg border-b border-border-tertiary text-xs text-purple-text">
        <span className="flex-1">
          <strong className="font-semibold">{inv.equipo}</strong> te invitó a su equipo
          {invitaciones.length > 1 ? ` (y ${invitaciones.length - 1} más)` : ''}.
        </span>
        <button onClick={() => rechazar(inv.id)} className="hover:underline opacity-80">
          Rechazar
        </button>
        <button
          onClick={() => {
            setEstado({ ocupado: false, error: null })
            setAbierta(inv)
          }}
          className="font-semibold hover:underline"
        >
          Ver invitación
        </button>
      </div>

      {abierta && (
        <Confirmacion
          titulo={`¿Unirte a ${abierta.equipo}?`}
          textoConfirmar="Unirme"
          ocupado={estado.ocupado}
          error={estado.error}
          onCancelar={() => setAbierta(null)}
          onConfirmar={async () => {
            setEstado({ ocupado: true, error: null })
            try {
              await aceptar(abierta.id)
            } catch (e) {
              setEstado({ ocupado: false, error: e.message })
            }
          }}
        >
          <p>
            Entrás como {comoRol(abierta.rol)}. Vas a dejar de estar en <strong className="text-text-primary">{equipoActual}</strong>.
          </p>
          <p>Tus contactos, notas y cierres se quedan en {equipoActual}, a tu nombre, para que quien lidera ese equipo los reasigne.</p>
        </Confirmacion>
      )}
    </>
  )
}
