// La app usa la misma lógica que la web (urgencia, interés, plantillas): Metro tiene que poder leer
// frontend/src/lib, que está afuera de esta carpeta.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const compartida = path.resolve(__dirname, '../frontend/src/lib')

config.watchFolders = [compartida]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]

// Prototipo (npm run prototipo): en lugar de Supabase y el backend, usa el inicio de sesión y el
// servidor de ejemplo del prototipo web (frontend/src/demo), con los mismos datos.
if (process.env.EXPO_PUBLIC_DEMO === '1') {
  const demo = path.resolve(__dirname, '../frontend/src/demo')
  const reemplazos = {
    [path.resolve(__dirname, 'src/lib/supabase.js')]: path.join(demo, 'supabaseDemo.js'),
    [path.resolve(__dirname, 'src/lib/api.js')]: path.join(demo, 'apiDemo.js'),
  }
  config.watchFolders = [compartida, demo]
  const resolverOriginal = config.resolver.resolveRequest
  config.resolver.resolveRequest = (contexto, pedido, plataforma) => {
    const resuelto = (resolverOriginal || contexto.resolveRequest)(contexto, pedido, plataforma)
    if (resuelto?.type === 'sourceFile' && reemplazos[resuelto.filePath]) {
      return { type: 'sourceFile', filePath: reemplazos[resuelto.filePath] }
    }
    return resuelto
  }
}

module.exports = config
