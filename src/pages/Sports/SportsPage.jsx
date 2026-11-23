import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Edit2,
  Link2,
  Plus,
  Search,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  contratosApi,
  deportesApi,
  equiposApi,
  equiposDeportesApi,
  habilidadesApi,
  habilidadesJugadoresApi,
  jugadoresApi,
} from '../../api/client';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

const tabs = [
  { id: 'deportes', label: 'Deportes', icon: Trophy },
  { id: 'equipos', label: 'Equipos', icon: Users },
  { id: 'jugadores', label: 'Jugadores', icon: UserRound },
  { id: 'habilidades', label: 'Habilidades', icon: Activity },
  { id: 'asociaciones', label: 'Asociaciones', icon: Link2 },
  { id: 'perfil', label: 'Perfil deportivo', icon: Search },
];

export default function SportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('deportes');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deportes, setDeportes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [equipoDeportes, setEquipoDeportes] = useState([]);
  const [habilidadJugadores, setHabilidadJugadores] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ isOpen: false, onConfirm: () => {} });
  const [selectedJugador, setSelectedJugador] = useState('');
  const [perfil, setPerfil] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [ds, es, js, hs, ed, hj, cs] = await Promise.all([
        deportesApi.getAll(),
        equiposApi.getAll(),
        jugadoresApi.getAll(),
        habilidadesApi.getAll(),
        equiposDeportesApi.getAll(),
        habilidadesJugadoresApi.getAll(),
        contratosApi.getAll().catch(() => []),
      ]);
      setDeportes(ds || []);
      setEquipos(es || []);
      setJugadores(js || []);
      setHabilidades(hs || []);
      setEquipoDeportes(ed || []);
      setHabilidadJugadores(hj || []);
      setContratos(cs || []);
    } catch (error) {
      showToast(error.message || 'Error al cargar Gestion Deportiva', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = (type) => {
    const defaults = {
      deporte: { nombre: '', descripcion: '', esColectivo: true, minJugadores: 1, maxJugadores: 1, activo: true, deportePadreId: null },
      equipo: { nombre: '', siglas: '', fechaFundacion: '', ciudad: '', pais: '', activo: true },
      jugador: { nombres: '', apellidos: '', identificacion: '', numeroCamiseta: 1, nacionalidad: '', activo: true },
      habilidad: { nombre: '', descripcion: '', activa: true },
      equipoDeporte: { equipoId: '', deporteId: '', fechaInscripcion: '', entrenador: '', categoria: '' },
      habilidadJugador: { jugadorId: '', habilidadId: '', nivel: 1 },
      contrato: { jugadorId: '', equipoId: '', fechaInicio: '', fechaFin: '', numeroCamiseta: '', posicion: '', salario: 0, activo: true },
    };
    setForm(defaults[type]);
    setModal({ type, mode: 'create' });
  };

  const openEdit = (type, item) => {
    const mapped = {
      deporte: {
        nombre: item.nombre,
        descripcion: item.descripcion ?? '',
        esColectivo: item.esColectivo,
        minJugadores: item.minJugadores,
        maxJugadores: item.maxJugadores,
        activo: item.activo,
        deportePadreId: item.deportePadreId ?? item.deportePadre?.id ?? null,
        id: item.id,
      },
      equipo: item,
      jugador: item,
      habilidad: item,
      equipoDeporte: { ...item, equipoId: item.equipo?.id, deporteId: item.deporte?.id },
      habilidadJugador: { ...item, jugadorId: item.jugador?.id, habilidadId: item.habilidad?.id },
      contrato: { ...item, jugadorId: item.jugador?.id, equipoId: item.equipo?.id },
    };
    setForm(mapped[type]);
    setModal({ type, mode: 'edit' });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const { type, mode } = modal;
      const id = form.id;
      if (type === 'deporte') {
        const deportePayload = {
          nombre: form.nombre,
          descripcion: form.descripcion ?? '',
          esColectivo: form.esColectivo,
          minJugadores: Number(form.minJugadores),
          maxJugadores: Number(form.maxJugadores),
          activo: form.activo,
          deportePadreId: form.deportePadreId == null || form.deportePadreId === '' ? null : Number(form.deportePadreId),
        };
        mode === 'create'
          ? await deportesApi.create(deportePayload)
          : await deportesApi.update(id, deportePayload);
      }
      if (type === 'equipo') mode === 'create' ? await equiposApi.create(form) : await equiposApi.update(id, form);
      if (type === 'jugador') mode === 'create' ? await jugadoresApi.create(form) : await jugadoresApi.update(id, form);
      if (type === 'habilidad') mode === 'create' ? await habilidadesApi.create(form) : await habilidadesApi.update(id, form);
      if (type === 'equipoDeporte') mode === 'create' ? await equiposDeportesApi.create(form) : await equiposDeportesApi.update(id, form);
      if (type === 'habilidadJugador') mode === 'create' ? await habilidadesJugadoresApi.create(form) : await habilidadesJugadoresApi.update(id, form);
      if (type === 'contrato') mode === 'create' ? await contratosApi.create(form) : await contratosApi.update(id, form);
      showToast(mode === 'create' ? 'Registro creado correctamente' : 'Registro actualizado correctamente', 'success');
      setModal(null);
      await refresh();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (type, item) => {
    const names = {
      deporte: item.nombre,
      equipo: item.nombre,
      jugador: `${item.nombres} ${item.apellidos}`,
      habilidad: item.nombre,
      equipoDeporte: `la asociacion equipo-deporte #${item.id}`,
      habilidadJugador: `la habilidad asignada #${item.id}`,
      contrato: `el contrato #${item.id}`,
    };
    setConfirm({
      isOpen: true,
      title: 'Confirmar accion',
      message: `¿Desea eliminar ${names[type]}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (type === 'deporte') await deportesApi.delete(item.id);
          if (type === 'equipo') await equiposApi.delete(item.id);
          if (type === 'jugador') await jugadoresApi.delete(item.id);
          if (type === 'habilidad') await habilidadesApi.delete(item.id);
          if (type === 'equipoDeporte') await equiposDeportesApi.delete(item.id);
          if (type === 'habilidadJugador') await habilidadesJugadoresApi.delete(item.id);
          if (type === 'contrato') await contratosApi.delete(item.id);
          showToast('Registro eliminado o retirado correctamente', 'success');
          setConfirm((prev) => ({ ...prev, isOpen: false }));
          await refresh();
        } catch (error) {
          showToast(error.message || 'No se pudo eliminar el registro', 'error');
        }
      },
    });
  };

  const toggleActive = async (type, item) => {
    try {
      if (type === 'deporte') await deportesApi.update(item.id, { activo: !item.activo });
      if (type === 'equipo') await equiposApi.update(item.id, { activo: !item.activo });
      if (type === 'jugador') await jugadoresApi.update(item.id, { activo: !item.activo });
      if (type === 'habilidad') await habilidadesApi.update(item.id, { activa: !item.activa });
      showToast('Estado actualizado correctamente', 'success');
      await refresh();
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar el estado', 'error');
    }
  };

  const loadPerfil = async (id) => {
    if (!id) { setPerfil(null); return; }
    try {
      setPerfil(await jugadoresApi.getPerfil(Number(id)));
    } catch (error) {
      showToast(error.message || 'No se pudo consultar el perfil', 'error');
      setPerfil(null);
    }
  };

  const bySearch = (items, getText) => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((item) => getText(item).toLowerCase().includes(q)) : items;
  };

  const deporteRows = useMemo(() => bySearch(deportes, (d) => `${d.nombre} ${d.descripcion || ''}`), [deportes, search]);
  const equipoRows = useMemo(() => bySearch(equipos, (e) => `${e.nombre} ${e.siglas} ${e.ciudad} ${e.pais}`), [equipos, search]);
  const jugadorRows = useMemo(() => bySearch(jugadores, (j) => `${j.nombres} ${j.apellidos} ${j.identificacion || ''}`), [jugadores, search]);
  const habilidadRows = useMemo(() => bySearch(habilidades, (h) => `${h.nombre} ${h.descripcion || ''}`), [habilidades, search]);

  const actionButtons = (type, item) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <button className="btn-icon" title="Editar" onClick={() => openEdit(type, item)}><Edit2 size={16} color="#f59e0b" /></button>
      {['deporte', 'equipo', 'jugador', 'habilidad'].includes(type) && (
        <button className="btn-icon" title="Activar o desactivar" onClick={() => toggleActive(type, item)}>
          <Activity size={16} color={item.activo !== false && item.activa !== false ? '#22c55e' : '#94a3b8'} />
        </button>
      )}
      <button className="btn-icon" title="Eliminar o retirar" onClick={() => removeItem(type, item)}><Trash2 size={16} color="#ef4444" /></button>
    </div>
  );

  const columns = {
    deporte: [
      { key: 'nombre', label: 'Deporte', render: (d) => <strong style={{ color: '#fff' }}>{d.nombre}</strong> },
      { key: 'rango', label: 'Jugadores', render: (d) => `${d.minJugadores}-${d.maxJugadores}` },
      { key: 'tipo', label: 'Tipo', render: (d) => d.esColectivo ? 'Colectivo' : 'Individual' },
      { key: 'activo', label: 'Estado', render: (d) => d.activo ? 'Activo' : 'Inactivo' },
      { key: 'actions', label: 'Acciones', align: 'right', render: (d) => actionButtons('deporte', d) },
    ],
    equipo: [
      { key: 'nombre', label: 'Equipo', render: (e) => <strong style={{ color: '#fff' }}>{e.nombre}</strong> },
      { key: 'siglas', label: 'Siglas' },
      { key: 'ciudad', label: 'Ciudad', render: (e) => `${e.ciudad}, ${e.pais}` },
      { key: 'activo', label: 'Estado', render: (e) => e.activo ? 'Activo' : 'Inactivo' },
      { key: 'actions', label: 'Acciones', align: 'right', render: (e) => actionButtons('equipo', e) },
    ],
    jugador: [
      { key: 'nombres', label: 'Jugador', render: (j) => <strong style={{ color: '#fff' }}>{j.nombres} {j.apellidos}</strong> },
      { key: 'identificacion', label: 'Identificacion', render: (j) => j.identificacion || 'Sin identificacion' },
      { key: 'numeroCamiseta', label: 'Camiseta' },
      { key: 'activo', label: 'Estado', render: (j) => j.activo ? 'Activo' : 'Inactivo' },
      { key: 'actions', label: 'Acciones', align: 'right', render: (j) => actionButtons('jugador', j) },
    ],
    habilidad: [
      { key: 'nombre', label: 'Habilidad', render: (h) => <strong style={{ color: '#fff' }}>{h.nombre}</strong> },
      { key: 'descripcion', label: 'Descripcion', render: (h) => h.descripcion || 'Sin descripcion' },
      { key: 'activa', label: 'Estado', render: (h) => h.activa ? 'Activa' : 'Inactiva' },
      { key: 'actions', label: 'Acciones', align: 'right', render: (h) => actionButtons('habilidad', h) },
    ],
  };

  const field = (label, name, props = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
      {label}
      <input
        {...props}
        value={form[name] ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, [name]: props.type === 'number' ? Number(e.target.value) : props.type === 'checkbox' ? e.target.checked : e.target.value }))}
      />
    </label>
  );

  const selectField = (label, name, options, getValue = (o) => o.id, getLabel = (o) => o.nombre) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
      {label}
      <select value={form[name] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [name]: Number(e.target.value) }))}>
        <option value="">Seleccione...</option>
        {options.map((o) => <option key={getValue(o)} value={getValue(o)}>{getLabel(o)}</option>)}
      </select>
    </label>
  );

  const renderModal = () => {
    if (!modal) return null;
    const titles = { deporte: 'Deporte', equipo: 'Equipo', jugador: 'Jugador', habilidad: 'Habilidad', equipoDeporte: 'Asociacion equipo-deporte', habilidadJugador: 'Habilidad del jugador', contrato: 'Contrato jugador-equipo' };
    return (
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={`${modal.mode === 'create' ? 'Registrar' : 'Editar'} ${titles[modal.type]}`} maxWidth="620px"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <form id="sports-form" onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {modal.type === 'deporte' && <>
            {field('Nombre', 'nombre', { required: true, maxLength: 120 })}
            {selectField('Deporte padre', 'deportePadreId', deportes.filter((d) => d.id !== form.id), undefined, (d) => d.nombre)}
            {field('Jugadores minimos', 'minJugadores', { type: 'number', min: 1, required: true })}
            {field('Jugadores maximos', 'maxJugadores', { type: 'number', min: 1, required: true })}
            {field('Descripcion', 'descripcion', { style: { gridColumn: '1 / -1' } })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.esColectivo !== false} onChange={(e) => setForm((p) => ({ ...p, esColectivo: e.target.checked }))} /> Deporte colectivo</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Activo</label>
          </>}
          {modal.type === 'equipo' && <>
            {field('Nombre', 'nombre', { required: true })}
            {field('Siglas', 'siglas', { required: true, maxLength: 12 })}
            {field('Fecha de fundacion', 'fechaFundacion', { type: 'date', required: true })}
            {field('Ciudad', 'ciudad', { required: true })}
            {field('Pais', 'pais', { required: true })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Activo</label>
          </>}
          {modal.type === 'jugador' && <>
            {field('Nombres', 'nombres', { required: true })}
            {field('Apellidos', 'apellidos', { required: true })}
            {field('Identificacion', 'identificacion')}
            {field('Numero de camiseta', 'numeroCamiseta', { type: 'number', min: 1, required: true })}
            {field('Nacionalidad', 'nacionalidad')}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Activo</label>
          </>}
          {modal.type === 'habilidad' && <>
            {field('Nombre', 'nombre', { required: true })}
            {field('Descripcion', 'descripcion', { style: { gridColumn: '1 / -1' } })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activa !== false} onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))} /> Activa</label>
          </>}
          {modal.type === 'equipoDeporte' && <>
            {selectField('Equipo', 'equipoId', equipos, (e) => e.id, (e) => e.nombre)}
            {selectField('Deporte', 'deporteId', deportes, (d) => d.id, (d) => d.nombre)}
            {field('Fecha de inscripcion', 'fechaInscripcion', { type: 'date', required: true })}
            {field('Entrenador', 'entrenador')}
            {field('Categoria', 'categoria')}
          </>}
          {modal.type === 'habilidadJugador' && <>
            {selectField('Jugador', 'jugadorId', jugadores, (j) => j.id, (j) => `${j.nombres} ${j.apellidos}`)}
            {selectField('Habilidad', 'habilidadId', habilidades, (h) => h.id, (h) => h.nombre)}
            {field('Nivel', 'nivel', { type: 'number', min: 1, max: 100, required: true })}
          </>}
          {modal.type === 'contrato' && <>
            {selectField('Jugador', 'jugadorId', jugadores, (j) => j.id, (j) => `${j.nombres} ${j.apellidos}`)}
            {selectField('Equipo', 'equipoId', equipos, (e) => e.id, (e) => e.nombre)}
            {field('Fecha inicio', 'fechaInicio', { type: 'date', required: true })}
            {field('Fecha fin', 'fechaFin', { type: 'date' })}
            {field('Camiseta', 'numeroCamiseta', { type: 'number', min: 1 })}
            {field('Posicion', 'posicion')}
            {field('Salario', 'salario', { type: 'number', min: 0 })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Contrato activo</label>
          </>}
        </form>
      </Modal>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab !== 'asociaciones' && tab !== 'perfil' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 380, maxWidth: '100%' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 38 }} />
            <Search size={16} style={{ position: 'absolute', left: 13, top: 12, color: 'var(--text-muted)' }} />
          </div>
          <button className="btn btn-primary" onClick={() => openCreate(tab === 'habilidades' ? 'habilidad' : tab === 'deportes' ? 'deporte' : tab === 'equipos' ? 'equipo' : 'jugador')}>
            <Plus size={18} /> Registrar
          </button>
        </div>
      )}

      {tab === 'deportes' && <Table columns={columns.deporte} data={deporteRows} loading={loading} emptyMessage="No hay deportes registrados." />}
      {tab === 'equipos' && <Table columns={columns.equipo} data={equipoRows} loading={loading} emptyMessage="No hay equipos registrados." />}
      {tab === 'jugadores' && <Table columns={columns.jugador} data={jugadorRows} loading={loading} emptyMessage="No hay jugadores registrados." />}
      {tab === 'habilidades' && <Table columns={columns.habilidad} data={habilidadRows} loading={loading} emptyMessage="No hay habilidades registradas." />}

      {tab === 'asociaciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#fff' }}>Equipos con deportes</h3>
              <button className="btn btn-primary" onClick={() => openCreate('equipoDeporte')}><Plus size={16} /> Asociar</button>
            </div>
            {equipoDeportes.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <span>{r.equipo?.nombre} <b>→</b> {r.deporte?.nombre}</span>
              <button className="btn-icon" onClick={() => removeItem('equipoDeporte', r)} title="Retirar asociacion"><X size={16} color="#ef4444" /></button>
            </div>)}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#fff' }}>Jugadores con habilidades</h3>
              <button className="btn btn-primary" onClick={() => openCreate('habilidadJugador')}><Plus size={16} /> Asignar</button>
            </div>
            {habilidadJugadores.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <span>{r.jugador?.nombres} {r.jugador?.apellidos} <b>→</b> {r.habilidad?.nombre} (Nivel {r.nivel})</span>
              <button className="btn-icon" onClick={() => removeItem('habilidadJugador', r)} title="Retirar habilidad"><X size={16} color="#ef4444" /></button>
            </div>)}
          </div>
          <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#fff' }}>Contratos jugador-equipo</h3>
              <button className="btn btn-primary" onClick={() => openCreate('contrato')}><Plus size={16} /> Contratar</button>
            </div>
            {contratos.map((r) => <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <span>{r.jugador?.nombres} {r.jugador?.apellidos} <b>→</b> {r.equipo?.nombre} | {r.fechaInicio} a {r.fechaFin || 'sin fecha fin'} | {r.activo ? 'Activo' : 'Finalizado'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {r.activo && <button className="btn-icon" title="Finalizar contrato" onClick={async () => { await contratosApi.finalizar(r.id); showToast('Contrato finalizado', 'success'); await refresh(); }}><Activity size={16} color="#22c55e" /></button>}
                <button className="btn-icon" title="Retirar contrato" onClick={() => removeItem('contrato', r)}><X size={16} color="#ef4444" /></button>
              </div>
            </div>)}
          </div>
        </div>
      )}

      {tab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 480 }}>
            Jugador
            <select value={selectedJugador} onChange={(e) => { setSelectedJugador(e.target.value); loadPerfil(e.target.value); }}>
              <option value="">Seleccione un jugador...</option>
              {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos} - {j.identificacion || `ID ${j.id}`}</option>)}
            </select>
          </label>
          {perfil && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <h3 style={{ color: '#fff', marginBottom: 10 }}>Información básica</h3>
                <p>{perfil.jugador.nombres} {perfil.jugador.apellidos}</p>
                <p>Identificacion: {perfil.jugador.identificacion || 'N/A'}</p>
                <p>Camiseta: {perfil.jugador.numeroCamiseta}</p>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <h3 style={{ color: '#fff', marginBottom: 10 }}>Equipos</h3>
                {perfil.equipos?.length ? perfil.equipos.map((e) => <p key={e.contrato_id}>{e.equipo_nombre}</p>) : <p>{perfil.mensajeEquipos}</p>}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <h3 style={{ color: '#fff', marginBottom: 10 }}>Habilidades</h3>
                {perfil.habilidades?.length ? perfil.habilidades.map((h) => <p key={h.relacion_id}>{h.habilidad_nombre} - Nivel {h.nivel}</p>) : <p>{perfil.mensajeHabilidades}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {renderModal()}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={() => setConfirm((prev) => ({ ...prev, isOpen: false }))}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
      />
    </div>
  );
}
