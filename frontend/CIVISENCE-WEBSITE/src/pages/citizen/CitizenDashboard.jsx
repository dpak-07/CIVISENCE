import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import GlassCard from "../../components/common/GlassCard";
import ComplaintTable from "../../components/dashboard/ComplaintTable";
import StatusTimeline from "../../components/dashboard/StatusTimeline";
import {
  citizenComplaintsSeed,
  citizenTimelineByComplaint,
} from "../../services/mockData";

const statusClass = {
  Pending: "bg-amber-400/20 text-amber-100 border-amber-300/30",
  "In Progress": "bg-sky-400/20 text-sky-100 border-sky-300/30",
  Resolved: "bg-emerald-400/20 text-emerald-100 border-emerald-300/30",
};

function CitizenDashboard() {
  const [complaints, setComplaints] = useState(citizenComplaintsSeed);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", location: "" });
  const [selectedComplaintId, setSelectedComplaintId] = useState(citizenComplaintsSeed[0]?.id || "");

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((item) => item.status === "Pending").length;
    const inProgress = complaints.filter((item) => item.status === "In Progress").length;
    const resolved = complaints.filter((item) => item.status === "Resolved").length;
    return { total, pending, inProgress, resolved };
  }, [complaints]);

  const history = useMemo(
    () => [...complaints].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [complaints]
  );

  const timeline = citizenTimelineByComplaint[selectedComplaintId] || [];

  const beginEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({ title: row.title, location: row.location });
  };

  const saveEdit = (id) => {
    setComplaints((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editDraft.title,
              location: editDraft.location,
            }
          : item
      )
    );
    setEditingId(null);
  };

  const deleteComplaint = (id) => {
    setComplaints((prev) => prev.filter((item) => item.id !== id));
    if (selectedComplaintId === id) {
      const remaining = complaints.filter((item) => item.id !== id);
      setSelectedComplaintId(remaining[0]?.id || "");
    }
  };

  const columns = [
    { key: "id", label: "Complaint ID" },
    {
      key: "title",
      label: "Issue",
      render: (row) =>
        editingId === row.id ? (
          <input
            value={editDraft.title}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded border border-white/20 bg-slate-900/70 px-2 py-1"
          />
        ) : (
          row.title
        ),
    },
    { key: "category", label: "Category" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[row.status]}`}>{row.status}</span>
      ),
    },
    { key: "priority", label: "Priority" },
    {
      key: "location",
      label: "Location",
      render: (row) =>
        editingId === row.id ? (
          <input
            value={editDraft.location}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, location: event.target.value }))}
            className="w-full rounded border border-white/20 bg-slate-900/70 px-2 py-1"
          />
        ) : (
          row.location
        ),
    },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">My complaints</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Pending</p>
          <p className="mt-2 text-3xl font-semibold">{stats.pending}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">In Progress</p>
          <p className="mt-2 text-3xl font-semibold">{stats.inProgress}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Resolved</p>
          <p className="mt-2 text-3xl font-semibold">{stats.resolved}</p>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <GlassCard hover={false}>
          <h3 className="text-lg font-semibold">My complaints and history</h3>
          <p className="mt-1 text-sm text-slate-300">Edit or delete is available only while status is pending.</p>
          <div className="mt-4">
            <ComplaintTable
              rows={complaints}
              columns={columns}
              emptyMessage="You have not raised any complaints yet."
              renderActions={(row) => {
                const pending = row.status === "Pending";
                const isEditing = editingId === row.id;

                return (
                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => saveEdit(row.id)}
                        className="rounded-md border border-emerald-300/30 bg-emerald-500/20 px-2 py-1 text-xs"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaintId(row.id);
                          if (pending) {
                            beginEdit(row);
                          }
                        }}
                        disabled={!pending}
                        className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteComplaint(row.id)}
                      disabled={!pending}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-300/30 bg-rose-500/16 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedComplaintId(row.id)}
                      className="rounded-md border border-white/20 px-2 py-1 text-xs"
                    >
                      Timeline
                    </button>
                  </div>
                );
              }}
            />
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold">Status timeline</h3>
            <p className="mt-1 text-sm text-slate-300">Complaint: {selectedComplaintId || "None"}</p>
            <div className="mt-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-300">Select a complaint to view timeline.</p>
              ) : (
                <StatusTimeline items={timeline} />
              )}
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold">Complaint history</h3>
            <div className="mt-3 space-y-2 text-sm">
              {history.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-white/6 p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-slate-300">
                    {item.date} • {item.location}
                  </p>
                </article>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}

export default CitizenDashboard;
