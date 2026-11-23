import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Edit2, Layers3, Plus, Search, Trash2, Trophy, Users, X } from 'lucide-react';
import {
  anotacionesApi,
  deportesApi,
  equiposApi,
  escenariosApi,
  fasesApi,
  finalesApi,
  gruposApi,
  inscripcionesApi,
  jugadoresApi,
  partidosApi,
  torneosApi,
} from '../../api/client';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

const tabs = [
  { id: 'torneos', label: 'Torneos', icon: Trophy },
  { id: 'inscripciones', label: 'Inscripciones', icon: Users },
  { id: 'fases', label: 'Fases', icon: Layers3 },
  { id: 'grupos', label: 'Grupos', icon: Users },
  { id: 'finales', label: 'Fases finales', icon: Activity },
  { id: 'partidos', label: 'Partidos', icon: CalendarDays },
  { id: 'anotaciones', label: 'Anotaciones', icon: Edit2 },
  { id: 'desarrollo', label: 'Desarrollo', icon: Search },
];

export default function TournamentsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('torneos');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [torneos, setTorneos] = useState([]);
  const [deportes, setDeportes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [fases, setFases] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [finales, setFinales] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [anotaciones, setAnotaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedTorneo, setSelectedTorneo] = useState('');
  const [desarrollo, setDesarrollo] = useState(null);
  const [confirm, setConfirm] = useState({ isOpen: false, onConfirm: () => {} });

  const refresh = async () => {
    setLoading(true);
    try {
      const [ts, ds, es, js, sc, ins, fs, gs, fn, ps, ans] = await Promise.all([
        torneosApi.getAll(),
        deportesApi.getAll(),
        equiposApi.getAll(),
        jugadoresApi.getAll(),
        escenariosApi.getAll(),
        inscripcionesApi.getAll(),
        fasesApi.getAll(),
        gruposApi.getAll(),
        finalesApi.getAll(),
        partidosApi.getAll(),
        anotacionesApi.getAll(),
      ]);
      setTorneos(ts || []);
      setDeportes(ds || []);
      setEquipos(es || []);
      setJugadores(js || []);
      setEscenarios(sc || []);
      setInscripciones(ins || []);
      setFases(fs || []);
      setGrupos(gs || []);
      setFinales(fn || []);
      setPartidos(ps || []);
      setAnotaciones(ans || []);
    } catch (error) {
      showToast(error.message || 'Error al cargar los torneos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = (items, getText) => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((item) => getText(item).toLowerCase().includes(q)) : items;
  };

  const openCreate = (type) => {
    const defaults = {
      torneo: { nombre: '', edicion: '', fechaInicio: '', fechaFin: '', premio: 0, activo: true, deporteId: '' },
      inscripcion: { fechaInscripcion: '', numeroRegistro: '', costo: 0, estado: 'CONFIRMADA', torneoId: '', equipoId: '' },
      fase: { nombre: '', orden: 1, tipo: 'GRUPOS', activa: true, torneoId: '' },
      grupo: { nombre: '', descripcion: '', activo: true, faseId: '' },
      final: { premioCampeon: 0, premioSubcampeon: 0, tiempoExtra: true, definicionPenales: true, trofeoNombre: '', reglasEspecificas: '', faseId: '' },
      partido: { fechaHora: '', estado: 'PROGRAMADO', descripcion: '', faseId: '', escenarioId: '', equipoLocalId: '', equipoVisitanteId: '', golesLocal: 0, golesVisitante: 0 },
      anotacion: { minuto: 0, tipo: 'GOL', descripcion: '', partidoId: '', jugadorId: '' },
    };
    setForm(defaults[type]);
    setModal({ type, mode: 'create' });
  };

  const openEdit = (type, item) => {
    const mapped = {
      torneo: { ...item, deporteId: item.deporteId ?? item.deporte?.id },
      inscripcion: { ...item, torneoId: item.torneoId ?? item.torneo?.id, equipoId: item.equipoId ?? item.equipo?.id },
      fase: { ...item, torneoId: item.torneoId ?? item.torneo?.id },
      grupo: { ...item, faseId: item.faseId ?? item.fase?.id },
      final: { ...item, faseId: item.faseId ?? item.fase?.id },
      partido: { ...item, faseId: item.faseId ?? item.fase?.id, escenarioId: item.escenarioId ?? item.escenario?.id },
      anotacion: { ...item, partidoId: item.partidoId ?? item.partido?.id, jugadorId: item.jugadorId ?? item.jugador?.id },
    };
    setForm(mapped[type]);
    setModal({ type, mode: 'edit' });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      const id = form.id;
      const operations = {
        torneo: torneosApi,
        inscripcion: inscripcionesApi,
        fase: fasesApi,
        grupo: gruposApi,
        final: finalesApi,
        partido: partidosApi,
        anotacion: anotacionesApi,
      };
      const api = operations[modal.type];
      modal.mode === 'create' ? await api.create(payload) : await api.update(id, payload);
      showToast(modal.mode === 'create' ? 'Registro creado correctamente' : 'Registro actualizado correctamente', 'success');
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
      torneo: item.nombre,
      inscripcion: `la inscripción #${item.id}`,
      fase: item.nombre,
      grupo: item.nombre,
      final: `la fase final #${item.id}`,
      partido: `el partido #${item.id}`,
      anotacion: `la anotación #${item.id}`,
    };
    setConfirm({
      isOpen: true,
      title: 'Confirmar acción',
      message: `¿Desea eliminar ${names[type]}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const operations = { torneo: torneosApi, inscripcion: inscripcionesApi, fase: fasesApi, grupo: gruposApi, final: finalesApi, partido: partidosApi, anotacion: anotacionesApi };
          await operations[type].delete(item.id);
          showToast(type === 'inscripcion' ? 'Inscripción retirada correctamente' : 'Registro eliminado correctamente', 'success');
          setConfirm((prev) => ({ ...prev, isOpen: false }));
          await refresh();
        } catch (error) {
          showToast(error.message || 'No se pudo eliminar el registro', 'error');
        }
      },
    });
  };

  const field = (label, name, props = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label}
      <input
        {...props}
        value={form[name] ?? ''}
        onChange={(e) => setForm((prev) => ({
          ...prev,
          [name]: props.type === 'number' ? Number(e.target.value) : props.type === 'checkbox' ? e.target.checked : e.target.value,
        }))}
      />
    </label>
  );

  const selectField = (label, name, options, getValue = (o) => o.id, getLabel = (o) => o.nombre) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label}
      <select value={form[name] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [name]: Number(e.target.value) }))}>
        <option value="">Seleccione...</option>
        {options.map((o) => <option key={getValue(o)} value={getValue(o)}>{getLabel(o)}</option>)}
      </select>
    </label>
  );

  const actions = (type, item) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <button className="btn-icon" title="Editar" onClick={() => openEdit(type, item)}><Edit2 size={16} color="#f59e0b" /></button>
      <button className="btn-icon" title="Eliminar" onClick={() => removeItem(type, item)}><Trash2 size={16} color="#ef4444" /></button>
    </div>
  );

  const torneoRows = filtered(torneos, (t) => `${t.nombre} ${t.edicion}`);
  const inscripcionRows = filtered(inscripciones, (i) => `${i.numeroRegistro} ${i.torneoId} ${i.equipoId}`);
  const faseRows = filtered(fases, (f) => `${f.nombre} ${f.tipo}`);
  const grupoRows = filtered(grupos, (g) => `${g.nombre} ${g.descripcion || ''}`);
  const finalRows = filtered(finales, (f) => `${f.trofeoNombre} ${f.faseId}`);
  const partidoRows = filtered(partidos, (p) => `${p.id} ${p.estado} ${p.descripcion || ''}`);
  const anotacionRows = filtered(anotaciones, (a) => `${a.minuto} ${a.tipo} ${a.descripcion || ''}`);

  const loadDesarrollo = async (id) => {
    if (!id) { setDesarrollo(null); return; }
    try {
      const [torneo, fasesData, inscripcionesData] = await Promise.all([
        torneosApi.getById(Number(id)),
        torneosApi.getFases(Number(id)),
        torneosApi.getInscripciones(Number(id)),
      ]);
      const phaseDetails = await Promise.all((fasesData || []).map(async (fase) => {
        const [groups, phasePartidos, phaseFinal] = await Promise.all([
          fasesApi.getGrupos(fase.id).catch(() => []),
          fasesApi.getPartidos(fase.id).catch(() => []),
          fasesApi.getFinal(fase.id).catch(() => null),
        ]);
        const groupsWithTeams = await Promise.all((groups || []).map(async (group) => ({
          ...group,
          equipos: await gruposApi.getEquipos(group.id).catch(() => []),
        })));
        return { ...fase, groups: groupsWithTeams, partidos: phasePartidos || [], final: phaseFinal };
      }));
      setDesarrollo({ torneo, fases: phaseDetails, inscripciones: inscripcionesData || [] });
    } catch (error) {
      showToast(error.message || 'No se pudo cargar el desarrollo del torneo', 'error');
      setDesarrollo(null);
    }
  };

  const renderModal = () => {
    if (!modal) return null;
    const titles = { torneo: 'Torneo', inscripcion: 'Inscripción', fase: 'Fase', grupo: 'Grupo', final: 'Fase final', partido: 'Partido', anotacion: 'Anotación' };
    return (
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={`${modal.mode === 'create' ? 'Registrar' : 'Editar'} ${titles[modal.type]}`} maxWidth="680px"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <form id="tournaments-form" onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {modal.type === 'torneo' && <>
            {field('Nombre', 'nombre', { required: true, maxLength: 120 })}
            {field('Edición', 'edicion', { required: true, maxLength: 50 })}
            {field('Fecha inicio', 'fechaInicio', { type: 'date', required: true })}
            {field('Fecha fin', 'fechaFin', { type: 'date' })}
            {field('Premio', 'premio', { type: 'number', min: 0 })}
            {selectField('Deporte', 'deporteId', deportes)}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Torneo activo</label>
          </>}
          {modal.type === 'inscripcion' && <>
            {selectField('Torneo', 'torneoId', torneos)}
            {selectField('Equipo', 'equipoId', equipos)}
            {field('Fecha de inscripción', 'fechaInscripcion', { type: 'date', required: true })}
            {field('Número de registro', 'numeroRegistro', { required: true, maxLength: 50 })}
            {field('Costo', 'costo', { type: 'number', min: 0, required: true })}
            {field('Estado', 'estado', { maxLength: 30 })}
          </>}
          {modal.type === 'fase' && <>
            {selectField('Torneo', 'torneoId', torneos)}
            {field('Nombre', 'nombre', { required: true, maxLength: 100 })}
            {field('Orden', 'orden', { type: 'number', min: 1, required: true })}
            <label>Tipo de fase
              <select value={form.tipo || 'GRUPOS'} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}>
                <option value="GRUPOS">Fase de grupos</option>
                <option value="FINAL">Fase final</option>
                <option value="ELIMINACION">Eliminación</option>
              </select>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activa !== false} onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))} /> Fase activa</label>
          </>}
          {modal.type === 'grupo' && <>
            {selectField('Fase', 'faseId', fases, (f) => f.id, (f) => f.nombre)}
            {field('Nombre', 'nombre', { required: true, maxLength: 50 })}
            {field('Descripción', 'descripcion', { style: { gridColumn: '1 / -1' } })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Grupo activo</label>
          </>}
          {modal.type === 'final' && <>
            {selectField('Fase', 'faseId', fases.filter((f) => f.tipo === 'FINAL'), (f) => f.id, (f) => f.nombre)}
            {field('Trofeo', 'trofeoNombre', { required: true, maxLength: 100 })}
            {field('Premio campeón', 'premioCampeon', { type: 'number', min: 0 })}
            {field('Premio subcampeón', 'premioSubcampeon', { type: 'number', min: 0 })}
            {field('Reglas específicas', 'reglasEspecificas', { style: { gridColumn: '1 / -1' } })}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.tiempoExtra !== false} onChange={(e) => setForm((p) => ({ ...p, tiempoExtra: e.target.checked }))} /> Tiempo extra</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.definicionPenales !== false} onChange={(e) => setForm((p) => ({ ...p, definicionPenales: e.target.checked }))} /> Definición por penales</label>
          </>}
          {modal.type === 'partido' && <>
            {selectField('Fase', 'faseId', fases, (f) => f.id, (f) => f.nombre)}
            {selectField('Escenario', 'escenarioId', escenarios)}
            {selectField('Equipo local', 'equipoLocalId', equipos)}
            {selectField('Equipo visitante', 'equipoVisitanteId', equipos)}
            {field('Fecha y hora', 'fechaHora', { type: 'datetime-local', required: true })}
            {field('Estado', 'estado', { required: true, maxLength: 30 })}
            {field('Goles local', 'golesLocal', { type: 'number', min: 0 })}
            {field('Goles visitante', 'golesVisitante', { type: 'number', min: 0 })}
            {field('Descripción', 'descripcion', { style: { gridColumn: '1 / -1' } })}
          </>}
          {modal.type === 'anotacion' && <>
            {selectField('Partido', 'partidoId', partidos, (p) => p.id, (p) => `Partido #${p.id} - ${p.estado}`)}
            {selectField('Jugador', 'jugadorId', jugadores, (j) => j.id, (j) => `${j.nombres} ${j.apellidos}`)}
            {field('Minuto', 'minuto', { type: 'number', min: 0, max: 300, required: true })}
            {field('Tipo', 'tipo', { maxLength: 30 })}
            {field('Descripción', 'descripcion', { style: { gridColumn: '1 / -1' } })}
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

      {tab !== 'desarrollo' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 380, maxWidth: '100%' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 38 }} />
            <Search size={16} style={{ position: 'absolute', left: 13, top: 12, color: 'var(--text-muted)' }} />
          </div>
          {tab !== 'desarrollo' && <button className="btn btn-primary" onClick={() => openCreate(tab === 'torneos' ? 'torneo' : tab === 'inscripciones' ? 'inscripcion' : tab === 'fases' ? 'fase' : tab === 'grupos' ? 'grupo' : tab === 'finales' ? 'final' : tab === 'partidos' ? 'partido' : 'anotacion')}><Plus size={18} /> Registrar</button>}
        </div>
      )}

      {tab === 'torneos' && <Table loading={loading} emptyMessage="No hay torneos registrados." data={torneoRows} columns={[
        { key: 'nombre', label: 'Torneo', render: (t) => <strong style={{ color: '#fff' }}>{t.nombre}</strong> },
        { key: 'edicion', label: 'Edición' },
        { key: 'fechaInicio', label: 'Inicio' },
        { key: 'fechaFin', label: 'Fin', render: (t) => t.fechaFin || 'Abierta' },
        { key: 'activo', label: 'Estado', render: (t) => t.activo ? 'Activo' : 'Inactivo' },
        { key: 'actions', label: 'Acciones', align: 'right', render: (t) => actions('torneo', t) },
      ]} />}

      {tab === 'inscripciones' && <Table loading={loading} emptyMessage="No hay inscripciones registradas." data={inscripcionRows} columns={[
        { key: 'numeroRegistro', label: 'Registro' },
        { key: 'torneo', label: 'Torneo', render: (i) => i.torneo?.nombre || `Torneo #${i.torneoId}` },
        { key: 'equipo', label: 'Equipo', render: (i) => i.equipo?.nombre || `Equipo #${i.equipoId}` },
        { key: 'estado', label: 'Estado' },
        { key: 'costo', label: 'Costo', render: (i) => `$${Number(i.costo || 0).toLocaleString()}` },
        { key: 'actions', label: 'Acciones', align: 'right', render: (i) => actions('inscripcion', i) },
      ]} />}

      {tab === 'fases' && <Table loading={loading} emptyMessage="No hay fases registradas." data={faseRows} columns={[
        { key: 'nombre', label: 'Fase', render: (f) => <strong style={{ color: '#fff' }}>{f.nombre}</strong> },
        { key: 'orden', label: 'Orden' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'torneo', label: 'Torneo', render: (f) => f.torneo?.nombre || `Torneo #${f.torneoId}` },
        { key: 'activa', label: 'Estado', render: (f) => f.activa ? 'Activa' : 'Inactiva' },
        { key: 'actions', label: 'Acciones', align: 'right', render: (f) => actions('fase', f) },
      ]} />}

      {tab === 'grupos' && <Table loading={loading} emptyMessage="No hay grupos registrados." data={grupoRows} columns={[
        { key: 'nombre', label: 'Grupo', render: (g) => <strong style={{ color: '#fff' }}>{g.nombre}</strong> },
        { key: 'fase', label: 'Fase', render: (g) => g.fase?.nombre || `Fase #${g.faseId}` },
        { key: 'descripcion', label: 'Descripción', render: (g) => g.descripcion || 'Sin descripción' },
        { key: 'activo', label: 'Estado', render: (g) => g.activo ? 'Activo' : 'Inactivo' },
        { key: 'actions', label: 'Acciones', align: 'right', render: (g) => actions('grupo', g) },
      ]} />}

      {tab === 'finales' && <Table loading={loading} emptyMessage="No hay fases finales registradas." data={finalRows} columns={[
        { key: 'trofeoNombre', label: 'Trofeo', render: (f) => <strong style={{ color: '#fff' }}>{f.trofeoNombre}</strong> },
        { key: 'fase', label: 'Fase', render: (f) => f.fase?.nombre || `Fase #${f.faseId}` },
        { key: 'premios', label: 'Premios', render: (f) => `Campeón $${f.premioCampeon || 0} / Subcampeón $${f.premioSubcampeon || 0}` },
        { key: 'actions', label: 'Acciones', align: 'right', render: (f) => actions('final', f) },
      ]} />}

      {tab === 'partidos' && <Table loading={loading} emptyMessage="No hay partidos registrados." data={partidoRows} columns={[
        { key: 'id', label: 'Partido', render: (p) => <strong style={{ color: '#fff' }}>#{p.id}</strong> },
        { key: 'fechaHora', label: 'Fecha', render: (p) => p.fechaHora ? new Date(p.fechaHora).toLocaleString() : 'Sin fecha' },
        { key: 'estado', label: 'Estado' },
        { key: 'escenario', label: 'Escenario', render: (p) => p.escenario?.nombre || `Escenario #${p.escenarioId}` },
        { key: 'actions', label: 'Acciones', align: 'right', render: (p) => actions('partido', p) },
      ]} />}

      {tab === 'anotaciones' && <Table loading={loading} emptyMessage="No hay anotaciones registradas." data={anotacionRows} columns={[
        { key: 'minuto', label: 'Minuto', render: (a) => `${a.minuto}'` },
        { key: 'tipo', label: 'Tipo' },
        { key: 'jugador', label: 'Jugador', render: (a) => a.jugador?.nombres ? `${a.jugador.nombres} ${a.jugador.apellidos}` : `Jugador #${a.jugadorId}` },
        { key: 'partido', label: 'Partido', render: (a) => `Partido #${a.partidoId ?? a.partido?.id}` },
        { key: 'actions', label: 'Acciones', align: 'right', render: (a) => actions('anotacion', a) },
      ]} />}

      {tab === 'desarrollo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ maxWidth: 480 }}>Torneo seleccionado
            <select value={selectedTorneo} onChange={(e) => { setSelectedTorneo(e.target.value); loadDesarrollo(e.target.value); }}>
              <option value="">Seleccione un torneo...</option>
              {torneos.map((t) => <option key={t.id} value={t.id}>{t.nombre} - {t.edicion}</option>)}
            </select>
          </label>
          {desarrollo && (
            <>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <h3 style={{ marginBottom: 8 }}>{desarrollo.torneo.nombre}</h3>
                <p>Edición: {desarrollo.torneo.edicion} · Inicio: {desarrollo.torneo.fechaInicio} · Estado: {desarrollo.torneo.activo ? 'Activo' : 'Inactivo'}</p>
                <p>Equipos inscritos: {desarrollo.inscripciones.length}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {desarrollo.fases.map((fase) => (
                  <div key={fase.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <h3>{fase.orden}. {fase.nombre}</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{fase.tipo}</p>
                    {fase.groups.map((grupo) => (
                      <div key={grupo.id} style={{ marginBottom: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <strong>{grupo.nombre}</strong>
                        {grupo.equipos.length ? grupo.equipos.map((e) => <p key={e.id}>• {e.nombre}</p>) : <p>Sin equipos asignados</p>}
                      </div>
                    ))}
                    {fase.partidos.map((partido) => {
                      const partidoAnotaciones = anotaciones.filter((a) => (a.partidoId ?? a.partido?.id) === partido.id);
                      return (
                        <div key={partido.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                          <p><strong>Partido #{partido.id}</strong> · {partido.estado}</p>
                          <p>{partido.fechaHora ? new Date(partido.fechaHora).toLocaleString() : 'Pendiente de fecha'}</p>
                          <p>{partidoAnotaciones.length ? `${partidoAnotaciones.length} anotación(es)` : 'Sin anotaciones'}</p>
                        </div>
                      );
                    })}
                    {fase.final && <p style={{ marginTop: 10 }}>🏆 {fase.final.trofeoNombre}</p>}
                  </div>
                ))}
              </div>
            </>
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
