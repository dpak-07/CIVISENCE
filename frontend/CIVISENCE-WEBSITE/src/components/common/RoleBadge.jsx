import { ROLE_LABELS } from "../../services/roleConfig";

function RoleBadge({ role }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default RoleBadge;
