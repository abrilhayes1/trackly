import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function NuevoLeadModal({ onCerrar, onCreado }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [origen, setOrigen] = useState('')
  const [consulta, setConsulta] = useState('')
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const nuevosErrores = {}
    if (!nombre.trim()) nuevosErrores.nombre = 'Ingresá un nombre.'
    if (!telefono.trim()) nuevosErrores.telefono = 'Ingresá un teléfono.'
    setErrores(nuevosErrores)
    setErrorServidor(null)

    if (Object.keys(nuevosErrores).length > 0) return

    setGuardando(true)
    try {
      const leadCreado = await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim() || null,
          origen: origen.trim() || null,
          consulta: consulta.trim() || null,
        }),
      })
      onCreado(leadCreado)
    } catch (e) {
      setErrorServidor(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const inputClase =
    'w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44, 44, 42, 0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="bg-bg-primary rounded-2xl w-full max-w-105 max-h-[90vh] overflow-auto"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)' }}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border-tertiary">
          <div>
            <div className="text-[15px] font-semibold text-text-primary">Nuevo lead</div>
            <div className="text-[11px] text-text-secondary mt-px">
              Cargá un contacto manualmente
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="ml-auto text-lg leading-none text-text-tertiary hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3">
            <label className="block text-xs text-text-secondary mb-1">
              Nombre y apellido *
            </label>
            <input
              className={inputClase}
              placeholder="Ej: Molina, Paula"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
            {errores.nombre && (
              <p className="text-[11px] text-red-text mt-1">{errores.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Teléfono *</label>
              <input
                className={inputClase}
                placeholder="11 4448 7720"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
              {errores.telefono && (
                <p className="text-[11px] text-red-text mt-1">{errores.telefono}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Email</label>
              <input
                className={inputClase}
                placeholder="contacto@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-text-secondary mb-1">
              Carrera / origen
            </label>
            <input
              className={inputClase}
              placeholder="Ej: marketing digital"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-text-secondary mb-1">Consulta</label>
            <textarea
              className={`${inputClase} resize-none`}
              rows={3}
              placeholder="Ej: Quisiera saber el costo de la cuota..."
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
          </div>

          {errorServidor && (
            <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">
              {errorServidor}
            </p>
          )}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full text-sm font-medium text-white bg-accent hover:bg-accent-dark disabled:opacity-60 rounded-md py-2.5"
          >
            {guardando ? 'Guardando...' : 'Guardar lead'}
          </button>
        </div>
      </div>
    </div>
  )
}