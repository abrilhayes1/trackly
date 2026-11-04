// Piezas de los formularios: campo de texto, botones, chips, avisos y elegir día y hora
import { TextInput, View } from 'react-native'
import { LETRA, useTema } from '../lib/tema'
import Texto from './Texto'
import Presionable from './Presionable'

export function Etiqueta({ children, style }) {
  const { c } = useTema()
  return (
    <Texto peso="media" tamano={13} color={c.texto2} style={[{ marginBottom: 6 }, style]}>
      {children}
    </Texto>
  )
}

export function Campo({ style, multiline, ...props }) {
  const { c } = useTema()
  return (
    <TextInput
      placeholderTextColor={c.texto3}
      multiline={multiline}
      {...props}
      style={[
        {
          fontFamily: LETRA.normal,
          fontSize: 15,
          color: c.texto,
          backgroundColor: c.fondo2,
          borderColor: c.borde2,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          minHeight: multiline ? 88 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  )
}

export function Boton({ texto, onPress, tipo = 'primario', disabled, style, color }) {
  const { c } = useTema()
  const estilos = {
    primario: { fondo: color || c.acento, texto: '#fff', borde: color || c.acento },
    secundario: { fondo: c.fondo, texto: c.texto, borde: c.borde2 },
  }[tipo]
  return (
    <Presionable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          height: 50,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: estilos.fondo,
          borderColor: estilos.borde,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Texto peso="semi" tamano={15} color={estilos.texto}>
        {texto}
      </Texto>
    </Presionable>
  )
}

// chip que se elige (origen, motivo, día, interés...)
export function Chip({ texto, elegido, onPress, colores, disabled }) {
  const { c } = useTema()
  const [fondo, color, borde] = colores || [c.violetaFondo, c.violetaTexto, c.violetaBorde]
  return (
    <Presionable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: elegido ? fondo : c.fondo,
        borderColor: elegido ? borde : c.borde2,
      }}
    >
      <Texto peso={elegido ? 'semi' : 'media'} tamano={14} color={elegido ? color : c.texto}>
        {texto}
      </Texto>
    </Presionable>
  )
}

export function Aviso({ texto, tipo = 'error', style }) {
  const { c } = useTema()
  if (!texto) return null
  const [fondo, color, borde] = tipo === 'ok' ? [c.verdeFondo, c.verdeTexto, c.verdeBorde] : [c.rojoFondo, c.rojoTexto, c.rojoBorde]
  return (
    <View style={[{ backgroundColor: fondo, borderColor: borde, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 }, style]}>
      <Texto tamano={13} color={color}>
        {texto}
      </Texto>
    </View>
  )
}
