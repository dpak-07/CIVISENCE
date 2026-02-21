import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Layers,
  MapPinned,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import CategoryDistributionChart from "../../components/charts/CategoryDistributionChart";
import MonthlyComplaintsChart from "../../components/charts/MonthlyComplaintsChart";
import MunicipalPerformanceChart from "../../components/charts/MunicipalPerformanceChart";
import ComplaintTable from "../../components/dashboard/ComplaintTable";
import FilterPanel from "../../components/dashboard/FilterPanel";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import GlassCard from "../../components/common/GlassCard";
import LocationPickerMap from "../../components/map/LocationPickerMap";
import CityMap from "../../components/map/CityMap";
import {
  adminStatsSeed,
  allComplaintsSeed,
  categoryDistribution,
  cityComplaintClusters,
  monthlyComplaints,
  municipalPerformance,
  sensitiveLocationsSeed,
} from "../../services/mockData";

const statusClass = {
  Pending: "bg-amber-400/20 text-amber-100 border-amber-300/30",
  "In Progress": "bg-sky-400/20 text-sky-100 border-sky-300/30",
  Resolved: "bg-emerald-400/20 text-emerald-100 border-emerald-300/30",
};

const priorityClass = {
  High: "bg-rose-400/20 text-rose-100 border-rose-300/30",
  Medium: "bg-orange-400/20 text-orange-100 border-orange-300/30",
  Low: "bg-cyan-400/20 text-cyan-100 border-cyan-300/30",
};

function MainAdminDashboard() {
  const [complaints] = useState(allComplaintsSeed);
  const [sensitiveLocations, setSensitiveLocations] = useState(sensitiveLocationsSeed);
  const [municipalOffices, setMunicipalOffices] = useState([]);

  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    location: "all",
    fromDate: "",
    toDate: "",
  });

  const [officeForm, setOfficeForm] = useState({
    name: "",
    area: "",
    location: null,
  });

  const [sensitiveForm, setSensitiveForm] = useState({
    name: "",
    type: "Hospital",
    location: null,
  });

  const locations = useMemo(
    () => [...new Set(complaints.map((complaint) => complaint.location))],
    [complaints]
  );

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const statusMatch = filters.status === "all" || complaint.status === filters.status;
      const priorityMatch = filters.priority === "all" || complaint.priority === filters.priority;
      const locationMatch = filters.location === "all" || complaint.location === filters.location;
      const fromMatch = !filters.fromDate || complaint.date >= filters.fromDate;
      const toMatch = !filters.toDate || complaint.date <= filters.toDate;
      return statusMatch && priorityMatch && locationMatch && fromMatch && toMatch;
    });
  }, [complaints, filters]);

  const stats = useMemo(
    () => ({
      totalComplaints: filteredComplaints.length,
      resolved: filteredComplaints.filter((item) => item.status === "Resolved").length,
      pending: filteredComplaints.filter((item) => item.status === "Pending").length,
      highPriority: filteredComplaints.filter((item) => item.priority === "High").length,
      duplicates: adminStatsSeed.duplicates,
    }),
    [filteredComplaints]
  );

  const topOffice = useMemo(
    () => [...municipalPerformance].sort((a, b) => b.resolvedRate - a.resolvedRate)[0],
    []
  );

  const statCards = [
    { label: "Total complaints", value: stats.totalComplaints, icon: Layers },
    { label: "Total resolved", value: stats.resolved, icon: CheckCircle2 },
    { label: "Pending", value: stats.pending, icon: Clock3 },
    { label: "High priority", value: stats.highPriority, icon: AlertTriangle },
    { label: "Duplicate detected", value: stats.duplicates, icon: ShieldAlert },
  ];

  const onFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const onFilterReset = () => {
    setFilters({ status: "all", priority: "all", location: "all", fromDate: "", toDate: "" });
  };

  const onAddMunicipalOffice = (event) => {
    event.preventDefault();
    if (!officeForm.name || !officeForm.area || !officeForm.location) {
      return;
    }

    setMunicipalOffices((prev) => [
      {
        id: `OFF-${prev.length + 1}`,
        name: officeForm.name,
        area: officeForm.area,
        location: officeForm.location,
      },
      ...prev,
    ]);

    setOfficeForm({ name: "", area: "", location: null });
  };

  const onAddSensitiveLocation = (event) => {
    event.preventDefault();
    if (!sensitiveForm.name || !sensitiveForm.location) {
      return;
    }

    setSensitiveLocations((prev) => [
      {
        id: `s-${Date.now()}`,
        name: sensitiveForm.name,
        type: sensitiveForm.type,
        lat: sensitiveForm.location.lat,
        lng: sensitiveForm.location.lng,
      },
      ...prev,
    ]);

    setSensitiveForm({ name: "", type: "Hospital", location: null });
  };

  const complaintColumns = [
    { key: "id", label: "Complaint ID" },
    { key: "title", label: "Issue" },
    { key: "category", label: "Category" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[row.status]}`}>{row.status}</span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs ${priorityClass[row.priority]}`}>
          {row.priority}
        </span>
      ),
    },
    { key: "date", label: "Date" },
    { key: "location", label: "Location" },
    { key: "municipal", label: "Assigned Office" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <GlassCard key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-300">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    <AnimatedCounter value={card.value} />
                  </p>
                </div>
                <Icon className="h-5 w-5 text-cyan-200" />
              </div>
            </GlassCard>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Monthly complaints trend</h3>
            <p className="text-xs uppercase tracking-[0.13em] text-slate-300">Analytics</p>
          </div>
          <MonthlyComplaintsChart data={monthlyComplaints} />
        </GlassCard>

        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Office</h3>
            <Trophy className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="rounded-xl border border-cyan-200/20 bg-cyan-300/10 p-4">
            <p className="text-lg font-semibold text-cyan-100">{topOffice.office}</p>
            <p className="mt-2 text-sm text-slate-300">Resolved Rate: {topOffice.resolvedRate}%</p>
            <p className="mt-1 text-sm text-slate-300">
              Avg Turnaround: {topOffice.avgTurnaroundDays} days
            </p>
          </div>

          <div className="mt-4">
            <CategoryDistributionChart data={categoryDistribution} />
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Municipal office performance</h3>
            <p className="text-xs uppercase tracking-[0.13em] text-slate-300">Resolved %</p>
          </div>
          <MunicipalPerformanceChart data={municipalPerformance} />
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold">Added municipal offices</h3>
          <div className="mt-4 space-y-2 text-sm">
            {municipalOffices.length === 0 ? (
              <p className="text-slate-300">No new office entries yet.</p>
            ) : (
              municipalOffices.map((office) => (
                <article key={office.id} className="rounded-xl border border-white/12 bg-white/6 p-3">
                  <p className="font-medium">{office.name}</p>
                  <p className="text-slate-300">Area: {office.area}</p>
                  <p className="text-xs text-cyan-200">
                    {office.location.lat.toFixed(4)}, {office.location.lng.toFixed(4)}
                  </p>
                </article>
              ))
            )}
          </div>
        </GlassCard>
      </section>

      <GlassCard hover={false}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Full city map and sensitive zones</h3>
          <MapPinned className="h-5 w-5 text-cyan-300" />
        </div>
        <CityMap clusters={cityComplaintClusters} sensitiveLocations={sensitiveLocations} height="460px" />
      </GlassCard>

      <section className="grid gap-4 lg:grid-cols-2">
        <GlassCard hover={false}>
          <h3 className="text-lg font-semibold">Add Municipal Office</h3>
          <form onSubmit={onAddMunicipalOffice} className="mt-4 space-y-3">
            <input
              value={officeForm.name}
              onChange={(event) => setOfficeForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Office name"
              className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2"
            />
            <input
              value={officeForm.area}
              onChange={(event) => setOfficeForm((prev) => ({ ...prev, area: event.target.value }))}
              placeholder="Assign area"
              className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2"
            />

            <LocationPickerMap
              value={officeForm.location}
              onChange={(latlng) => setOfficeForm((prev) => ({ ...prev, location: latlng }))}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Save Municipal Office
            </button>
          </form>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="text-lg font-semibold">Add Sensitive Location</h3>
          <form onSubmit={onAddSensitiveLocation} className="mt-4 space-y-3">
            <input
              value={sensitiveForm.name}
              onChange={(event) => setSensitiveForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Location name"
              className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2"
            />
            <select
              value={sensitiveForm.type}
              onChange={(event) => setSensitiveForm((prev) => ({ ...prev, type: event.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2"
            >
              <option>Hospital</option>
              <option>School</option>
              <option>Utility</option>
              <option>Transit</option>
              <option>Govt Building</option>
            </select>

            <LocationPickerMap
              value={sensitiveForm.location}
              onChange={(latlng) => setSensitiveForm((prev) => ({ ...prev, location: latlng }))}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Add Sensitive Marker
            </button>
          </form>
        </GlassCard>
      </section>

      <GlassCard hover={false}>
        <h3 className="text-lg font-semibold">View all complaints</h3>
        <p className="mt-1 text-sm text-slate-300">Filter by status, priority, date, and location.</p>
        <div className="mt-4 space-y-3">
          <FilterPanel
            filters={filters}
            locations={locations}
            onChange={onFilterChange}
            onReset={onFilterReset}
          />
          <ComplaintTable rows={filteredComplaints} columns={complaintColumns} />
        </div>
      </GlassCard>
    </div>
  );
}

export default MainAdminDashboard;
