-- Cierres de ejemplo para los dos leads cerrados del seed (Fernández y Acosta)
insert into cierres (lead_id, tenant_id, tipo, producto, modalidad, descuento, importe, motivo, cerrado_por)
select l.id, l.tenant_id, 'ganado', 'Diseño gráfico', 'presencial', 20, 15000, null, l.asesor_id
from leads l
where l.nombre = 'Fernández, Julieta' and l.estado = 'ganado'
on conflict (lead_id) do nothing;

insert into cierres (lead_id, tenant_id, tipo, producto, modalidad, descuento, importe, motivo, cerrado_por)
select l.id, l.tenant_id, 'perdido', null, null, null, null, 'Le quedaba lejos la sede', l.asesor_id
from leads l
where l.nombre = 'Acosta, Tomás' and l.estado = 'perdido'
on conflict (lead_id) do nothing;
