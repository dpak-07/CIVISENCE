const { mongoose } = require("../db");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["citizen", "municipal_staff", "admin"],
      default: "citizen",
      index: true,
    },
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    department_id: { type: String, default: null },
    ward_number: { type: Number, default: null },
    is_active: { type: Boolean, default: true },
    is_verified: { type: Boolean, default: false },
    fcm_token: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
