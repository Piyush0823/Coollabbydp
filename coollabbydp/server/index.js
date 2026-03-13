require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const { execSync } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const PORT = 5001;

const rooms = {};
const versionHistory = {};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Collaborative Code Editor Server Running 🚀");
});

// ========================
// 🔥 PISTON + LOCAL FALLBACK RUN ROUTE
// ========================
app.post("/run", async (req, res) => {
    const { code, language, room, username } = req.body;

    if (!room) {
        return res.status(400).json({ output: "Room is missing" });
    }

    // Language mapping for Piston API
    const languageMap = {
      javascript: "javascript",
      python: "python3",
      python3: "python3",
      cpp: "cpp",
      c: "c",
      java: "java",
      ruby: "ruby",
      go: "go",
      rust: "rust",
    };

    const pistonLanguage = languageMap[language.toLowerCase()];

    if (!pistonLanguage) {
        return res.status(400).json({ 
            output: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(", ")}`
        });
    }

    // Local runners (Node builtin, no deps)
    const localRunners = {
      javascript: { cmd: "node", flag: "-e" },
      python: { cmd: "python", flag: "-c" },
      python3: { cmd: "python", flag: "-c" }
    };

    const localRunner = localRunners[language.toLowerCase()];

    let finalOutput = "No output";

    try {
        // Try Piston API first (free public service)
        console.log(`🔥 Trying Piston API for ${language}...`);
        const response = await fetch("https://api.piston.rocks/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: pistonLanguage,
                version: "*",
                files: [{ name: "main", content: code }]
            }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        finalOutput = result.run ? (result.run.stdout || result.run.stderr || "") : "";
        
        console.log(`✅ Piston executed ${language} in room ${room}`);
        
    } catch (pistonErr) {
        console.log(`🔄 Piston failed: ${pistonErr.message}, trying local...`);
        
        // Local fallback for JS/Python only
        if (localRunner) {
            try {
                const escapedCode = code.replace(/"/g, '\\"').replace(/`/g, "\\`");
                const cmd = `${localRunner.cmd} ${localRunner.flag} "${escapedCode}"`;
                finalOutput = execSync(cmd, { 
                    timeout: 5000, 
                    encoding: "utf8", 
                    stdio: "pipe",
                    shell: true 
                }).toString().trim();
                
                console.log(`✅ Local ${language} executed in room ${room}`);
                
            } catch (localErr) {
                finalOutput = `Local exec error: ${localErr.message}`;
                console.error(`❌ Local failed: ${localErr.message}`);
            }
        } else {
            finalOutput = `Unsupported for local: ${language}. Piston error: ${pistonErr.message}`;
        }
    }

    // Broadcast output to room
    io.to(room).emit("receive_output", {
        output: finalOutput || "No output",
        ranBy: username,
    });

    console.log(`${language} output sent to room ${room}`);
    res.json({ success: true, output: finalOutput });
});

// ========================
// AI CODE SUGGESTION ROUTE (OLLAMA - FREE & LOCAL)
// ========================
app.post("/ai-suggest", async (req, res) => {
  try {
    const { code, language, prompt } = req.body;

    if (!code || !language || !prompt) {
      return res.status(400).json({
        suggestion: "Missing required fields: code, language, or prompt",
        error: "Invalid request",
        type: "error"
      });
    }

    // Format the prompt with code context
    const fullPrompt = `You are an expert code assistant. The user is working with ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Request: ${prompt}

Provide a clear, concise, and helpful response. Focus on practical solutions and best practices.`;

    // Call Ollama API (Local, Free, No API Key Required)
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral", // You can change to neural-chat or orca-mini
        prompt: fullPrompt,
        stream: false,
        temperature: 0.7
      },
      {
        timeout: 300000, // 5 minute timeout for long responses
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    let suggestion = "";
    
    // Extract the response from Ollama
    if (response.data && response.data.response) {
      suggestion = response.data.response.trim();
    }

    if (!suggestion || suggestion.length === 0) {
      suggestion = "I couldn't generate a response. Make sure Ollama is running with 'ollama pull mistral' first.";
    }

    res.json({ 
      suggestion: suggestion,
      type: "ai_suggestion",
      model: "mistral (local, free)"
    });

  } catch (err) {
    console.error("Ollama Error:", {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // Helpful error messages
    let errorMsg = "";
    
    if (err.code === "ECONNREFUSED") {
      errorMsg = "⚠️ Ollama is not running. Please:\n1. Open Command Prompt\n2. Run: ollama pull mistral\n3. Keep Ollama window open while using the chatbot\n\nRead OLLAMA_SETUP.md for full instructions.";
    } else if (err.code === "ETIMEDOUT" || err.code === "EHOSTUNREACH") {
      errorMsg = "Ollama is not responding. Make sure it's running on http://localhost:11434";
    } else if (err.message.includes("404")) {
      errorMsg = "Ollama model not found. Run: ollama pull mistral";
    } else {
      errorMsg = `Error: ${err.message}`;
    }
    
    res.status(503).json({ 
      suggestion: errorMsg,
      error: err.message,
      type: "error"
    });
  }
});

// ========================
// SOCKET.IO LOGIC - UNCHANGED
// ========================
io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  socket.on("join_room", ({ room, username }) => {
    socket.join(room);

    socket.data.room = room;
    socket.data.username = username;

    if (!rooms[room]) {
      rooms[room] = {
        users: [],
        host: socket.id,
        language: "javascript",
      };
    }

    rooms[room].users = rooms[room].users.filter(
      (user) => user.id !== socket.id
    );

    rooms[room].users.push({
      id: socket.id,
      username,
    });

    io.to(room).emit("room_data", {
      users: rooms[room].users,
      host: rooms[room].host,
      language: rooms[room].language,
    });

    io.to(room).emit("receive_message", {
      sender: "system",
      message: `🟢 ${username} joined the room`,
      time: new Date().toLocaleTimeString(),
    });

    if (versionHistory[room]) {
      socket.emit("update_versions", versionHistory[room]);
    }

    console.log(`📌 ${username} joined room ${room}`);
  });

  socket.on("change_language", ({ room, language }) => {
    if (!rooms[room]) return;

    if (socket.id === rooms[room].host) {
      rooms[room].language = language;
      io.to(room).emit("language_updated", language);
      console.log(`🌍 Language changed to ${language}`);
    }
  });

  socket.on("send_code", ({ room, code }) => {
    socket.to(room).emit("receive_code", code);
  });

  socket.on("send_message", ({ room, message }) => {
    io.to(room).emit("receive_message", {
      sender: socket.data.username,
      message,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("save_version", ({ room, code }) => {
    if (!versionHistory[room]) {
      versionHistory[room] = [];
    }

    const history = versionHistory[room];
    const lastVersion = history[history.length - 1];

    if (lastVersion && lastVersion.code === code) return;

    history.push({
      code,
      time: new Date().toLocaleTimeString(),
    });

    if (history.length > 10) {
      history.shift();
    }

    io.to(room).emit("update_versions", history);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    const username = socket.data.username;

    if (!room || !rooms[room]) return;

    rooms[room].users = rooms[room].users.filter(
      (user) => user.id !== socket.id
    );

    if (
      socket.id === rooms[room].host &&
      rooms[room].users.length > 0
    ) {
      rooms[room].host = rooms[room].users[0].id;
      console.log("👑 Host transferred");
    }

    io.to(room).emit("room_data", {
      users: rooms[room].users,
      host: rooms[room].host,
      language: rooms[room].language,
    });

    if (username) {
      io.to(room).emit("receive_message", {
        sender: "system",
        message: `🔴 ${username} left the room`,
        time: new Date().toLocaleTimeString(),
      });
    }

    if (rooms[room].users.length === 0) {
      delete rooms[room];
      delete versionHistory[room];
    }

    console.log(`❌ ${username || socket.id} left room ${room}`);
  });
});

server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});

