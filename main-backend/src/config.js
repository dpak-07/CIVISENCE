function parseCsv(value, fallback = []) {
  if (!value || typeof value !== "string") return fallback;
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUrl: process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/civisense",
  jwtSecret: process.env.JWT_SECRET_KEY || "change-me",
  jwtAlgorithm: process.env.JWT_ALGORITHM || "HS256",
  accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 30),
  refreshTokenExpireDays: Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7),
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS, ["http://localhost:3000", "http://localhost:5173"]),
};
