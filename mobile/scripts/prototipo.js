// Genera el prototipo de la app mobile: la app real con los datos de ejemplo del prototipo web
// (frontend/src/demo), sin Supabase ni backend. Queda en frontend/public/prototipo-mobile y se publica
// con la web: https://trackly-six-delta.vercel.app/prototipo-mobile
// En la compu se ve dentro de un marco de teléfono; en un celular, a pantalla completa.
// Uso: npm run prototipo (en la carpeta mobile)
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const aqui = path.resolve(__dirname, '..')
const salida = path.join(aqui, 'dist-prototipo')
const destino = path.resolve(aqui, '../frontend/public/prototipo-mobile')

execSync('npx expo export --platform web --output-dir dist-prototipo --clear', {
  cwd: aqui,
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_DEMO: '1',
    EXPO_OFFLINE: '1',
    // no se usan (el prototipo no se conecta a nada); solo evitan avisos de variables faltantes
    EXPO_PUBLIC_SUPABASE_URL: 'https://prototipo.local',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'prototipo',
    EXPO_PUBLIC_API_URL: 'https://prototipo.local',
  },
})

// la app usa 4 variantes de la letra Inter: las otras se exportan igual, pero nunca se cargan
const USADAS = ['Inter_400Regular.', 'Inter_500Medium.', 'Inter_600SemiBold.', 'Inter_700Bold.']
function recorrer(carpeta) {
  for (const nombre of fs.readdirSync(carpeta)) {
    const ruta = path.join(carpeta, nombre)
    if (fs.statSync(ruta).isDirectory()) recorrer(ruta)
    else if (nombre.endsWith('.ttf') && nombre.startsWith('Inter_') && !USADAS.some((u) => nombre.startsWith(u))) fs.rmSync(ruta)
  }
}
recorrer(salida)

// marco de teléfono en pantallas anchas y barra para cambiar de usuario o reiniciar los datos
const USUARIOS = [
  ['bbbbbbbb-0000-4000-8000-000000000001', 'Carolina (líder)'],
  ['bbbbbbbb-0000-4000-8000-000000000002', 'Martín (asesor)'],
  ['bbbbbbbb-0000-4000-8000-000000000003', 'Lucía (asesora)'],
  ['bbbbbbbb-0000-4000-8000-000000000004', 'Diego (asesor)'],
]
const extra = `
<style>
  @media (min-width: 640px) {
    html, body { background: #e9e7e1 !important; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding-top: 50px; box-sizing: border-box; }
    #barra-prototipo { bottom: auto !important; top: 12px; }
    #root {
      position: relative; flex: none !important; width: 390px; height: min(844px, calc(100vh - 80px));
      border: 10px solid #1c1c1a; border-radius: 44px; overflow: hidden; transform: translateZ(0);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);
    }
  }
  #barra-prototipo { position: fixed; bottom: 12px; left: 0; right: 0; margin: 0 auto; width: fit-content; z-index: 9999;
    font: 500 12px Inter, system-ui, sans-serif; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    justify-content: center; max-width: calc(100vw - 24px); }
  #barra-prototipo button { font: inherit; border-radius: 999px; padding: 6px 11px; cursor: pointer;
    border: 1px solid #d3d1c7; background: #fff; color: #444; }
  #barra-prototipo button.activo { background: #534ab7; border-color: #534ab7; color: #fff; }
  #barra-prototipo .titulo { background: #1c1c1a; color: #fff; border-color: #1c1c1a; }
  @media (max-width: 639px) { #barra-prototipo { bottom: auto; top: 6px; } #barra-prototipo:not(.abierta) button:not(.titulo) { display: none; } }
</style>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var usuarios = ${JSON.stringify(USUARIOS)}
    var actual = null
    try { actual = sessionStorage.getItem('trackly-prototipo-sesion') } catch (e) {}
    var barra = document.createElement('div')
    barra.id = 'barra-prototipo'
    var titulo = document.createElement('button')
    titulo.className = 'titulo'
    titulo.textContent = 'Prototipo mobile · ver como'
    titulo.onclick = function () { barra.classList.toggle('abierta') }
    barra.appendChild(titulo)
    usuarios.forEach(function (u) {
      var b = document.createElement('button')
      b.textContent = u[1]
      if (u[0] === actual) b.className = 'activo'
      b.onclick = function () {
        try { sessionStorage.setItem('trackly-prototipo-sesion', u[0]) } catch (e) {}
        location.href = '/prototipo-mobile/'
      }
      barra.appendChild(b)
    })
    var reiniciar = document.createElement('button')
    reiniciar.textContent = 'Reiniciar datos'
    reiniciar.onclick = function () {
      try { sessionStorage.clear() } catch (e) {}
      location.href = '/prototipo-mobile/'
    }
    barra.appendChild(reiniciar)
    document.body.appendChild(barra)
  })
</script>
`
const indice = path.join(salida, 'index.html')
let html = fs.readFileSync(indice, 'utf8')
html = html.replace('</head>', `${extra}</head>`).replace(/<title>[^<]*<\/title>/, '<title>Trackly · Prototipo mobile</title>')
fs.writeFileSync(indice, html)

fs.rmSync(destino, { recursive: true, force: true })
fs.cpSync(salida, destino, { recursive: true })
console.log(`\nPrototipo mobile listo en ${path.relative(path.resolve(aqui, '..'), destino)}`)
