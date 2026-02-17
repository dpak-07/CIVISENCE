const path = require("path");
const fs = require("fs");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function generateComplaintId() {
  const year = new Date().getUTCFullYear();
  const randomNum = String(Math.floor(10000 + Math.random() * 90000));
  return `CIVI-${year}-${randomNum}`;
}

function estimateResolutionTime(priority, category) {
  const baseTimes = {
    pothole: 48,
    water_leakage: 24,
    drainage_overflow: 36,
    garbage: 72,
    broken_streetlight: 48,
    road_damage: 96,
    other: 72,
  };
  const multipliers = { low: 1.5, medium: 1.0, high: 0.5, critical: 0.4 };
  const baseHours = baseTimes[category] || 72;
  const hours = Math.max(1, Math.floor(baseHours * (multipliers[priority] || 1.0)));
  if (hours < 24) return `${hours} hours`;
  return `${Math.floor(hours / 24)} days`;
}

function toPublicFileUrl(req, absolutePath) {
  const fileName = path.basename(absolutePath);
  return `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
}

module.exports = {
  ensureDir,
  generateComplaintId,
  estimateResolutionTime,
  toPublicFileUrl,
};
