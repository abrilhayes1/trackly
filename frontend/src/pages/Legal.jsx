import Logo from '../components/Logo'

// Términos y condiciones y política de privacidad. Se abren sin iniciar sesión
// en /?legal=terminos y /?legal=privacidad (el registro y la landing enlazan acá).
const ACTUALIZADO = '10 de noviembre de 2026'

function Seccion({ titulo, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-semibold text-text-primary mb-2">{titulo}</h2>
      <div className="space-y-3 text-[14.5px] leading-relaxed text-text-secondary">{children}</div>
    </section>
  )
}

function Terminos() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-primary">Términos y condiciones</h1>
      <p className="mt-2 text-[13px] text-text-tertiary">Última actualización: {ACTUALIZADO}</p>

      <Seccion titulo="1. Qué es Trackly">
        <p>
          Trackly es una herramienta para que equipos comerciales registren sus contactos (leads), programen recordatorios y hagan
          seguimiento de cada oportunidad. Al crear una cuenta o usar el servicio aceptás estos términos.
        </p>
      </Seccion>

      <Seccion titulo="2. Tu cuenta">
        <p>
          Para usar Trackly necesitás una cuenta con un email válido. Sos responsable de mantener tu contraseña en secreto y de lo que se
          haga con tu cuenta. Si creés que alguien más entró, cambiá la contraseña desde Mi perfil.
        </p>
        <p>Por seguridad, la sesión se cierra sola después de un tiempo sin actividad.</p>
        <p>
          Si usás Trackly como parte de un equipo, el acceso lo administra ese equipo: quien lo lidera puede desactivarlo. Tu email y tu
          contraseña siguen siendo tuyos: si otro equipo te invita, podés unirte con la misma cuenta.
        </p>
      </Seccion>

      <Seccion titulo="3. Equipos y roles">
        <p>
          Cada cuenta pertenece a un equipo. El líder del equipo puede invitar asesores, ver y reasignar los leads del equipo y configurar
          sus etapas, motivos y plantillas. Los asesores ven y gestionan sus propios leads.
        </p>
        <p>
          Cada equipo tiene una cantidad de licencias y cada persona activa o invitada ocupa una. El plan gratuito incluye 1 licencia.
          Cuando alguien deja el equipo, el líder lo desactiva y su licencia queda libre para otra persona.
        </p>
      </Seccion>

      <Seccion titulo="4. Los datos que cargás">
        <p>
          Los datos de los contactos que cargás son del equipo que los carga, no de Trackly. El equipo es responsable de tener una base
          legítima para guardarlos (por ejemplo, que la persona haya pedido información) y de usarlos solo para el seguimiento comercial.
        </p>
        <p>Trackly guarda y procesa esos datos únicamente para prestar el servicio, como se explica en la política de privacidad.</p>
      </Seccion>

      <Seccion titulo="5. Uso aceptable">
        <p>No está permitido usar Trackly para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>cargar datos obtenidos sin autorización o comprados a terceros;</li>
          <li>enviar spam o mensajes que la persona no pidió;</li>
          <li>intentar acceder a cuentas o equipos ajenos, o afectar el funcionamiento del servicio.</li>
        </ul>
        <p>Si se detecta un uso así, la cuenta puede suspenderse.</p>
      </Seccion>

      <Seccion titulo="6. Disponibilidad">
        <p>
          Trabajamos para que Trackly funcione siempre, pero el servicio se ofrece tal como está y puede tener interrupciones por
          mantenimiento o fallas de los proveedores en los que se apoya. Te recomendamos exportar periódicamente la información que te
          resulte importante.
        </p>
      </Seccion>

      <Seccion titulo="7. Bajas">
        <p>
          Las personas de un equipo no se dan de baja solas: la baja la decide el equipo. Quien lo lidera desactiva a quien se va; esa
          persona deja de tener acceso y lo que cargó (contactos, notas, cierres) queda en el equipo, a su nombre, porque es información del
          equipo.
        </p>
        <p>Si un equipo deja de usar Trackly, quien lo lidera puede pedir la baja del equipo completo, y sus datos se eliminan.</p>
      </Seccion>

      <Seccion titulo="8. Cambios">
        <p>
          Podemos actualizar estos términos. Si el cambio es importante, lo avisamos dentro de la aplicación antes de que entre en vigencia.
        </p>
      </Seccion>

      <Seccion titulo="9. Ley aplicable">
        <p>Estos términos se rigen por las leyes de la República Argentina.</p>
      </Seccion>
    </>
  )
}

function Privacidad() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-primary">Política de privacidad</h1>
      <p className="mt-2 text-[13px] text-text-tertiary">Última actualización: {ACTUALIZADO}</p>

      <Seccion titulo="1. Qué datos guardamos">
        <p>Hay dos tipos de datos en Trackly:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-text-primary font-medium">Los de tu cuenta:</strong> nombre, email, foto si la subís, el equipo al que
            pertenecés y tus preferencias.
          </li>
          <li>
            <strong className="text-text-primary font-medium">Los de los contactos que carga tu equipo:</strong> nombre, teléfono, email,
            interés, notas, recordatorios y el historial de seguimiento.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="2. Quién es responsable de cada dato">
        <p>
          De los datos de tu cuenta, el responsable es Trackly. De los datos de los contactos, el responsable es el equipo que los cargó:
          Trackly actúa como encargado del tratamiento, es decir, los guarda y procesa por cuenta del equipo y solo para prestar el
          servicio, en los términos de la Ley 25.326 de Protección de los Datos Personales.
        </p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Para que puedas ingresar y trabajar con tu equipo.</li>
          <li>Para mostrarte alertas, recordatorios y estadísticas.</li>
          <li>Para mandarte emails necesarios del servicio, como confirmar la cuenta o recuperar la contraseña.</li>
        </ul>
        <p>No vendemos ni alquilamos datos, y no los usamos para publicidad.</p>
      </Seccion>

      <Seccion titulo="4. Dónde se guardan">
        <p>
          Los datos se guardan en Supabase (base de datos y archivos) y la aplicación funciona sobre Vercel y Railway. Estos proveedores
          pueden tener sus servidores fuera de Argentina; al usar Trackly aceptás esa transferencia internacional, que se hace solo para
          prestar el servicio y con proveedores que aplican medidas de seguridad adecuadas.
        </p>
        <p>Si ingresás con Google, Google nos comparte tu nombre, email y foto de perfil.</p>
      </Seccion>

      <Seccion titulo="5. Cómo los cuidamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Las conexiones van cifradas (HTTPS).</li>
          <li>Cada equipo solo puede ver sus propios datos: la base de datos lo controla en cada consulta.</li>
          <li>Las contraseñas no se guardan en texto: las maneja el sistema de autenticación de Supabase.</li>
          <li>La sesión se cierra sola después de un tiempo sin actividad.</li>
        </ul>
      </Seccion>

      <Seccion titulo="6. Cuánto tiempo">
        <p>
          Guardamos los datos mientras la cuenta o el equipo estén activos. Cuando se pide la baja, se eliminan, salvo lo que una ley
          obligue a conservar.
        </p>
      </Seccion>

      <Seccion titulo="7. Tus derechos">
        <p>
          Podés pedir acceder a tus datos, corregirlos, actualizarlos o eliminarlos. Muchos se pueden cambiar directamente desde Mi perfil.
          Si sos un contacto cargado por un equipo, el pedido se lo hacés a ese equipo, que es el responsable; Trackly lo ayuda a cumplirlo.
        </p>
        <p>
          Si sos parte de un equipo, los pedidos sobre tus datos se los hacés a ese equipo. Cuando alguien deja un equipo, su nombre se
          conserva en el historial de lo que hizo, porque es parte del registro del equipo.
        </p>
        <p>
          El acceso es gratuito cada seis meses, salvo que se acredite un interés legítimo para pedirlo antes (art. 14, inc. 3 de la Ley
          25.326).
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, como órgano de control de la Ley 25.326, atiende las denuncias y reclamos que se
          presenten por incumplimiento de las normas sobre protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="8. Cambios">
        <p>Si cambiamos esta política de forma importante, lo avisamos dentro de la aplicación.</p>
      </Seccion>
    </>
  )
}

export default function Legal({ tipo }) {
  const esPrivacidad = tipo === 'privacidad'
  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="border-b border-border-tertiary bg-bg-primary">
        <div className="max-w-[720px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <a href={window.location.pathname} aria-label="Ir a Trackly">
            <Logo alto="h-6" />
          </a>
          <nav className="flex gap-4 text-[13px]">
            <a
              href="?legal=terminos"
              className={esPrivacidad ? 'text-text-secondary hover:text-text-primary' : 'text-text-primary font-medium'}
            >
              Términos
            </a>
            <a
              href="?legal=privacidad"
              className={esPrivacidad ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}
            >
              Privacidad
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-5 py-10 pb-20">{esPrivacidad ? <Privacidad /> : <Terminos />}</main>
    </div>
  )
}
