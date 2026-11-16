// Configuración de Expo: es la de app.json. Solo para el prototipo (npm run prototipo) la app vive en
// /prototipo-mobile, dentro de la web publicada en Vercel.
module.exports = ({ config }) =>
  process.env.EXPO_PUBLIC_DEMO === '1' ? { ...config, experiments: { ...config.experiments, baseUrl: '/prototipo-mobile' } } : config
