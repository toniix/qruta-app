import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { PERU_DEPARTMENTS } from '../../../constants/peruDepartments';

export function DepartmentCombobox({
  id = 'dept-combobox',
  value,
  onChange,
  departments = PERU_DEPARTMENTS,
  disabled = false,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  const query = value || '';
  const filtered = departments.filter((d) =>
    d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
      query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )
  );

  const activeIndex = Math.min(highlight, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const choose = (dept) => {
    onChange(dept);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        event.preventDefault();
        choose(filtered[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder="Buscar departamento…"
          value={query}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border bg-white pl-10 pr-10 py-2.5 text-xs text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400 ${
            error ? 'border-rose-300' : 'border-slate-200'
          }`}
          required
        />
        <ChevronDown
          className={`pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400 transition-transform ${
            open ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </div>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-overlay animate-slide-in-top"
        >
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-xs text-slate-500">
              Sin resultados para “{query}”
            </p>
          ) : (
            filtered.map((dept, index) => {
              const isSelected = dept.toLowerCase() === (value || '').toLowerCase();
              return (
                <button
                  key={dept}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(dept)}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                    index === activeIndex
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{dept}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
