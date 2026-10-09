/** Quick Action Button for Home Dashboard */
export function QuickAction({ icon: Icon, label, bgClass, iconClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-h-[44px] group active:scale-90 transition-transform duration-150"
    >
      <div
        className={`w-14 h-14 ${bgClass} rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200`}
      >
        <Icon className={`w-6 h-6 ${iconClass}`} />
      </div>
      <span className="text-xs text-slate-600 text-center font-medium leading-tight whitespace-pre-line">
        {label}
      </span>
    </button>
  );
}
