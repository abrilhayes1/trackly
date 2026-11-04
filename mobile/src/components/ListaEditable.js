// Lista de textos que se agregan y se quitan (categorías de origen, motivos de pérdida, opciones)
import { useState } from 'react'
import { View } from 'react-native'
import { useTema } from '../lib/tema'
import Texto from './Texto'
import Presionable from './Presionable'
import Icono from './Icono'
import { Campo } from './Formulario'

export default function ListaEditable({ valores, onCambio, placeholder, maximo = 30 }) {
  const { c } = useTema()
  const [nuevo, setNuevo] = useState('')
  const agregar = () => {
    const v = nuevo.trim()
    if (!v || valores.some((x) => x.toLowerCase() === v.toLowerCase()) || valores.length >= maximo) return setNuevo('')
    onCambio([...valores, v])
    setNuevo('')
  }
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: valores.length ? 10 : 0 }}>
        {valores.map((v) => (
          <Presionable
            key={v}
            onPress={() => onCambio(valores.filter((x) => x !== v))}
            accessibilityLabel={`Quitar ${v}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c.borde2,
              backgroundColor: c.fondo2,
              paddingLeft: 12,
              paddingRight: 8,
              paddingVertical: 6,
            }}
          >
            <Texto tamano={14}>{v}</Texto>
            <Icono nombre="cerrar" tamano={12} color={c.texto3} />
          </Presionable>
        ))}
      </View>
      <Campo
        value={nuevo}
        onChangeText={setNuevo}
        placeholder={placeholder}
        onSubmitEditing={agregar}
        onBlur={agregar}
        returnKeyType="done"
      />
    </View>
  )
}
