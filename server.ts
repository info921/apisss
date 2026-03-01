import express from "express";
import { createServer as createViteServer } from "vite";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
