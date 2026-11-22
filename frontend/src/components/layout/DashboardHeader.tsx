function DashboardHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-orange-500/20 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
          Live Fleet Console
        </h1>

        <p className="mt-1 text-sm italic font-light text-orange-200/75">
          Real-time electric vehicle telemetry & intelligent monitoring
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-full border border-orange-500/20 bg-stone-900/60 px-3.5 py-1.5 shadow-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
        </span>

        <span className="text-xs font-medium italic text-stone-300">
          Backend connected
        </span>
      </div>
    </header>
  );
}

export default DashboardHeader;