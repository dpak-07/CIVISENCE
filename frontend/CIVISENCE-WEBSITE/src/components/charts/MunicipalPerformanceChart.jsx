import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function MunicipalPerformanceChart({ data }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="office" stroke="#cbd5e1" angle={-12} textAnchor="end" interval={0} height={58} />
          <YAxis stroke="#cbd5e1" />
          <Tooltip
            contentStyle={{
              background: "rgba(2, 6, 23, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="resolvedRate" fill="#22d3ee" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MunicipalPerformanceChart;
