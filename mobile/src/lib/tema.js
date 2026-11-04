// Los mismos colores que la web (frontend/src/index.css), en claro y oscuro, y la letra Inter.
import { createContext, useContext } from 'react'

export const CLARO = {
  fondoApp: '#e8e6df',
  fondo: '#ffffff',
  fondo2: '#f7f6f2',
  fondo3: '#f1efe8',
  texto: '#2c2c2a',
  texto2: '#6b6a65',
  texto3: '#9b9a94',
  borde: '#e5e3dc',
  borde2: '#cfcdc4',
  borde3: '#b0aea4',
  acento: '#534ab7',
  acentoOscuro: '#3c3489',
  acentoTexto: '#3c3489',
  overlay: 'rgba(44, 44, 42, 0.35)',
  verdeFondo: '#e1f5ee',
  verdeTexto: '#085041',
  verdeBorde: '#1d9e75',
  limaFondo: '#eaf3de',
  limaTexto: '#27500a',
  limaBorde: '#639922',
  ambarFondo: '#faeeda',
  ambarTexto: '#633806',
  ambarBorde: '#ba7517',
  rojoFondo: '#fcebeb',
  rojoTexto: '#791f1f',
  rojoBorde: '#e24b4a',
  violetaFondo: '#eeedfe',
  violetaTexto: '#3c3489',
  violetaBorde: '#7f77dd',
  puntoRojo: '#e24b4a',
  puntoAmbar: '#ef9f27',
  puntoAzul: '#378add',
  urgenteRojo: '#a32d2d',
  urgenteAmbar: '#854f0b',
  urgenteAzul: '#185fa5',
  avatarFondo: '#e6f1fb',
  avatarTexto: '#0c447c',
}

export const OSCURO = {
  fondoApp: '#121211',
  fondo: '#1c1c1a',
  fondo2: '#242422',
  fondo3: '#2e2d2a',
  texto: '#eceae3',
  texto2: '#a9a79f',
  texto3: '#7a7871',
  borde: '#33322e',
  borde2: '#46443f',
  borde3: '#5e5c55',
  acento: '#7369dd',
  acentoOscuro: '#5f55cc',
  acentoTexto: '#b7b1f5',
  overlay: 'rgba(0, 0, 0, 0.62)',
  verdeFondo: '#12302a',
  verdeTexto: '#84d9bb',
  verdeBorde: '#1d9e75',
  limaFondo: '#222e19',
  limaTexto: '#aed384',
  limaBorde: '#639922',
  ambarFondo: '#372912',
  ambarTexto: '#f0c67f',
  ambarBorde: '#ba7517',
  rojoFondo: '#3a1d1d',
  rojoTexto: '#f3a7a7',
  rojoBorde: '#e24b4a',
  violetaFondo: '#29264d',
  violetaTexto: '#c5c0f8',
  violetaBorde: '#8c85e6',
  puntoRojo: '#ec5e5d',
  puntoAmbar: '#f2a93a',
  puntoAzul: '#4c9bea',
  urgenteRojo: '#f08a8a',
  urgenteAmbar: '#eab55a',
  urgenteAzul: '#82b8f0',
  avatarFondo: '#1e3248',
  avatarTexto: '#a8cdf3',
}

export const LETRA = {
  normal: 'Inter_400Regular',
  media: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
}

// colores de cada nivel de interés (igual que lib/interes.js de la web)
export function colorInteres(c, interes) {
  return (
    {
      muy_interesado: [c.verdeFondo, c.verdeTexto, c.verdeBorde],
      interesado: [c.limaFondo, c.limaTexto, c.limaBorde],
      duda: [c.ambarFondo, c.ambarTexto, c.ambarBorde],
      poco_interesado: [c.fondo3, c.texto, c.borde3],
      frio: [c.fondo3, c.texto2, c.borde3],
      no_interesado: [c.rojoFondo, c.rojoTexto, c.rojoBorde],
    }[interes] || [c.fondo3, c.texto, c.borde3]
  )
}

export const TemaContext = createContext({ c: CLARO, oscuro: false })
export const useTema = () => useContext(TemaContext)
