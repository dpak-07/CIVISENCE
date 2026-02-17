const { mongoose } = require("../db");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null },
    category_assignments: { type: [String], default: [] },
    head_name: { type: String, default: null },
    contact_email: { type: String, default: null },
    contact_phone: { type: String, default: null },
    sla_hours: { type: Number, default: 24 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Department = mongoose.model("Department", departmentSchema, "departments");

module.exports = Department;
