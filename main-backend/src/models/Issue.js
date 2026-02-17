const { mongoose } = require("../db");

const statusUpdateSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    updated_by: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: null },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    complaint_id: { type: String, index: true, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: "other", index: true },
    status: {
      type: String,
      enum: ["pending", "reported", "assigned", "in_progress", "resolved", "closed", "duplicate"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    priority_score: { type: Number, default: null },
    confidence_score: { type: Number, default: null },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, default: null },
    ward_number: { type: Number, default: null, index: true },
    image_url: { type: String, default: null },
    images: { type: [String], default: [] },
    voice_note_url: { type: String, default: null },
    reporter: { type: String, required: true, index: true },
    assigned_to: { type: String, default: null, index: true },
    department: { type: String, default: null, index: true },
    ai_metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    is_duplicate: { type: Boolean, default: false },
    duplicate_of: { type: String, default: null },
    estimated_resolution_time: { type: String, default: null },
    status_history: { type: [statusUpdateSchema], default: [] },
    resolved_at: { type: Date, default: null },
    sla_deadline: { type: Date, default: null },
    is_overdue: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

issueSchema.index({ location: "2dsphere" });

const Issue = mongoose.model("Issue", issueSchema, "issues");

module.exports = Issue;
