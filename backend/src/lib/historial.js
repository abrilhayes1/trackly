const ETIQUETA_INTERES = {
  muy_interesado: 'Muy interesado',
  interesado: 'Interesado',
  duda: 'Duda',
  poco_interesado: 'Poco interesado',
  frio: 'Frío',
  no_interesado: 'No interesado',
};

const ZONA = 'America/Argentina/Buenos_Aires';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Formato fijo ("5 oct 2026 · 14:30"): estos textos quedan guardados para siempre,
// así que no dependemos del idioma ni de la versión de Node del servidor.
function partes(iso) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(new Date(iso))
    .forEach((x) => {
      p[x.type] = x.value;
    });
  return p;
}

function fecha(iso) {
  const p = partes(iso);
  return `${Number(p.day)} ${MESES[Number(p.month) - 1]} ${p.year}`;
}

function fechaHora(iso) {
  const p = partes(iso);
  return `${fecha(iso)} · ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

function mismoInstante(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

// Compara el lead antes del cambio con los cambios pedidos y arma
// los textos que se guardan solos en el historial (RNF09: trazabilidad).
function construirEntradasHistorial(antes, cambios) {
  const entradas = [];

  if ('interes' in cambios && cambios.interes !== antes.interes) {
    entradas.push(
      cambios.interes
        ? `Categorizado como ${ETIQUETA_INTERES[cambios.interes]}.`
        : 'Se quitó la categoría de interés.'
    );
  }

  if (
    'ultimo_contacto' in cambios &&
    cambios.ultimo_contacto &&
    !mismoInstante(cambios.ultimo_contacto, antes.ultimo_contacto)
  ) {
    entradas.push(`Último contacto registrado: ${fecha(cambios.ultimo_contacto)}.`);
  }

  if ('recordatorio' in cambios && !mismoInstante(cambios.recordatorio, antes.recordatorio)) {
    entradas.push(
      cambios.recordatorio
        ? `Recordatorio programado para el ${fechaHora(cambios.recordatorio)}.`
        : 'Se quitó el recordatorio.'
    );
  }

  if ('estado' in cambios && cambios.estado !== antes.estado) {
    entradas.push(`Estado cambiado a ${cambios.estado}.`);
  }

  if ('telefono' in cambios && cambios.telefono !== antes.telefono) {
    entradas.push('Se actualizó el teléfono.');
  }

  if ('email' in cambios && cambios.email !== antes.email) {
    entradas.push('Se actualizó el email.');
  }

  if ('consulta' in cambios && cambios.consulta !== antes.consulta) {
    entradas.push('Se editó la consulta.');
  }

  return entradas;
}

module.exports = { ETIQUETA_INTERES, construirEntradasHistorial };