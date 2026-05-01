import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

let cache = [];
let lastFetch = 0;
const CACHE_TTL = 60000;

const QUERIES = ["ak", "awp", "knife", "m4", "glove"];

const EXCLUDE = ["case", "capsule", "graffiti", "sticker", "key", "pass", "patch"];

function isValidSkin(name) {
  const n = name.toLowerCase();
  return !EXCLUDE.some(word => n.includes(word));
}

async function fetchQuery(query) {
  const response = await fetch(
    `https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=100&query=${query}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  if (!data.results) return [];

  return data.results
    .filter(item => isValidSkin(item.name))
    .map(item => ({
      name: item.name,
      price: item.sell_price_text
        ? parseFloat(item.sell_price_text.replace(/[^\d.]/g, "")) || 0
        : 0,
      image:
        "https://community.cloudflare.steamstatic.com/economy/image/" +
        item.asset_description.icon_url
    }));
}

app.get("/api/skins", async (req, res) => {
  try {
    if (cache.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      console.log("CACHE HIT:", cache.length, "skins");
      return res.json({ skins: cache });
    }

    console.log("FETCHING from Steam...");

    const results = await Promise.all(QUERIES.map(fetchQuery));

    // Birleştir, duplicate'leri isime göre temizle
    const seen = new Set();
    const skins = results
      .flat()
      .filter(item => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });

    console.log("TOTAL SKINS:", skins.length);

    if (skins.length === 0) {
      if (cache.length > 0) {
        console.log("No results, serving stale cache");
        return res.json({ skins: cache });
      }
      return res.json({ skins: [] });
    }

    cache = skins;
    lastFetch = Date.now();

    res.json({ skins });

  } catch (err) {
    console.error("ERROR:", err);

    if (cache.length > 0) {
      console.log("Error, serving stale cache");
      return res.json({ skins: cache });
    }

    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
