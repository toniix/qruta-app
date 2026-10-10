/** Skeleton loader for the nearby stops section */
export function StopSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 animate-pulse">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
        <div className="h-4 bg-slate-100 rounded-full w-40" />
        <div className="h-4 bg-slate-100 rounded-full w-12" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-100 rounded-full w-16" />
        <div className="h-3 bg-slate-100 rounded-full w-28" />
      </div>
    </div>
  );
}
