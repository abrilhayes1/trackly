// Mi perfil: lo que el usuario ve y cambia de sí mismo. Foto y nombre (se ven en todo el equipo),
// sus números, la contraseña y el modo claro / oscuro. El email, el rol y el equipo solo se muestran.
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { leadsParaAnalisis } from '../lib/analisis'
import { achicarFoto } from '../lib/foto'
import { preferenciaTema, aplicarTema, alCambiarTema } from '../lib/tema'
import {
  OPCIONES_POR_SECCION,
  porSeccion,
  guardarPorSeccion,
  OPCIONES_PROXIMOS,
  proximosDias,
  guardarProximosDias,
  horaRecordatorios,
  guardarHoraRecordatorios,
  PANTALLAS_INICIO,
  pantallaInicial,
  guardarPantallaInicial,
  DIAS_SEMANA,
  agendaDiasOcultos,
  guardarAgendaDiasOcultos,
} from '../lib/preferencias'
import { etiquetaProximo } from '../lib/urgencia'
import PlantillasEditor from '../components/PlantillasEditor'
import { useLeadsEquipo } from '../lib/leadsEquipo'
import { useTerminos } from '../lib/configEquipo'
import Avatar from '../components/Avatar'
import CambioContrasena from '../components/CambioContrasena'

const ETIQUETA_ROL = { lider: 'Líder de equipo', asesor: 'Asesor comercial' }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const TEMAS = [
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
  { valor: 'sistema', etiqueta: 'Según el sistema' },
]

const campo =
  'w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

function Tarjeta({ titulo, sub, children }) {
  return (
    <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-5 py-4 mb-3">
      <h2 className="text-sm font-semibold text-text-primary">{titulo}</h2>
      {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Numero({ label, valor, detalle }) {
  return (
    <div className="bg-bg-secondary rounded-md px-4 py-3">
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className="text-[22px] font-semibold text-text-primary">{valor}</div>
      {detalle && <div className="text-[11px] text-text-tertiary mt-0.5">{detalle}</div>}
    </div>
  )
}

function Aviso({ aviso }) {
  if (!aviso) return null
  const clases = aviso.tipo === 'ok' ? 'text-green-text bg-green-bg border-green-border' : 'text-red-text bg-red-bg border-red-border'
  return <p className={`text-xs border rounded-md px-3 py-2 mt-3 ${clases}`}>{aviso.texto}</p>
}

export default function Perfil({ perfil, usuario, cambios, onPerfilCambiado }) {
  const { varios, Varios } = useTerminos()
  const { leads, listo } = useLeadsEquipo()
  const [cerrados, setCerrados] = useState(null)
  const [nombre, setNombre] = useState(perfil.nombre || '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [avisoNombre, setAvisoNombre] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [avisoFoto, setAvisoFoto] = useState(null)
  const [tema, setTema] = useState(preferenciaTema)
  const [cuantos, setCuantos] = useState(porSeccion)
  const [proximos, setProximos] = useState(proximosDias)
  const [hora, setHora] = useState(horaRecordatorios)
  const [inicio, setInicio] = useState(pantallaInicial)
  const [ocultos, setOcultos] = useState(agendaDiasOcultos)
  const elegirArchivo = useRef(null)

  const proveedores = usuario.app_metadata?.providers || [usuario.app_metadata?.provider].filter(Boolean)
  const conGoogle = proveedores.includes('google')
  const conEmail = proveedores.includes('email')
  const desde = perfil.created_at ? new Date(perfil.created_at) : null
  const foto = perfil.avatar_url || null

  // si el modo cambia desde el botón de la barra superior, se refleja acá
  useEffect(() => alCambiarTema(() => setTema(preferenciaTema())), [])

  // ganados y perdidos propios (para la tasa de conversión); solo las columnas de análisis
  useEffect(() => {
    leadsParaAnalisis(`${usuario.id}:${cambios}`)
      .then((todos) => {
        const mios = todos.filter((l) => l.asesor_id === usuario.id)
        setCerrados({
          ganados: mios.filter((l) => l.estado === 'ganado').length,
          perdidos: mios.filter((l) => l.estado === 'perdido').length,
        })
      })
      .catch(() => setCerrados(null))
  }, [usuario.id, cambios])

  const numeros = useMemo(() => {
    const activos = leads.filter((l) => l.estado === 'activo' && l.asesor_id === usuario.id)
    return { activos: activos.length, contactados: activos.filter((l) => l.ultimo_contacto).length }
  }, [leads, usuario.id])

  const cierres = cerrados ? cerrados.ganados + cerrados.perdidos : 0
  const tasa = cierres ? `${Math.round((cerrados.ganados / cierres) * 100)}%` : '—'

  async function guardarNombre(e) {
    e.preventDefault()
    setAvisoNombre(null)
    setGuardandoNombre(true)
    try {
      const nuevo = await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ nombre }) })
      onPerfilCambiado(nuevo)
      setNombre(nuevo.nombre)
      setAvisoNombre({ tipo: 'ok', texto: 'Listo, tu nombre se actualizó para todo el equipo.' })
    } catch (err) {
      setAvisoNombre({ tipo: 'error', texto: err.message })
    } finally {
      setGuardandoNombre(false)
    }
  }

  async function subirFoto(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setAvisoFoto(null)
    setSubiendo(true)
    try {
      const imagen = await achicarFoto(archivo)
      const nuevo = await apiFetch('/api/me/foto', { method: 'PUT', body: imagen, headers: { 'Content-Type': 'image/jpeg' } })
      onPerfilCambiado(nuevo)
    } catch (err) {
      setAvisoFoto({ tipo: 'error', texto: err.message })
    } finally {
      setSubiendo(false)
    }
  }

  async function quitarFoto() {
    setAvisoFoto(null)
    setSubiendo(true)
    try {
      onPerfilCambiado(await apiFetch('/api/me/foto', { method: 'DELETE' }))
    } catch (err) {
      setAvisoFoto({ tipo: 'error', texto: err.message })
    } finally {
      setSubiendo(false)
    }
  }

  function elegirTema(valor) {
    aplicarTema(valor)
    setTema(valor)
  }

  const boton =
    'text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary disabled:opacity-50'

  return (
    <div className="p-5 max-w-[760px]">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Mi perfil</h1>
      <p className="text-xs text-text-secondary mb-5">Tu foto y tu nombre los ve todo el equipo</p>

      {/* encabezado: quién sos */}
      <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-5 py-5 mb-3">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar nombre={perfil.nombre} foto={foto} tamano="w-[84px] h-[84px] text-[26px]" />
            {subiendo && (
              <span className="absolute inset-0 rounded-full bg-[var(--color-overlay)] flex items-center justify-center text-[10px] text-white">
                Subiendo...
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-text-primary truncate">{perfil.nombre}</div>
            <div className="text-xs text-text-secondary mt-0.5">
              {ETIQUETA_ROL[perfil.rol] || perfil.rol} · {perfil.tenants?.nombre || 'Tu equipo'}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5 truncate">{usuario.email}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-tertiary mt-2">
              {desde && (
                <span>
                  En el equipo desde {MESES[desde.getMonth()]} de {desde.getFullYear()}
                </span>
              )}
              <span>Ingresás con {conGoogle && conEmail ? 'Google o email' : conGoogle ? 'Google' : 'email y contraseña'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <button onClick={() => elegirArchivo.current?.click()} disabled={subiendo} className={boton}>
              {foto ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {foto && (
              <button
                onClick={quitarFoto}
                disabled={subiendo}
                className="text-[11px] text-text-tertiary hover:text-red-text disabled:opacity-50"
              >
                Quitar foto
              </button>
            )}
            <input ref={elegirArchivo} type="file" accept="image/jpeg,image/png,image/webp" onChange={subirFoto} className="hidden" />
          </div>
        </div>
        <Aviso aviso={avisoFoto} />
      </section>

      <Tarjeta titulo="Mis números" sub={`Los ${varios} que tenés asignados y tus cierres`}>
        <div className="grid grid-cols-4 gap-2">
          <Numero label={`${Varios} activos`} valor={listo ? numeros.activos : '…'} />
          <Numero
            label="Contactados"
            valor={listo ? numeros.contactados : '…'}
            detalle={listo && numeros.activos ? `${Math.round((numeros.contactados / numeros.activos) * 100)}% de los activos` : null}
          />
          <Numero label="Ganados" valor={cerrados ? cerrados.ganados : '…'} detalle={cerrados ? `${cerrados.perdidos} perdidos` : null} />
          <Numero label="Tasa de conversión" valor={cerrados ? tasa : '…'} detalle="ganados sobre cerrados" />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Datos personales">
        <form onSubmit={guardarNombre}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Nombre y apellido</label>
              <input className={campo} value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Email</label>
              <input className={`${campo} opacity-70 cursor-not-allowed`} value={usuario.email || ''} disabled />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="submit"
              disabled={guardandoNombre || nombre.trim() === perfil.nombre || nombre.trim().length < 2}
              className="text-xs font-medium px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
            >
              {guardandoNombre ? 'Guardando...' : 'Guardar nombre'}
            </button>
            <span className="text-[11px] text-text-tertiary">El email es con el que ingresás y no se puede cambiar.</span>
          </div>
          <Aviso aviso={avisoNombre} />
        </form>
      </Tarjeta>

      <Tarjeta titulo="Seguridad">
        {conEmail ? (
          <CambioContrasena />
        ) : (
          <p className="text-xs text-text-secondary">
            Ingresás con tu cuenta de Google, así que no tenés una contraseña de Trackly: se maneja desde Google.
          </p>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Plantillas de mensajes"
        sub="Textos armados para WhatsApp y email. En la tarjeta de cada contacto elegís una y se completa sola con su nombre."
      >
        <PlantillasEditor rol={perfil.rol} userId={usuario.id} />
      </Tarjeta>

      <Tarjeta titulo="Preferencias">
        <div className="text-[11px] font-medium text-text-secondary mb-1.5">Apariencia</div>
        <div className="inline-flex p-0.5 rounded-md bg-bg-tertiary">
          {TEMAS.map((t) => (
            <button
              key={t.valor}
              onClick={() => elegirTema(t.valor)}
              className={`text-xs px-3 py-1 rounded ${
                tema === t.valor ? 'bg-bg-primary text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-medium text-text-secondary mt-4 mb-1.5">{`${Varios} por sección en Mis ${varios}`}</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-md bg-bg-tertiary">
            {OPCIONES_POR_SECCION.map((n) => (
              <button
                key={n}
                onClick={() => {
                  guardarPorSeccion(n)
                  setCuantos(n)
                }}
                className={`text-xs px-3 py-1 rounded ${
                  cuantos === n ? 'bg-bg-primary text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {n === 0 ? 'Todos' : n}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-text-tertiary">El resto se ve con "Ver todos"</span>
        </div>
        <div className="text-[11px] font-medium text-text-secondary mt-4 mb-1.5">Al entrar, abrir</div>
        <div className="inline-flex p-0.5 rounded-md bg-bg-tertiary">
          {PANTALLAS_INICIO.map((o) => (
            <button
              key={o.valor}
              onClick={() => {
                guardarPantallaInicial(o.valor)
                setInicio(o.valor)
              }}
              className={`text-xs px-3 py-1 rounded ${
                inicio === o.valor ? 'bg-bg-primary text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {o.valor === 'leads' ? `Mis ${varios}` : o.etiqueta}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-medium text-text-secondary mt-4 mb-1.5">Botones para programar el próximo contacto (hasta 4)</div>
        <div className="flex flex-wrap gap-1.5">
          {OPCIONES_PROXIMOS.map((d) => {
            const activo = proximos.includes(d)
            const bloqueado = (activo && proximos.length === 1) || (!activo && proximos.length >= 4)
            return (
              <button
                key={d}
                disabled={bloqueado}
                onClick={() => {
                  const nuevos = activo ? proximos.filter((x) => x !== d) : [...proximos, d].sort((a, b) => a - b)
                  guardarProximosDias(nuevos)
                  setProximos(nuevos)
                }}
                className={`text-xs px-2.5 py-1 rounded-full border disabled:opacity-40 ${
                  activo ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
                }`}
              >
                {etiquetaProximo(d)}
              </button>
            )
          })}
        </div>

        <div className="text-[11px] font-medium text-text-secondary mt-4 mb-1.5">Hora de esos recordatorios</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-md bg-bg-tertiary">
            {[
              [null, 'La misma hora en que lo programás'],
              ['10:00', 'Una hora fija'],
            ].map(([valor, etiqueta]) => {
              const activo = valor === null ? hora === null : hora !== null
              return (
                <button
                  key={etiqueta}
                  onClick={() => {
                    const nueva = valor === null ? null : hora || valor
                    guardarHoraRecordatorios(nueva)
                    setHora(nueva)
                  }}
                  className={`text-xs px-3 py-1 rounded ${
                    activo ? 'bg-bg-primary text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {etiqueta}
                </button>
              )
            })}
          </div>
          {hora !== null && (
            <input
              type="time"
              value={hora}
              onChange={(e) => {
                if (!e.target.value) return
                guardarHoraRecordatorios(e.target.value)
                setHora(e.target.value)
              }}
              className="text-xs px-2 py-1 rounded-md border border-border-secondary bg-bg-secondary text-text-primary"
            />
          )}
        </div>

        <div className="text-[11px] font-medium text-text-secondary mt-4 mb-1.5">Días que se muestran en la Agenda</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {DIAS_SEMANA.map((d) => {
              const visible = !ocultos.includes(d.valor)
              // siempre tiene que quedar al menos un día visible
              const ultimo = visible && ocultos.length === 6
              return (
                <button
                  key={d.valor}
                  disabled={ultimo}
                  onClick={() => {
                    const nuevos = visible ? [...ocultos, d.valor] : ocultos.filter((x) => x !== d.valor)
                    guardarAgendaDiasOcultos(nuevos)
                    setOcultos(nuevos)
                  }}
                  className={`text-xs w-11 py-1 rounded-md border disabled:opacity-40 ${
                    visible ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-tertiary border-border-secondary line-through'
                  }`}
                >
                  {d.etiqueta}
                </button>
              )
            })}
          </div>
          <span className="text-[11px] text-text-tertiary">Tocá un día para ocultarlo. Si tiene recordatorios, se muestra igual.</span>
        </div>
      </Tarjeta>
    </div>
  )
}
