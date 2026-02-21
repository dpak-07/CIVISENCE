import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const palette = ["#38bdf8", "#22d3ee", "#818cf8", "#14b8a6", "#60a5fa"];

function CategoryDistributionChart({ data }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={115}
            innerRadius={66}
            paddingAngle={3}
            label={({ name, value }) => `${name}: ${value}%`}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(2, 6, 23, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryDistributionChart;
