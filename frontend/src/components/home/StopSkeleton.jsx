/** Skeleton loader for the nearby stops section */
export function StopSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 animate-pulse">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
        <div className="h-4 bg-slate-100 rounded-full w-40" />
        <div className="h-4 bg-slate-100 rounded-full w-12" />
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-100 rounded-full w-3/4" />
              <div className="h-3 bg-slate-100 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
