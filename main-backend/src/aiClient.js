const axios = require("axios");

function getAiBaseUrl() {
  return (process.env.AI_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
}

async function waitForAiReady(timeoutMs) {
  const baseUrl = getAiBaseUrl();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await axios.get(`${baseUrl}/health`, { timeout: 3000 });
      return true;
    } catch (_err) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return false;
}

async function classifyText(payload) {
  const baseUrl = getAiBaseUrl();
  const { data } = await axios.post(`${baseUrl}/classify/text`, payload, { timeout: 30000 });
  return data;
}

async function classifyImage(payload) {
  const baseUrl = getAiBaseUrl();
  const { data } = await axios.post(`${baseUrl}/classify/image`, payload, { timeout: 60000 });
  return data;
}

async function checkDuplicates(payload) {
  const baseUrl = getAiBaseUrl();
  const { data } = await axios.post(`${baseUrl}/duplicates/check`, payload, { timeout: 30000 });
  return data;
}

async function calculatePriority(payload) {
  const baseUrl = getAiBaseUrl();
  const { data } = await axios.post(`${baseUrl}/priority/calculate`, payload, { timeout: 30000 });
  return data;
}

async function routeDepartment(payload) {
  const baseUrl = getAiBaseUrl();
  const { data } = await axios.post(`${baseUrl}/routing/department`, payload, { timeout: 30000 });
  return data;
}

module.exports = {
  waitForAiReady,
  classifyText,
  classifyImage,
  checkDuplicates,
  calculatePriority,
  routeDepartment,
};
