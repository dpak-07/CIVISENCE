import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function ResolutionPerformanceChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <XAxis dataKey="week" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip
            contentStyle={{
              background: "rgba(2, 6, 23, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 12,
            }}
          />
          <Line type="monotone" dataKey="resolved" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="backlog" stroke="#818cf8" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ResolutionPerformanceChart;
