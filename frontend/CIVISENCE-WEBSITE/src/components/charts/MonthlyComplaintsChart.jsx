import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function MonthlyComplaintsChart({ data }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          <Line type="monotone" dataKey="complaints" stroke="#38bdf8" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="resolved" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="pending" stroke="#818cf8" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyComplaintsChart;
