const MODALIDADES = ['presencial', 'virtual', 'hibrida'];
const DESCUENTOS = [0, 20, 30, 50, 70];
const ETIQUETA_MODALIDAD = { presencial: 'Presencial', virtual: 'Virtual', hibrida: 'Híbrida' };

function aNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

// Valida lo que manda el usuario y devuelve { valores } listos para guardar, o { error }.
// En un cierre perdido solo se guarda el motivo; en uno ganado, solo los datos de la venta.
function validarCierre(body) {
  const tipo = body.tipo;
  if (tipo !== 'ganado' && tipo !== 'perdido') {
    return { error: 'El tipo de cierre tiene que ser "ganado" o "perdido"' };
  }

  if (tipo === 'perdido') {
    const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
    if (motivo.length > 500) {
      return { error: 'El motivo es demasiado largo (máximo 500 caracteres)' };
    }
    return {
      valores: { tipo, producto: null, modalidad: null, descuento: null, importe: null, motivo: motivo || null },
    };
  }

  const producto = typeof body.producto === 'string' ? body.producto.trim() : '';
  if (!producto) return { error: 'Indicá la carrera o el producto vendido' };
  if (producto.length > 120) return { error: 'El nombre de la carrera o producto es demasiado largo' };

  if (!MODALIDADES.includes(body.modalidad)) {
    return { error: 'Elegí una modalidad válida (presencial, virtual o híbrida)' };
  }

  const descuento = aNumero(body.descuento);
  if (!DESCUENTOS.includes(descuento)) {
    return { error: 'El descuento tiene que ser 0, 20, 30, 50 o 70' };
  }

  const importe = aNumero(body.importe);
  if (!Number.isFinite(importe) || importe < 0 || importe > 999999999) {
    return { error: 'Ingresá un importe válido' };
  }

  return {
    valores: {
      tipo,
      producto,
      modalidad: body.modalidad,
      descuento,
      importe: Math.round(importe * 100) / 100,
      motivo: null,
    },
  };
}

// 15000 -> "15.000" ; 15000.5 -> "15.000,50" (sin depender del idioma del servidor)
function formatearImporte(numero) {
  const [entera, decimales] = Number(numero).toFixed(2).split('.');
  const conPuntos = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimales === '00' ? conPuntos : `${conPuntos},${decimales}`;
}

// Texto que queda en el historial del lead (RF14: todo cierre queda asentado)
function textoHistorial(tipoAnterior, v) {
  let detalle;
  if (v.tipo === 'ganado') {
    const descuento = v.descuento === 0 ? 'sin descuento' : `${v.descuento}% de descuento`;
    detalle = `${v.producto} · ${ETIQUETA_MODALIDAD[v.modalidad]} · ${descuento} · importe $${formatearImporte(v.importe)}`;
  } else {
    detalle = v.motivo ? `motivo: ${v.motivo}` : '';
  }

  let inicio;
  if (!tipoAnterior) inicio = `Cerrado como ${v.tipo}`;
  else if (tipoAnterior !== v.tipo) inicio = `Cierre cambiado de ${tipoAnterior} a ${v.tipo}`;
  else inicio = `Cierre ${v.tipo} modificado`;

  return detalle ? `${inicio}: ${detalle}.` : `${inicio}.`;
}

module.exports = { validarCierre, formatearImporte, textoHistorial };
