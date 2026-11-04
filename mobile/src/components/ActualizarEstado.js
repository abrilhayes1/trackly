// "Actualizar estado" (RF44): registrar un contacto (y programar el próximo) o cerrar el lead como
// ganado (con los campos que definió el equipo) o perdido (con su motivo). Mismas reglas que la web.
import { useState } from 'react'
import { View } from 'react-native'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { etiquetaProximo, fechaLocal, fechaProximoContacto } from '../lib/compartido'
import Hoja from './Hoja'
import Texto from './Texto'
import Presionable from './Presionable'
import ElegirFechaHora, { HORA_VALIDA } from './ElegirFechaHora'
import { Aviso, Boton, Campo, Chip, Etiqueta } from './Formulario'

function Opcion({ titulo, sub, elegida, onPress, color }) {
  const { c } = useTema()
  return (
    <Presionable
      escala={0.98}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 14,
        borderWidth: elegida ? 2 : 1,
        borderColor: elegida ? color : c.borde2,
        backgroundColor: elegida ? c.fondo2 : c.fondo,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: elegida ? color : c.borde3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {elegida && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Texto peso="semi" tamano={16}>
          {titulo}
        </Texto>
        <Texto tamano={13} color={c.texto2} style={{ marginTop: 2 }}>
          {sub}
        </Texto>
      </View>
    </Presionable>
  )
}

export default function ActualizarEstado({ lead, visible, onCerrar, onListo }) {
  const { c } = useTema()
  const { config, preferencias } = useSesion()
  const [tipo, elegirTipo] = useState('contacto')
  const [proximo, setProximo] = useState(null) // null | { fecha, hora } | 'elegir'
  const [fecha, setFecha] = useState(fechaLocal())
  const [hora, setHora] = useState('')
  const [datos, setDatos] = useState({})
  const [motivo, setMotivo] = useState('')
  const [otro, setOtro] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const campos = config?.campos_cierre || []
  // al cambiar de opción, el aviso de la anterior ya no aplica
  const setTipo = (t) => {
    setError(null)
    elegirTipo(t)
  }
  const motivos = config?.motivos_perdida || []

  async function guardar(cerrar) {
    setError(null)
    let cuerpo, ruta, metodo
    if (tipo === 'contacto') {
      cuerpo = { ultimo_contacto: new Date().toISOString() }
      if (proximo === 'elegir') {
        if (!HORA_VALIDA.test(hora)) return setError('Elegí la hora del próximo contacto (por ejemplo 17:30).')
        const [a, m, d] = fecha.split('-').map(Number)
        const [h, mi] = hora.split(':').map(Number)
        cuerpo.recordatorio = new Date(a, m - 1, d, h, mi).toISOString()
      } else if (proximo) {
        cuerpo.recordatorio = proximo
      }
      ruta = `/api/leads/${lead.id}`
      metodo = 'PATCH'
    } else {
      if (tipo === 'ganado') {
        const falta = campos.find((x) => x.obligatorio && !String(datos[x.id] || '').trim())
        if (falta) return setError(`Completá "${falta.nombre}".`)
        const malNumero = campos.find(
          (x) => x.tipo === 'numero' && String(datos[x.id] || '').trim() && Number.isNaN(Number(String(datos[x.id]).replace(',', '.'))),
        )
        if (malNumero) return setError(`"${malNumero.nombre}" tiene que ser un número.`)
      }
      cuerpo = tipo === 'ganado' ? { tipo, datos } : { tipo, motivo }
      ruta = `/api/cierres/${lead.id}`
      metodo = 'PUT'
    }
    setGuardando(true)
    try {
      const respuesta = await apiFetch(ruta, { method: metodo, body: JSON.stringify(cuerpo) })
      onListo(tipo === 'contacto' ? respuesta : { estado: tipo })
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo="Actualizar estado"
      subtitulo={`${lead.nombre} · ¿Qué pasó con este lead?`}
      pie={(cerrar) => (
        <Boton
          texto={guardando ? 'Guardando...' : 'Guardar'}
          disabled={guardando}
          color={tipo === 'ganado' ? c.verdeBorde : tipo === 'perdido' ? c.urgenteRojo : undefined}
          onPress={() => guardar(cerrar)}
        />
      )}
    >
      <Opcion
        titulo="Registrar contacto"
        sub="Sigue activo y se reinicia el contador de días"
        elegida={tipo === 'contacto'}
        onPress={() => setTipo('contacto')}
        color={c.acento}
      />
      <Opcion
        titulo="Ganado"
        sub="Se concretó la venta o inscripción"
        elegida={tipo === 'ganado'}
        onPress={() => setTipo('ganado')}
        color={c.verdeBorde}
      />
      <Opcion
        titulo="Perdido"
        sub="No avanza; queda registrado el motivo"
        elegida={tipo === 'perdido'}
        onPress={() => setTipo('perdido')}
        color={c.urgenteRojo}
      />

      {tipo === 'contacto' && (
        <View style={{ marginTop: 10 }}>
          <Etiqueta>Próximo contacto (opcional)</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {preferencias.proximosDias.map((d) => {
              const valor = fechaProximoContacto(d, new Date(), preferencias.horaRecordatorios)
              const elegido = proximo && proximo !== 'elegir' && new Date(proximo).toDateString() === new Date(valor).toDateString()
              return <Chip key={d} texto={etiquetaProximo(d)} elegido={elegido} onPress={() => setProximo(elegido ? null : valor)} />
            })}
            <Chip texto="Elegir fecha" elegido={proximo === 'elegir'} onPress={() => setProximo(proximo === 'elegir' ? null : 'elegir')} />
          </View>
          {proximo === 'elegir' && (
            <View style={{ marginTop: 14 }}>
              <ElegirFechaHora fecha={fecha} hora={hora} onFecha={setFecha} onHora={setHora} />
            </View>
          )}
        </View>
      )}

      {tipo === 'ganado' && (
        <View style={{ marginTop: 10 }}>
          {campos.length === 0 && (
            <Texto tamano={13} color={c.texto3}>
              Tu equipo no tiene campos de cierre: se registra solo como ganado.
            </Texto>
          )}
          {campos.map((x) => (
            <View key={x.id} style={{ marginBottom: 14 }}>
              <Etiqueta>
                {x.nombre}
                {x.obligatorio ? ' *' : ' (opcional)'}
              </Etiqueta>
              {x.tipo === 'lista' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(x.opciones || []).map((o) => (
                    <Chip
                      key={o}
                      texto={o}
                      elegido={datos[x.id] === o}
                      colores={[c.verdeFondo, c.verdeTexto, c.verdeBorde]}
                      onPress={() => setDatos({ ...datos, [x.id]: datos[x.id] === o ? '' : o })}
                    />
                  ))}
                </View>
              ) : (
                <Campo
                  value={datos[x.id] || ''}
                  onChangeText={(v) => setDatos({ ...datos, [x.id]: v })}
                  keyboardType={x.tipo === 'numero' ? 'decimal-pad' : 'default'}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {tipo === 'perdido' && (
        <View style={{ marginTop: 10 }}>
          <Etiqueta>Motivo (opcional)</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {motivos.map((m) => {
              const elegido = !otro && motivo === m
              return (
                <Chip
                  key={m}
                  texto={m}
                  elegido={elegido}
                  colores={[c.rojoFondo, c.rojoTexto, c.rojoBorde]}
                  onPress={() => {
                    setOtro(false)
                    setMotivo(elegido ? '' : m)
                  }}
                />
              )
            })}
            <Chip
              texto="Otro"
              elegido={otro}
              colores={[c.rojoFondo, c.rojoTexto, c.rojoBorde]}
              onPress={() => {
                setOtro(true)
                if (motivos.includes(motivo)) setMotivo('')
              }}
            />
          </View>
          {(otro || motivos.length === 0) && (
            <Campo
              multiline
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej: eligió otra institución"
              style={{ marginTop: 10 }}
              autoFocus={otro}
            />
          )}
        </View>
      )}
      <Aviso texto={error} />
    </Hoja>
  )
}
