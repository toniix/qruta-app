import { useLocation } from "react-router-dom";

function RoutesListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-slate-50/70 overflow-hidden animate-pulse">
      <div className="bg-white pt-4 pb-3 px-4 sm:px-6 space-y-3 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-5 w-36 bg-slate-200 rounded-md" />
            <div className="h-3 w-48 bg-slate-100 rounded-md" />
          </div>
          <div className="h-6 w-16 bg-slate-100 rounded-full" />
        </div>
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="flex gap-2 overflow-hidden pt-1">
          <div className="h-7 w-16 bg-slate-200 rounded-full shrink-0" />
          <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0" />
          <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0" />
          <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5"
          >
            <div className="flex justify-between items-center">
              <div className="h-6 w-20 bg-slate-200 rounded-lg" />
              <div className="h-4 w-14 bg-slate-100 rounded-full" />
            </div>
            <div className="h-4 w-3/4 bg-slate-100 rounded-md" />
            <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="h-12 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg backdrop-blur-sm" />
      </div>
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
        <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl" />
        <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col min-h-full bg-surface-page p-4 space-y-4 animate-pulse max-w-lg mx-auto w-full">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
        <div className="h-11 bg-slate-100 rounded-xl" />
        <div className="h-11 bg-slate-100 rounded-xl" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 w-32 bg-slate-200 rounded-md" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-slate-200 rounded-full" />
          <div className="h-7 w-24 bg-slate-200 rounded-full" />
          <div className="h-7 w-16 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="flex flex-col h-full bg-surface-page overflow-hidden animate-pulse">
      <div className="bg-white pt-4 pb-3 px-4 border-b border-slate-200 space-y-2">
        <div className="h-5 w-28 bg-slate-200 rounded-md" />
        <div className="h-3 w-44 bg-slate-100 rounded-md" />
        <div className="flex gap-2 pt-1 overflow-hidden">
          <div className="h-7 w-16 bg-slate-200 rounded-full shrink-0" />
          <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0" />
          <div className="h-7 w-20 bg-slate-100 rounded-full shrink-0" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="space-y-1">
                <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
                <div className="h-2.5 w-16 bg-slate-100 rounded-md" />
              </div>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-md" />
            <div className="h-4 w-4/5 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-full bg-surface-page animate-pulse">
      <div className="bg-brand-navy p-4 space-y-3.5 border-b border-border-navy">
        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-surface-navy rounded-md" />
          <div className="h-6 w-16 bg-surface-navy rounded-full" />
        </div>
        <div className="h-11 bg-surface-navy rounded-xl" />
        <div className="h-7 w-40 bg-surface-navy rounded-full" />
      </div>
      <div className="p-4 space-y-4">
        <div className="h-4 w-32 bg-slate-200 rounded-md" />
        <div className="flex gap-3 overflow-hidden">
          <div className="h-24 w-60 bg-white rounded-2xl border border-slate-200/80 shrink-0" />
          <div className="h-24 w-60 bg-white rounded-2xl border border-slate-200/80 shrink-0" />
        </div>
        <div className="h-4 w-28 bg-slate-200 rounded-md pt-2" />
        <div className="space-y-2">
          <div className="h-16 bg-white rounded-2xl border border-slate-200/80" />
          <div className="h-16 bg-white rounded-2xl border border-slate-200/80" />
        </div>
      </div>
    </div>
  );
}

export function CitizenRouteFallback() {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith("/mapa")) {
    return <MapSkeleton />;
  }
  if (path === "/rutas") {
    return <RoutesListSkeleton />;
  }
  if (path === "/buscar") {
    return <SearchSkeleton />;
  }
  if (path === "/comunidad") {
    return <CommunitySkeleton />;
  }
  if (path === "/") {
    return <HomeSkeleton />;
  }
  return <RoutesListSkeleton />;
}
