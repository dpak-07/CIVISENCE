const Department = require("../models/Department");

const defaults = [
  { name: "Road Maintenance Department", category_assignments: ["pothole", "road_damage"], sla_hours: 48 },
  { name: "Water Supply Department", category_assignments: ["water_leakage"], sla_hours: 24 },
  { name: "Drainage & Sewerage Department", category_assignments: ["drainage_overflow"], sla_hours: 36 },
  { name: "Sanitation Department", category_assignments: ["garbage"], sla_hours: 72 },
  { name: "Electrical Department", category_assignments: ["broken_streetlight"], sla_hours: 48 },
  { name: "General Maintenance Department", category_assignments: ["other"], sla_hours: 72 },
];

async function seedDepartments() {
  const count = await Department.countDocuments({});
  if (count > 0) return;
  await Department.insertMany(defaults);
}

module.exports = { seedDepartments };
