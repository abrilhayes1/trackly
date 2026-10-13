// Onboarding (RF05, CU12): la primera vez que alguien entra sin equipo, arma el suyo en 5 pasos.
// Sigue el diseño del onboarding del prototipo (docs/prototipos).
import { useState } from 'react'
import { apiFetch } from '../lib/api'
import {
  RUBROS,
  CONTACTOS,
  EVENTOS,
  ORIGENES_SUGERIDOS,
  EMAIL_VALIDO,
  pluralizar,
  etiquetaRubro,
  errorVencimiento,
} from '../lib/configEquipo'
import {
  Campo,
  claseInput,
  Opcion,
  GrillaOpciones,
  Interruptor,
  Etiquetas,
  CamposVencimiento,
  ListaEmails,
} from '../components/CamposEquipo'

const PASOS = ['Tu equipo', 'Contactos', 'Eventos', 'Invitar', 'Resumen']

const INICIAL = {
  nombreUsuario: '',
  equipoNombre: '',
  rubro: '',
  contacto: 'Lead', // una de CONTACTOS o 'Otro'
  contactoUno: '',
  contactoVarios: '',
  vencimientoHabilitado: false,
  diasVencimiento: 14,
  diasAlertaPrevia: 3,
  diasArchivo: 30,
  categoriasOrigen: [],
  eventosHabilitado: false,
  evento: 'Charla informativa', // uno de EVENTOS o 'Otro'
  eventoOtro: '',
  emailDiario: true,
  invitados: [''],
}

// nombre del contacto elegido, en singular y plural
function terminos(d) {
  if (d.contacto !== 'Otro') {
    const opcion = CONTACTOS.find((c) => c.uno === d.contacto)
    return { uno: opcion.uno, varios: opcion.varios }
  }
  const uno = d.contactoUno.trim()
  return { uno, varios: d.contactoVarios.trim() || pluralizar(uno) }
}

function nombreEvento(d) {
  return d.evento === 'Otro' ? d.eventoOtro.trim() : d.evento
}

function emailsCargados(d) {
  return d.invitados.map((e) => e.trim().toLowerCase()).filter(Boolean)
}

// qué le falta a cada paso para poder seguir (null = está completo)
function errorDelPaso(paso, d) {
  if (paso === 1) {
    if (!d.equipoNombre.trim()) return 'Ingresá el nombre del equipo.'
    if (!d.rubro) return 'Elegí a qué se dedican.'
  }
  if (paso === 2) {
    if (d.contacto === 'Otro' && !d.contactoUno.trim()) return 'Escribí cómo se llaman tus contactos.'
    return errorVencimiento(d)
  }
  if (paso === 3 && d.eventosHabilitado && !nombreEvento(d)) return 'Escribí cómo se llaman tus eventos.'
  if (paso === 4) {
    const mal = emailsCargados(d).find((e) => !EMAIL_VALIDO.test(e))
    if (mal) return `El email "${mal}" no es válido.`
  }
  return null
}

function Encabezado({ eyebrow, titulo, descripcion }) {
  return (
    <>
      <div className="text-[11px] font-semibold text-accent uppercase tracking-[0.08em] mb-2">{eyebrow}</div>
      <h2 className="text-[22px] font-bold text-text-primary tracking-tight leading-tight mb-1.5">{titulo}</h2>
      <p className="text-[13px] text-text-secondary leading-relaxed mb-7">{descripcion}</p>
    </>
  )
}

function FilaResumen({ icono, label, valor }) {
  return (
    <div className="flex gap-3 items-start px-3.5 py-2.5 rounded-[7px] bg-bg-secondary">
      <span className="text-base leading-5">{icono}</span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.05em] text-text-tertiary">{label}</div>
        <div className="text-[13px] text-text-primary">{valor}</div>
      </div>
    </div>
  )
}

export default function Onboarding({ email, onListo, onCerrarSesion }) {
  const [paso, setPaso] = useState(1)
  const [d, setD] = useState(INICIAL)
  const [intento, setIntento] = useState(false) // se tocó "Siguiente" con datos incompletos
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [listo, setListo] = useState(null)

  const cambiar = (cambios) => setD((actual) => ({ ...actual, ...cambios }))
  const errorPaso = errorDelPaso(paso, d)
  const t = terminos(d)

  function elegirRubro(valor) {
    // al elegir el rubro se sugieren categorías de origen, si todavía no cargó ninguna
    cambiar({
      rubro: valor,
      categoriasOrigen: d.categoriasOrigen.length ? d.categoriasOrigen : ORIGENES_SUGERIDOS[valor],
    })
  }

  function siguiente() {
    if (errorPaso) {
      setIntento(true)
      return
    }
    setIntento(false)
    if (paso < PASOS.length) setPaso(paso + 1)
    else confirmar()
  }

  async function confirmar() {
    setGuardando(true)
    setErrorGuardar(null)
    try {
      const respuesta = await apiFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          nombreUsuario: d.nombreUsuario.trim(),
          equipoNombre: d.equipoNombre.trim(),
          rubro: d.rubro,
          terminoContacto: t.uno,
          terminoContactoPlural: t.varios,
          vencimientoHabilitado: d.vencimientoHabilitado,
          diasVencimiento: d.diasVencimiento,
          diasAlertaPrevia: d.diasAlertaPrevia,
          diasArchivo: d.diasArchivo,
          categoriasOrigen: d.categoriasOrigen,
          eventosHabilitado: d.eventosHabilitado,
          terminoEvento: d.eventosHabilitado ? nombreEvento(d) : '',
          emailDiario: d.emailDiario,
          invitados: emailsCargados(d),
        }),
      })
      setListo(respuesta)
    } catch (e) {
      setErrorGuardar(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const invitados = emailsCargados(d)
  const resumen = [
    { icono: '🏢', label: 'Equipo', valor: d.equipoNombre.trim() },
    { icono: '🗂️', label: 'Rubro', valor: etiquetaRubro(d.rubro) },
    { icono: '👤', label: 'Nombre del contacto', valor: `${t.uno} / ${t.varios}` },
    {
      icono: '⏱️',
      label: 'Vencimiento',
      valor: d.vencimientoHabilitado
        ? `A los ${d.diasVencimiento} días sin contacto (aviso ${d.diasAlertaPrevia} días antes) · a Archivo ${d.diasArchivo} días después`
        : 'Desactivado (lo podés activar después)',
    },
    {
      icono: '🏷️',
      label: 'Categorías de origen',
      valor: d.categoriasOrigen.length ? d.categoriasOrigen.join(', ') : 'Sin categorías definidas',
    },
    { icono: '📅', label: 'Eventos', valor: d.eventosHabilitado ? nombreEvento(d) : 'No activado' },
    { icono: '📧', label: 'Resumen diario', valor: d.emailDiario ? 'Activado' : 'Desactivado' },
    {
      icono: '👥',
      label: 'Equipo invitado',
      valor: invitados.length ? invitados.join(', ') : 'Nadie todavía',
    },
  ]

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center px-4 pt-8 pb-12">
      <div className="text-[22px] font-bold text-accent-dark tracking-tight mb-10">
        Trackly<span className="text-green-border">.</span>
      </div>

      <div className="w-full max-w-[520px] bg-bg-primary border border-border-tertiary rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(83,74,183,0.07)]">
        {/* progreso */}
        <div className="h-[3px] bg-border-tertiary">
          <div
            className="h-full bg-accent rounded-full transition-all duration-400"
            style={{ width: `${listo ? 100 : (paso / PASOS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between px-6 py-3 border-b border-border-tertiary">
          {PASOS.map((nombre, i) => {
            const n = i + 1
            const hecho = listo || n < paso
            const actual = !listo && n === paso
            return (
              <div
                key={nombre}
                className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] ${
                  actual ? 'text-accent font-semibold' : hecho ? 'text-green-border' : 'text-text-tertiary'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center text-[9px] font-bold ${
                    actual
                      ? 'border-accent bg-accent text-white'
                      : hecho
                        ? 'border-green-border bg-green-border text-white'
                        : 'border-border-secondary'
                  }`}
                >
                  {hecho ? '✓' : n}
                </span>
                {nombre}
              </div>
            )
          })}
        </div>

        {listo ? (
          <div className="px-7 py-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-bg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6L23 7" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              ¡{d.equipoNombre.trim()} ya está en Trackly!
            </h2>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
              Tu configuración quedó guardada. Podés empezar a cargar {t.varios.toLowerCase()} ahora mismo.
              {listo.invitados > 0 &&
                ` Las personas que invitaste entran solas a tu equipo cuando crean su cuenta en Trackly con ese email.`}
            </p>
            <button
              onClick={onListo}
              className="px-6 py-2.5 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent-dark"
            >
              Ir a Trackly →
            </button>
          </div>
        ) : (
          <>
            <div className="px-7 py-8">
              {paso === 1 && (
                <>
                  <Encabezado
                    eyebrow="Empecemos"
                    titulo="Contanos sobre tu equipo"
                    descripcion="Trackly se adapta a tu negocio. Esta configuración la hacés una sola vez y la podés cambiar después."
                  />
                  <Campo label="¿Cómo te llamás?" ayuda="Así te van a ver los demás en el equipo.">
                    <input
                      value={d.nombreUsuario}
                      onChange={(e) => cambiar({ nombreUsuario: e.target.value })}
                      placeholder={email ? email.split('@')[0] : 'Tu nombre'}
                      className={claseInput}
                    />
                  </Campo>
                  <Campo label="Nombre del equipo o empresa">
                    <input
                      value={d.equipoNombre}
                      onChange={(e) => cambiar({ equipoNombre: e.target.value })}
                      placeholder="Ej: Escuela Da Vinci · Inmobiliaria Sur · Clínica Salud"
                      className={claseInput}
                    />
                  </Campo>
                  <Campo label="¿A qué se dedican?">
                    <GrillaOpciones>
                      {RUBROS.map((r) => (
                        <Opcion
                          key={r.valor}
                          sel={d.rubro === r.valor}
                          onClick={() => elegirRubro(r.valor)}
                          icono={r.icono}
                          label={r.label}
                          sub={r.sub}
                        />
                      ))}
                    </GrillaOpciones>
                  </Campo>
                </>
              )}

              {paso === 2 && (
                <>
                  <Encabezado
                    eyebrow="Paso 2 de 5"
                    titulo="¿Cómo llamás a tus contactos?"
                    descripcion="Trackly usa la terminología de tu negocio para que todo se sienta natural."
                  />
                  <Campo label="Nombre del contacto" ayuda="¿Cómo se llaman las personas que seguís?">
                    <GrillaOpciones>
                      {CONTACTOS.map((c) => (
                        <Opcion
                          key={c.uno}
                          sel={d.contacto === c.uno}
                          onClick={() => cambiar({ contacto: c.uno })}
                          label={c.uno}
                          sub={c.sub}
                        />
                      ))}
                      <Opcion
                        sel={d.contacto === 'Otro'}
                        onClick={() => cambiar({ contacto: 'Otro' })}
                        label="Otro"
                        sub="Lo defino yo"
                      />
                    </GrillaOpciones>
                    {d.contacto === 'Otro' && (
                      <div className="grid grid-cols-2 gap-2 -mt-2">
                        <input
                          value={d.contactoUno}
                          onChange={(e) => cambiar({ contactoUno: e.target.value })}
                          placeholder="Singular: Alumno, Cliente..."
                          className={claseInput}
                        />
                        <input
                          value={d.contactoVarios}
                          onChange={(e) => cambiar({ contactoVarios: e.target.value })}
                          placeholder={pluralizar(d.contactoUno) || 'Plural: Alumnos, Clientes...'}
                          className={claseInput}
                        />
                      </div>
                    )}
                  </Campo>

                  <Campo label="Vencimiento">
                    <Interruptor
                      prendido={d.vencimientoHabilitado}
                      onCambiar={(v) => cambiar({ vencimientoHabilitado: v })}
                      label="¿Querés que te avisemos cuando un contacto lleva mucho tiempo sin respuesta?"
                      sub="Podés activarlo ahora o más tarde desde la configuración"
                    />
                    {d.vencimientoHabilitado && <CamposVencimiento valores={d} onCambiar={cambiar} />}
                  </Campo>

                  <Campo
                    label="Categorías de origen"
                    ayuda="¿De dónde vienen tus contactos? Escribí cada categoría y presioná Enter."
                  >
                    <Etiquetas
                      valores={d.categoriasOrigen}
                      onCambiar={(v) => cambiar({ categoriasOrigen: v })}
                      placeholder="Ej: Instagram, Referido, Web..."
                    />
                    <div className="text-[11px] text-text-tertiary mt-1.5">
                      Podés agregar más categorías después desde la configuración.
                    </div>
                  </Campo>
                </>
              )}

              {paso === 3 && (
                <>
                  <Encabezado
                    eyebrow="Paso 3 de 5"
                    titulo="¿Organizan eventos o reuniones?"
                    descripcion="Trackly puede gestionar eventos a los que invitás a tus contactos y registrar quién asistió."
                  />
                  <Interruptor
                    prendido={d.eventosHabilitado}
                    onCambiar={(v) => cambiar({ eventosHabilitado: v })}
                    label="Usar gestión de eventos"
                    sub="Charlas, webinars, demos, visitas, reuniones grupales"
                  />
                  {d.eventosHabilitado && (
                    <Campo label="¿Cómo se llaman sus eventos?">
                      <GrillaOpciones>
                        {EVENTOS.map((ev) => (
                          <Opcion
                            key={ev.nombre}
                            sel={d.evento === ev.nombre}
                            onClick={() => cambiar({ evento: ev.nombre })}
                            label={ev.nombre}
                            sub={ev.sub}
                          />
                        ))}
                        <Opcion
                          sel={d.evento === 'Otro'}
                          onClick={() => cambiar({ evento: 'Otro' })}
                          label="Otro"
                          sub="Lo defino yo"
                        />
                      </GrillaOpciones>
                      {d.evento === 'Otro' && (
                        <input
                          value={d.eventoOtro}
                          onChange={(e) => cambiar({ eventoOtro: e.target.value })}
                          placeholder="Nombre del evento..."
                          className={`${claseInput} -mt-2`}
                        />
                      )}
                    </Campo>
                  )}
                  <div className="mt-4">
                    <Interruptor
                      prendido={d.emailDiario}
                      onCambiar={(v) => cambiar({ emailDiario: v })}
                      label="Resumen diario por email"
                      sub="Cada mañana, un resumen de lo que hay que atender ese día"
                    />
                  </div>
                </>
              )}

              {paso === 4 && (
                <>
                  <Encabezado
                    eyebrow="Paso 4 de 5"
                    titulo="Sumá a tu equipo"
                    descripcion="Cargá los emails de tu equipo. Cuando cada persona cree su cuenta en Trackly con ese email, entra sola a tu equipo. No es obligatorio para seguir."
                  />
                  <Campo label="Emails del equipo">
                    <ListaEmails emails={d.invitados} onCambiar={(v) => cambiar({ invitados: v })} />
                    <div className="text-[11px] text-text-tertiary mt-2">
                      Si preferís, salteá este paso y sumá gente después desde la configuración del equipo.
                    </div>
                  </Campo>
                </>
              )}

              {paso === 5 && (
                <>
                  <Encabezado
                    eyebrow="Paso 5 de 5"
                    titulo="Todo listo para arrancar"
                    descripcion="Así queda configurado tu equipo. Podés cambiarlo después desde la configuración."
                  />
                  <div className="flex flex-col gap-1.5">
                    {resumen.map((r) => (
                      <FilaResumen key={r.label} {...r} />
                    ))}
                  </div>
                </>
              )}

              {intento && errorPaso && (
                <p className="text-[11px] text-red-text mt-3">{errorPaso}</p>
              )}
              {errorGuardar && (
                <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mt-4">
                  {errorGuardar}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-7 py-4 border-t border-border-tertiary">
              <button
                onClick={() => {
                  setIntento(false)
                  setPaso(paso - 1)
                }}
                className={`text-xs px-3.5 py-2 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:bg-bg-secondary ${
                  paso === 1 ? 'invisible' : ''
                }`}
              >
                ← Atrás
              </button>
              <span className="text-[11px] text-text-tertiary">
                {paso} de {PASOS.length}
              </span>
              <button
                onClick={siguiente}
                disabled={guardando}
                className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {paso < PASOS.length ? 'Siguiente →' : guardando ? 'Guardando...' : 'Confirmar ✓'}
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={onCerrarSesion} className="mt-6 text-[11px] text-text-tertiary hover:text-red-text">
        Salir ({email})
      </button>
    </div>
  )
}
