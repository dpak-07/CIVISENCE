const express = require("express");
const multer = require("multer");
const path = require("path");

const Issue = require("../models/Issue");
const { requireAuth, attachCurrentUser, requireStaff } = require("../middleware/auth");
const { ensureDir, generateComplaintId, toPublicFileUrl } = require("../utils/helpers");

const router = express.Router();

const uploadDir = path.resolve(__dirname, "../../uploads");
ensureDir(uploadDir);
const upload = multer({ dest: uploadDir });

function toIssueResponse(issue) {
  return {
    id: String(issue._id),
    complaint_id: issue.complaint_id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    status: issue.status,
    priority: issue.priority,
    priority_score: issue.priority_score,
    confidence_score: issue.confidence_score,
    location: issue.location,
    address: issue.address,
    ward_number: issue.ward_number,
    image_url: issue.image_url,
    images: issue.images,
    voice_note_url: issue.voice_note_url,
    reporter: issue.reporter,
    assigned_to: issue.assigned_to,
    department: issue.department,
    ai_metadata: issue.ai_metadata,
    is_duplicate: issue.is_duplicate,
    duplicate_of: issue.duplicate_of,
    estimated_resolution_time: issue.estimated_resolution_time,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    resolved_at: issue.resolved_at,
  };
}

router.post("", requireAuth, attachCurrentUser, upload.fields([{ name: "images", maxCount: 10 }, { name: "voice_note", maxCount: 1 }]), async (req, res) => {
  try {
    const { title, description, longitude, latitude, address, category, ward_number } = req.body || {};
    if (!title || !description || longitude === undefined || latitude === undefined || !address) {
      return res.status(400).json({ detail: "title, description, longitude, latitude, address are required" });
    }

    const images = (req.files?.images || []).map((f) => toPublicFileUrl(req, f.path));
    const voiceNote = req.files?.voice_note?.[0] ? toPublicFileUrl(req, req.files.voice_note[0].path) : null;

    const issue = await Issue.create({
      complaint_id: generateComplaintId(),
      title,
      description,
      category: category || "other",
      status: "reported",
      location: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
      address,
      ward_number: ward_number ? Number(ward_number) : null,
      image_url: images[0] || null,
      images,
      voice_note_url: voiceNote,
      reporter: String(req.currentUser._id),
      status_history: [{ status: "reported", updated_by: String(req.currentUser._id), timestamp: new Date() }],
    });

    return res.status(201).json(toIssueResponse(issue));
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

router.get("/my/reports", requireAuth, attachCurrentUser, async (req, res) => {
  const skip = Number(req.query.skip || 0);
  const limit = Number(req.query.limit || 50);
  const issues = await Issue.find({ reporter: String(req.currentUser._id) })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return res.json(issues.map(toIssueResponse));
});

router.get("", requireAuth, attachCurrentUser, async (req, res) => {
  const skip = Number(req.query.skip || 0);
  const limit = Number(req.query.limit || 50);

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.category) query.category = req.query.category;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.ward_number !== undefined) query.ward_number = Number(req.query.ward_number);

  const issues = await Issue.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean();
  return res.json(issues.map(toIssueResponse));
});

router.get("/:issue_id", requireAuth, attachCurrentUser, async (req, res) => {
  const issue = await Issue.findById(req.params.issue_id).lean();
  if (!issue) return res.status(404).json({ detail: "Issue not found" });
  return res.json(toIssueResponse(issue));
});

router.put("/:issue_id/status", requireAuth, attachCurrentUser, requireStaff, async (req, res) => {
  const { status, note } = req.body || {};
  if (!status) return res.status(400).json({ detail: "status is required" });

  const issue = await Issue.findById(req.params.issue_id);
  if (!issue) return res.status(404).json({ detail: "Issue not found" });

  issue.status = status;
  issue.status_history = issue.status_history || [];
  issue.status_history.push({
    status,
    updated_by: String(req.currentUser._id),
    timestamp: new Date(),
    note: note || null,
  });
  if (status === "resolved") issue.resolved_at = new Date();

  await issue.save();
  return res.json(toIssueResponse(issue));
});

router.get("/:issue_id/timeline", requireAuth, attachCurrentUser, async (req, res) => {
  const issue = await Issue.findById(req.params.issue_id).lean();
  if (!issue) return res.status(404).json({ detail: "Issue not found" });

  const timeline = (issue.status_history || []).map((entry) => ({
    status: String(entry.status || ""),
    updated_by: String(entry.updated_by || ""),
    timestamp: entry.timestamp,
    note: entry.note || null,
  }));
  return res.json(timeline);
});

module.exports = router;
