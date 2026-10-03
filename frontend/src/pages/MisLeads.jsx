import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import LeadCard from '../components/LeadCard'
import NuevoLeadModal from '../components/NuevoLeadModal'

export default function MisLeads() {
  const [leads, setLeads] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    apiFetch('/api/leads')
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  function alCrearLead(nuevoLead) {
    // lo sumamos arriba de la lista sin tener que volver a pedir todo al backend
    setLeads((actuales) => [nuevoLead, ...actuales])
    setModalAbierto(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-text-primary mb-1">Mis leads</h1>
          <p className="text-xs text-text-secondary">
            Ordenados automáticamente por urgencia
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-md px-3.5 py-2"
        >
          + Nuevo lead
        </button>
      </div>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!cargando && !error && leads.length === 0 && (
        <p className="text-sm text-text-secondary">Todavía no tenés leads cargados.</p>
      )}

      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}

      {modalAbierto && (
        <NuevoLeadModal
          onCerrar={() => setModalAbierto(false)}
          onCreado={alCrearLead}
        />
      )}
    </div>
  )
}