const mongoose = require("mongoose");
const config = require("./config");

async function connectDb() {
  await mongoose.connect(config.mongoUrl);
  return mongoose.connection;
}

module.exports = { connectDb, mongoose };
