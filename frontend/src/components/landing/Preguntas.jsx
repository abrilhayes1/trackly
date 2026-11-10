// Preguntas frecuentes: se abre una a la vez; la respuesta se despliega con su altura real.
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const PREGUNTAS = [
  ['¿Trackly es gratis?', 'Sí. Crear la cuenta, invitar a tu equipo y usar todas las funciones no tiene costo.'],
  [
    '¿Sirve para mi rubro?',
    'Sí. Está pensado para equipos que venden a personas: institutos y universidades, clínicas y consultorios, servicios. Elegís cómo se llaman tus contactos (leads, pacientes, alumnos, candidatos), de dónde llegan, en cuántos días vencen y qué datos se cargan al cerrar una venta.',
  ],
  [
    '¿Puedo usarlo solo, sin equipo?',
    'Sí. Al crear la cuenta armás tu equipo y quedás como líder. Cuando quieras, invitás a otras personas por email.',
  ],
  [
    '¿Puedo traer mis contactos desde Excel?',
    'Sí. Subís tu planilla de Excel o CSV, Trackly reconoce las columnas, te muestra una vista previa y deja afuera los repetidos y los que tienen errores.',
  ],
  [
    '¿Qué pasa si un asesor no contacta a tiempo?',
    'Unos días antes del plazo, Trackly avisa. Si nadie lo contacta, el lead vence y pasa a una lista donde cualquiera del equipo lo puede reclamar. Así no se pierde.',
  ],
  ['¿Hay app para el celular?', 'Sí. La app para Android tiene lo mismo que la web, menos las estadísticas, que quedan en la compu.'],
  [
    '¿Mis datos están seguros?',
    'Cada equipo ve solo sus datos: la base lo controla en cada consulta. Todo viaja cifrado y la sesión se cierra sola después de 8 horas sin usar la app.',
  ],
]

export default function Preguntas() {
  const [abierta, setAbierta] = useState(null)
  return (
    <div className="divide-y divide-border-tertiary border-y border-border-tertiary">
      {PREGUNTAS.map(([pregunta, respuesta], i) => {
        const abierto = abierta === i
        return (
          <div key={pregunta}>
            <h3>
              <button
                onClick={() => setAbierta(abierto ? null : i)}
                aria-expanded={abierto}
                aria-controls={`respuesta-${i}`}
                className="w-full flex items-center justify-between gap-6 py-5 text-left text-[17px] font-medium text-text-primary hover:text-accent-text"
              >
                {pregunta}
                <svg
                  viewBox="0 0 24 24"
                  className={`w-5 h-5 shrink-0 text-text-tertiary transition-transform duration-200 ${abierto ? 'rotate-45' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {abierto && (
                <motion.div
                  id={`respuesta-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 pr-10 text-[16px] leading-relaxed text-text-secondary max-w-[68ch]">{respuesta}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
