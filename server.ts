import express from "express";
import { createServer as createViteServer } from "vite";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "appState.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase limit for large payloads (images)
  app.use(express.json({ limit: '50mb' }));

  // State persistence endpoints
  app.get("/api/state", (req, res) => {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error reading state:", error);
      res.status(500).json({ error: "Failed to read state" });
    }
  });

  app.post("/api/state", (req, res) => {
    try {
      const state = req.body;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving state:", error);
      res.status(500).json({ error: "Failed to save state" });
    }
  });

  // Vertex AI API endpoint
  app.post("/api/vertex/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const project = process.env.GOOGLE_CLOUD_PROJECT || "ai-kampania-10-krokow";
      const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

      const vertexAI = new VertexAI({ project, location });
      const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-1.5-flash-002",
      });

      const request = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      };

      const result = await generativeModel.generateContent(request);
      const response = await result.response;
      const text = response.candidates[0].content.parts[0].text;

      res.json({ text });
    } catch (error: any) {
      console.error("Vertex AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
