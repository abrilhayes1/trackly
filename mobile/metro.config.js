// La app usa la misma lógica que la web (urgencia, interés, plantillas): Metro tiene que poder leer
// frontend/src/lib, que está afuera de esta carpeta.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const compartida = path.resolve(__dirname, '../frontend/src/lib')

config.watchFolders = [compartida]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]

module.exports = config
