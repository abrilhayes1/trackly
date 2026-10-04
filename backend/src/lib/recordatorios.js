const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// "2026-10-05" válida de verdad (rechaza 2026-02-30, por ejemplo)
function fechaValida(texto) {
  if (typeof texto !== 'string' || !FECHA.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  return f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia;
}

// Valida lo que manda el usuario y devuelve { valores } o { error }
function validarRecordatorio(body) {
  if (!HORA.test(String(body.hora ?? ''))) {
    return { error: 'Elegí una hora válida (por ejemplo 17:30)' };
  }

  const contacto = typeof body.contacto === 'string' ? body.contacto.trim() : '';
  if (!contacto) return { error: 'Indicá el nombre o el contacto' };
  if (contacto.length > 120) {
    return { error: 'El nombre o contacto es demasiado largo (máximo 120 caracteres)' };
  }

  const nota = typeof body.nota === 'string' ? body.nota.trim() : '';
  if (nota.length > 200) return { error: 'La nota es demasiado larga (máximo 200 caracteres)' };

  if (!fechaValida(body.fecha)) return { error: 'La fecha no es válida' };

  return { valores: { hora: body.hora, contacto, nota: nota || null, fecha: body.fecha } };
}

// por fecha y después por hora (los que no tienen hora, al final)
function ordenarRecordatorios(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  if (a.hora === b.hora) return 0;
  if (!a.hora) return 1;
  if (!b.hora) return -1;
  return a.hora < b.hora ? -1 : 1;
}

module.exports = { fechaValida, validarRecordatorio, ordenarRecordatorios };
