// Landing (la página de bienvenida antes de entrar): qué hace Trackly, con la interfaz real en
// miniatura y animaciones de Motion. Pide crear la cuenta solo arriba y al final. El movimiento
// principal es la escena de arriba (un lead que se
// atiende y pasa a "Al día"); cada función tiene su propia demostración. Con "reducir movimiento"
// del sistema, todo queda quieto (MotionConfig reducedMotion="user").
import { useState } from 'react'
import { MotionConfig, useScroll, useMotionValueEvent } from 'motion/react'
import {
  DemoCelular,
  DemoContacta,
  DemoEquipo,
  DemoEstadisticas,
  DemoPrioriza,
  DemoRubro,
  DemoVencimiento,
  EscenaPrincipal,
  NumeroQueSube,
  Recorrido,
} from '../components/landing/Demos'

const FUNCIONES = [
  {
    titulo: 'Sabé a quién contactar hoy',
    texto:
      'Tus contactos se ordenan solos por urgencia: los que están por vencer, los que todavía nadie contactó y los que se quedaron sin próximo paso. Abrís Trackly y ya sabés por dónde empezar.',
    Demo: DemoPrioriza,
  },
  {
    titulo: 'Enterate antes de que sea tarde',
    texto:
      'Cada equipo define en cuántos días vence un contacto. Trackly avisa unos días antes y, si nadie lo atiende, lo pasa a una lista para que cualquiera del equipo lo pueda reclamar.',
    Demo: DemoVencimiento,
  },
  {
    titulo: 'Contactá en un toque',
    texto:
      'WhatsApp, llamada o email con un clic, y plantillas que se completan solas con el nombre de cada persona. Cada contacto queda registrado en su historial.',
    Demo: DemoContacta,
  },
  {
    titulo: 'Todo el equipo a la vista',
    texto:
      'El líder ve en un panel cuántos contactos tiene cada asesor, cuántos están por vencer y cuáles llegaron sin asignar, y los reparte en un clic.',
    Demo: DemoEquipo,
  },
  {
    titulo: 'Se adapta a tu rubro',
    texto:
      'Leads, pacientes, alumnos o candidatos: elegís cómo se llaman tus contactos, de dónde llegan, en cuántos días vencen y qué datos se cargan al cerrar una venta.',
    Demo: DemoRubro,
  },
  {
    titulo: 'También en el celular',
    texto:
      'La app te muestra lo urgente del día y te avisa cuando un contacto está por vencer o se acerca un recordatorio. Registrás el contacto ahí mismo, sin volver a la compu.',
    Demo: DemoCelular,
  },
]

const CIFRAS = [
  [62, 'pierde contactos seguido o todo el tiempo por falta de aviso.'],
  [62, 'dedica más de una hora por semana solo a ordenar información.'],
  [100, 'valoró con 4 o 5 puntos que la herramienta priorice sola.'],
]

function BotonPrincipal({ children, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-accent text-white text-[15px] font-semibold hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {children}
    </button>
  )
}

// email + "Crear cuenta gratis": el registro empieza acá mismo y sigue en la pantalla de la cuenta
function FormularioRegistro({ onCrearCuenta, id }) {
  const [email, setEmail] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onCrearCuenta(email.trim())
      }}
      className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[480px] mx-auto"
    >
      <label htmlFor={id} className="sr-only">
        Tu email
      </label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="w-full sm:flex-1 min-w-0 h-12 shrink-0 px-4 rounded-xl border border-border-secondary bg-bg-primary text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
      />
      <BotonPrincipal type="submit">Crear cuenta gratis</BotonPrincipal>
    </form>
  )
}

export default function Landing({ onIngresar, onCrearCuenta }) {
  const { scrollY } = useScroll()
  const [conBorde, setConBorde] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setConBorde(y > 8))

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-bg-secondary text-text-primary">
        <header
          className={`sticky top-0 z-30 bg-bg-secondary border-b transition-colors duration-200 ${conBorde ? 'border-border-tertiary' : 'border-transparent'}`}
        >
          <div className="max-w-[1160px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            <span className="text-[20px] font-semibold tracking-tight text-accent-text">
              Trackly<span className="text-green-border">.</span>
            </span>
            <nav className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={onIngresar}
                className="text-[14px] font-medium text-text-primary px-2 sm:px-3 h-10 rounded-lg hover:bg-bg-tertiary"
              >
                Ingresar
              </button>
              <BotonPrincipal onClick={() => onCrearCuenta('')} className="h-10 px-4 text-[14px]">
                Crear cuenta<span className="hidden sm:inline">&nbsp;gratis</span>
              </BotonPrincipal>
            </nav>
          </div>
        </header>

        <main>
          {/* portada */}
          <section className="max-w-[1160px] mx-auto px-5 md:px-8 pt-14 md:pt-24 pb-16 md:pb-24">
            <div className="text-center max-w-[860px] mx-auto">
              <h1 className="text-[40px] sm:text-[58px] lg:text-[76px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
                Que ningún <span className="text-accent-text">lead</span> se enfríe.
              </h1>
              <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed text-text-secondary max-w-[640px] mx-auto text-pretty">
                Trackly te muestra cada mañana a quién contactar primero, te avisa antes de que un contacto venza y le da al líder la foto
                completa del equipo.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3">
                <FormularioRegistro onCrearCuenta={onCrearCuenta} id="email-portada" />
                <p className="text-[13px] text-text-tertiary">
                  Gratis. Sin tarjeta. Listo en 5 minutos. ¿Ya tenés cuenta?{' '}
                  <button
                    onClick={onIngresar}
                    className="font-medium text-accent-text underline underline-offset-4 decoration-accent/40 hover:decoration-accent"
                  >
                    Ingresá
                  </button>
                </p>
              </div>
            </div>
            <div className="mt-16 md:mt-20">
              <EscenaPrincipal />
            </div>
          </section>

          {/* lo que dijeron los equipos (encuesta de la investigación) */}
          <section className="border-y border-border-tertiary bg-bg-primary">
            <div className="max-w-[1160px] mx-auto px-5 md:px-8 py-16 md:py-20">
              <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] max-w-[620px] text-balance">
                Lo que nos dijeron los equipos comerciales
              </h2>
              <div className="mt-10 grid md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-border-tertiary">
                {CIFRAS.map(([valor, texto], i) => (
                  <p key={i} className="md:px-8 first:md:pl-0 text-[17px] leading-snug text-text-secondary">
                    <NumeroQueSube
                      valor={valor}
                      sufijo="%"
                      className="block text-[56px] leading-none font-semibold tracking-[-0.04em] text-text-primary mb-3"
                    />
                    {texto}
                  </p>
                ))}
              </div>
              <p className="mt-10 text-[12px] text-text-tertiary">Encuesta a asesores comerciales, 2026.</p>
            </div>
          </section>

          {/* funciones, en zigzag */}
          <section className="max-w-[1160px] mx-auto px-5 md:px-8 py-20 md:py-28 flex flex-col gap-24 md:gap-32">
            {FUNCIONES.map(({ titulo, texto, Demo }, i) => (
              <article key={titulo} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
                <div className={i % 2 ? 'md:order-2' : ''}>
                  <h2 className="text-[32px] sm:text-[42px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">{titulo}</h2>
                  <p className="mt-5 text-[17px] leading-relaxed text-text-secondary max-w-[480px] text-pretty">{texto}</p>
                </div>
                <div className={i % 2 ? 'md:order-1' : ''}>
                  <Demo />
                </div>
              </article>
            ))}
          </section>

          {/* estadísticas */}
          <section className="max-w-[1160px] mx-auto px-5 md:px-8">
            <div className="rounded-[28px] bg-bg-tertiary px-6 sm:px-10 py-12 sm:py-16">
              <div className="max-w-[620px]">
                <h2 className="text-[32px] sm:text-[42px] leading-[1.05] font-semibold tracking-[-0.035em]">Medí lo que importa.</h2>
                <p className="mt-5 text-[17px] leading-relaxed text-text-secondary text-pretty">
                  Contactos por origen, tasa de conversión, por qué se pierden y cómo rinde cada asesor, actualizado al momento.
                </p>
              </div>
              <div className="mt-10">
                <DemoEstadisticas />
              </div>
            </div>
          </section>

          {/* el recorrido de un lead */}
          <section className="max-w-[1160px] mx-auto px-5 md:px-8 py-20 md:py-28">
            <h2 className="text-[32px] sm:text-[42px] leading-[1.05] font-semibold tracking-[-0.035em] text-center text-balance">
              De la primera consulta a la inscripción.
            </h2>
            <div className="mt-14 max-w-[900px] mx-auto">
              <Recorrido />
            </div>
          </section>

          {/* cierre */}
          <section className="border-t border-border-tertiary bg-bg-primary">
            <div className="max-w-[1160px] mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
              <h2 className="text-[36px] sm:text-[52px] leading-[1.03] font-semibold tracking-[-0.035em] text-balance max-w-[760px] mx-auto">
                Empezá a ordenar tus contactos hoy.
              </h2>
              <div className="mt-9">
                <FormularioRegistro onCrearCuenta={onCrearCuenta} id="email-cierre" />
              </div>
              <p className="mt-4 text-[13px] text-text-tertiary">Gratis. Sin tarjeta.</p>
            </div>
          </section>
        </main>

        <footer className="border-t border-border-tertiary">
          <div className="max-w-[1160px] mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-text-secondary">
            <span>© 2026 Trackly</span>
            <span className="flex gap-5">
              <button onClick={onIngresar} className="hover:text-text-primary">
                Ingresar
              </button>
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
