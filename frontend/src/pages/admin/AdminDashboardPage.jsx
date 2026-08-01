import { useState } from 'react';
import { Route, MapPin, Bus, Plus, LogOut, Save } from 'lucide-react';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { MOCK_LINES, MOCK_ROUTES, MOCK_STOPS } from '../../services/mockData';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('routes'); // 'lines' | 'routes' | 'stops'
  const [lines] = useState(MOCK_LINES);
  const [routes] = useState(MOCK_ROUTES);
  const [stops, setStops] = useState(MOCK_STOPS);

  // Simple modal / inline form state for adding a stop or line
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');
  const [newStopLat, setNewStopLat] = useState(-12.0463);
  const [newStopLng, setNewStopLng] = useState(-77.0428);

  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  const handleCreateStop = (e) => {
    e.preventDefault();
    const created = {
      id: `stop-${Date.now()}`,
      name: newStopName,
      code: `P-00${stops.length + 1}`,
      latitude: parseFloat(newStopLat),
      longitude: parseFloat(newStopLng),
      address: newStopAddress,
      isAccessible: true,
    };
    setStops([...stops, created]);
    setShowAddStop(false);
    setNewStopName('');
    setNewStopAddress('');
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Panel Administrativo RutaYa</h1>
          <p className="text-xs text-slate-500">Gestión central de líneas, rutas y paraderos</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'routes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Route className="w-4 h-4" />
          <span>Rutas ({routes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'lines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Líneas ({lines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stops')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stops'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Paraderos ({stops.length})</span>
        </button>
      </div>

      {/* Content depending on tab */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Listado de Rutas Registradas</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Línea</th>
                  <th className="p-3">Tarifa</th>
                  <th className="p-3">Paraderos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-600">{r.code}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                    <td className="p-3">{r.lineName}</td>
                    <td className="p-3 font-bold text-emerald-600">{r.fare}</td>
                    <td className="p-3">{r.stops?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lines' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Líneas de Transporte Urbano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lines.map((l) => (
              <div key={l.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color }} />
                  <h3 className="font-bold text-slate-900 text-sm">{l.name}</h3>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{l.code}</span>
                </div>
                <p className="text-xs text-slate-600">Empresa: <strong>{l.company}</strong></p>
                <p className="text-xs text-slate-500">Contacto: {l.contact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stops' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Paraderos Registrados</h2>
            <button
              onClick={() => setShowAddStop(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Nuevo Paradero
            </button>
          </div>

          {/* Add Stop Inline Form */}
          {showAddStop && (
            <form onSubmit={handleCreateStop} className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
              <h3 className="font-bold text-blue-900">Registrar Nuevo Paradero</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre del Paradero"
                  required
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Dirección / Referencia"
                  required
                  value={newStopAddress}
                  onChange={(e) => setNewStopAddress(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Latitud (ej. -12.0463)"
                  required
                  value={newStopLat}
                  onChange={(e) => setNewStopLat(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Longitud (ej. -77.0428)"
                  required
                  value={newStopLng}
                  onChange={(e) => setNewStopLng(e.target.value)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStop(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3">Coordenadas</th>
                  <th className="p-3">Accesible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stops.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-600">{s.code}</td>
                    <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.address}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {s.latitude}, {s.longitude}
                    </td>
                    <td className="p-3">{s.isAccessible ? '✅ Sí' : '❌ No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
