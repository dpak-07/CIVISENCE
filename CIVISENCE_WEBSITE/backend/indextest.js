const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const serviceAccount = require("./auth.json");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const path = require("path");
const { exec } = require("child_process");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Firebase Init
console.log('[Firebase] Initializing...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
console.log('[Firebase] Firestore connected.');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// 🧠 Temporary in-memory store for concept session
const memoryStore = {};

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('Teach-Back Chatbot Backend is running ✅');
});

// 🔐 Registration
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    if (!snapshot.empty) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await usersRef.add({ name, email, password: hashedPassword });

    res.json({ message: 'User registered successfully ✅' });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 🔐 Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({
      message: 'Login successful ✅',
      user: { name: userData.name, email: userData.email },
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 🔁 Reusable generator function
const generate = async (prompt, max_tokens = 300) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt,
      stream: false,
      temperature: 0.4,
      top_p: 0.9,
      max_tokens,
    }),
  });

  const data = await response.json();
  return (data?.response || '').trim();
};


// 📝 Route: Summarise Concept
// app.post('/summarise', async (req, res) => {
//   const { concept } = req.body;
//   console.log(`\n[SUMMARISE] Concept: "${concept}"`);

//   // Refined prompt for clarity, simplicity, and length control
//   const prompt = `
//   Explain the concept of "${concept}" in simple terms so that a school or college student can easily understand it.
//   Use plain, everyday language and short sentences.
//   Avoid technical jargon unless necessary — if used, explain it clearly.
//   Keep the explanation concise and under 200 words.
//   Do not add extra topics or unrelated information.
//   `;

//   try {
//     const summary = await generate(prompt);
//     if (!summary) throw new Error('Empty summary response');

//     await db.collection('teachback').add({
//       type: 'summary',
//       concept,
//       summary,
//       timestamp: new Date(),
//     });

//     console.log('[SUMMARISE] ✅ Summary:', summary.slice(0, 100), '...');
//     res.json({ response: summary });
//   } catch (error) {
//     console.error('❌ [SUMMARISE] Error:', error.message);
//     res.status(500).json({ response: 'Failed to get summary.' });
//   }
// });

// // 🧾 Route: Generate Flashcards
// app.post('/flashcards', async (req, res) => {
//   const { concept } = req.body;
//   console.log(`\n[FLASHCARDS] Concept: "${concept}"`);

//   const prompt = `Create 6 flashcards about "${concept}". Each flashcard should have a "title" and a short "explanation". Return the result as a JSON array like this: [{"title": "...", "explanation": "..."}, ...]`;

//   try {
//     const flashcardRaw = await generate(prompt, 300);
//     if (!flashcardRaw) throw new Error('Empty flashcard response');

//     let flashcards;
//     try {
//       flashcards = JSON.parse(flashcardRaw);
//       if (!Array.isArray(flashcards)) throw new Error('Invalid flashcard format');
//     } catch (parseError) {
//       console.warn('[FLASHCARDS] ⚠ JSON parsing failed:', flashcardRaw);
//       throw new Error('Failed to parse flashcards.');
//     }

//     await db.collection('teachback').add({
//       type: 'flashcards',
//       concept,
//       flashcards,
//       timestamp: new Date(),
//     });

//     console.log('[FLASHCARDS] ✅ Flashcards generated:', flashcards.length);
//     res.json({ response: flashcards });
//   } catch (error) {
//     console.error('❌ [FLASHCARDS] Error:', error.message);
//     res.status(500).json({ response: 'Failed to generate flashcards.' });
//   }
// });
app.post('/ask', async (req, res) => {
  let { concept } = req.body;
  console.log(`\n[ASK] Raw concept received: "${concept}"`);

  if (!concept || !concept.trim()) {
    return res.status(400).json({ response: 'Concept is required.' });
  }

  concept = concept.trim().toLowerCase().replace(/^about\s+|^what\s+is\s+|\?$/g, '');
  const conceptKey = concept.charAt(0).toUpperCase() + concept.slice(1);
   const prompt = `
   Explain the concept of "${concept}" in simple terms so that a school or college student can easily understand it.
   Use plain, everyday language and short sentences.
   Avoid technical jargon unless necessary — if used, explain it clearly.
   Keep the explanation concise and under 200 words.
   Do not add extra topics or unrelated information.
 `;
  try {
    const explanation = await generate(prompt, 120);
    if (!explanation) throw new Error('Empty model response');

    if (!memoryStore[conceptKey]) {
      memoryStore[conceptKey] = {
        concept: conceptKey,
        history: [],
      };
    }

    memoryStore[conceptKey].history.push({
      explanation,
      userAnswer: null,
      feedback: null,
    });

    console.log('[ASK] ✅ Explanation:', explanation.slice(0, 100), '...');
    res.json({ response: explanation });
  } catch (error) {
    console.error('❌ [ASK] Error:', error.message);
    res.status(500).json({ response: 'Failed to get explanation.' });
  }
});

// ✅ Route: Evaluate Student Answer (Enhanced)
// 🛠 Helper: Normalize concept consistently
function normalizeConcept(text) {
  if (!text) return '';
  text = text.trim().toLowerCase();
  text = text.replace(/^about\s+/, '');
  text = text.replace(/^what\s+is\s+/, '');
  text = text.replace(/\?$/, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ✅ Route: Evaluate Student Answer (Fixed + Enhanced)
app.post('/check', async (req, res) => {
  let { concept, userAnswer } = req.body;
  if (!concept || !userAnswer) {
    return res.status(400).json({ response: 'Missing data' });
  }

  concept = concept.trim().toLowerCase().replace(/^about\s+|^what\s+is\s+|\?$/g, '');
  const conceptKey = concept.charAt(0).toUpperCase() + concept.slice(1);

  const session = memoryStore[conceptKey];
  if (!session || !session.history || session.history.length === 0) {
    return res.status(400).json({ response: 'Explanation not available yet. Please call /ask first.' });
  }

  const latestExplanation = session.history[session.history.length - 1].explanation;

  const prompt = `
Compare the following two answers and evaluate the student's understanding:

Summarised answer (AI's explanation from teach-back method): "${latestExplanation}"
User's answer: "${userAnswer}"

Instructions for your response:
- Determine how similar the user's answer is to the summarised answer.
- Provide a percentage score representing how closely the user's answer matches the summarised answer (0% to 100%).
- Provide an estimated "understanding score" (0% to 100%) representing how well the student understands the concept.
- Mention any key points the user missed or misunderstood.
- Write the feedback in a natural, human, and conversational tone (no bullet points, no headers, no emojis).
- Keep it short and clear.
`.trim();

  try {
    const feedback = await generate(prompt, 200);
    if (!feedback) throw new Error('Empty feedback from model.');

    // Store new entry
    session.history.push({
      explanation: latestExplanation,
      userAnswer,
      feedback,
    });

    console.log('[CHECK] ✅ Feedback stored:', feedback.slice(0, 100), '...');
    res.json({ response: feedback });
  } catch (error) {
    console.error('❌ [CHECK] Error:', error.message);
    res.status(500).json({ response: 'Failed to evaluate answer.' });
  }
});
// ✅ Route: Complete Session
// This endpoint saves the session data to Firestore and cleans up the in-memory store
app.post('/complete', async (req, res) => {
  let { concept } = req.body;
  if (!concept || !concept.trim()) {
    return res.status(400).json({ response: 'Concept is required.' });
  }

  concept = concept.trim().toLowerCase().replace(/^about\s+|^what\s+is\s+|\?$/g, '');
  const conceptKey = concept.charAt(0).toUpperCase() + concept.slice(1);

  const session = memoryStore[conceptKey];
  if (!session || !session.history || session.history.length === 0) {
    return res.status(400).json({ response: 'No session found to complete.' });
  }

  try {
    await db.collection('history').add({
      type: 'completed-session',
      concept: conceptKey,
      conversation: session.history,
      timestamp: new Date(),
    });

    delete memoryStore[conceptKey]; // cleanup after saving
    console.log(`[COMPLETE] ✅ Session saved for: "${conceptKey}"`);
    res.json({ response: 'Session saved successfully ✅' });
  } catch (error) {
    console.error('❌ [COMPLETE] Error:', error.message);
    res.status(500).json({ response: 'Failed to save session.' });
  }
});

app.get('/history_chatbot', async (req, res) => {
  try {
    const snapshot = await db.collection('history').orderBy('timestamp', 'desc').get();
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ sessions });
  } catch (err) {
    console.error('❌ Failed to fetch history:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

const upload = multer({ dest: 'uploads/' });
async function extractTextFromPDF(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textContent += pageText + '\n';
  }
  return textContent;
}
app.post('/process', upload.single('file'), async (req, res) => {
  console.log(`\n🛠️ [PROCESS] Request received: task=${req.query.task || 'summary'}`);

  const file = req.file;
  const task = req.query.task || 'summary';
  const model = req.query.model || 'llama3'; // You can change default model here

  if (!file) {
    console.warn('⚠️ No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log(`📄 Uploaded file: ${file.originalname}`);
  console.log(`   - Temp path: ${file.path}`);
  console.log(`   - Size: ${(file.size / 1024).toFixed(2)} KB`);

  const filePath = path.resolve(file.path);
  const ext = path.extname(file.originalname).toLowerCase();
  let textContent = '';

  try {
    // ====== Extract Text ======
    console.log(`🔍 Extracting text from ${ext}...`);
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      textContent = data.text;
    } 
    else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      textContent = result.value;
    } 
    else if (ext === '.txt') {
      textContent = fs.readFileSync(filePath, 'utf8');
    } 
    else if (ext === '.mp3' || ext === '.wav' || ext === '.m4a') {
      console.log('🎙️ Transcribing audio file...');
      const transcript = await runPythonScript('transcribe.py', [file.path]);
      textContent = transcript.trim();
    } 
    else {
      console.error('❌ Unsupported file format:', ext);
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    console.log(`✅ Extracted text length: ${textContent.length} chars`);

    if (!textContent.trim()) {
      console.warn('⚠️ No text extracted from file');
      return res.status(400).json({ error: 'No text extracted from file' });
    }

    // ====== Build Prompt ======
    const prompt = buildPrompt(task, textContent);
    console.log(`📝 Prompt built (length: ${prompt.length} chars)`);
    console.log(`   Prompt preview: ${prompt.slice(0, 200)}...`);

    // ====== Call Local LLaMA / Mixtral Model ======
    console.log(`🤖 Sending request to model: ${model}`);
    const aiRes = await axios.post('http://localhost:11434/api/generate', {
      model,
      prompt,
      stream: false
    });

    console.log('📥 Raw AI output received:');
    console.log(aiRes.data.response.slice(0, 300) + '...');

    // ====== Parse Output ======
    let aiOutput = parseAIResponse(aiRes.data.response, task);
    console.log(`📦 Parsed AI output for task "${task}"`);

    res.json({
      task,
      model,
      inputType: ext,
      aiOutput
    });

  } catch (err) {
    console.error('❌ Error during processing:', err);
    res.status(500).json({ error: 'Processing failed', details: err.message });
  } finally {
    // Always delete the uploaded file
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted temp file: ${filePath}`);
    } catch {
      console.warn('⚠️ Failed to delete temp file');
    }
  }
});

// =======================
//  PROMPT GENERATOR
// =======================
function buildPrompt(task, inputText) {
  switch (task) {
    case 'summary':
      return `
You are an expert summarizer.
Summarize the following content in clear, concise bullet points.
Do not add extra commentary.

Content:
${inputText}
      `.trim();

case 'mindmap':
  return `
You are a JSON-only generator.

Task:
Extract a hierarchical mindmap from the given text.

Output:
Only one JSON object. No code fences. No explanations. No text outside JSON.

Format:
{
  "title": "Root Topic",
  "children": [
    {
      "title": "Subtopic 1",
      "children": [
        { "title": "Child 1" },
        { "title": "Child 2" }
      ]
    },
    {
      "title": "Subtopic 2",
      "children": [
        { "title": "Child 3" }
      ]
    }
  ]
}

Rules:
- Output must be **valid JSON** and nothing else.
- "title" must be a short phrase (max 5 words).
- Only include "children" if a node has subtopics.
- The first node's "title" is the main topic.
- Do not include markdown, bullet points, or commentary.

Content:
${inputText}
  `.trim();



    case 'flashcards':
  return `
You are an expert educator.
Your task is to read the given content and extract the 10 most important points of the topic.

Return them in valid JSON format as:
[
  "Important point 1",
  "Important point 2",
  "Important point 3",
  ...
]

Rules:
- Output ONLY valid JSON. No markdown, no extra text, no explanations.
- Exactly 10 points.
- Each point must be concise, factual, and high-value.
- Avoid trivial or obvious details.
- Focus only on the most critical concepts or facts from the content.

Content:
${inputText}
  `.trim();



    case 'qa':
      return `
You are an expert question generator.
Generate exactly 5 Q&A pairs in valid JSON format:
[
  { "question": "Question text here", "answer": "Answer text here" }
]

Rules:
- Output ONLY valid JSON.
- No markdown formatting or extra text.
- Keep answers short and accurate.

Content:
${inputText}
      `.trim();

    default:
      return `
You are an expert summarizer.
Summarize the following content clearly and concisely.

Content:
${inputText}
      `.trim();
  }
}

// =======================
//  AI OUTPUT PARSER
// =======================
// =======================
//  AI OUTPUT PARSER (UPDATED)
// =======================
function parseAIResponse(output, task) {
  // Always trim GPT output
  let cleaned = output.trim();

  // Remove code fences if present
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

  if (task === 'mindmap') {
    try {
      // Find first valid JSON object in the output
      const jsonMatch = cleaned.match(/\{[\s\S]*\}$/m);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed === 'object' && parsed.title) {
          return parsed; // ✅ Always return object
        }
      }
    } catch (err) {
      console.error('❌ Mindmap JSON parse error:', err.message);
      return { error: 'Invalid mindmap JSON', raw: cleaned };
    }
    return { error: 'No valid JSON found for mindmap', raw: cleaned };
  }

  if (task === 'flashcards' || task === 'qa') {
    try {
      // Find first valid JSON array
      const jsonMatch = cleaned.match(/\[[\s\S]*\]$/m);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.error('❌ Array JSON parse error:', err.message);
    }
    return { error: 'Invalid JSON output', raw: cleaned };
  }

  // For summary or others, return cleaned string
  return cleaned;
}

// =======================
//  PYTHON SCRIPT RUNNER
// =======================
function runPythonScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const cmd = `python ${scriptPath} ${args.join(' ')}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
}

// Utility: Build a Mermaid mindmap prompt
function buildMermaidPrompt(text) {
  return `
You are a Mermaid mindmap generator.

Task:
Read the provided text and create a valid Mermaid 'mindmap' diagram code.
The diagram must represent the hierarchy and structure of the ideas in the text.

Rules:
- Output only valid Mermaid syntax starting with 'mindmap'
- No explanations, no Markdown, no JSON — only the Mermaid diagram.
- Keep titles short (max 5 words each).

Text:
${text}
  `.trim();
}

// === Mindmap API ===
const GEMINI_API_KEY = "AIzaSyBvOKxBLIfrEQlArBIyqA1zHTGEGYrw-CA"; // <-- Put your key here
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// ===== Helper =====
function buildMermaidPrompt(text) {
  return `
You are a Mermaid mindmap generator.

Task:
Read the provided text and create a valid Mermaid 'mindmap' diagram code.
The diagram must represent the hierarchy and structure of the ideas in the text.

Rules:
- Output only valid Mermaid syntax starting with 'mindmap'
- No explanations, no Markdown, no JSON — only the Mermaid diagram.
- Keep titles short (max 5 words each).

Text:
${text}
  `.trim();
}

// ===== /mindmap =====
app.post("/mindmap", upload.single("file"), async (req, res) => {
  console.log("\n🛠️ [MINDMAP] Request received");

  const file = req.file;
  if (!file) {
    console.warn("⚠️ No file uploaded");
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log(`📄 Uploaded file: ${file.originalname}`);
  console.log(`   - Temp path: ${file.path}`);
  console.log(`   - Size: ${(file.size / 1024).toFixed(2)} KB`);

  const filePath = path.resolve(file.path);
  const ext = path.extname(file.originalname).toLowerCase();
  let textContent = "";

  try {
    // ===== Extract text =====
    console.log(`🔍 Extracting text from ${ext}...`);
    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      textContent = data.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      textContent = result.value;
    } else if (ext === ".txt") {
      textContent = fs.readFileSync(filePath, "utf8");
    } else {
      console.error(`❌ Unsupported file format: ${ext}`);
      return res.status(400).json({ error: "Unsupported file format" });
    }

    if (!textContent.trim()) {
      console.warn("⚠️ No text extracted from file");
      return res.status(400).json({ error: "No text extracted from file" });
    }

    // ===== Build prompt =====
    console.log("📝 Building Mermaid mindmap prompt...");
    const prompt = buildMermaidPrompt(textContent);

    // ===== Call Gemini =====
    console.log(`🤖 Sending prompt to Gemini API`);
    const geminiRes = await geminiModel.generateContent(prompt);

    const mermaidCode = geminiRes.response.text().trim();
    console.log("📥 Mermaid code preview:");
    console.log(mermaidCode.slice(0, 300) + "...");

    res.json({
      model: "gemini-1.5-pro",
      mermaid: mermaidCode,
    });

  } catch (err) {
    console.error("❌ Mindmap generation error:", err);
    res.status(500).json({ error: "Mindmap generation failed", details: err.message });
  } finally {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted temp file: ${filePath}`);
    } catch {
      console.warn("⚠️ Failed to delete temp file");
    }
  }
});
    
// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
});
