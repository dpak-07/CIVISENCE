import { BarChart3, CheckCircle2, Clock3, ListChecks, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import MunicipalTrendChart from "../../components/charts/MunicipalTrendChart";
import ResolutionPerformanceChart from "../../components/charts/ResolutionPerformanceChart";
import GlassCard from "../../components/common/GlassCard";
import ComplaintTable from "../../components/dashboard/ComplaintTable";
import {
  issueTrends,
  municipalAssignedComplaintsSeed,
  resolutionPerformance,
} from "../../services/mockData";

const statusClass = {
  Pending: "bg-amber-400/20 text-amber-100 border-amber-300/30",
  "In Progress": "bg-sky-400/20 text-sky-100 border-sky-300/30",
  Resolved: "bg-emerald-400/20 text-emerald-100 border-emerald-300/30",
};

function MunicipalDashboard() {
  const [assignedComplaints, setAssignedComplaints] = useState(municipalAssignedComplaintsSeed);

  const stats = useMemo(() => {
    const total = assignedComplaints.length;
    const pending = assignedComplaints.filter((item) => item.status === "Pending").length;
    const inProgress = assignedComplaints.filter((item) => item.status === "In Progress").length;
    const resolved = assignedComplaints.filter((item) => item.status === "Resolved").length;
    const highPriority = assignedComplaints.filter((item) => item.priority === "High").length;
    return { total, pending, inProgress, resolved, highPriority };
  }, [assignedComplaints]);

  const statsCards = [
    { label: "Assigned complaints", value: stats.total, icon: ListChecks },
    { label: "Pending", value: stats.pending, icon: Clock3 },
    { label: "In progress", value: stats.inProgress, icon: BarChart3 },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2 },
    { label: "High priority", value: stats.highPriority, icon: TriangleAlert },
  ];

  const updateComplaint = (id, field, value) => {
    setAssignedComplaints((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const columns = [
    { key: "id", label: "Issue ID" },
    { key: "title", label: "Issue" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[row.status]}`}>{row.status}</span>
      ),
    },
    { key: "priority", label: "Priority" },
    { key: "sector", label: "Assigned Area" },
    { key: "reportedAt", label: "Reported" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <GlassCard key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-300">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                </div>
                <Icon className="h-5 w-5 text-cyan-200" />
              </div>
            </GlassCard>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GlassCard>
          <h3 className="text-lg font-semibold">Area issue trends</h3>
          <p className="mt-1 text-sm text-slate-300">Sanitation and roads over recent months.</p>
          <div className="mt-3">
            <MunicipalTrendChart data={issueTrends} />
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold">Resolution performance</h3>
          <p className="mt-1 text-sm text-slate-300">Weekly resolved vs backlog movement.</p>
          <div className="mt-3">
            <ResolutionPerformanceChart data={resolutionPerformance} />
          </div>
        </GlassCard>
      </section>

      <GlassCard hover={false}>
        <h3 className="text-lg font-semibold">Assigned complaints workflow</h3>
        <p className="mt-1 text-sm text-slate-300">
          Update status and add operational remarks for each assigned complaint.
        </p>

        <div className="mt-4">
          <ComplaintTable
            rows={assignedComplaints}
            columns={columns}
            renderActions={(row) => (
              <div className="space-y-2">
                <select
                  value={row.status}
                  onChange={(event) => updateComplaint(row.id, "status", event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-2 py-1.5 text-xs"
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
                <input
                  value={row.remarks}
                  onChange={(event) => updateComplaint(row.id, "remarks", event.target.value)}
                  placeholder="Add remarks"
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-2 py-1.5 text-xs"
                />
              </div>
            )}
          />
        </div>
      </GlassCard>
    </div>
  );
}

export default MunicipalDashboard;
