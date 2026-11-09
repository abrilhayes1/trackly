// Demostraciones animadas de la landing. Cada una muestra en pocos segundos lo que hace Trackly:
// la escena principal (un lead que se atiende y pasa de "Por vencer" a "Al día") y una por cada
// función. Las que se repiten solo corren mientras se ven, y con "reducir movimiento" quedan quietas.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, animate, motion, useInView, useReducedMotion } from 'motion/react'
import { Cursor, FilaLead, Icono, Pastilla, TituloSeccion, Ventana } from './Piezas'

const SALIDA = [0.16, 1, 0.3, 1] // frenado natural para lo que llega
const RESORTE = { type: 'spring', duration: 0.7, bounce: 0.12 }

// corre fn cada `ms` mientras el elemento se ve (y si no se pidió menos movimiento)
function useCiclo(ref, ms, fn) {
  const visible = useInView(ref, { amount: 0.35 })
  const quieto = useReducedMotion()
  const guardada = useRef(fn)
  useEffect(() => {
    guardada.current = fn
  })
  useEffect(() => {
    if (!visible || quieto) return
    const id = setInterval(() => guardada.current(), ms)
    return () => clearInterval(id)
  }, [visible, quieto, ms])
  return visible
}

// ---------- escena principal ----------

const LEADS_PORTADA = [
  { id: 'p', nombre: 'Molina, Paula', consulta: '¿Hay algún día presencial?', interes: 'muy', dias: '13d' },
  { id: 'l', nombre: 'Ferreyra, Lucas', consulta: 'Saber más sobre marketing', interes: 'int', dias: '12d' },
  { id: 'm', nombre: 'Pérez, María', consulta: 'Cuota y métodos de pago', interes: 'muy', dias: '11d' },
  { id: 'd', nombre: 'González, Daniel', consulta: 'Horarios de cursada', interes: 'duda', dias: '12d' },
]

export function EscenaPrincipal() {
  const ref = useRef(null)
  const [listas, setListas] = useState({ porVencer: ['p', 'l', 'm'], alDia: ['d'] })
  const [alerta, setAlerta] = useState(true)
  const { porVencer, alDia } = listas
  const lead = (id) => LEADS_PORTADA.find((l) => l.id === id)

  // aparece la alerta del primero, se lo contacta y pasa a "Al día"; el más viejo de "Al día"
  // vuelve a quedar por vencer (pasaron los días), así la escena no se termina
  useCiclo(ref, 3400, () => {
    setAlerta(false)
    setListas(({ porVencer: pv, alDia: ad }) => ({
      porVencer: [...pv.slice(1), ad[ad.length - 1]],
      alDia: [pv[0], ...ad.slice(0, -1)],
    }))
    setTimeout(() => setAlerta(true), 1300)
  })

  const primero = lead(porVencer[0])
  return (
    <div ref={ref} className="relative mx-auto max-w-[980px]">
      {/* fondo de color detrás de la escena */}
      <div
        className="absolute -inset-x-6 -top-8 bottom-6 rounded-[32px] md:-inset-x-10"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, var(--color-purple-bg) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="relative grid md:grid-cols-[1.35fr_1fr] gap-5 items-start" aria-hidden="true">
        <Ventana titulo="Mis leads">
          <div className="p-4 min-h-[330px]">
            <LayoutGroup>
              <TituloSeccion texto="Por vencer" cantidad={porVencer.length} clases="bg-red-bg text-urgent-red" />
              <div className="flex flex-col gap-2">
                {porVencer.map((id) => (
                  <motion.div key={id} layout layoutId={id} transition={RESORTE}>
                    <FilaLead {...lead(id)} punto="bg-dot-red" colorDias="text-urgent-red" />
                  </motion.div>
                ))}
              </div>
              <TituloSeccion texto="Al día" cantidad={alDia.length} clases="bg-green-bg text-green-text" />
              <div className="flex flex-col gap-2">
                {alDia.map((id) => (
                  <motion.div key={id} layout layoutId={id} transition={RESORTE}>
                    <FilaLead {...lead(id)} dias="hoy" punto="bg-green-border" colorDias="text-green-text" />
                  </motion.div>
                ))}
              </div>
            </LayoutGroup>
          </div>
        </Ventana>

        <div className="hidden md:flex flex-col gap-4 pt-10">
          {/* la tarjeta del lead que hay que atender */}
          <div
            className="bg-bg-primary border border-border-tertiary rounded-2xl p-4"
            style={{ boxShadow: '0 18px 44px -16px rgba(44, 38, 110, 0.3)' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={primero.id}
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-[15px] font-semibold text-text-primary">{primero.nombre}</div>
                <div className="flex gap-1.5 mt-2">
                  <Pastilla clases="bg-red-bg text-red-text border-red-border">{primero.dias} sin contacto</Pastilla>
                  <Pastilla clases="bg-green-bg text-green-text border-green-border">Muy interesado</Pastilla>
                </div>
                <p className="text-[12px] text-text-secondary mt-3 leading-relaxed">“{primero.consulta}”</p>
              </motion.div>
            </AnimatePresence>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <span className="flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg py-2 bg-text-primary text-bg-primary">
                <Icono nombre="telefono" className="w-3.5 h-3.5" /> Llamar
              </span>
              <span className="flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg py-2 bg-green-bg text-green-text border border-green-border">
                <Icono nombre="whatsapp" className="w-3.5 h-3.5" /> WhatsApp
              </span>
            </div>
          </div>

          {/* el aviso que llega antes de que venza */}
          <div className="min-h-[64px]">
            <AnimatePresence>
              {alerta && (
                <motion.div
                  key={primero.id}
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4, ease: SALIDA }}
                  className="flex items-center gap-3 bg-bg-primary border border-red-border rounded-xl px-3.5 py-3"
                  style={{ boxShadow: '0 12px 30px -14px rgba(162, 45, 45, 0.35)' }}
                >
                  <span className="w-8 h-8 rounded-lg bg-red-bg text-urgent-red flex items-center justify-center shrink-0">
                    <Icono nombre="campana" />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-text-primary">
                      {primero.nombre.split(', ').reverse().join(' ')} vence hoy
                    </div>
                    <div className="text-[11px] text-text-secondary">Si no la contactás, pasa a la cola del equipo.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* compañeros trabajando a la vez */}
      <CursorQueAnda nombre="Martín" color="#534ab7" camino={{ x: [40, 260, 180, 40], y: [120, 90, 220, 120] }} duracion={9} />
      <CursorQueAnda nombre="Lucía" color="#1d9e75" camino={{ x: [700, 820, 640, 700], y: [70, 200, 260, 70] }} duracion={11} />
    </div>
  )
}

function CursorQueAnda({ nombre, color, camino, duracion }) {
  const quieto = useReducedMotion()
  return (
    <motion.div
      className="absolute left-0 top-0 hidden md:block pointer-events-none"
      initial={{ x: camino.x[0], y: camino.y[0] }}
      animate={quieto ? undefined : camino}
      transition={{ duration: duracion, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <Cursor nombre={nombre} color={color} />
    </motion.div>
  )
}

// ---------- 1. prioriza solo ----------

const MEZCLADOS = [
  { id: 'a', nombre: 'Ríos, Martina', consulta: 'Pidió que la llamen a la tarde', grupo: 2, dias: '2d', interes: 'int' },
  { id: 'b', nombre: 'Luna, Santiago', consulta: 'Escribió por Instagram', grupo: 1, dias: 'hoy', interes: 'sin' },
  { id: 'c', nombre: 'Ortiz, Camila', consulta: 'Becas para Diseño', grupo: 0, dias: '12d', interes: 'muy' },
  { id: 'e', nombre: 'Sosa, Facundo', consulta: 'Va a venir a la sede', grupo: 2, dias: '1d', interes: 'int' },
  { id: 'f', nombre: 'Paz, Nicolás', consulta: 'Curso intensivo', grupo: 0, dias: '13d', interes: 'duda' },
]
const GRUPOS = [
  ['Por vencer', 'bg-red-bg text-urgent-red', 'bg-dot-red', 'text-urgent-red'],
  ['Sin contactar', 'bg-avatar-bg text-urgent-blue', 'bg-dot-blue', 'text-urgent-blue'],
  ['Al día', 'bg-green-bg text-green-text', 'bg-green-border', 'text-green-text'],
]

export function DemoPrioriza() {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, amount: 0.5 })
  const [ordenado, setOrdenado] = useState(false)
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setOrdenado(true), 500)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div ref={ref} aria-hidden="true">
      <Ventana titulo="Mis leads">
        <div className="p-4 min-h-[340px]">
          <LayoutGroup>
            {ordenado ? (
              GRUPOS.map(([titulo, clases, punto, colorDias], g) => {
                const lista = MEZCLADOS.filter((l) => l.grupo === g)
                return (
                  <div key={titulo}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <TituloSeccion texto={titulo} cantidad={lista.length} clases={clases} />
                    </motion.div>
                    <div className="flex flex-col gap-2">
                      {lista.map((l) => (
                        <motion.div key={l.id} layoutId={`prioriza-${l.id}`} transition={RESORTE}>
                          <FilaLead {...l} punto={punto} colorDias={colorDias} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col gap-2">
                {MEZCLADOS.map((l) => (
                  <motion.div key={l.id} layoutId={`prioriza-${l.id}`}>
                    <FilaLead {...l} punto="bg-border-secondary" />
                  </motion.div>
                ))}
              </div>
            )}
          </LayoutGroup>
        </div>
      </Ventana>
    </div>
  )
}

// ---------- 2. avisa antes de que venza ----------

export function DemoVencimiento() {
  const ref = useRef(null)
  const [dias, setDias] = useState(8)
  useCiclo(ref, 900, () => setDias((d) => (d >= 13 ? 8 : d + 1)))
  const PLAZO = 14
  const AVISO = 11
  const porVencer = dias >= AVISO

  return (
    <div ref={ref} className="flex flex-col gap-4" aria-hidden="true">
      <div
        className="bg-bg-primary border border-border-tertiary rounded-2xl p-5"
        style={{ boxShadow: '0 18px 44px -18px rgba(44, 38, 110, 0.25)' }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold text-text-primary">Ferreyra, Lucas</div>
          <AnimatePresence>
            {porVencer && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Pastilla clases="bg-red-bg text-red-text border-red-border">Por vencer</Pastilla>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className={`text-[44px] leading-none font-semibold tabular-nums ${porVencer ? 'text-urgent-red' : 'text-text-primary'}`}>
            {dias}
          </span>
          <span className="text-[13px] text-text-secondary">días sin contacto</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-bg-tertiary mt-5 overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 w-full origin-left rounded-full ${porVencer ? 'bg-dot-red' : 'bg-accent'}`}
            animate={{ scaleX: dias / PLAZO }}
            transition={{ duration: 0.6, ease: SALIDA }}
          />
        </div>
        <div className="relative h-5 mt-1.5 text-[10.5px] text-text-tertiary">
          <span className="absolute" style={{ left: `${(AVISO / PLAZO) * 100}%`, transform: 'translateX(-50%)' }}>
            aviso
          </span>
          <span className="absolute right-0">vence a los {PLAZO}</span>
        </div>
      </div>
      <div className="min-h-[58px]">
        <AnimatePresence>
          {porVencer && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, ease: SALIDA }}
              className="flex items-center gap-3 bg-bg-primary border border-border-tertiary rounded-xl px-4 py-3"
            >
              <span className="w-8 h-8 rounded-lg bg-amber-bg text-urgent-amber flex items-center justify-center shrink-0">
                <Icono nombre="campana" />
              </span>
              <span className="text-[12.5px] text-text-primary">
                <strong className="font-semibold">Lucas</strong> vence en {PLAZO - dias} {PLAZO - dias === 1 ? 'día' : 'días'}. Contactalo
                hoy.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------- 3. contactá en un toque ----------

const MENSAJE =
  'Hola Lucía, soy Martín de Instituto Horizonte. Te escribo por tu consulta sobre la carrera de Diseño. ¿Te puedo llamar hoy?'

export function DemoContacta() {
  const ref = useRef(null)
  const [letras, setLetras] = useState(0)
  useCiclo(ref, 45, () => setLetras((n) => (n >= MENSAJE.length + 60 ? 0 : n + 2)))
  const quieto = useReducedMotion()
  const visibles = quieto ? MENSAJE.length : Math.min(letras, MENSAJE.length)
  const enviado = visibles >= MENSAJE.length

  return (
    <div
      ref={ref}
      className="bg-bg-primary border border-border-tertiary rounded-2xl p-5"
      style={{ boxShadow: '0 18px 44px -18px rgba(44, 38, 110, 0.25)' }}
      aria-hidden="true"
    >
      <div className="text-[15px] font-semibold text-text-primary">Ortiz, Lucía</div>
      <div className="flex gap-1.5 mt-3">
        <span className="text-[11px] px-2.5 py-1 rounded-full border border-border-secondary text-text-secondary">Sin plantilla</span>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-purple-border bg-purple-bg text-purple-text">
          Primer contacto
        </span>
      </div>
      <div className="mt-4 rounded-xl p-4 bg-green-bg min-h-[118px]">
        <div className="ml-auto max-w-[88%] bg-white text-[#1f2b24] rounded-xl rounded-tr-sm px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm">
          {MENSAJE.slice(0, visibles)}
          {!enviado && <span className="inline-block w-px h-3.5 bg-[#1f2b24] align-[-2px] ml-px animate-pulse" />}
          <AnimatePresence>
            {enviado && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex ml-1.5 text-[#34b7f1] align-[-3px]"
              >
                <Icono nombre="check" className="w-3.5 h-3.5" />
                <Icono nombre="check" className="w-3.5 h-3.5 -ml-2" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          ['telefono', 'Llamar', 'bg-text-primary text-bg-primary'],
          ['whatsapp', 'WhatsApp', 'bg-green-bg text-green-text border border-green-border'],
          ['flecha', 'Email', 'border border-border-secondary text-text-primary'],
        ].map(([icono, texto, clases]) => (
          <span key={texto} className={`flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg py-2 ${clases}`}>
            <Icono nombre={icono} className="w-3.5 h-3.5" /> {texto}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- 4. todo el equipo a la vista ----------

export function DemoEquipo() {
  const ref = useRef(null)
  const [asignado, setAsignado] = useState(false)
  useCiclo(ref, 2600, () => setAsignado((a) => !a))
  const asesores = [
    ['Martín Suárez', 'MS', 12, 0],
    ['Lucía Fernández', 'LF', asignado ? 10 : 9, 1],
    ['Diego Romero', 'DR', 7, 3],
  ]

  return (
    <div ref={ref} aria-hidden="true">
      <Ventana titulo="Panel del equipo">
        <div className="p-4 flex flex-col gap-2">
          {asesores.map(([nombre, ini, cantidad, vencer]) => (
            <div key={nombre} className="flex items-center gap-3 bg-bg-primary border border-border-tertiary rounded-[10px] px-3 py-2.5">
              <span className="w-8 h-8 rounded-full bg-avatar-bg text-avatar-text text-[11px] font-semibold flex items-center justify-center">
                {ini}
              </span>
              <span className="flex-1 text-[12.5px] font-medium text-text-primary">{nombre}</span>
              <span className="w-14 text-right text-[12px] text-text-secondary tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={cantidad}
                    className="inline-block font-semibold text-text-primary"
                    initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                    transition={{ duration: 0.3 }}
                  >
                    {cantidad}
                  </motion.span>
                </AnimatePresence>{' '}
                leads
              </span>
              <span className={`w-20 text-right text-[11px] ${vencer ? 'text-urgent-red font-medium' : 'text-text-tertiary'}`}>
                {vencer} por vencer
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 mt-2 rounded-[10px] border border-dashed border-border-secondary px-3 py-2.5">
            <span className="flex-1">
              <span className="block text-[12.5px] font-semibold text-text-primary">Vega, Micaela</span>
              <span className="block text-[10.5px] text-text-secondary">Llegó por la web</span>
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={String(asignado)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                {asignado ? (
                  <Pastilla clases="bg-green-bg text-green-text border-green-border">Asignado a Lucía</Pastilla>
                ) : (
                  <Pastilla clases="bg-avatar-bg text-urgent-blue border-dot-blue">Sin asignar</Pastilla>
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </Ventana>
    </div>
  )
}

// ---------- 5. se adapta a tu rubro ----------

const RUBROS = [
  { rubro: 'Educación', varios: 'Alumnos', origen: 'Feria educativa', cierre: 'Carrera' },
  { rubro: 'Salud', varios: 'Pacientes', origen: 'Obra social', cierre: 'Tratamiento' },
  { rubro: 'Servicios', varios: 'Clientes', origen: 'Recomendación', cierre: 'Plan' },
]

// palabra que cambia con un fundido corto (para "Mis alumnos" → "Mis pacientes"...)
function Palabra({ children }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={children}
        className="inline-block"
        initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.35, ease: SALIDA }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}

export function DemoRubro() {
  const ref = useRef(null)
  const [i, setI] = useState(0)
  useCiclo(ref, 2400, () => setI((n) => (n + 1) % RUBROS.length))
  const r = RUBROS[i]
  return (
    <div ref={ref} aria-hidden="true">
      <div className="flex gap-1.5 mb-4">
        {RUBROS.map((x, j) => (
          <span
            key={x.rubro}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors duration-300 ${
              j === i ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
            }`}
          >
            {x.rubro}
          </span>
        ))}
      </div>
      <Ventana>
        <div className="p-5">
          <div className="text-[20px] font-semibold text-text-primary tracking-tight">
            Mis <Palabra>{r.varios.toLowerCase()}</Palabra>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-[10px] bg-bg-primary border border-border-tertiary p-3">
              <div className="text-text-tertiary text-[10.5px]">Origen</div>
              <div className="font-medium text-text-primary mt-0.5">
                <Palabra>{r.origen}</Palabra>
              </div>
            </div>
            <div className="rounded-[10px] bg-bg-primary border border-border-tertiary p-3">
              <div className="text-text-tertiary text-[10.5px]">Al cerrar se carga</div>
              <div className="font-medium text-text-primary mt-0.5">
                <Palabra>{r.cierre}</Palabra>
              </div>
            </div>
          </div>
        </div>
      </Ventana>
    </div>
  )
}

// ---------- 6. también en el celular ----------

const NOTIFICACIONES = [
  ['tendencia', 'bg-accent text-white', 'Tu día en Trackly', '2 leads vencen hoy, 4 recordatorios y 21 sin contactar.'],
  ['campana', 'bg-dot-red text-white', 'Paula Molina vence hoy', 'Muy interesada · 13 días sin contacto.'],
  ['check', 'bg-urgent-amber text-white', 'Recordatorio en 15 minutos', '17:00 · Paula Molina, llamada coordinada.'],
]

export function DemoCelular() {
  const ref = useRef(null)
  const quieto = useReducedMotion()
  const [n, setN] = useState(quieto ? NOTIFICACIONES.length : 0)
  useCiclo(ref, 1500, () => setN((x) => (x >= NOTIFICACIONES.length + 1 ? 0 : x + 1)))

  return (
    <div ref={ref} className="flex justify-center" aria-hidden="true">
      <div className="w-[270px] rounded-[42px] bg-[#16151f] p-2.5" style={{ boxShadow: '0 30px 60px -20px rgba(22, 21, 31, 0.55)' }}>
        <div className="rounded-[34px] bg-[#232235] h-[480px] px-3.5 pt-14 overflow-hidden">
          <div className="text-center text-white/90 text-[50px] font-light leading-none tabular-nums">08:00</div>
          <div className="text-center text-white/60 text-[12px] mt-2">Lunes</div>
          <div className="mt-6 flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {NOTIFICACIONES.slice(0, Math.min(n, NOTIFICACIONES.length)).map(([icono, color, titulo, texto]) => (
                <motion.div
                  key={titulo}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.45, ease: SALIDA }}
                  className="flex gap-2.5 rounded-2xl bg-white/90 px-3 py-2.5"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icono nombre={icono} className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-semibold text-[#1d1c26]">{titulo}</span>
                    <span className="block text-[10.5px] leading-snug text-[#4a4958]">{texto}</span>
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- estadísticas ----------

const ORIGENES = [
  ['Instagram', 34],
  ['Web', 27],
  ['Referido', 18],
  ['Feria', 12],
  ['Facebook', 9],
]

export function NumeroQueSube({ valor, sufijo = '', className = '' }) {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, amount: 0.6 })
  const quieto = useReducedMotion()
  useEffect(() => {
    if (!visible || !ref.current) return
    if (quieto) {
      ref.current.textContent = `${valor}${sufijo}`
      return
    }
    const control = animate(0, valor, {
      duration: 1.2,
      ease: SALIDA,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${sufijo}`
      },
    })
    return () => control.stop()
  }, [visible, quieto, valor, sufijo])
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {valor}
      {sufijo}
    </span>
  )
}

export function DemoEstadisticas() {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, amount: 0.4 })
  const max = Math.max(...ORIGENES.map(([, v]) => v))
  return (
    <div ref={ref} className="grid sm:grid-cols-[1.4fr_1fr] gap-4" aria-hidden="true">
      <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-text-primary">Leads por origen</div>
        <div className="flex items-end gap-3 h-[160px] mt-5 border-b border-border-tertiary">
          {ORIGENES.map(([origen, v], i) => (
            <div key={origen} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[11px] font-semibold text-text-primary tabular-nums mb-1">{v}</span>
              <motion.div
                className="w-full max-w-[38px] bg-accent rounded-t-[4px] origin-bottom"
                style={{ height: `${(v / max) * 100}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: visible ? 1 : 0 }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease: SALIDA }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2">
          {ORIGENES.map(([origen]) => (
            <span key={origen} className="flex-1 text-center text-[10.5px] text-text-secondary">
              {origen}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-5">
          <div className="text-[12px] text-text-secondary">Tasa de conversión</div>
          <div className="text-[40px] font-semibold text-text-primary leading-none mt-2">
            <NumeroQueSube valor={34} sufijo="%" />
          </div>
          <div className="text-[11px] text-text-tertiary mt-2">ganados sobre cerrados</div>
        </div>
        <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-5">
          <div className="text-[12px] text-text-secondary">¿Por qué se pierden?</div>
          <div className="text-[15px] font-semibold text-text-primary mt-2">Precio · Horarios</div>
          <div className="text-[11px] text-text-tertiary mt-1">los dos motivos más comunes</div>
        </div>
      </div>
    </div>
  )
}

// ---------- el recorrido de un lead ----------

const PASOS = ['Ingresa', 'Lo contactás', 'Programás el próximo paso', 'Ganado']

export function Recorrido() {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, amount: 0.5 })
  return (
    <div ref={ref} className="relative" aria-hidden="true">
      <div className="absolute left-[12.5%] right-[12.5%] top-[19px] h-0.5 bg-border-tertiary hidden sm:block">
        <motion.div
          className="h-full bg-accent origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: visible ? 1 : 0 }}
          transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>
      <ol className="relative grid sm:grid-cols-4 gap-6 sm:gap-2">
        {PASOS.map((paso, i) => {
          const ultimo = i === PASOS.length - 1
          return (
            <li key={paso} className="flex sm:flex-col items-center gap-3 sm:text-center">
              <motion.span
                className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold border-2 ${
                  ultimo ? 'border-green-border text-green-text' : 'border-accent text-accent-text'
                }`}
                initial={{ backgroundColor: 'var(--color-bg-primary)' }}
                animate={{
                  backgroundColor: visible ? (ultimo ? 'var(--color-green-bg)' : 'var(--color-purple-bg)') : 'var(--color-bg-primary)',
                }}
                transition={{ delay: 0.4 * i, duration: 0.3 }}
              >
                {ultimo ? <Icono nombre="check" /> : i + 1}
              </motion.span>
              <span className="text-[14px] font-medium text-text-primary">{paso}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
