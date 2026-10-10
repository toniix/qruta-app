import { useState, useEffect, useRef } from 'react';
import { Route, MapPin, Bus, LogOut, Plus, Trash2, Edit2, Save, Building2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { adminLineService } from '../../services/adminLineService';
import { adminStopService } from '../../services/adminStopService';
import { adminRouteService } from '../../services/adminRouteService';
import { cityService } from '../../services/cityService';
import { useNavigate } from 'react-router-dom';
import { BRAND_PRIMARY } from '../../constants/brand';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('routes');
  const [lines, setLines] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [editCity, setEditCity] = useState(null);
  const [editLine, setEditLine] = useState(null);
  const [editStop, setEditStop] = useState(null);
  const [editRoute, setEditRoute] = useState(null);

  // Form fields
  const [cityForm, setCityForm] = useState({ name: '', department: '', country: 'Peru' });
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const PERU_DEPARTMENTS = [
    'Amazonas', 'Ancash', 'Apurimac', 'Arequipa', 'Ayacucho',
    'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huanuco',
    'Ica', 'Junin', 'La Libertad', 'Lambayeque', 'Lima',
    'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
    'Puno', 'San Martin', 'Tacna', 'Tumbes', 'Ucayali'
  ];

  const filteredDepartments = PERU_DEPARTMENTS.filter(d =>
    d.toLowerCase().includes(departmentSearch.toLowerCase())
  );
  const [lineForm, setLineForm] = useState({ cityId: '', name: '', code: '', color: BRAND_PRIMARY, company: '', contact: '', description: '' });
  const [stopForm, setStopForm] = useState({ cityId: '', name: '', latitude: '', longitude: '', reference: '', address: '', isAccessible: true });
  const [routeForm, setRouteForm] = useState({ transportLineId: '', code: '', name: '', color: BRAND_PRIMARY, fare: '', schedule: '', frequency: '', description: '' });

  const navigate = useNavigate();
  const deptDropdownRef = useRef(null);

  // Cerrar dropdown de departamentos al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setShowDepartmentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    const [fetchedLines, fetchedRoutes, fetchedStops, fetchedCities] = await Promise.all([
      adminLineService.getAllLines(),
      adminRouteService.getAllRoutes(),
      adminStopService.getAllStops(),
      cityService.getAdminCities(),
    ]);
    return { fetchedLines, fetchedRoutes, fetchedStops, fetchedCities };
  };

  const applyData = ({ fetchedLines, fetchedRoutes, fetchedStops, fetchedCities }) => {
    setLines(fetchedLines);
    setRoutes(fetchedRoutes);
    setStops(fetchedStops);
    setCities(fetchedCities);
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      applyData(await fetchAllData());
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load. `loading` already starts as true, so this only writes state after
  // the request settles — no synchronous reset that would cost an extra render.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchAllData();
        if (isMounted) applyData(data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error cargando datos:', err);
        setError('No se pudieron cargar los datos. Verifica tu conexión.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  const resetLineForm = () => {
    setLineForm({ cityId: cities[0]?.id || '', name: '', code: '', color: BRAND_PRIMARY, company: '', contact: '', description: '' });
    setShowAddLine(false);
    setEditLine(null);
  };

  const resetCityForm = () => {
    setCityForm({ name: '', department: '', country: 'Peru' });
    setDepartmentSearch('');
    setShowDepartmentDropdown(false);
    setShowAddCity(false);
    setEditCity(null);
  };

  const resetStopForm = () => {
    setStopForm({ cityId: cities[0]?.id || '', name: '', latitude: '', longitude: '', reference: '', address: '', isAccessible: true });
    setShowAddStop(false);
    setEditStop(null);
  };

  const resetRouteForm = () => {
    setRouteForm({ transportLineId: lines[0]?.id || '', code: '', name: '', color: BRAND_PRIMARY, fare: '', schedule: '', frequency: '', description: '' });
    setShowAddRoute(false);
    setEditRoute(null);
  };

  const handleCreateLine = async (e) => {
    e.preventDefault();
    try {
      await adminLineService.createLine(lineForm);
      resetLineForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear línea');
    }
  };

  const handleUpdateLine = async (e) => {
    e.preventDefault();
    try {
      await adminLineService.updateLine(editLine.id, lineForm);
      resetLineForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar línea');
    }
  };

  const handleDeleteLine = async (id) => {
    if (!confirm('¿Eliminar esta línea?')) return;
    try {
      await adminLineService.deleteLine(id);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar línea');
    }
  };

  const handleCreateCity = async (e) => {
    e.preventDefault();
    try {
      await cityService.createCity(cityForm);
      resetCityForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear ciudad');
    }
  };

  const handleUpdateCity = async (e) => {
    e.preventDefault();
    try {
      await cityService.updateCity(editCity.id, cityForm);
      resetCityForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar ciudad');
    }
  };

  const handleDeleteCity = async (id) => {
    if (!confirm('¿Eliminar esta ciudad? Se eliminarán también sus líneas y paraderos.')) return;
    try {
      await cityService.deleteCity(id);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar ciudad');
    }
  };

  const handleCreateStop = async (e) => {
    e.preventDefault();
    try {
      await adminStopService.createStop(stopForm);
      resetStopForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear paradero');
    }
  };

  const handleUpdateStop = async (e) => {
    e.preventDefault();
    try {
      await adminStopService.updateStop(editStop.id, stopForm);
      resetStopForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar paradero');
    }
  };

  const handleDeleteStop = async (id) => {
    if (!confirm('¿Eliminar este paradero?')) return;
    try {
      await adminStopService.deleteStop(id);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar paradero');
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      await adminRouteService.createRoute(routeForm);
      resetRouteForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear ruta');
    }
  };

  const handleUpdateRoute = async (e) => {
    e.preventDefault();
    try {
      await adminRouteService.updateRoute(editRoute.id, routeForm);
      resetRouteForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar ruta');
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!confirm('¿Eliminar esta ruta?')) return;
    try {
      await adminRouteService.deleteRoute(id);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar ruta');
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Panel Administrativo RutaYa</h1>
          <p className="text-xs text-slate-500">Gestión central de líneas, rutas y paraderos</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline ml-auto">Cerrar</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Cargando datos...</div>
      ) : (
        <>
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'routes', label: 'Rutas', count: routes.length, icon: Route },
              { id: 'lines', label: 'Líneas', count: lines.length, icon: Bus },
              { id: 'stops', label: 'Paraderos', count: stops.length, icon: MapPin },
              { id: 'cities', label: 'Ciudades', count: cities.length, icon: Building2 },
            ].map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === id ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label} ({count})</span>
              </button>
            ))}
          </div>

          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-800">Listado de Rutas Registradas</h2>
                <button onClick={() => { resetRouteForm(); setShowAddRoute(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Nueva Ruta
                </button>
              </div>

              {showAddRoute && (
                <form onSubmit={handleCreateRoute} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
                  <h3 className="font-bold text-blue-900">Nueva Ruta</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <select value={routeForm.transportLineId} onChange={(e) => setRouteForm({ ...routeForm, transportLineId: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <option value="">Seleccionar línea...</option>
                      {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <input type="text" placeholder="Código (ej. R101)" required value={routeForm.code} onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Nombre de la ruta" required value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Tarifa (ej. S/ 2.50)" value={routeForm.fare} onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Horario (ej. 06:00 - 22:00)" value={routeForm.schedule} onChange={(e) => setRouteForm({ ...routeForm, schedule: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Frecuencia (ej. Cada 10 min)" value={routeForm.frequency} onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="color" value={routeForm.color} onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })} className="p-1 h-10 rounded-xl border border-slate-200" />
                    <input type="text" placeholder="Descripción" value={routeForm.description} onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl col-span-full" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={resetRouteForm} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              {editRoute && (
                <form onSubmit={handleUpdateRoute} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <h3 className="font-bold text-amber-900">Editar Ruta</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input type="text" placeholder="Código" required value={routeForm.code} onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Nombre" required value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Tarifa" value={routeForm.fare} onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Horario" value={routeForm.schedule} onChange={(e) => setRouteForm({ ...routeForm, schedule: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Frecuencia" value={routeForm.frequency} onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="color" value={routeForm.color} onChange={(e) => setRouteForm({ ...routeForm, color: e.target.value })} className="p-1 h-10 rounded-xl border border-slate-200" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditRoute(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Línea</th>
                      <th className="p-3">Tarifa</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-blue-600">{r.code}</td>
                        <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                        <td className="p-3">{r.transportLineName}</td>
                        <td className="p-3 font-bold text-emerald-600">{r.fare || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditRoute(r); setRouteForm({ code: r.code, name: r.name, color: r.color, fare: r.fare, schedule: r.schedule, frequency: r.frequency, description: r.description, transportLineId: r.transportLineId }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteRoute(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LINES TAB */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-800">Líneas de Transporte</h2>
                <button onClick={() => { resetLineForm(); setShowAddLine(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Nueva Línea
                </button>
              </div>

              {showAddLine && (
                <form onSubmit={handleCreateLine} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
                  <h3 className="font-bold text-blue-900">Nueva Línea</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <select value={lineForm.cityId} onChange={(e) => setLineForm({ ...lineForm, cityId: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <option value="">Seleccionar ciudad...</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="text" placeholder="Nombre de la línea" required value={lineForm.name} onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Código (ej. L1)" value={lineForm.code} onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="color" value={lineForm.color} onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })} className="p-1 h-10 rounded-xl border border-slate-200" />
                    <input type="text" placeholder="Empresa" value={lineForm.company} onChange={(e) => setLineForm({ ...lineForm, company: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Contacto" value={lineForm.contact} onChange={(e) => setLineForm({ ...lineForm, contact: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Descripción" value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl col-span-full" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={resetLineForm} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              {editLine && (
                <form onSubmit={handleUpdateLine} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <h3 className="font-bold text-amber-900">Editar Línea</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input type="text" placeholder="Nombre" required value={lineForm.name} onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Código" value={lineForm.code} onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="color" value={lineForm.color} onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })} className="p-1 h-10 rounded-xl border border-slate-200" />
                    <input type="text" placeholder="Empresa" value={lineForm.company} onChange={(e) => setLineForm({ ...lineForm, company: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Contacto" value={lineForm.contact} onChange={(e) => setLineForm({ ...lineForm, contact: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditLine(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lines.map((l) => (
                  <div key={l.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {l.color && <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: l.color }} />}
                        <h3 className="font-bold text-slate-900 text-sm">{l.name}</h3>
                        {l.code && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{l.code}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditLine(l); setLineForm({ cityId: l.cityId, name: l.name, code: l.code, color: l.color, company: l.company, contact: l.contact, description: l.description }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteLine(l.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {l.company && <p className="text-xs text-slate-600">Empresa: <strong>{l.company}</strong></p>}
                    {l.contact && <p className="text-xs text-slate-500">Contacto: {l.contact}</p>}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${l.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STOPS TAB */}
          {activeTab === 'stops' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-800">Paraderos Registrados</h2>
                <button onClick={() => { resetStopForm(); setShowAddStop(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Nuevo Paradero
                </button>
              </div>

              {showAddStop && (
                <form onSubmit={handleCreateStop} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
                  <h3 className="font-bold text-blue-900">Nuevo Paradero</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <select value={stopForm.cityId} onChange={(e) => setStopForm({ ...stopForm, cityId: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <option value="">Seleccionar ciudad...</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="text" placeholder="Nombre del paradero" required value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Referencia" value={stopForm.reference} onChange={(e) => setStopForm({ ...stopForm, reference: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Dirección" value={stopForm.address} onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="number" step="0.0001" placeholder="Latitud" required value={stopForm.latitude} onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="number" step="0.0001" placeholder="Longitud" required value={stopForm.longitude} onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                      <input type="checkbox" checked={stopForm.isAccessible} onChange={(e) => setStopForm({ ...stopForm, isAccessible: e.target.checked })} className="rounded" />
                      <span>Accesible</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={resetStopForm} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              {editStop && (
                <form onSubmit={handleUpdateStop} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <h3 className="font-bold text-amber-900">Editar Paradero</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input type="text" placeholder="Nombre" required value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Referencia" value={stopForm.reference} onChange={(e) => setStopForm({ ...stopForm, reference: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="text" placeholder="Dirección" value={stopForm.address} onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="number" step="0.0001" placeholder="Latitud" required value={stopForm.latitude} onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <input type="number" step="0.0001" placeholder="Longitud" required value={stopForm.longitude} onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                      <input type="checkbox" checked={stopForm.isAccessible} onChange={(e) => setStopForm({ ...stopForm, isAccessible: e.target.checked })} className="rounded" />
                      <span>Accesible</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditStop(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Referencia</th>
                      <th className="p-3">Coordenadas</th>
                      <th className="p-3">Accesible</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stops.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-600">{s.address || s.reference || '-'}</td>
                        <td className="p-3 font-mono text-xs text-slate-500">{s.latitude}, {s.longitude}</td>
                        <td className="p-3">{(s.accessible ?? s.isAccessible) ? '✅ Sí' : '❌ No'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditStop(s); setStopForm({ cityId: s.cityId, name: s.name, latitude: s.latitude, longitude: s.longitude, reference: s.reference, address: s.address, isAccessible: Boolean(s.accessible ?? s.isAccessible) }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteStop(s.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CITIES TAB */}
          {activeTab === 'cities' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-800">Ciudades Registradas</h2>
                <button onClick={() => { resetCityForm(); setShowAddCity(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Nueva Ciudad
                </button>
              </div>

              {showAddCity && (
                <form onSubmit={handleCreateCity} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
                  <h3 className="font-bold text-blue-900">Nueva Ciudad</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Nombre de la ciudad" required value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <div className="relative" ref={deptDropdownRef}>
                      <input
                        type="text"
                        placeholder="Buscar departamento..."
                        required
                        value={cityForm.department}
                        onChange={(e) => { setCityForm({ ...cityForm, department: e.target.value }); setDepartmentSearch(e.target.value); setShowDepartmentDropdown(true); }}
                        onFocus={() => setShowDepartmentDropdown(true)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl w-full"
                      />
                      {showDepartmentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                          {filteredDepartments.length === 0 ? (
                            <div className="p-2 text-slate-500 text-center">Sin resultados</div>
                          ) : (
                            filteredDepartments.map((dept) => (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => { setCityForm({ ...cityForm, department: dept }); setDepartmentSearch(dept); setShowDepartmentDropdown(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                              >
                                {dept}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <input type="text" placeholder="País" value={cityForm.country} onChange={(e) => setCityForm({ ...cityForm, country: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" readOnly />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={resetCityForm} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              {editCity && (
                <form onSubmit={handleUpdateCity} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <h3 className="font-bold text-amber-900">Editar Ciudad</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Nombre" required value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" />
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar departamento..."
                        required
                        value={cityForm.department}
                        onChange={(e) => { setCityForm({ ...cityForm, department: e.target.value }); setDepartmentSearch(e.target.value); setShowDepartmentDropdown(true); }}
                        onFocus={() => setShowDepartmentDropdown(true)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl w-full"
                      />
                      {showDepartmentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                          {filteredDepartments.length === 0 ? (
                            <div className="p-2 text-slate-500 text-center">Sin resultados</div>
                          ) : (
                            filteredDepartments.map((dept) => (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => { setCityForm({ ...cityForm, department: dept }); setDepartmentSearch(dept); setShowDepartmentDropdown(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors"
                              >
                                {dept}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <input type="text" placeholder="País" value={cityForm.country} onChange={(e) => setCityForm({ ...cityForm, country: e.target.value })} className="p-2.5 bg-white border border-slate-200 rounded-xl" readOnly />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditCity(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Departamento</th>
                      <th className="p-3">País</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cities.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                        <td className="p-3 text-slate-600">{c.department}</td>
                        <td className="p-3 text-slate-600">{c.country}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditCity(c); setCityForm({ name: c.name, department: c.department, country: c.country }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteCity(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
