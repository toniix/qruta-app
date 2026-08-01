import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Compass } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { geocodingService } from '../../services/geocodingService';

export function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    setSearchedLocation,
    clearSelection,
  } = useRoutes();

  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Debounced place autocomplete search using Photon API (Ica, Perú)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery || searchQuery.trim().length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      const results = await geocodingService.searchPlace(searchQuery);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.name);
    setSearchedLocation({
      name: item.name,
      district: item.district,
      latitude: item.latitude,
      longitude: item.longitude,
    });
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    clearSelection();
  };

  return (
    <div className="w-full space-y-2 relative" ref={dropdownRef}>
      {/* Friendly Prompt Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
            ¿A dónde quieres ir hoy en Ica?
          </h2>
        </div>
      </div>

      {/* Search Input Container */}
      <div className="relative flex items-center w-full shadow-md rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md border border-slate-200/90 focus-within:ring-2 focus-within:ring-blue-500/40 transition-all">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className={`w-4 h-4 ${isSearching ? 'animate-pulse text-blue-600' : ''}`} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="Busca paradero o destino (ej. Plaza, UNICA, Huacachina)..."
          className="w-full pl-10 pr-10 py-2.5 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
            Sugerencias en Ica, Perú (Photon OSM)
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {suggestions.map((item, index) => (
              <button
                key={`${item.name}-${index}`}
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left p-3 hover:bg-blue-50/60 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.district}, {item.country}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
