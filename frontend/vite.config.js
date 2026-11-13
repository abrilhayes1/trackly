import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const SALIDA_PROTOTIPO = path.resolve(aqui, '../docs/prototipos/trackly-prototipo.html')

// Prototipo (npm run prototipo): la misma app, pero con el servidor y el inicio de sesión de
// src/demo en lugar de Supabase y el backend, y todo (código, estilos, letra y logos) dentro de un
// solo archivo HTML que se abre con doble clic.
function prototipo() {
  const reemplazos = {
    [path.resolve(aqui, 'src/lib/supabaseClient.js')]: path.resolve(aqui, 'src/demo/supabaseDemo.js'),
    [path.resolve(aqui, 'src/lib/api.js')]: path.resolve(aqui, 'src/demo/apiDemo.js'),
  }
  const imagen = (archivo) => `data:image/png;base64,${fs.readFileSync(path.resolve(aqui, 'public', archivo)).toString('base64')}`
  const imagenes = ['logos/trackly-logo.png', 'logos/trackly-logo-oscuro.png', 'favicon.png', 'apple-touch-icon.png']

  return {
    name: 'trackly-prototipo',
    enforce: 'pre',
    async resolveId(origen, importador, opciones) {
      const resuelto = await this.resolve(origen, importador, { ...opciones, skipSelf: true })
      return resuelto && reemplazos[resuelto.id] ? reemplazos[resuelto.id] : null
    },
    // al terminar: se junta todo lo compilado en un solo archivo
    closeBundle() {
      const carpeta = path.resolve(aqui, 'dist-prototipo')
      let pagina = fs.readFileSync(path.join(carpeta, 'index.html'), 'utf8')
      const leer = (ruta) => fs.readFileSync(path.join(carpeta, ruta.replace(/^\.?\//, '')), 'utf8')
      pagina = pagina.replace(/<script([^>]*)src="([^"]+)"([^>]*)><\/script>/g, (_, a, ruta) => {
        const codigo = leer(ruta).replace(/<\/script/gi, '<\\/script')
        return `<script type="module">${codigo}</script>`
      })
      pagina = pagina.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, ruta) => `<style>${leer(ruta)}</style>`)
      pagina = pagina.replace(/<link rel="modulepreload"[^>]*>/g, '')
      for (const archivo of imagenes) pagina = pagina.split(`/${archivo}`).join(imagen(archivo))
      pagina = pagina.replace('<title>Trackly</title>', '<title>Trackly · Prototipo</title>')
      fs.mkdirSync(path.dirname(SALIDA_PROTOTIPO), { recursive: true })
      fs.writeFileSync(SALIDA_PROTOTIPO, pagina)
    },
  }
}

export default defineConfig(({ mode }) =>
  mode === 'demo'
    ? {
        plugins: [prototipo(), react(), tailwindcss()],
        publicDir: false,
        build: {
          outDir: 'dist-prototipo',
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: { output: { codeSplitting: false } },
        },
      }
    : { plugins: [react(), tailwindcss()] },
)
