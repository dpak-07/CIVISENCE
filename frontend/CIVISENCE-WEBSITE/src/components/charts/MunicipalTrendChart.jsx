import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function MunicipalTrendChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sanitationGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="roadsGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <XAxis dataKey="month" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip
            contentStyle={{
              background: "rgba(2, 6, 23, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 12,
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="sanitation"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#sanitationGlow)"
          />
          <Area type="monotone" dataKey="roads" stroke="#38bdf8" strokeWidth={2} fill="url(#roadsGlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MunicipalTrendChart;
