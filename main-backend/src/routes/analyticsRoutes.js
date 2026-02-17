const express = require("express");

const Issue = require("../models/Issue");
const Department = require("../models/Department");
const { requireAuth, attachCurrentUser, requireStaff } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", requireAuth, attachCurrentUser, async (_req, res) => {
  const [total_issues, reported, in_progress, resolved] = await Promise.all([
    Issue.countDocuments({}),
    Issue.countDocuments({ status: "reported" }),
    Issue.countDocuments({ status: "in_progress" }),
    Issue.countDocuments({ status: "resolved" }),
  ]);

  const categoryNames = [
    "pothole",
    "garbage",
    "broken_streetlight",
    "water_leakage",
    "road_damage",
    "drainage_overflow",
    "other",
  ];

  const categories = {};
  for (const category of categoryNames) {
    categories[category] = await Issue.countDocuments({ category });
  }

  const resolvedIssues = await Issue.find({ status: "resolved", resolved_at: { $ne: null } }).lean();
  let avg = 0;
  if (resolvedIssues.length > 0) {
    const hours = resolvedIssues
      .map((x) => (new Date(x.resolved_at).getTime() - new Date(x.created_at).getTime()) / 3600000)
      .filter((x) => Number.isFinite(x) && x >= 0);
    avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
  }

  return res.json({
    total_issues,
    reported,
    in_progress,
    resolved,
    categories,
    avg_resolution_hours: Number(avg.toFixed(2)),
  });
});

router.get("/heatmap", requireAuth, attachCurrentUser, async (req, res) => {
  const query = {};
  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;

  const issues = await Issue.find(query).lean();
  const heatmap = issues.map((issue) => ({
    lat: Number(issue.location?.coordinates?.[1] || 0),
    lng: Number(issue.location?.coordinates?.[0] || 0),
    intensity: 1,
  }));
  return res.json(heatmap);
});

router.get("/trends", requireAuth, attachCurrentUser, requireStaff, async (req, res) => {
  const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
  const startDate = new Date(Date.now() - days * 24 * 3600 * 1000);

  const [issues, resolvedIssues] = await Promise.all([
    Issue.find({ created_at: { $gte: startDate } }).lean(),
    Issue.find({ resolved_at: { $gte: startDate } }).lean(),
  ]);

  const daily_reported = {};
  for (const issue of issues) {
    const day = new Date(issue.created_at).toISOString().slice(0, 10);
    daily_reported[day] = (daily_reported[day] || 0) + 1;
  }

  const daily_resolved = {};
  for (const issue of resolvedIssues) {
    if (!issue.resolved_at) continue;
    const day = new Date(issue.resolved_at).toISOString().slice(0, 10);
    daily_resolved[day] = (daily_resolved[day] || 0) + 1;
  }

  return res.json({ daily_reported, daily_resolved });
});

router.get("/department/:department_id", requireAuth, attachCurrentUser, requireStaff, async (req, res) => {
  const department = await Department.findById(req.params.department_id).lean();
  if (!department) return res.status(404).json({ detail: "Department not found" });

  const [total, resolved] = await Promise.all([
    Issue.countDocuments({ department: department.name }),
    Issue.countDocuments({ department: department.name, status: "resolved" }),
  ]);

  const resolvedIssues = await Issue.find({
    department: department.name,
    status: "resolved",
    resolved_at: { $ne: null },
  }).lean();

  let avg = 0;
  if (resolvedIssues.length > 0) {
    const hours = resolvedIssues
      .map((x) => (new Date(x.resolved_at).getTime() - new Date(x.created_at).getTime()) / 3600000)
      .filter((x) => Number.isFinite(x) && x >= 0);
    avg = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
  }

  const withinSla = resolvedIssues.filter((issue) => {
    const hours = (new Date(issue.resolved_at).getTime() - new Date(issue.created_at).getTime()) / 3600000;
    return Number.isFinite(hours) && hours <= Number(department.sla_hours || 24);
  }).length;

  const sla = resolvedIssues.length ? (withinSla / resolvedIssues.length) * 100 : 0;

  return res.json({
    department_name: department.name,
    total_issues: total,
    resolved_issues: resolved,
    avg_resolution_hours: Number(avg.toFixed(2)),
    sla_hours: Number(department.sla_hours || 24),
    sla_compliance_percent: Number(sla.toFixed(2)),
  });
});

module.exports = router;
