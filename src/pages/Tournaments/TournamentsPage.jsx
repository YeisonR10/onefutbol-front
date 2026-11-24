import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, Edit2, Layers3, Plus, Power, Search, Trash2, Trophy, Users, X } from 'lucide-react';
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

const unwrapData = (response) => response?.data ?? response;

const getRecords = (response, collectionKeys = []) => {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.content)) return data.content;
  const collection = collectionKeys.find((key) => Array.isArray(data[key]));
  return collection ? data[collection] : [data];
};

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
  const [groupTeamsLoading, setGroupTeamsLoading] = useState(false);
  const groupTeamsLoadToken = useRef(0);
  const [selectedTorneo, setSelectedTorneo] = useState('');
  const [desarrollo, setDesarrollo] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetails, setTournamentDetails] = useState(null);
  const [tournamentDetailsLoading, setTournamentDetailsLoading] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [inscriptionDetails, setInscriptionDetails] = useState(null);
  const [inscriptionDetailsLoading, setInscriptionDetailsLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseDetails, setPhaseDetails] = useState(null);
  const [phaseDetailsLoading, setPhaseDetailsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [selectedFinal, setSelectedFinal] = useState(null);
  const [finalDetails, setFinalDetails] = useState(null);
  const [finalDetailsLoading, setFinalDetailsLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [matchDetailsLoading, setMatchDetailsLoading] = useState(false);
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
    groupTeamsLoadToken.current += 1;
    setGroupTeamsLoading(false);
    const defaults = {
      torneo: { nombre: '', edicion: '', fechaInicio: '', fechaFin: '', premio: 0, activo: true, deporteId: '' },
      inscripcion: { fechaInscripcion: '', numeroRegistro: '', costo: 0, estado: 'CONFIRMADA', torneoId: '', equipoId: '' },
      fase: { nombre: '', orden: 1, tipo: 'GRUPOS', activa: true, torneoId: '' },
      grupo: { nombre: '', descripcion: '', activo: true, faseId: '', equipoIds: [] },
      final: { premioCampeon: 0, premioSubcampeon: 0, tiempoExtra: true, definicionPenales: true, trofeoNombre: '', reglasEspecificas: '', faseId: '', equipoIds: [] },
      partido: { fechaHora: '', estado: 'PROGRAMADO', descripcion: '', faseId: '', escenarioId: '', equipoLocalId: '', equipoVisitanteId: '', golesLocal: 0, golesVisitante: 0 },
      anotacion: { minuto: 0, tipo: 'GOL', descripcion: '', partidoId: '', jugadorId: '' },
    };
    setForm(defaults[type]);
    setModal({ type, mode: 'create' });
  };

  const openEdit = async (type, item) => {
    const mapped = {
      torneo: { ...item, deporteId: item.deporteId ?? item.deporte?.id },
      inscripcion: { ...item, torneoId: item.torneoId ?? item.torneo?.id, equipoId: item.equipoId ?? item.equipo?.id },
      fase: { ...item, torneoId: item.torneoId ?? item.torneo?.id },
      grupo: { ...item, faseId: item.faseId ?? item.fase?.id },
      final: { ...item, faseId: item.faseId ?? item.fase?.id, equipoIds: item.equipoIds ?? item.equipos?.map((equipo) => equipo.id) ?? [] },
      partido: { ...item, faseId: item.faseId ?? item.fase?.id, escenarioId: item.escenarioId ?? item.escenario?.id },
      anotacion: { ...item, partidoId: item.partidoId ?? item.partido?.id, jugadorId: item.jugadorId ?? item.jugador?.id },
    };
    if (type !== 'grupo') {
      groupTeamsLoadToken.current += 1;
      setGroupTeamsLoading(false);
      setForm(mapped[type]);
      setModal({ type, mode: 'edit' });
      return;
    }

    const requestToken = ++groupTeamsLoadToken.current;
    setForm({ ...mapped.grupo, equipoIds: [] });
    setModal({ type, mode: 'edit' });
    setGroupTeamsLoading(true);
    try {
      const assignedTeams = getRecords(await gruposApi.getEquipos(item.id), ['equipos']);
      if (requestToken === groupTeamsLoadToken.current) {
        setForm((current) => String(current.id) === String(item.id)
          ? { ...current, equipoIds: assignedTeams.map((team) => Number(team.id)) }
          : current);
      }
    } catch (error) {
      if (requestToken === groupTeamsLoadToken.current) {
        showToast(error.message || 'No se pudieron cargar los equipos del grupo', 'error');
        setModal(null);
      }
    } finally {
      if (requestToken === groupTeamsLoadToken.current) setGroupTeamsLoading(false);
    }
  };

  const closeFormModal = () => {
    groupTeamsLoadToken.current += 1;
    setGroupTeamsLoading(false);
    setModal(null);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!modal || (modal.type === 'grupo' && groupTeamsLoading)) return;
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
      closeFormModal();
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

  const toggleTournamentActive = async (tournament) => {
    try {
      await torneosApi.update(tournament.id, { activo: !tournament.activo });
      showToast('Estado del torneo actualizado correctamente', 'success');
      await refresh();
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar el estado del torneo', 'error');
    }
  };

  const openTournamentDetails = async (tournament) => {
    setSelectedTournament(tournament);
    setTournamentDetails(null);
    setTournamentDetailsLoading(true);
    try {
      const [details, phases, registrations, venues] = await Promise.all([
        torneosApi.getById(tournament.id),
        torneosApi.getFases(tournament.id),
        torneosApi.getInscripciones(tournament.id),
        torneosApi.getEscenarios(tournament.id),
      ]);
      setTournamentDetails({
        tournament: unwrapData(details),
        phases: getRecords(phases, ['fases']),
        registrations: getRecords(registrations, ['inscripciones']),
        venues: getRecords(venues, ['escenarios']),
      });
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del torneo', 'error');
      setSelectedTournament(null);
    } finally {
      setTournamentDetailsLoading(false);
    }
  };

  const openInscriptionDetails = async (inscription) => {
    setSelectedInscription(inscription);
    setInscriptionDetails(null);
    setInscriptionDetailsLoading(true);
    try {
      setInscriptionDetails(unwrapData(await inscripcionesApi.getById(inscription.id)));
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles de la inscripción', 'error');
      setSelectedInscription(null);
    } finally {
      setInscriptionDetailsLoading(false);
    }
  };

  const openPhaseDetails = async (phase) => {
    setSelectedPhase(phase);
    setPhaseDetails(null);
    setPhaseDetailsLoading(true);
    try {
      const [details, matches, phaseGroups, final] = await Promise.all([
        fasesApi.getById(phase.id),
        fasesApi.getPartidos(phase.id),
        fasesApi.getGrupos(phase.id),
        fasesApi.getFinal(phase.id),
      ]);
      setPhaseDetails({
        phase: unwrapData(details),
        matches: getRecords(matches, ['partidos']),
        groups: getRecords(phaseGroups, ['grupos']),
        final: unwrapData(final),
      });
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles de la fase', 'error');
      setSelectedPhase(null);
    } finally {
      setPhaseDetailsLoading(false);
    }
  };

  const openGroupDetails = async (group) => {
    setSelectedGroup(group);
    setGroupDetails(null);
    setGroupDetailsLoading(true);
    try {
      const [details, teams] = await Promise.all([
        gruposApi.getById(group.id),
        gruposApi.getEquipos(group.id),
      ]);
      setGroupDetails({
        group: unwrapData(details),
        teams: getRecords(teams, ['equipos']),
      });
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del grupo', 'error');
      setSelectedGroup(null);
    } finally {
      setGroupDetailsLoading(false);
    }
  };

  const openFinalDetails = async (finalItem) => {
    setSelectedFinal(finalItem);
    setFinalDetails(null);
    setFinalDetailsLoading(true);
    try {
      setFinalDetails(unwrapData(await finalesApi.getById(finalItem.id)));
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles de la fase final', 'error');
      setSelectedFinal(null);
    } finally {
      setFinalDetailsLoading(false);
    }
  };

  const openMatchDetails = async (match) => {
    setSelectedMatch(match);
    setMatchDetails(null);
    setMatchDetailsLoading(true);
    try {
      setMatchDetails(unwrapData(await partidosApi.getById(match.id)));
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del partido', 'error');
      setSelectedMatch(null);
    } finally {
      setMatchDetailsLoading(false);
    }
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
      {['torneo', 'inscripcion', 'fase', 'grupo', 'final', 'partido'].includes(type) && (
        <button
          className="btn-icon"
          title={{
            torneo: 'Ver detalles del torneo',
            inscripcion: 'Ver detalles de la inscripción',
            fase: 'Ver detalles de la fase',
            grupo: 'Ver detalles del grupo',
            final: 'Ver detalles de la fase final',
            partido: 'Ver detalles del partido',
          }[type]}
          onClick={() => {
            if (type === 'torneo') openTournamentDetails(item);
            else if (type === 'inscripcion') openInscriptionDetails(item);
            else if (type === 'fase') openPhaseDetails(item);
            else if (type === 'grupo') openGroupDetails(item);
            else if (type === 'final') openFinalDetails(item);
            else openMatchDetails(item);
          }}
        >
          <ClipboardList size={16} color="#60a5fa" />
        </button>
      )}
      {type === 'torneo' && (
        <button
          className="btn-icon"
          title={item.activo ? 'Desactivar torneo' : 'Activar torneo'}
          onClick={() => toggleTournamentActive(item)}
        >
          <Power size={16} color={item.activo ? '#22c55e' : '#94a3b8'} />
        </button>
      )}
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
      <Modal isOpen={!!modal} onClose={closeFormModal} title={`${modal.mode === 'create' ? 'Registrar' : 'Editar'} ${titles[modal.type]}`} maxWidth="680px"
        footer={<><button className="btn btn-secondary" onClick={closeFormModal}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving || groupTeamsLoading}>{saving ? 'Guardando...' : groupTeamsLoading ? 'Cargando equipos...' : 'Guardar'}</button></>}>
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
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span>Equipos del grupo</span>
              <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                {groupTeamsLoading ? (
                  <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>Cargando equipos asignados...</p>
                ) : equipos.length ? equipos.map((equipo) => {
                    const selected = (form.equipoIds || []).some((id) => String(id) === String(equipo.id));
                    return (
                      <label key={equipo.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => setForm((prev) => ({
                            ...prev,
                            equipoIds: event.target.checked
                              ? [...(prev.equipoIds || []), Number(equipo.id)]
                              : (prev.equipoIds || []).filter((id) => String(id) !== String(equipo.id)),
                          }))}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                        />
                        {equipo.nombre}{equipo.siglas ? ` (${equipo.siglas})` : ''}
                      </label>
                    );
                }) : <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>No hay equipos registrados.</p>}
              </div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /> Grupo activo</label>
          </>}
          {modal.type === 'final' && <>
            {selectField('Fase', 'faseId', fases.filter((f) => f.tipo === 'FINAL'), (f) => f.id, (f) => f.nombre)}
            {field('Trofeo', 'trofeoNombre', { required: true, maxLength: 100 })}
            {field('Premio campeón', 'premioCampeon', { type: 'number', min: 0 })}
            {field('Premio subcampeón', 'premioSubcampeon', { type: 'number', min: 0 })}
            {field('Reglas específicas', 'reglasEspecificas', { style: { gridColumn: '1 / -1' } })}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span>Equipos de la fase final</span>
              <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                {equipos.length ? equipos.map((equipo) => {
                  const selected = (form.equipoIds || []).some((id) => String(id) === String(equipo.id));
                  return (
                    <label key={equipo.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => setForm((prev) => ({
                          ...prev,
                          equipoIds: event.target.checked
                            ? [...(prev.equipoIds || []), Number(equipo.id)]
                            : (prev.equipoIds || []).filter((id) => String(id) !== String(equipo.id)),
                        }))}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                      />
                      {equipo.nombre}{equipo.siglas ? ` (${equipo.siglas})` : ''}
                    </label>
                  );
                }) : <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>No hay equipos registrados.</p>}
              </div>
              <small style={{ color: 'var(--text-muted)' }}>Selecciona los equipos que participarán en esta fase final.</small>
            </div>
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
      <Modal
        isOpen={!!selectedTournament}
        onClose={() => setSelectedTournament(null)}
        title={`Detalles de ${tournamentDetails?.tournament?.nombre || selectedTournament?.nombre || 'torneo'}`}
        maxWidth="900px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedTournament(null)}>Cerrar</button>}
      >
        {tournamentDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del torneo...
          </div>
        ) : tournamentDetails && (() => {
          const tournament = tournamentDetails.tournament || {};
          const sport = tournament.deporte?.nombre
            || deportes.find((item) => String(item.id) === String(tournament.deporteId))?.nombre
            || (tournament.deporteId != null ? `Deporte #${tournament.deporteId}` : 'Sin deporte');
          const renderSection = (title, Icon, items, emptyMessage, renderItem) => (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={18} /> {title}</h3>
                <span className="badge badge-neutral">{items.length}</span>
              </div>
              {items.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {items.map(renderItem)}
                </div>
              ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{emptyMessage}</p>}
            </section>
          );
          const isActive = tournament.activo ?? selectedTournament?.activo;
          const displayCard = (icon, title, description, details = [], key = title) => (
            <article key={key} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: '#fff', overflowWrap: 'anywhere' }}>{title}</strong>
                  {description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{description}</div>}
                </div>
              </div>
              {details.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 13 }}>
                  {details.map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Trophy size={24} /></span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{tournament.nombre || selectedTournament?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>Edición {tournament.edicion || selectedTournament?.edicion || '—'} · {sport}</p>
                    </div>
                  </div>
                  <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginTop: 18 }}>
                  {[
                    ['Inicio', tournament.fechaInicio],
                    ['Fin', tournament.fechaFin || 'Sin fecha de finalización'],
                    ['Premio', `$${Number(tournament.premio || 0).toLocaleString()}`],
                    ['ID', tournament.id],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{value || '—'}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {renderSection('Fases', Layers3, tournamentDetails.phases, 'Este torneo no tiene fases registradas.', (phase, index) => displayCard(
                <Layers3 size={18} />,
                phase.nombre || `Fase ${index + 1}`,
                [phase.orden != null && `Orden ${phase.orden}`, phase.tipo].filter(Boolean).join(' · '),
                [['Estado', phase.activa === false ? 'Inactiva' : 'Activa']],
                phase.id ?? `phase-${index}`,
              ))}
              {renderSection('Inscripciones', Users, tournamentDetails.registrations, 'Este torneo no tiene inscripciones registradas.', (registration, index) => {
                const teamName = registration.equipo?.nombre
                  || registration.equipoNombre
                  || equipos.find((item) => String(item.id) === String(registration.equipoId))?.nombre
                  || `Equipo ${index + 1}`;
                return displayCard(
                  <Users size={18} />,
                  teamName,
                  registration.numeroRegistro || 'Inscripción',
                  [
                    ['Estado', registration.estado || '—'],
                    ['Fecha', registration.fechaInscripcion || '—'],
                    ['Costo', `$${Number(registration.costo || 0).toLocaleString()}`],
                  ],
                  registration.id ?? `registration-${index}`,
                );
              })}
              {renderSection('Escenarios', CalendarDays, tournamentDetails.venues, 'Este torneo no tiene escenarios asociados.', (venue, index) => displayCard(
                <CalendarDays size={18} />,
                venue.nombre || venue.nombreEscenario || `Escenario ${index + 1}`,
                [venue.ciudad, venue.pais].filter(Boolean).join(', '),
                [
                  ['Capacidad', venue.capacidad ?? '—'],
                  ['Dirección', venue.direccion || venue.ubicacion || '—'],
                ],
                venue.id ?? `venue-${index}`,
              ))}
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedInscription}
        onClose={() => setSelectedInscription(null)}
        title={`Detalles de inscripción${inscriptionDetails?.numeroRegistro ? ` ${inscriptionDetails.numeroRegistro}` : ''}`}
        maxWidth="680px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedInscription(null)}>Cerrar</button>}
      >
        {inscriptionDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información de la inscripción...
          </div>
        ) : inscriptionDetails && (() => {
          const inscription = inscriptionDetails;
          const tournamentName = inscription.torneo?.nombre
            || torneos.find((item) => String(item.id) === String(inscription.torneoId))?.nombre
            || (inscription.torneoId != null ? `Torneo #${inscription.torneoId}` : 'Sin torneo');
          const teamName = inscription.equipo?.nombre
            || equipos.find((item) => String(item.id) === String(inscription.equipoId))?.nombre
            || (inscription.equipoId != null ? `Equipo #${inscription.equipoId}` : 'Sin equipo');
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={24} /></span>
                  <div>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.15rem' }}>{teamName}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{tournamentName}</p>
                  </div>
                </div>
              </section>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  ['Número de registro', inscription.numeroRegistro || '—'],
                  ['Estado', inscription.estado || '—'],
                  ['Fecha de inscripción', inscription.fechaInscripcion || '—'],
                  ['Costo', `$${Number(inscription.costo || 0).toLocaleString()}`],
                  ['ID', inscription.id],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-secondary)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                    <strong style={{ display: 'block', color: '#fff', marginTop: 4, overflowWrap: 'anywhere' }}>{value || '—'}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedPhase}
        onClose={() => setSelectedPhase(null)}
        title={`Detalles de ${phaseDetails?.phase?.nombre || selectedPhase?.nombre || 'fase'}`}
        maxWidth="900px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedPhase(null)}>Cerrar</button>}
      >
        {phaseDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información de la fase...
          </div>
        ) : phaseDetails && (() => {
          const phase = phaseDetails.phase || {};
          const phaseFinal = phaseDetails.final
            || finales.find((finalItem) => String(finalItem.faseId) === String(phase.id));
          const finalTeamIds = phaseFinal?.equipoIds
            ?? phaseFinal?.equipos?.map((team) => team.id)
            ?? [];
          const finalTeams = equipos.filter((team) =>
            finalTeamIds.some((id) => String(id) === String(team.id)));
          const tournamentName = phase.torneo?.nombre
            || torneos.find((tournament) => String(tournament.id) === String(phase.torneoId))?.nombre
            || (phase.torneoId != null ? `Torneo #${phase.torneoId}` : 'Sin torneo');
          const renderSection = (title, Icon, items, emptyMessage, renderItem) => (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={18} /> {title}</h3>
                <span className="badge badge-neutral">{items.length}</span>
              </div>
              {items.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {items.map(renderItem)}
                </div>
              ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{emptyMessage}</p>}
            </section>
          );
          const formatMatchDate = (value) => {
            if (!value) return 'Sin fecha';
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
          };
          const resolveTeamName = (match, side) => match[side]?.nombre
            || match[`${side}Nombre`]
            || equipos.find((team) => String(team.id) === String(match[`${side}Id`]))?.nombre
            || null;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Layers3 size={24} /></span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{phase.nombre || selectedPhase?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{tournamentName}</p>
                    </div>
                  </div>
                  <span className={`badge ${(phase.activa ?? phase.activo) === false ? 'badge-inactive' : 'badge-active'}`}>
                    {(phase.activa ?? phase.activo) === false ? 'Inactiva' : 'Activa'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginTop: 18 }}>
                  {[
                    ['Tipo', phase.tipo || '—'],
                    ['Orden', phase.orden ?? '—'],
                    ['Torneo', tournamentName],
                    ['ID', phase.id],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff', overflowWrap: 'anywhere' }}>{value || '—'}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {renderSection('Partidos', CalendarDays, phaseDetails.matches, 'Esta fase no tiene partidos registrados.', (match, index) => {
                const homeTeam = resolveTeamName(match, 'equipoLocal') || resolveTeamName(match, 'local');
                const awayTeam = resolveTeamName(match, 'equipoVisitante') || resolveTeamName(match, 'visitante');
                const score = match.golesLocal != null && match.golesVisitante != null
                  ? `${match.golesLocal} - ${match.golesVisitante}`
                  : match.marcador || 'Sin resultado';
                return (
                  <article key={match.id ?? `match-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}><CalendarDays size={18} /></span>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: '#fff' }}>{homeTeam && awayTeam ? `${homeTeam} vs. ${awayTeam}` : `Partido #${match.id ?? index + 1}`}</strong>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{formatMatchDate(match.fechaHora)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 13 }}>
                      {[
                        ['Estado', match.estado || '—'],
                        ['Marcador', score],
                        ['Escenario', match.escenario?.nombre || match.escenarioNombre || '—'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', marginTop: 2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}

              {renderSection('Grupos de la fase', Users, phaseDetails.groups, 'Esta fase no tiene grupos registrados.', (group, index) => (
                <article key={group.id ?? `group-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={18} /></span>
                    <div>
                      <strong style={{ color: '#fff' }}>{group.nombre || `Grupo ${index + 1}`}</strong>
                      {group.descripcion && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{group.descripcion}</div>}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: 12 }}>
                    Estado: {(group.activo ?? group.activa) === false ? 'Inactivo' : 'Activo'}
                  </div>
                </article>
              ))}

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Fase final</h3>
                  <span className={`badge ${phaseFinal ? 'badge-active' : 'badge-neutral'}`}>{phaseFinal ? 'Configurada' : 'Sin configurar'}</span>
                </div>
                {phaseFinal ? (
                  <article style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg-secondary)' }}>
                    <h4 style={{ color: '#fff', margin: 0 }}>{phaseFinal.trofeoNombre || 'Configuración de fase final'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 14 }}>
                      {[
                        ['Premio campeón', `$${Number(phaseFinal.premioCampeon || 0).toLocaleString()}`],
                        ['Premio subcampeón', `$${Number(phaseFinal.premioSubcampeon || 0).toLocaleString()}`],
                        ['Tiempo extra', phaseFinal.tiempoExtra ? 'Sí' : 'No'],
                        ['Definición por penales', phaseFinal.definicionPenales ? 'Sí' : 'No'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', marginTop: 2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {phaseFinal.reglasEspecificas && (
                      <p style={{ color: 'var(--text-secondary)', margin: '14px 0 0' }}>{phaseFinal.reglasEspecificas}</p>
                    )}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 7 }}>Equipos participantes</div>
                      {finalTeams.length ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {finalTeams.map((team) => <span key={team.id} className="badge badge-neutral">{team.nombre}</span>)}
                        </div>
                      ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No hay equipos asociados a esta fase final.</p>}
                    </div>
                  </article>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Esta fase todavía no tiene una configuración final.</p>}
              </section>
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={`Detalles de ${groupDetails?.group?.nombre || selectedGroup?.nombre || 'grupo'}`}
        maxWidth="820px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedGroup(null)}>Cerrar</button>}
      >
        {groupDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del grupo...
          </div>
        ) : groupDetails && (() => {
          const group = groupDetails.group || {};
          const phaseName = group.fase?.nombre
            || fases.find((phase) => String(phase.id) === String(group.faseId))?.nombre
            || (group.faseId != null ? `Fase #${group.faseId}` : 'Sin fase');
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={24} /></span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{group.nombre || selectedGroup?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{phaseName}</p>
                    </div>
                  </div>
                  <span className={`badge ${group.activo ? 'badge-active' : 'badge-inactive'}`}>{group.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginTop: 18 }}>
                  {[
                    ['Fase', phaseName],
                    ['Descripción', group.descripcion || 'Sin descripción'],
                    ['Equipos', groupDetails.teams.length],
                    ['ID', group.id],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff', overflowWrap: 'anywhere' }}>{value || '—'}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Equipos del grupo</h3>
                  <span className="badge badge-neutral">{groupDetails.teams.length}</span>
                </div>
                {groupDetails.teams.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {groupDetails.teams.map((team, index) => (
                      <article key={team.id ?? `team-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={18} /></span>
                          <div>
                            <strong style={{ color: '#fff' }}>{team.nombre || `Equipo ${index + 1}`}</strong>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>
                              {[team.siglas, team.ciudad, team.pais].filter(Boolean).join(' · ') || 'Sin información adicional'}
                            </div>
                          </div>
                        </div>
                        {typeof team.activo === 'boolean' && (
                          <span className={`badge ${team.activo ? 'badge-active' : 'badge-inactive'}`} style={{ display: 'inline-flex', marginTop: 12 }}>
                            {team.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este grupo no tiene equipos asociados.</p>}
              </section>
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedFinal}
        onClose={() => setSelectedFinal(null)}
        title={`Detalles de ${finalDetails?.trofeoNombre || selectedFinal?.trofeoNombre || 'fase final'}`}
        maxWidth="760px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedFinal(null)}>Cerrar</button>}
      >
        {finalDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información de la fase final...
          </div>
        ) : finalDetails && (() => {
          const finalItem = finalDetails;
          const phaseName = fases.find((phase) => String(phase.id) === String(finalItem.faseId))?.nombre
            || (finalItem.faseId != null ? `Fase #${finalItem.faseId}` : 'Sin fase');
          const teamIds = finalItem.equipoIds
            ?? finalItem.equipos?.map((team) => team.id)
            ?? [];
          const finalTeams = teamIds.map((id) =>
            equipos.find((team) => String(team.id) === String(id)) || { id, nombre: `Equipo #${id}` });
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Trophy size={24} /></span>
                  <div>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{finalItem.trofeoNombre || 'Fase final'}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{phaseName}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 18 }}>
                  {[
                    ['Premio campeón', `$${Number(finalItem.premioCampeon || 0).toLocaleString()}`],
                    ['Premio subcampeón', `$${Number(finalItem.premioSubcampeon || 0).toLocaleString()}`],
                    ['Tiempo extra', finalItem.tiempoExtra ? 'Sí' : 'No'],
                    ['Definición por penales', finalItem.definicionPenales ? 'Sí' : 'No'],
                    ['Equipos', finalTeams.length],
                    ['ID', finalItem.id],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{value ?? '—'}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 style={{ color: '#fff', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Equipos participantes</h3>
                {finalTeams.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {finalTeams.map((team) => (
                      <article key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 9, padding: 12, background: 'var(--bg-secondary)' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={17} /></span>
                        <div>
                          <strong style={{ color: '#fff' }}>{team.nombre}</strong>
                          {team.siglas && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>{team.siglas}</div>}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No hay equipos asociados a esta fase final.</p>}
              </section>
              {finalItem.reglasEspecificas && (
                <section style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 14, background: 'var(--bg-secondary)' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '0.95rem' }}>Reglas específicas</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{finalItem.reglasEspecificas}</p>
                </section>
              )}
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={`Detalles del partido #${matchDetails?.id || selectedMatch?.id || ''}`}
        maxWidth="760px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedMatch(null)}>Cerrar</button>}
      >
        {matchDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del partido...
          </div>
        ) : matchDetails && (() => {
          const match = matchDetails;
          const homeTeam = equipos.find((team) => String(team.id) === String(match.equipoLocalId));
          const awayTeam = equipos.find((team) => String(team.id) === String(match.equipoVisitanteId));
          const phaseName = fases.find((phase) => String(phase.id) === String(match.faseId))?.nombre
            || (match.faseId != null ? `Fase #${match.faseId}` : 'Sin fase');
          const venueName = escenarios.find((venue) => String(venue.id) === String(match.escenarioId))?.nombre
            || (match.escenarioId != null ? `Escenario #${match.escenarioId}` : 'Sin escenario');
          const matchDate = match.fechaHora ? new Date(match.fechaHora) : null;
          const formattedDate = matchDate && !Number.isNaN(matchDate.getTime())
            ? matchDate.toLocaleString()
            : match.fechaHora || 'Sin fecha';
          const score = match.golesLocal == null && match.golesVisitante == null
            ? 'Sin resultado'
            : `${match.golesLocal ?? '—'} - ${match.golesVisitante ?? '—'}`;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                  <div>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, margin: '0 auto 8px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={22} /></span>
                    <strong style={{ color: '#fff' }}>{homeTeam?.nombre || (match.equipoLocalId != null ? `Equipo #${match.equipoLocalId}` : 'Equipo local')}</strong>
                  </div>
                  <strong style={{ color: 'var(--accent)', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>{score}</strong>
                  <div>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, margin: '0 auto 8px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Users size={22} /></span>
                    <strong style={{ color: '#fff' }}>{awayTeam?.nombre || (match.equipoVisitanteId != null ? `Equipo #${match.equipoVisitanteId}` : 'Equipo visitante')}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                  <span className="badge badge-neutral">{match.estado || 'Sin estado'}</span>
                </div>
              </section>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  ['Fecha y hora', formattedDate],
                  ['Fase', phaseName],
                  ['Escenario', venueName],
                  ['ID', match.id],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-secondary)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                    <strong style={{ display: 'block', color: '#fff', marginTop: 4, overflowWrap: 'anywhere' }}>{value || '—'}</strong>
                  </div>
                ))}
              </div>
              {match.descripcion && (
                <section style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 14, background: 'var(--bg-secondary)' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '0.95rem' }}>Descripción</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{match.descripcion}</p>
                </section>
              )}
            </div>
          );
        })()}
      </Modal>
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
