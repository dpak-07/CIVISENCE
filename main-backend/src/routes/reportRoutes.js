const express = require("express");
const multer = require("multer");
const path = require("path");

const Issue = require("../models/Issue");
const { requireAuth, attachCurrentUser } = require("../middleware/auth");
const { classifyText, classifyImage, checkDuplicates, calculatePriority, routeDepartment } = require("../aiClient");
const { ensureDir, generateComplaintId, estimateResolutionTime, toPublicFileUrl } = require("../utils/helpers");

const router = express.Router();

const uploadDir = path.resolve(__dirname, "../../uploads");
ensureDir(uploadDir);
const upload = multer({ dest: uploadDir });

function pickFinalCategoryAndConfidence(textResult, imageResult) {
  if (!imageResult || !imageResult.category) {
    return {
      category: textResult?.category || "road_damage",
      confidence: Number(textResult?.confidence || 0.5),
    };
  }

  const imageConf = Number(imageResult.confidence || 0);
  const textConf = Number(textResult?.confidence || 0);
  if (imageConf > textConf) {
    return { category: imageResult.category, confidence: imageConf * 0.6 + textConf * 0.4 };
  }
  return { category: textResult?.category || imageResult.category, confidence: textConf * 0.6 + imageConf * 0.4 };
}

async function orchestrateAi({ title, description, latitude, longitude, wardNumber, imageUrl, imageCount }) {
  const textResult = await classifyText({ title, description });
  const imageResult = imageUrl ? await classifyImage({ image_url: imageUrl }) : null;
  const { category, confidence } = pickFinalCategoryAndConfidence(textResult, imageResult);

  const duplicateResponse = await checkDuplicates({
    text: `${title}. ${description}`,
    longitude: Number(longitude),
    latitude: Number(latitude),
    category,
  });
  const duplicates = Array.isArray(duplicateResponse?.duplicates)
    ? duplicateResponse.duplicates
    : Array.isArray(duplicateResponse)
    ? duplicateResponse
    : [];

  const priorityResult = await calculatePriority({
    category,
    ward_number: Number(wardNumber),
    description,
    image_count: Number(imageCount || 0),
    latitude: Number(latitude),
    longitude: Number(longitude),
  });

  const routeResult = await routeDepartment({ category });
  const department = routeResult?.department || routeResult || "General Department";

  return {
    textResult,
    imageResult,
    category,
    confidence,
    duplicates,
    priorityResult,
    department,
  };
}

async function createReportFromPayload({ req, reporterId, title, description, latitude, longitude, wardNumber, imageUrl, voiceUrl, reportType }) {
  const ai = await orchestrateAi({
    title,
    description,
    latitude,
    longitude,
    wardNumber,
    imageUrl,
    imageCount: imageUrl ? 1 : 0,
  });

  const priority = String(ai.priorityResult?.priority || "medium").toLowerCase();
  const complaintId = generateComplaintId();
  const duplicateOf = ai.duplicates[0]?.issue_id || null;

  const issue = await Issue.create({
    complaint_id: complaintId,
    title,
    description,
    category: ai.category,
    status: duplicateOf ? "duplicate" : "pending",
    priority,
    priority_score: Number(ai.priorityResult?.score || 0.5),
    confidence_score: Number(Number(ai.confidence || 0.5).toFixed(3)),
    location: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
    ward_number: Number(wardNumber),
    image_url: imageUrl || null,
    images: imageUrl ? [imageUrl] : [],
    voice_note_url: voiceUrl || null,
    reporter: String(reporterId),
    department: ai.department,
    is_duplicate: Boolean(duplicateOf),
    duplicate_of: duplicateOf,
    estimated_resolution_time: estimateResolutionTime(priority, ai.category),
    ai_metadata: {
      report_type: reportType,
      image_classification: ai.imageResult,
      text_classification: ai.textResult,
      duplicate_metadata: ai.duplicates.slice(0, 3),
      priority_components: ai.priorityResult?.components || {},
      voice_url: voiceUrl || null,
    },
  });

  return { issue, ai };
}

router.post("/report", requireAuth, attachCurrentUser, upload.single("image"), async (req, res) => {
  try {
    const { title, description, latitude, longitude, ward_number } = req.body || {};
    if (!title || !description || latitude === undefined || longitude === undefined || ward_number === undefined) {
      return res.status(400).json({ detail: "title, description, latitude, longitude, ward_number are required" });
    }

    const imageUrl = req.file ? toPublicFileUrl(req, req.file.path) : null;

    const { issue, ai } = await createReportFromPayload({
      req,
      reporterId: req.currentUser._id,
      title,
      description,
      latitude,
      longitude,
      wardNumber: ward_number,
      imageUrl,
      voiceUrl: null,
      reportType: imageUrl ? "image_upload" : "text_only",
    });

    return res.status(201).json({
      success: true,
      complaint_id: issue.complaint_id,
      issue_id: String(issue._id),
      category: issue.category,
      priority: issue.priority,
      department: issue.department,
      duplicate: issue.is_duplicate,
      duplicate_of: issue.duplicate_of,
      confidence_score: issue.confidence_score,
      estimated_resolution_time: issue.estimated_resolution_time,
      status: issue.status,
      ai_insights: {
        image_confidence: ai.imageResult ? Number(ai.imageResult.confidence || 0) : null,
        text_confidence: Number(ai.textResult?.confidence || 0),
        priority_score: issue.priority_score,
        duplicate_count: ai.duplicates.length,
      },
      created_at: issue.created_at,
    });
  } catch (error) {
    return res.status(502).json({ detail: `Failed to process report: ${error.message}` });
  }
});

router.get("/report/:complaint_id", requireAuth, attachCurrentUser, async (req, res) => {
  const issue = await Issue.findOne({ complaint_id: req.params.complaint_id }).lean();
  if (!issue) return res.status(404).json({ detail: "Report not found" });

  return res.json({
    complaint_id: issue.complaint_id,
    issue_id: String(issue._id),
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
    status: issue.status,
    department: issue.department,
    duplicate: Boolean(issue.duplicate_of),
    confidence_score: issue.confidence_score,
    estimated_resolution_time: issue.estimated_resolution_time,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    location: {
      latitude: issue.location?.coordinates?.[1],
      longitude: issue.location?.coordinates?.[0],
    },
    ai_insights: issue.ai_metadata,
  });
});

router.post("/report/text", requireAuth, attachCurrentUser, async (req, res) => {
  try {
    const { title, description, latitude, longitude, ward_number } = req.body || {};
    if (!title || !description || latitude === undefined || longitude === undefined || ward_number === undefined) {
      return res.status(400).json({ detail: "title, description, latitude, longitude, ward_number are required" });
    }

    const { issue } = await createReportFromPayload({
      req,
      reporterId: req.currentUser._id,
      title,
      description,
      latitude,
      longitude,
      wardNumber: ward_number,
      imageUrl: null,
      voiceUrl: null,
      reportType: "text_only",
    });

    return res.status(201).json({
      success: true,
      complaint_id: issue.complaint_id,
      issue_id: String(issue._id),
      category: issue.category,
      priority: issue.priority,
      department: issue.department,
      duplicate: issue.is_duplicate,
      confidence_score: issue.confidence_score,
      estimated_resolution_time: issue.estimated_resolution_time,
      report_type: "text_only",
    });
  } catch (error) {
    return res.status(502).json({ detail: `Failed to process text report: ${error.message}` });
  }
});

router.post("/report/image", requireAuth, attachCurrentUser, upload.single("image"), async (req, res) => {
  try {
    const { title, description, latitude, longitude, ward_number } = req.body || {};
    if (!title || !description || latitude === undefined || longitude === undefined || ward_number === undefined) {
      return res.status(400).json({ detail: "title, description, latitude, longitude, ward_number are required" });
    }
    if (!req.file) return res.status(400).json({ detail: "image is required" });

    const imageUrl = toPublicFileUrl(req, req.file.path);
    const { issue, ai } = await createReportFromPayload({
      req,
      reporterId: req.currentUser._id,
      title,
      description,
      latitude,
      longitude,
      wardNumber: ward_number,
      imageUrl,
      voiceUrl: null,
      reportType: "image_upload",
    });

    return res.status(201).json({
      success: true,
      complaint_id: issue.complaint_id,
      issue_id: String(issue._id),
      category: issue.category,
      priority: issue.priority,
      department: issue.department,
      duplicate: issue.is_duplicate,
      confidence_score: issue.confidence_score,
      estimated_resolution_time: issue.estimated_resolution_time,
      image_url: imageUrl,
      ai_insights: {
        image_confidence: Number(ai.imageResult?.confidence || 0),
        text_confidence: Number(ai.textResult?.confidence || 0),
      },
      report_type: "image_upload",
    });
  } catch (error) {
    return res.status(502).json({ detail: `Failed to process image report: ${error.message}` });
  }
});

router.post("/report/voice", requireAuth, attachCurrentUser, upload.single("voice"), async (req, res) => {
  try {
    const { latitude, longitude, ward_number } = req.body || {};
    let { title, description } = req.body || {};
    if (latitude === undefined || longitude === undefined || ward_number === undefined) {
      return res.status(400).json({ detail: "latitude, longitude, ward_number are required" });
    }
    if (!req.file) return res.status(400).json({ detail: "voice is required" });

    const voiceUrl = toPublicFileUrl(req, req.file.path);
    if (!title) title = "Voice report";
    if (!description) description = "Voice report submitted";

    const { issue } = await createReportFromPayload({
      req,
      reporterId: req.currentUser._id,
      title,
      description,
      latitude,
      longitude,
      wardNumber: ward_number,
      imageUrl: null,
      voiceUrl,
      reportType: "voice_upload",
    });

    return res.status(201).json({
      success: true,
      complaint_id: issue.complaint_id,
      issue_id: String(issue._id),
      category: issue.category,
      priority: issue.priority,
      department: issue.department,
      duplicate: issue.is_duplicate,
      confidence_score: issue.confidence_score,
      estimated_resolution_time: issue.estimated_resolution_time,
      voice_url: voiceUrl,
      transcription: null,
      report_type: "voice_upload",
    });
  } catch (error) {
    return res.status(502).json({ detail: `Failed to process voice report: ${error.message}` });
  }
});

module.exports = router;
