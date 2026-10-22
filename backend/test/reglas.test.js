// Reglas de validación y armado de datos del backend (sin base de datos).
const test = require('node:test');
const assert = require('node:assert/strict');
const { fechaValida, validarRecordatorio, ordenarRecordatorios } = require('../src/lib/recordatorios');
const { limpiarEmails } = require('../src/lib/configEquipo');
const { validarDefinicion } = require('../src/lib/reportes');
const { traducirErrorDeBase, lanzarSiError } = require('../src/lib/errores');

test('fechaValida acepta fechas reales y rechaza las imposibles', () => {
  assert.equal(fechaValida('2026-10-21'), true);
  assert.equal(fechaValida('2026-02-30'), false);
  assert.equal(fechaValida('21/10/2026'), false);
  assert.equal(fechaValida(undefined), false);
});

test('validarRecordatorio limpia los textos y exige hora, contacto y fecha', () => {
  const { valores } = validarRecordatorio({ hora: '17:30', contacto: '  Ana  ', nota: '   ', fecha: '2026-10-21' });
  assert.deepEqual(valores, { hora: '17:30', contacto: 'Ana', nota: null, fecha: '2026-10-21' });
  assert.match(validarRecordatorio({ hora: '25:00', contacto: 'Ana', fecha: '2026-10-21' }).error, /hora/);
  assert.match(validarRecordatorio({ hora: '10:00', contacto: ' ', fecha: '2026-10-21' }).error, /contacto/);
  assert.match(validarRecordatorio({ hora: '10:00', contacto: 'Ana', fecha: 'mañana' }).error, /fecha/);
});

test('ordenarRecordatorios ordena por fecha y hora, y los sin hora van al final del día', () => {
  const lista = [
    { fecha: '2026-10-22', hora: '09:00' },
    { fecha: '2026-10-21', hora: null },
    { fecha: '2026-10-21', hora: '18:00' },
    { fecha: '2026-10-21', hora: '08:00' },
  ].sort(ordenarRecordatorios);
  assert.deepEqual(
    lista.map((r) => `${r.fecha} ${r.hora}`),
    ['2026-10-21 08:00', '2026-10-21 18:00', '2026-10-21 null', '2026-10-22 09:00'],
  );
});

test('limpiarEmails pasa a minúsculas, saca repetidos y rechaza los inválidos', () => {
  assert.deepEqual(limpiarEmails([' Ana@Mail.com ', 'ana@mail.com', 'pedro@mail.com']), ['ana@mail.com', 'pedro@mail.com']);
  assert.deepEqual(limpiarEmails(undefined), []);
  assert.throws(() => limpiarEmails(['no-es-un-email']), /no es válido/);
  assert.throws(() => limpiarEmails('ana@mail.com'), /lista/);
});

test('validarDefinicion de un reporte exige medida, agrupación y vista válidas', () => {
  const base = { medida: 'cantidad', agrupar: 'origen', vista: 'barras', filtros: { dias: 30, estados: [] } };
  assert.doesNotThrow(() => validarDefinicion(base));
  assert.throws(() => validarDefinicion({ ...base, medida: 'cualquiera' }), /qué medir/);
  assert.throws(() => validarDefinicion({ ...base, vista: 'torta3d' }), /cómo ver/);
  assert.throws(() => validarDefinicion({ ...base, medida: 'suma_campo' }), /campo del cierre/);
  assert.throws(() => validarDefinicion([]), /no es válida/);
});

test('los errores técnicos de la base llegan en castellano y con el código HTTP correcto', (t) => {
  // el servidor anota los errores técnicos; en el test no hace falta verlos
  t.mock.method(console, 'error', () => {});

  const propio = traducirErrorDeBase({ code: '42501', message: 'Solo el líder puede reasignar leads' });
  assert.equal(propio.status, 403);
  assert.equal(propio.message, 'Solo el líder puede reasignar leads');

  const rls = traducirErrorDeBase({ code: '42501', message: 'new row violates row-level security policy for table "leads"' });
  assert.equal(rls.status, 403);
  assert.equal(rls.message, 'No tenés permiso para hacer esto.');

  assert.equal(traducirErrorDeBase({ code: '23505', message: 'duplicate key value violates unique constraint' }).status, 409);
  assert.equal(traducirErrorDeBase({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }).status, 404);
  assert.equal(traducirErrorDeBase({ message: 'TypeError: fetch failed' }).status, 503);
  assert.doesNotThrow(() => lanzarSiError(null));
});

test('plantillas: valida nombre, texto y canal antes de guardar', async () => {
  const plantillas = require('../src/services/plantillasService');
  const guardado = [];
  const supabase = {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: { tenant_id: 't1' }, error: null }),
        insert: (fila) => {
          guardado.push(fila);
          return { select: () => ({ single: async () => ({ data: fila, error: null }) }) };
        },
      };
      return q;
    },
  };
  const creada = await plantillas.crear(
    supabase,
    { id: 'u1' },
    { nombre: ' Hola ', texto: ' Hola {nombre} ', canal: 'whatsapp', asunto: 'x' },
  );
  assert.deepEqual(creada, {
    nombre: 'Hola',
    texto: 'Hola {nombre}',
    asunto: null,
    canal: 'whatsapp',
    compartida: false,
    tenant_id: 't1',
    creado_por: 'u1',
  });
  await assert.rejects(plantillas.crear(supabase, { id: 'u1' }, { nombre: '', texto: 'x' }), /nombre/);
  await assert.rejects(plantillas.crear(supabase, { id: 'u1' }, { nombre: 'x', texto: '   ' }), /texto/);
  const conCanalRaro = await plantillas.crear(supabase, { id: 'u1' }, { nombre: 'x', texto: 'y', canal: 'sms' });
  assert.equal(conCanalRaro.canal, 'ambos');
});
