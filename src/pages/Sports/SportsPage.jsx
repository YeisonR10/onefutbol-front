import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Edit2,
  Link2,
  ClipboardList,
  Plus,
  Power,
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
  inscripcionesApi,
  jugadoresApi,
  torneosApi,
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

const detailFieldLabels = {
  activo: 'Estado',
  activa: 'Estado',
  categoria: 'Categoría',
  ciudad: 'Ciudad',
  entrenador: 'Entrenador',
  esColectivo: 'Colectivo',
  fechaFundacion: 'Fundación',
  fechaInscripcion: 'Inscripción',
  maxJugadores: 'Máximo de jugadores',
  minJugadores: 'Mínimo de jugadores',
  pais: 'País',
  siglas: 'Siglas',
};

const getDetailFields = (item, excludedFields = []) =>
  Object.entries(item || {})
    .filter(([key, value]) => !excludedFields.includes(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({
      label: detailFieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()),
      value: typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value,
    }));

const getRelatedRecords = (data, collectionKeys) => {
  const source = data?.data && typeof data.data === 'object' ? data.data : data;
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  if (Array.isArray(source.content)) return source.content;
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.results)) return source.results;
  const collection = collectionKeys.find((key) => Array.isArray(source[key]));
  if (collection) return source[collection];
  return [source];
};

const getAssociationId = (association, entityKey, entities = []) => {
  const related = association?.[entityKey];
  if (related && typeof related === 'object') return related.id ?? null;
  if (typeof related === 'number' || (typeof related === 'string' && !Number.isNaN(Number(related)))) return related;
  const capitalizedKey = entityKey.charAt(0).toUpperCase() + entityKey.slice(1);
  const explicitId = association?.[`${entityKey}Id`]
    ?? association?.[`${entityKey}_id`]
    ?? association?.[`id${capitalizedKey}`]
    ?? association?.[`id_${entityKey}`]
    ?? null;
  if (explicitId != null) return explicitId;
  const relatedName = typeof related === 'string'
    ? related
    : related?.nombre || [related?.nombres, related?.apellidos].filter(Boolean).join(' ');
  return entities.find((entity) => entity.nombre === relatedName)?.id ?? null;
};

const getAssociationName = (association, entityKey, entities, label) => {
  const related = association?.[entityKey];
  const capitalizedKey = entityKey.charAt(0).toUpperCase() + entityKey.slice(1);
  const directName = typeof related === 'string' && Number.isNaN(Number(related)) ? related : null;
  const nestedName = related?.nombre || [related?.nombres, related?.apellidos].filter(Boolean).join(' ');
  const denormalizedName = association?.[`${entityKey}Nombre`]
    ?? association?.[`${entityKey}_nombre`]
    ?? association?.[`nombre${capitalizedKey}`]
    ?? association?.[`nombre_${entityKey}`];
  const id = getAssociationId(association, entityKey)
    ?? (typeof related === 'string' && !Number.isNaN(Number(related)) ? related : null);
  const matchedEntity = entities.find((entity) => String(entity.id) === String(id));

  const matchedName = matchedEntity?.nombre || [matchedEntity?.nombres, matchedEntity?.apellidos].filter(Boolean).join(' ');
  return nestedName
    || directName
    || denormalizedName
    || matchedName
    || (id != null ? `${label} #${id}` : `Sin ${label.toLowerCase()}`);
};

const parseContractActiveStatus = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 0) return value === 1;
  if (typeof value !== 'string') return null;
  const normalizedStatus = value.trim().toLowerCase();
  if (['activo', 'activa', 'active', 'true', '1', 'vigente'].includes(normalizedStatus)) return true;
  if (['false', '0', 'inactivo', 'inactiva', 'inactive', 'finalizado', 'finalizada', 'cancelado', 'cancelada', 'vencido', 'vencida'].includes(normalizedStatus)) return false;
  return null;
};

const getContractActiveStatus = (association) => {
  const nestedContracts = [
    association?.contrato,
    association?.contract,
    association?.contratoJugador,
    association?.contrato_jugador,
    ...(Array.isArray(association?.contratos) ? association.contratos : []),
  ].filter((contract) => contract && typeof contract === 'object');
  const contractStatusKeys = [
    'contratoActivo', 'contrato_activo', 'activoContrato', 'activo_contrato',
    'contractActive', 'contract_active', 'isContractActive', 'is_contract_active',
  ];
  const nestedStatuses = nestedContracts
    .map((contract) => parseContractActiveStatus(
      contract.activo ?? contract.active ?? contract.estadoContrato ?? contract.estado_contrato ?? contract.estado,
    ))
    .filter((status) => status !== null);

  if (nestedStatuses.some(Boolean)) return true;
  if (nestedStatuses.length > 0) return false;

  for (const key of contractStatusKeys) {
    const status = parseContractActiveStatus(association?.[key]);
    if (status !== null) return status;
  }

  const hasContractData = nestedContracts.length > 0
    || Boolean(association?.equipo || association?.jugador)
    || ['contratoId', 'contrato_id', 'equipoId', 'equipo_id', 'jugadorId', 'jugador_id', 'fechaInicio', 'fecha_inicio', 'fechaFin', 'fecha_fin', 'salario']
      .some((key) => association?.[key] != null);
  if (!hasContractData) return null;
  return parseContractActiveStatus(
    association?.activo ?? association?.active ?? association?.estadoContrato ?? association?.estado_contrato ?? association?.estado,
  );
};

const isAssociationContractActive = (association) => getContractActiveStatus(association) !== false;

const getContractEndDate = (association) => {
  const nestedContract = association?.contrato
    || association?.contract
    || association?.contratoJugador
    || association?.contrato_jugador
    || (Array.isArray(association?.contratos)
      ? association.contratos.find((contract) => getContractActiveStatus(contract) === true) || association.contratos[0]
      : null);
  return association?.fechaFin
    ?? association?.fecha_fin
    ?? association?.fechaFinalizacion
    ?? association?.fecha_finalizacion
    ?? association?.fechaFinContrato
    ?? association?.fecha_fin_contrato
    ?? association?.fechaFinalizacionContrato
    ?? association?.fecha_finalizacion_contrato
    ?? association?.fechaVencimiento
    ?? association?.fecha_vencimiento
    ?? nestedContract?.fechaFin
    ?? nestedContract?.fecha_fin
    ?? nestedContract?.fechaFinalizacion
    ?? nestedContract?.fecha_finalizacion
    ?? nestedContract?.fechaFinContrato
    ?? nestedContract?.fecha_fin_contrato
    ?? nestedContract?.fechaFinalizacionContrato
    ?? nestedContract?.fecha_finalizacion_contrato
    ?? nestedContract?.fechaVencimiento
    ?? nestedContract?.fecha_vencimiento
    ?? null;
};

const formatDateWithoutTime = (date) => {
  if (!date) return null;
  return String(date).trim().split(/[T ]/)[0] || null;
};

const getTeamShieldUrl = (team) => {
  const shield = team?.escudo ?? team?.escudoUrl ?? team?.imagenEscudo ?? team?.logo;
  const path = typeof shield === 'string' ? shield.trim() : shield?.url ?? shield?.path ?? shield?.ruta;
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const baseUrl = import.meta.env.VITE_EQUIPOS_ASSET_BASE_URL
    || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);
  const normalizedPath = String(path).replace(/\\/g, '/');
  return new URL(normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`, `${baseUrl}/`).toString();
};

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
  const [selectedSport, setSelectedSport] = useState(null);
  const [sportDetails, setSportDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [teamDetailsLoading, setTeamDetailsLoading] = useState(false);
  const [teamTournamentData, setTeamTournamentData] = useState(null);
  const [teamTournamentsError, setTeamTournamentsError] = useState('');
  const [teamTournamentSportFilter, setTeamTournamentSportFilter] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [playerDetailsLoading, setPlayerDetailsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillDetails, setSkillDetails] = useState(null);
  const [skillDetailsLoading, setSkillDetailsLoading] = useState(false);
  const [form, setForm] = useState({});
  const [shieldFile, setShieldFile] = useState(null);
  const [existingShield, setExistingShield] = useState(null);
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
      setEquipoDeportes(getRelatedRecords(ed, ['equiposDeportes', 'equipoDeportes']));
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
    if (type === 'equipo') {
      setShieldFile(null);
      setExistingShield(null);
    }
    setForm(defaults[type]);
    setModal({ type, mode: 'create' });
  };

  const openEdit = (type, item) => {
    if (type === 'equipo') {
      setShieldFile(null);
      setExistingShield(getTeamShieldUrl(item));
    }
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
      equipo: {
        nombre: item.nombre,
        siglas: item.siglas,
        fechaFundacion: item.fechaFundacion,
        ciudad: item.ciudad,
        pais: item.pais,
        activo: item.activo,
        id: item.id,
      },
      jugador: {
        nombres: item.nombres,
        apellidos: item.apellidos,
        identificacion: item.identificacion ?? '',
        numeroCamiseta: item.numeroCamiseta,
        nacionalidad: item.nacionalidad ?? '',
        activo: item.activo,
        id: item.id,
      },
      habilidad: {
        nombre: item.nombre,
        descripcion: item.descripcion ?? '',
        activa: item.activa,
        id: item.id,
      },
      equipoDeporte: {
        ...item,
        equipoId: getAssociationId(item, 'equipo', equipos),
        deporteId: getAssociationId(item, 'deporte', deportes),
      },
      habilidadJugador: {
        ...item,
        jugadorId: getAssociationId(item, 'jugador', jugadores),
        habilidadId: getAssociationId(item, 'habilidad', habilidades),
      },
      contrato: {
        ...item,
        jugadorId: getAssociationId(item, 'jugador', jugadores),
        equipoId: getAssociationId(item, 'equipo', equipos),
      },
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
      if (type === 'equipo') {
        const teamPayload = {
          nombre: form.nombre,
          siglas: form.siglas,
          fechaFundacion: form.fechaFundacion,
          ciudad: form.ciudad,
          pais: form.pais,
          activo: form.activo,
        };
        if (shieldFile) {
          const multipartPayload = new FormData();
          Object.entries(teamPayload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) multipartPayload.append(key, String(value));
          });
          multipartPayload.append('escudo', shieldFile);
          mode === 'create'
            ? await equiposApi.create(multipartPayload)
            : await equiposApi.update(id, multipartPayload);
        } else {
          mode === 'create' ? await equiposApi.create(teamPayload) : await equiposApi.update(id, teamPayload);
        }
      }
      if (type === 'jugador') {
        const jugadorPayload = {
          nombres: form.nombres,
          apellidos: form.apellidos,
          identificacion: form.identificacion,
          numeroCamiseta: Number(form.numeroCamiseta),
          nacionalidad: form.nacionalidad,
          activo: form.activo,
        };
        mode === 'create'
          ? await jugadoresApi.create(jugadorPayload)
          : await jugadoresApi.update(id, jugadorPayload);
      }
      if (type === 'habilidad') {
        const habilidadPayload = {
          nombre: form.nombre,
          descripcion: form.descripcion ?? '',
          activa: form.activa,
        };
        mode === 'create'
          ? await habilidadesApi.create(habilidadPayload)
          : await habilidadesApi.update(id, habilidadPayload);
      }
      if (type === 'equipoDeporte') mode === 'create' ? await equiposDeportesApi.create(form) : await equiposDeportesApi.update(id, form);
      if (type === 'habilidadJugador') mode === 'create' ? await habilidadesJugadoresApi.create(form) : await habilidadesJugadoresApi.update(id, form);
      if (type === 'contrato') mode === 'create' ? await contratosApi.create(form) : await contratosApi.update(id, form);
      showToast(mode === 'create' ? 'Registro creado correctamente' : 'Registro actualizado correctamente', 'success');
      setModal(null);
      if (type === 'equipo') {
        setShieldFile(null);
        setExistingShield(null);
      }
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

  const openSportDetails = async (sport) => {
    setSelectedSport(sport);
    setSportDetails(null);
    setDetailsLoading(true);
    try {
      const [details, teams, subsports] = await Promise.all([
        deportesApi.getById(sport.id),
        deportesApi.getEquipos(sport.id),
        deportesApi.getSubdeportes(sport.id),
      ]);
      setSportDetails([
        { endpoint: `/deportes/${sport.id}`, data: details },
        { endpoint: `/deportes/${sport.id}/equipos`, data: teams },
        { endpoint: `/deportes/${sport.id}/subdeportes`, data: subsports },
      ]);
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del deporte', 'error');
      setSelectedSport(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openTeamDetails = async (team) => {
    setSelectedTeam(team);
    setTeamDetails(null);
    setTeamTournamentData(null);
    setTeamTournamentsError('');
    setTeamTournamentSportFilter('all');
    setTeamDetailsLoading(true);
    try {
      const [details, sports, players] = await Promise.all([
        equiposApi.getById(team.id),
        equiposApi.getDeportes(team.id),
        equiposApi.getJugadores(team.id),
      ]);
      setTeamDetails([
        { endpoint: `/equipos/${team.id}`, data: details },
        { endpoint: `/equipos/${team.id}/deportes`, data: sports },
        { endpoint: `/equipos/${team.id}/jugadores`, data: players },
      ]);
      try {
        const [tournaments, registrations] = await Promise.all([
          torneosApi.getAll(),
          inscripcionesApi.getAll(),
        ]);
        setTeamTournamentData({
          tournaments: getRelatedRecords(tournaments, ['torneos']),
          registrations: getRelatedRecords(registrations, ['inscripciones']),
        });
      } catch (error) {
        const message = error.message || 'No se pudieron consultar los torneos asociados al equipo';
        setTeamTournamentsError(message);
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del equipo', 'error');
      setSelectedTeam(null);
    } finally {
      setTeamDetailsLoading(false);
    }
  };

  const openPlayerDetails = async (player) => {
    setSelectedPlayer(player);
    setPlayerDetails(null);
    setPlayerDetailsLoading(true);
    try {
      const [details, profile, teams, skills] = await Promise.all([
        jugadoresApi.getById(player.id),
        jugadoresApi.getPerfil(player.id),
        jugadoresApi.getEquipos(player.id),
        jugadoresApi.getHabilidades(player.id),
      ]);
      setPlayerDetails([
        { endpoint: `/jugadores/${player.id}`, data: details },
        { endpoint: `/jugadores/${player.id}/perfil`, data: profile },
        { endpoint: `/jugadores/${player.id}/equipos`, data: teams },
        { endpoint: `/jugadores/${player.id}/habilidades`, data: skills },
      ]);
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles del jugador', 'error');
      setSelectedPlayer(null);
    } finally {
      setPlayerDetailsLoading(false);
    }
  };

  const openSkillDetails = async (skill) => {
    setSelectedSkill(skill);
    setSkillDetails(null);
    setSkillDetailsLoading(true);
    try {
      const [details, players] = await Promise.all([
        habilidadesApi.getById(skill.id),
        habilidadesApi.getJugadores(skill.id),
      ]);
      setSkillDetails([
        { endpoint: `/habilidades/${skill.id}`, data: details },
        { endpoint: `/habilidades/${skill.id}/jugadores`, data: players },
      ]);
    } catch (error) {
      showToast(error.message || 'No se pudieron consultar los detalles de la habilidad', 'error');
      setSelectedSkill(null);
    } finally {
      setSkillDetailsLoading(false);
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
      {['deporte', 'equipo', 'jugador', 'habilidad'].includes(type) && (
        <button
          className="btn-icon"
          title={`Ver detalles del ${type}`}
          onClick={() => {
            if (type === 'deporte') openSportDetails(item);
            if (type === 'equipo') openTeamDetails(item);
            if (type === 'jugador') openPlayerDetails(item);
            if (type === 'habilidad') openSkillDetails(item);
          }}
        >
          <ClipboardList size={16} color="#60a5fa" />
        </button>
      )}
      <button className="btn-icon" title="Editar" onClick={() => openEdit(type, item)}><Edit2 size={16} color="#f59e0b" /></button>
      {['deporte', 'equipo', 'jugador', 'habilidad'].includes(type) && (
        <button className="btn-icon" title={item.activo !== false && item.activa !== false ? 'Desactivar' : 'Activar'} onClick={() => toggleActive(type, item)}>
          <Power size={16} color={item.activo !== false && item.activa !== false ? '#22c55e' : '#94a3b8'} />
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
      {
        key: 'nombre',
        label: 'Equipo',
        render: (e) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {getTeamShieldUrl(e) && (
              <img
                src={getTeamShieldUrl(e)}
                alt={`Escudo de ${e.nombre}`}
                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,.06)', padding: 3 }}
              />
            )}
            <strong style={{ color: '#fff' }}>{e.nombre}</strong>
          </div>
        ),
      },
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
    equipoDeporte: [
      { key: 'equipo', label: 'Equipo', render: (r) => getAssociationName(r, 'equipo', equipos, 'Equipo') },
      { key: 'deporte', label: 'Deporte', render: (r) => getAssociationName(r, 'deporte', deportes, 'Deporte') },
      { key: 'fechaInscripcion', label: 'Inscripción', render: (r) => r.fechaInscripcion || '—' },
      { key: 'entrenador', label: 'Entrenador', render: (r) => r.entrenador || '—' },
      { key: 'categoria', label: 'Categoría', render: (r) => r.categoria || '—' },
      {
        key: 'actions',
        label: 'Acciones',
        align: 'right',
        render: (r) => <button className="btn-icon" onClick={() => removeItem('equipoDeporte', r)} title="Retirar asociación"><X size={16} color="#ef4444" /></button>,
      },
    ],
    habilidadJugador: [
      { key: 'jugador', label: 'Jugador', render: (r) => getAssociationName(r, 'jugador', jugadores, 'Jugador') },
      { key: 'habilidad', label: 'Habilidad', render: (r) => getAssociationName(r, 'habilidad', habilidades, 'Habilidad') },
      { key: 'nivel', label: 'Nivel', render: (r) => r.nivel ?? '—' },
      {
        key: 'actions',
        label: 'Acciones',
        align: 'right',
        render: (r) => <button className="btn-icon" onClick={() => removeItem('habilidadJugador', r)} title="Retirar habilidad"><X size={16} color="#ef4444" /></button>,
      },
    ],
    contrato: [
      { key: 'jugador', label: 'Jugador', render: (r) => getAssociationName(r, 'jugador', jugadores, 'Jugador') },
      { key: 'equipo', label: 'Equipo', render: (r) => getAssociationName(r, 'equipo', equipos, 'Equipo') },
      { key: 'fechaInicio', label: 'Inicio', render: (r) => r.fechaInicio || '—' },
      { key: 'fechaFin', label: 'Fin', render: (r) => r.fechaFin || 'Sin fecha fin' },
      { key: 'posicion', label: 'Posición', render: (r) => r.posicion || '—' },
      { key: 'activo', label: 'Estado', render: (r) => r.activo ? 'Activo' : 'Finalizado' },
      {
        key: 'actions',
        label: 'Acciones',
        align: 'right',
        render: (r) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }} onClick={(event) => event.stopPropagation()}>
            {r.activo && <button className="btn-icon" title="Finalizar contrato" onClick={async () => { await contratosApi.finalizar(r.id); showToast('Contrato finalizado', 'success'); await refresh(); }}><Activity size={16} color="#22c55e" /></button>}
            <button className="btn-icon" title="Retirar contrato" onClick={() => removeItem('contrato', r)}><X size={16} color="#ef4444" /></button>
          </div>
        ),
      },
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
        <form
          id="sports-form"
          className={['deporte', 'equipo'].includes(modal.type) ? 'sports-form-compact-checkboxes' : ''}
          onSubmit={save}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}
        >
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
            {(
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: '1 / -1', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Escudo del equipo {modal.mode === 'edit' ? '(opcional)' : ''}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setShieldFile(event.target.files?.[0] || null)}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                  {shieldFile
                    ? `Se usará la nueva imagen: ${shieldFile.name}`
                    : existingShield
                      ? 'Se conservará el escudo actual si no seleccionas otra imagen.'
                      : 'Selecciona una imagen para el escudo (opcional).'}
                </span>
                {!shieldFile && existingShield && (
                  <img
                    src={existingShield}
                    alt={`Escudo actual de ${form.nombre || 'equipo'}`}
                    style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 8, padding: 5, background: 'rgba(255,255,255,.06)' }}
                  />
                )}
              </label>
            )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              title: 'Equipos con deportes',
              count: equipoDeportes.length,
              data: equipoDeportes,
              columns: columns.equipoDeporte,
              emptyMessage: 'No hay equipos asociados a deportes.',
              actionLabel: 'Asociar',
              onAction: () => openCreate('equipoDeporte'),
            },
            {
              title: 'Jugadores con habilidades',
              count: habilidadJugadores.length,
              data: habilidadJugadores,
              columns: columns.habilidadJugador,
              emptyMessage: 'No hay jugadores asociados a habilidades.',
              actionLabel: 'Asignar',
              onAction: () => openCreate('habilidadJugador'),
            },
            {
              title: 'Contratos jugador-equipo',
              count: contratos.length,
              data: contratos,
              columns: columns.contrato,
              emptyMessage: 'No hay contratos registrados.',
              actionLabel: 'Contratar',
              onAction: () => openCreate('contrato'),
            },
          ].map(({ title, count, data, columns: tableColumns, emptyMessage, actionLabel, onAction }) => (
            <details key={title} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <summary style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 4px', color: 'var(--text-primary)' }}>
                <strong style={{ color: '#fff', fontSize: '1rem' }}>{title}</strong>
                <span className="badge badge-neutral">{count}</span>
              </summary>
              <div style={{ padding: '4px 0 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary" onClick={onAction}><Plus size={16} /> {actionLabel}</button>
                </div>
                <Table columns={tableColumns} data={data} loading={loading} emptyMessage={emptyMessage} />
              </div>
            </details>
          ))}
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
          {perfil && (() => {
            const playerProfile = perfil.jugador || {};
            const profileTeams = Array.isArray(perfil.equipos) ? perfil.equipos : [];
            const profileSkills = Array.isArray(perfil.habilidades) ? perfil.habilidades : [];
            const playerName = [playerProfile.nombres, playerProfile.apellidos].filter(Boolean).join(' ') || 'Jugador';

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <section style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, border: '1px solid var(--border)', borderRadius: 12, background: 'linear-gradient(120deg, rgba(117,230,163,.1), rgba(145,184,255,.06))' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 58, height: 58, flexShrink: 0, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <UserRound size={28} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{playerName}</h2>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                      <span>Identificación: {playerProfile.identificacion || 'Sin registrar'}</span>
                      <span>Camiseta: {playerProfile.numeroCamiseta ?? '—'}</span>
                      {playerProfile.nacionalidad && <span>{playerProfile.nacionalidad}</span>}
                    </div>
                  </div>
                  {typeof playerProfile.activo === 'boolean' && (
                    <span className={`badge ${playerProfile.activo ? 'badge-active' : 'badge-inactive'}`}>
                      {playerProfile.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Equipos</h3>
                      <span className="badge badge-neutral">{profileTeams.length}</span>
                    </div>
                    {profileTeams.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {profileTeams.map((team, index) => (
                          <article key={team.contrato_id || team.id || index} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, borderRadius: 9, background: 'rgba(255,255,255,.035)' }}>
                            <Users size={18} color="var(--accent)" />
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ color: '#fff' }}>{team.equipo_nombre || team.equipo?.nombre || team.nombre || 'Equipo'}</strong>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>
                                {team.posicion || 'Equipo asociado'}
                              </div>
                              {(() => {
                                const contractActive = getContractActiveStatus(team);
                                const endDate = formatDateWithoutTime(getContractEndDate(team));
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                                    <span className={`badge ${contractActive === true ? 'badge-active' : contractActive === false ? 'badge-inactive' : 'badge-neutral'}`}>
                                      {contractActive === true ? 'Contrato activo' : contractActive === false ? 'Contrato finalizado' : 'Estado no disponible'}
                                    </span>
                                    {contractActive === true && (
                                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                        {endDate ? `Finaliza: ${endDate}` : 'Sin fecha de finalización'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{perfil.mensajeEquipos || 'Este jugador no tiene equipos asociados.'}</p>}
                  </section>

                  <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} /> Habilidades</h3>
                      <span className="badge badge-neutral">{profileSkills.length}</span>
                    </div>
                    {profileSkills.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {profileSkills.map((skill, index) => (
                          <article key={skill.relacion_id || skill.id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 9, background: 'rgba(255,255,255,.035)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                              <Activity size={18} color="var(--accent)" />
                              <strong style={{ color: '#fff', overflowWrap: 'anywhere' }}>{skill.habilidad_nombre || skill.habilidad?.nombre || skill.nombre || 'Habilidad'}</strong>
                            </div>
                            {skill.nivel != null && <span className="badge badge-neutral">Nivel {skill.nivel}</span>}
                          </article>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{perfil.mensajeHabilidades || 'Este jugador no tiene habilidades registradas.'}</p>}
                  </section>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {renderModal()}
      <Modal
        isOpen={!!selectedSport}
        onClose={() => setSelectedSport(null)}
        title={`Detalles de ${selectedSport?.nombre || 'deporte'}`}
        maxWidth="820px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedSport(null)}>Cerrar</button>}
      >
        {detailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del deporte...
          </div>
        ) : sportDetails && (() => {
          const sport = sportDetails[0]?.data?.data ?? sportDetails[0]?.data ?? {};
          const teams = getRelatedRecords(sportDetails[1]?.data, ['equipos']);
          const subsports = getRelatedRecords(sportDetails[2]?.data, ['subdeportes']);
          const sportFields = getDetailFields(sport, ['nombre', 'descripcion', 'activo', 'activa', 'esColectivo', 'minJugadores', 'maxJugadores']);

          const renderRelatedCard = (item, kind, index) => {
            const related = item.equipo || item.subdeporte || item;
            const fieldsSource = { ...item, ...related };
            const name = related.nombre || related.equipoNombre || related.equipo_nombre || `${kind} ${index + 1}`;
            const description = related.descripcion || [related.ciudad, related.pais].filter(Boolean).join(', ');
            const active = typeof related.activo === 'boolean' ? related.activo : related.activa;
            const shieldUrl = kind === 'Equipo' ? getTeamShieldUrl(fieldsSource) : null;
            const fields = getDetailFields(fieldsSource, [
              'nombre', 'descripcion', 'activo', 'activa', 'ciudad', 'pais',
              ...(kind === 'Subdeporte' ? ['deportePadreId', 'deporte_padre_id', 'idDeportePadre', 'id_deporte_padre'] : []),
              ...(kind === 'Equipo' ? ['escudo', 'escudoUrl', 'imagenEscudo', 'logo'] : []),
            ]);

            return (
              <article key={related.id || item.id || `${kind}-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {shieldUrl
                        ? <img src={shieldUrl} alt={`Escudo de ${name}`} style={{ width: 38, height: 38, objectFit: 'contain', padding: 3 }} />
                        : kind === 'Equipo' ? <Users size={19} /> : <Trophy size={19} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ color: '#fff', margin: 0, overflowWrap: 'anywhere' }}>{name}</h4>
                      {description && <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.84rem' }}>{description}</p>}
                    </div>
                  </div>
                  {typeof active === 'boolean' && (
                    <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
                  )}
                </div>
                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 16 }}>
                    {fields.map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 3 }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem', overflowWrap: 'anywhere' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.07))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      <Trophy size={24} />
                    </span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{sport.nombre || selectedSport?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{sport.descripcion || 'Sin descripción disponible'}</p>
                    </div>
                  </div>
                  <span className={`badge ${(sport.activo ?? sport.activa) ? 'badge-active' : 'badge-inactive'}`}>
                    {(sport.activo ?? sport.activa) ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginTop: 20 }}>
                  <div style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Modalidad</div>
                    <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{sport.esColectivo ? 'Colectivo' : 'Individual'}</strong>
                  </div>
                  <div style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Jugadores por equipo</div>
                    <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{sport.minJugadores ?? '—'} - {sport.maxJugadores ?? '—'}</strong>
                  </div>
                  {sportFields.map(({ label, value }) => (
                    <div key={label} style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff', overflowWrap: 'anywhere' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Equipos asociados</h3>
                  <span className="badge badge-neutral">{teams.length}</span>
                </div>
                {teams.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {teams.map((team, index) => renderRelatedCard(team, 'Equipo', index))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este deporte todavía no tiene equipos asociados.</p>}
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Subdeportes</h3>
                  <span className="badge badge-neutral">{subsports.length}</span>
                </div>
                {subsports.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {subsports.map((subsport, index) => renderRelatedCard(subsport, 'Subdeporte', index))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este deporte no tiene subdeportes registrados.</p>}
              </section>
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        title={`Detalles de ${selectedTeam?.nombre || 'equipo'}`}
        maxWidth="820px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedTeam(null)}>Cerrar</button>}
      >
        {teamDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del equipo...
          </div>
        ) : teamDetails && (() => {
          const team = teamDetails[0]?.data?.data ?? teamDetails[0]?.data ?? {};
          const shieldUrl = getTeamShieldUrl(team);
          const sports = getRelatedRecords(teamDetails[1]?.data, ['deportes']);
          const players = getRelatedRecords(teamDetails[2]?.data, ['jugadores']).filter(isAssociationContractActive);
          const teamSports = sports.map((association) => {
            const relatedSport = association.deporte || association.sport || association;
            const id = getAssociationId(association, 'deporte', deportes)
              ?? getAssociationId(association, 'sport', deportes)
              ?? relatedSport.id
              ?? association.deporteId
              ?? association.deporte_id;
            const name = relatedSport.nombre
              || association.deporteNombre
              || association.deporte_nombre
              || deportes.find((sport) => String(sport.id) === String(id))?.nombre
              || (id != null ? `Deporte #${id}` : 'Deporte');
            return { id, name };
          }).filter((sport, index, list) => sport.id != null
            && list.findIndex((candidate) => String(candidate.id) === String(sport.id)) === index);
          const teamRegistrations = (teamTournamentData?.registrations || []).filter((registration) => {
            const registrationTeamId = getAssociationId(registration, 'equipo', equipos);
            if (registrationTeamId != null) return String(registrationTeamId) === String(team.id);
            return getAssociationName(registration, 'equipo', equipos, 'Equipo').toLowerCase()
              === String(team.nombre || selectedTeam?.nombre || '').toLowerCase();
          });
          const tournamentById = new Map(
            (teamTournamentData?.tournaments || []).map((tournament) => [String(tournament.id), tournament]),
          );
          const associatedTournamentMap = new Map();
          teamRegistrations.forEach((registration) => {
            const registrationTournamentId = getAssociationId(registration, 'torneo');
            const relatedTournament = registration.torneo && typeof registration.torneo === 'object'
              ? registration.torneo
              : null;
            const tournament = relatedTournament
              || tournamentById.get(String(registrationTournamentId))
              || (typeof registration.torneo === 'string' && Number.isNaN(Number(registration.torneo))
                ? (teamTournamentData?.tournaments || []).find((item) => item.nombre === registration.torneo)
                : null);
            const tournamentId = tournament?.id ?? registrationTournamentId;
            if (tournament && tournamentId != null) {
              const key = String(tournamentId);
              if (!associatedTournamentMap.has(key)) {
                associatedTournamentMap.set(key, { id: tournamentId, tournament, registration });
              }
            }
          });
          const associatedTournaments = Array.from(associatedTournamentMap.values());
          const getTournamentSportId = (tournament) => getAssociationId(tournament, 'deporte', deportes)
            ?? getAssociationId(tournament, 'sport', deportes)
            ?? tournament.deporteId
            ?? tournament.deporte_id
            ?? null;
          const filteredTournaments = associatedTournaments.filter(({ tournament }) =>
            teamTournamentSportFilter === 'all'
            || String(getTournamentSportId(tournament)) === teamTournamentSportFilter);
          const formatDate = (value) => value ? String(value).split('T')[0] : '—';
          const teamFields = getDetailFields(team, [
            'nombre', 'siglas', 'ciudad', 'pais', 'fechaFundacion', 'activo', 'activa',
            'escudo', 'escudoUrl', 'imagenEscudo', 'logo',
          ]);

          const renderTeamRelationCard = (item, kind, index) => {
            const related = item.deporte || item.jugador || item;
            const fieldsSource = { ...item, ...related };
            const name = kind === 'Jugador'
              ? [related.nombres, related.apellidos].filter(Boolean).join(' ')
                || related.nombre
                || item.jugadorNombre
                || item.jugador_nombre
                || (() => {
                  const associationName = getAssociationName(item, 'jugador', jugadores, 'Jugador');
                  return associationName.startsWith('Sin ') ? null : associationName;
                })()
                || `${kind} ${index + 1}`
              : related.nombre || related.deporteNombre || `${kind} ${index + 1}`;
            const description = related.descripcion
              || [related.siglas, related.nacionalidad, related.ciudad, related.pais].filter(Boolean).join(' · ');
            const active = typeof related.activo === 'boolean' ? related.activo : related.activa;
            const fields = getDetailFields(fieldsSource, [
              'nombre', 'nombres', 'apellidos', 'descripcion', 'activo', 'activa',
              'siglas', 'nacionalidad', 'ciudad', 'pais',
              ...(kind === 'Jugador' ? ['equipoNombre', 'equipo_nombre', 'equipoId', 'equipo_id', 'idEquipo', 'id_equipo'] : []),
              ...(kind === 'Jugador' ? ['jugadorNombre', 'jugador_nombre', 'nombreJugador', 'nombre_jugador'] : []),
            ]);

            return (
              <article key={related.id || item.id || `${kind}-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {kind === 'Jugador' ? <UserRound size={19} /> : <Trophy size={19} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ color: '#fff', margin: 0, overflowWrap: 'anywhere' }}>{name}</h4>
                      {description && <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.84rem' }}>{description}</p>}
                    </div>
                  </div>
                  {typeof active === 'boolean' && (
                    <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
                  )}
                </div>
                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 16 }}>
                    {fields.map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 3 }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem', overflowWrap: 'anywhere' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.07))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {shieldUrl
                        ? <img src={shieldUrl} alt={`Escudo de ${team.nombre || selectedTeam?.nombre}`} style={{ width: 48, height: 48, objectFit: 'contain', padding: 4 }} />
                        : <Users size={24} />}
                    </span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{team.nombre || selectedTeam?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{[team.ciudad, team.pais].filter(Boolean).join(', ') || 'Ubicación no especificada'}</p>
                    </div>
                  </div>
                  <span className={`badge ${(team.activo ?? team.activa) ? 'badge-active' : 'badge-inactive'}`}>
                    {(team.activo ?? team.activa) ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginTop: 20 }}>
                  <div style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Siglas</div>
                    <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{team.siglas || '—'}</strong>
                  </div>
                  <div style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Fecha de fundación</div>
                    <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{team.fechaFundacion || '—'}</strong>
                  </div>
                  {teamFields.map(({ label, value }) => (
                    <div key={label} style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,.035)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{label}</div>
                      <strong style={{ display: 'block', marginTop: 4, color: '#fff', overflowWrap: 'anywhere' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Deportes asociados</h3>
                  <span className="badge badge-neutral">{sports.length}</span>
                </div>
                {sports.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {sports.map((sport, index) => renderTeamRelationCard(sport, 'Deporte', index))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este equipo todavía no tiene deportes asociados.</p>}
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> Torneos asociados</h3>
                    <span className="badge badge-neutral">{filteredTournaments.length}</span>
                  </div>
                  {teamSports.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                      Filtrar por deporte
                      <select
                        value={teamTournamentSportFilter}
                        onChange={(event) => setTeamTournamentSportFilter(event.target.value)}
                        style={{ width: 'auto', minWidth: 150 }}
                      >
                        <option value="all">Todos los deportes</option>
                        {teamSports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                {teamTournamentsError ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{teamTournamentsError}</p>
                ) : !teamTournamentData ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Consultando torneos asociados...</p>
                ) : filteredTournaments.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {filteredTournaments.map(({ id, tournament, registration }) => {
                      const tournamentSportId = getTournamentSportId(tournament);
                      const tournamentSportName = tournament.deporte?.nombre
                        || tournament.sport?.nombre
                        || teamSports.find((sport) => String(sport.id) === String(tournamentSportId))?.name
                        || deportes.find((sport) => String(sport.id) === String(tournamentSportId))?.nombre
                        || 'Deporte no especificado';
                      const active = tournament.activo ?? tournament.activa;
                      return (
                        <article key={id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Trophy size={19} /></span>
                              <div style={{ minWidth: 0 }}>
                                <h4 style={{ color: '#fff', margin: 0, overflowWrap: 'anywhere' }}>{tournament.nombre || `Torneo #${tournament.id}`}</h4>
                                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.84rem' }}>
                                  {[tournament.edicion, tournamentSportName].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                            </div>
                            {typeof active === 'boolean' && (
                              <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 16 }}>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 3 }}>Inicio</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>{formatDate(tournament.fechaInicio)}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 3 }}>Fin</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>{formatDate(tournament.fechaFin)}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 3 }}>Inscripción</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>{registration.estado || 'Registrado'}</div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {associatedTournaments.length
                      ? 'No hay torneos de este deporte asociados al equipo.'
                      : 'Este equipo todavía no tiene inscripciones en torneos.'}
                  </p>
                )}
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><UserRound size={18} /> Jugadores</h3>
                  <span className="badge badge-neutral">{players.length}</span>
                </div>
                {players.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {players.map((player, index) => renderTeamRelationCard(player, 'Jugador', index))}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este equipo todavía no tiene jugadores asociados.</p>}
              </section>
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        title={`Detalles de ${selectedPlayer ? `${selectedPlayer.nombres} ${selectedPlayer.apellidos}` : 'jugador'}`}
        maxWidth="860px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedPlayer(null)}>Cerrar</button>}
      >
        {playerDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información del jugador...
          </div>
        ) : playerDetails && (() => {
          const player = playerDetails[0]?.data?.data ?? playerDetails[0]?.data ?? {};
          const profile = playerDetails[1]?.data?.data ?? playerDetails[1]?.data ?? {};
          const profilePlayer = profile.jugador || player;
          const playerName = [profilePlayer.nombres, profilePlayer.apellidos].filter(Boolean).join(' ') || `${selectedPlayer?.nombres || ''} ${selectedPlayer?.apellidos || ''}`.trim();
          const endpointTeams = getRelatedRecords(playerDetails[2]?.data, ['equipos']);
          const endpointSkills = getRelatedRecords(playerDetails[3]?.data, ['habilidades']);
          const teams = (endpointTeams.length ? endpointTeams : getRelatedRecords(profile.equipos, ['equipos']))
            .filter(isAssociationContractActive);
          const skills = endpointSkills.length ? endpointSkills : getRelatedRecords(profile.habilidades, ['habilidades']);
          const playerFields = getDetailFields(profilePlayer, [
            'id', 'nombres', 'apellidos', 'identificacion', 'numeroCamiseta', 'nacionalidad', 'activo', 'activa',
          ]);
          const profileFields = getDetailFields(profile, [
            'id', 'jugador', 'equipos', 'habilidades', 'mensajeEquipos', 'mensajeHabilidades',
          ]);

          const relationCard = (item, kind, index) => {
            const related = item[kind === 'Equipo' ? 'equipo' : 'habilidad'] || item;
            const name = kind === 'Equipo'
              ? related.nombre
                || item.equipo_nombre
                || item.equipoNombre
                || (() => {
                  const associationName = getAssociationName(item, 'equipo', equipos, 'Equipo');
                  return associationName.startsWith('Sin ') ? null : associationName;
                })()
                || `${kind} ${index + 1}`
              : related.nombre || item.habilidad_nombre || item.habilidadNombre || `${kind} ${index + 1}`;
            const description = kind === 'Equipo'
              ? [related.siglas, related.ciudad, related.pais].filter(Boolean).join(' · ')
              : related.descripcion;
            const skillActive = kind === 'Habilidad'
              ? related.activa ?? related.activo ?? item.habilidadActiva ?? item.habilidad_activa
              : null;
            const relationFields = kind === 'Equipo'
              ? ['equipo_nombre', 'equipoNombre', 'equipoId', 'equipo_id', 'idEquipo', 'id_equipo']
              : ['habilidad_nombre', 'habilidadNombre', 'habilidadId', 'habilidad_id', 'idHabilidad', 'id_habilidad', 'habilidadActiva', 'habilidad_activa'];
            const fields = getDetailFields({ ...item, ...related }, [
              'nombre', 'descripcion', 'siglas', 'ciudad', 'pais', 'nacionalidad', 'activo', 'activa',
              ...relationFields,
            ]);

            return (
              <article key={related.id || item.id || `${kind}-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {kind === 'Equipo' ? <Users size={18} /> : <Activity size={18} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: '#fff', overflowWrap: 'anywhere' }}>{name}</strong>
                      {description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{description}</div>}
                    </div>
                  </div>
                  {kind === 'Habilidad' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                      {typeof skillActive === 'boolean' && (
                        <span className={`badge ${skillActive ? 'badge-active' : 'badge-inactive'}`}>
                          {skillActive ? 'Activa' : 'Inactiva'}
                        </span>
                      )}
                      {item.nivel != null && <span className="badge badge-neutral">Nivel {item.nivel}</span>}
                    </div>
                  )}
                </div>
                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 10, marginTop: 13 }}>
                    {fields.map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, flexShrink: 0, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <UserRound size={26} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{playerName}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      <span>Identificación: {profilePlayer.identificacion || 'Sin registrar'}</span>
                      <span>Camiseta: {profilePlayer.numeroCamiseta ?? '—'}</span>
                      {profilePlayer.nacionalidad && <span>{profilePlayer.nacionalidad}</span>}
                    </div>
                  </div>
                  {typeof profilePlayer.activo === 'boolean' && (
                    <span className={`badge ${profilePlayer.activo ? 'badge-active' : 'badge-inactive'}`}>
                      {profilePlayer.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </div>
                {playerFields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 18 }}>
                    {playerFields.map(({ label, value }) => (
                      <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                        <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {profileFields.length > 0 && (
                <section>
                  <h3 style={{ color: '#fff', margin: '0 0 10px' }}>Perfil deportivo</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {profileFields.map(({ label, value }) => (
                      <div key={label} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 9 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {[
                { title: 'Equipos', icon: Users, items: teams, kind: 'Equipo', empty: profile.mensajeEquipos || 'El jugador no tiene equipos asociados.' },
                { title: 'Habilidades', icon: Activity, items: skills, kind: 'Habilidad', empty: profile.mensajeHabilidades || 'El jugador no tiene habilidades registradas.' },
              ].map(({ title, icon: Icon, items, kind, empty }) => (
                <section key={title}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={18} /> {title}</h3>
                    <span className="badge badge-neutral">{items.length}</span>
                  </div>
                  {items.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
                      {items.map((item, index) => relationCard(item, kind, index))}
                    </div>
                  ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{empty}</p>}
                </section>
              ))}
            </div>
          );
        })()}
      </Modal>
      <Modal
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        title={`Detalles de ${selectedSkill?.nombre || 'habilidad'}`}
        maxWidth="820px"
        footer={<button className="btn btn-secondary" onClick={() => setSelectedSkill(null)}>Cerrar</button>}
      >
        {skillDetailsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 8px', color: 'var(--text-secondary)' }}>
            <Activity size={20} /> Consultando información de la habilidad...
          </div>
        ) : skillDetails && (() => {
          const skill = skillDetails[0]?.data?.data ?? skillDetails[0]?.data ?? {};
          const players = getRelatedRecords(skillDetails[1]?.data, ['jugadores']);
          const playerCard = (item, index) => {
            const player = item.jugador || item;
            const name = [player.nombres, player.apellidos].filter(Boolean).join(' ')
              || player.nombre
              || item.jugadorNombre
              || item.jugador_nombre
              || (() => {
                const associationName = getAssociationName(item, 'jugador', jugadores, 'Jugador');
                return associationName.startsWith('Sin ') ? null : associationName;
              })()
              || `Jugador ${index + 1}`;
            const fields = getDetailFields({ ...item, ...player }, [
              'nombres', 'apellidos', 'nombre', 'activo', 'activa', 'jugadorNombre', 'jugador_nombre',
              'jugadorId', 'jugador_id', 'idJugador', 'id_jugador',
            ]);
            return (
              <article key={player.id || item.id || `player-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}><UserRound size={18} /></span>
                  <div>
                    <strong style={{ color: '#fff' }}>{name}</strong>
                    {player.identificacion && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>ID: {player.identificacion}</div>}
                  </div>
                </div>
                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 13 }}>
                    {fields.map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', marginTop: 2 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          };

          const skillFields = getDetailFields(skill, ['id', 'nombre', 'descripcion', 'activa', 'activo']);
          const active = skill.activa ?? skill.activo;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--bg-secondary), rgba(117,230,163,.08))' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Activity size={24} /></span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{skill.nombre || selectedSkill?.nombre}</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0' }}>{skill.descripcion || 'Sin descripción disponible'}</p>
                    </div>
                  </div>
                  {typeof active === 'boolean' && <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Activa' : 'Inactiva'}</span>}
                </div>
                {skillFields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
                    {skillFields.map(({ label, value }) => (
                      <div key={label} style={{ padding: 11, borderRadius: 8, background: 'rgba(255,255,255,.035)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{label}</div>
                        <strong style={{ display: 'block', marginTop: 4, color: '#fff' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Jugadores con esta habilidad</h3>
                  <span className="badge badge-neutral">{players.length}</span>
                </div>
                {players.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
                    {players.map(playerCard)}
                  </div>
                ) : <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Ningún jugador tiene esta habilidad registrada.</p>}
              </section>
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
