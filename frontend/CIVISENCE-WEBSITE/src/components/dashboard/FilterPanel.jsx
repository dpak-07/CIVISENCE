function FilterPanel({ filters, locations, onChange, onReset }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:grid-cols-6">
      <select
        value={filters.status}
        onChange={(event) => onChange("status", event.target.value)}
        className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm"
      >
        <option value="all">Status: All</option>
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>

      <select
        value={filters.priority}
        onChange={(event) => onChange("priority", event.target.value)}
        className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm"
      >
        <option value="all">Priority: All</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <select
        value={filters.location}
        onChange={(event) => onChange("location", event.target.value)}
        className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm"
      >
        <option value="all">Location: All</option>
        {locations.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.fromDate}
        onChange={(event) => onChange("fromDate", event.target.value)}
        className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm"
      />

      <input
        type="date"
        value={filters.toDate}
        onChange={(event) => onChange("toDate", event.target.value)}
        className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
      >
        Reset Filters
      </button>
    </div>
  );
}

export default FilterPanel;
