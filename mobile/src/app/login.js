// Login (RF41): las mismas cuentas que la web, con email y contraseña.
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { LETRA, useTema } from '../lib/tema'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Icono from '../components/Icono'

const WEB = 'https://trackly-six-delta.vercel.app'

export default function Login() {
  const { c, oscuro } = useTema()
  const arriba = useSafeAreaInsets().top
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  async function ingresar() {
    setError(null)
    setAviso(null)
    if (!email.trim() || !password) return setError('Completá el email y la contraseña.')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setEnviando(false)
    if (error) setError(/invalid login/i.test(error.message) ? 'El email o la contraseña no son correctos.' : error.message)
  }

  // el enlace lleva a la web para elegir la contraseña nueva (después sirve también acá)
  async function recuperar() {
    setError(null)
    if (!email.trim()) return setError('Escribí tu email y tocá de nuevo "¿Olvidaste tu contraseña?".')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: WEB })
    if (error) return setError(/rate limit/i.test(error.message) ? 'Se mandaron demasiados emails. Probá en un rato.' : error.message)
    setAviso('Si hay una cuenta con ese email, te llegó un enlace para elegir una contraseña nueva.')
  }

  const campo = {
    fontFamily: LETRA.normal,
    fontSize: 15,
    color: c.texto,
    backgroundColor: c.fondo,
    borderColor: c.borde2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo2 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: arriba + 56 }} keyboardShouldPersistTaps="handled">
        <Image
          source={oscuro ? require('../../assets/images/trackly-logo-oscuro.png') : require('../../assets/images/trackly-logo.png')}
          accessibilityLabel="Trackly"
          style={{ width: 160, height: 35, marginBottom: 40 }}
          resizeMode="contain"
        />

        <Texto peso="negrita" tamano={30} style={{ lineHeight: 36, letterSpacing: -0.6 }}>
          Tus leads urgentes,{'\n'}siempre a mano.
        </Texto>
        <Texto tamano={15} color={c.texto2} style={{ marginTop: 10, lineHeight: 22 }}>
          Entrá con la cuenta de tu equipo para ver qué tenés que atender hoy.
        </Texto>

        <View style={{ flex: 1, minHeight: 48 }} />

        <Texto peso="media" tamano={13} color={c.texto2} style={{ marginBottom: 6 }}>
          Email
        </Texto>
        <TextInput
          style={campo}
          value={email}
          onChangeText={setEmail}
          placeholder="nombre@empresa.com"
          placeholderTextColor={c.texto3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14, marginBottom: 6 }}>
          <Texto peso="media" tamano={13} color={c.texto2}>
            Contraseña
          </Texto>
          <Presionable onPress={recuperar} hitSlop={8}>
            <Texto peso="media" tamano={12} color={c.acento}>
              ¿Olvidaste tu contraseña?
            </Texto>
          </Presionable>
        </View>
        <View>
          <TextInput
            style={[campo, { paddingRight: 48 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!ver}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={ingresar}
          />
          <Presionable
            onPress={() => setVer(!ver)}
            accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{ position: 'absolute', right: 0, top: 0, height: 50, width: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icono nombre={ver ? 'ojoTachado' : 'ojo'} tamano={18} color={c.texto3} />
          </Presionable>
        </View>

        {error && (
          <View
            style={{ backgroundColor: c.rojoFondo, borderColor: c.rojoBorde, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14 }}
          >
            <Texto tamano={13} color={c.rojoTexto}>
              {error}
            </Texto>
          </View>
        )}
        {aviso && (
          <View
            style={{
              backgroundColor: c.verdeFondo,
              borderColor: c.verdeBorde,
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              marginTop: 14,
            }}
          >
            <Texto tamano={13} color={c.verdeTexto}>
              {aviso}
            </Texto>
          </View>
        )}

        <Presionable
          onPress={ingresar}
          disabled={enviando}
          style={{ backgroundColor: c.acento, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}
        >
          <Texto peso="semi" tamano={16} color="#fff">
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </Texto>
        </Presionable>
        <Texto tamano={12} color={c.texto3} style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
          ¿Todavía no tenés equipo? Crealo desde la web.
        </Texto>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
