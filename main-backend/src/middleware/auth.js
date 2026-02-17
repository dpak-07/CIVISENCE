const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

function createAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, type: "access" },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.accessTokenExpireMinutes}m` }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), type: "refresh" },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, expiresIn: `${config.refreshTokenExpireDays}d` }
  );
}

function extractBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ detail: "Missing bearer token" });

    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [config.jwtAlgorithm] });
    if (payload.type !== "access") return res.status(401).json({ detail: "Invalid token type" });

    req.auth = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

async function attachCurrentUser(req, res, next) {
  try {
    const userId = req.auth?.sub;
    const user = await User.findById(userId).lean();
    if (!user || !user.is_active) return res.status(401).json({ detail: "User not found or inactive" });
    req.currentUser = user;
    next();
  } catch (_err) {
    return res.status(401).json({ detail: "Unable to load user" });
  }
}

function requireStaff(req, res, next) {
  const role = req.currentUser?.role;
  if (role === "municipal_staff" || role === "admin") return next();
  return res.status(403).json({ detail: "Staff access required" });
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  requireAuth,
  attachCurrentUser,
  requireStaff,
};
