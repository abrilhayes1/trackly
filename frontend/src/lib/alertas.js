const MS_DIA = 1000 * 60 * 60 * 24

function diasEntre(desde, hasta) {
  return Math.floor((hasta.getTime() - new Date(desde).getTime()) / MS_DIA)
}

// Arma las alertas de hoy del usuario.
// - Solo cuenta leads propios y activos (un lead cerrado no genera alertas, RNF10).
// - "Vencen hoy": llegaron al plazo configurado (o ya lo pasaron).
// - "Por vencer": están dentro del aviso previo configurado (por ejemplo, plazo 14 y aviso 3:
//   desde los 11 días). Es la misma regla que usa "Por vencer" en Mis leads.
// - "Recordatorios": los de hoy y los atrasados que nadie atendió. Un recordatorio
//   se considera atendido cuando se registró un contacto después de su fecha.
export function calcularAlertas(leads, config, userId, ahora = new Date()) {
  const plazo = config?.vencimiento_habilitado ? config.dias_vencimiento_lead : null
  const aviso = config?.dias_alerta_previa || 0

  const inicioDeHoy = new Date(ahora)
  inicioDeHoy.setHours(0, 0, 0, 0)
  const finDeHoy = new Date(ahora)
  finDeHoy.setHours(23, 59, 59, 999)

  const resultado = { vencenHoy: [], porVencer: [], recordatorios: [] }

  leads
    .filter((l) => l.asesor_id === userId && l.estado === 'activo')
    .forEach((lead) => {
      const dias = diasEntre(lead.ultimo_contacto || lead.fecha_ingreso, ahora)

      if (plazo) {
        if (dias >= plazo) {
          resultado.vencenHoy.push({ ...lead, dias, diasPasados: dias - plazo })
        } else if (dias >= plazo - aviso) {
          resultado.porVencer.push({ ...lead, dias, diasRestantes: plazo - dias })
        }
      }

      if (lead.recordatorio) {
        const fecha = new Date(lead.recordatorio)
        const atendido = lead.ultimo_contacto && new Date(lead.ultimo_contacto) >= fecha
        if (fecha <= finDeHoy && !atendido) {
          resultado.recordatorios.push({
            ...lead,
            dias,
            fechaRecordatorio: fecha,
            atrasado: fecha < inicioDeHoy,
          })
        }
      }
    })

  resultado.vencenHoy.sort((a, b) => b.dias - a.dias)
  resultado.porVencer.sort((a, b) => b.dias - a.dias)
  resultado.recordatorios.sort((a, b) => a.fechaRecordatorio - b.fechaRecordatorio)

  return resultado
}
