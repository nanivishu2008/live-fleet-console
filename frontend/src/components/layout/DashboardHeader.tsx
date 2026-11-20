function DashboardHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Live Fleet Console
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Real-time electric vehicle monitoring
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" />

        <span className="text-sm text-slate-300">
          Backend connected
        </span>
      </div>
    </header>
  );
}

export default DashboardHeader;