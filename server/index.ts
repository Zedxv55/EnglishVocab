import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // AI proxy — Mistral chat completions so the API key stays on the server.
  app.post("/api/mistral/chat", async (req, res) => {
    const { apiKey, model, maxTokens, messages } = (req.body || {}) as {
      apiKey?: string;
      model?: string;
      maxTokens?: number;
      messages?: { role: string; content: string }[];
    };
    const key = apiKey || process.env.MISTRAL_API_KEY;
    if (!key) {
      res.status(500).json({ error: "Mistral API key is not configured" });
      return;
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }
    try {
      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "mistral-large-latest",
          messages,
          max_tokens: Math.min(4000, Math.max(1, Number(maxTokens) || 2000)),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        res.status(resp.status).json({ error: data.error?.message || "Mistral API error" });
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(502).json({ error: `Upstream request failed: ${String(error)}` });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start the standalone server when run directly (not when ssr-loaded by the Vite dev proxy).
if (!process.env.MANUS_API_PROXY) {
  startServer().catch(console.error);
}
