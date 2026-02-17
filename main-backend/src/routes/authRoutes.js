const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const config = require("../config");
const {
  createAccessToken,
  createRefreshToken,
  requireAuth,
  attachCurrentUser,
} = require("../middleware/auth");

const router = express.Router();

function toUserResponse(user) {
  return {
    id: String(user._id),
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone: user.phone,
    department_id: user.department_id,
    ward_number: user.ward_number,
    is_active: user.is_active,
    is_verified: user.is_verified,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, phone, role, department_id, ward_number } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ detail: "email, password, and full_name are required" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (existing) return res.status(400).json({ detail: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: String(email).toLowerCase(),
      password_hash,
      full_name,
      phone: phone || null,
      role: role || "citizen",
      department_id: department_id || null,
      ward_number: ward_number ?? null,
    });

    const access_token = createAccessToken(user);
    const refresh_token = createRefreshToken(user);

    return res.status(201).json({ access_token, refresh_token, user: toUserResponse(user) });
  } catch (error) {
    return res.status(500).json({ detail: `Registration failed: ${error.message}` });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ detail: "email and password are required" });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return res.status(401).json({ detail: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ detail: "Invalid email or password" });
  if (!user.is_active) return res.status(403).json({ detail: "Account is inactive" });

  const access_token = createAccessToken(user);
  const refresh_token = createRefreshToken(user);

  return res.json({ access_token, refresh_token, user: toUserResponse(user) });
});

router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ detail: "refresh_token is required" });

    const payload = jwt.verify(refresh_token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type !== "refresh") return res.status(401).json({ detail: "Invalid refresh token" });

    const user = await User.findById(payload.sub);
    if (!user || !user.is_active) return res.status(401).json({ detail: "User not found or inactive" });

    return res.json({
      access_token: createAccessToken(user),
      refresh_token: createRefreshToken(user),
      token_type: "bearer",
    });
  } catch (_err) {
    return res.status(401).json({ detail: "Invalid refresh token" });
  }
});

router.get("/me", requireAuth, attachCurrentUser, async (req, res) => {
  return res.json(toUserResponse(req.currentUser));
});

router.put("/fcm-token", requireAuth, attachCurrentUser, async (req, res) => {
  const { fcm_token } = req.body || {};
  if (!fcm_token) return res.status(400).json({ detail: "fcm_token is required" });
  await User.updateOne({ _id: req.currentUser._id }, { $set: { fcm_token } });
  return res.json({ message: "FCM token updated successfully" });
});

module.exports = router;
