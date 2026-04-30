import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const BASE_URL = "https://kolzex.com/api/public/skins";

app.get("/api/skins", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query);
    params.set("game", "cs2");

    const response = await fetch(`${BASE_URL}?${params}`);
    const data = await response.json();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));