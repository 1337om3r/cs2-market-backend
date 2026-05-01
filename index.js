import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

let cache = [];
let lastFetch = 0;
const CACHE_TTL = 60000;

const QUERIES = [
  "ak", "awp", "m4", "usp", "glock",
  "deagle", "p250", "mp9", "mac10",
  "karambit", "bayonet", "butterfly",
  "knife", "glove", "sniper",
  "rifle", "smg"
];

const EXCLUDE = ["case", "capsule", "graffiti", "sticker", "key", "pass", "patch"];

function isValidSkin(name) {
  const n = name.toLowerCase();
  return !EXCLUDE.some(word => n.includes(word));
}

async function fetchQuery(query) {
  let all = [];

  for (let start = 0; start < 300; start += 100) {
    try {
      const response = await fetch(
        `https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=100&start=${start}&query=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "Referer": "https://steamcommunity.com/market/"
          }
        }
      );

      if (!response.ok) {
        console.warn(`[${query}] start=${start} → ${response.status}`);
        break;
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) break;

      all.push(...data.results);
      console.log(`[${query}] start=${start} → ${data.results.length} sonuç`);

      if (data.results.length < 100) break;

      await new Promise(res => setTimeout(res, 500));

    } catch (err) {
      console.error(`[${query}] start=${start} hata:`, err.message);
      break;
    }
  }

  return all
    .filter(item => isValidSkin(item.name))
    .map(item => ({
      name: item.name,
      price: item.sell_price_text
        ? parseFloat(
            item.sell_price_text
              .replace("$", "")
              .replace(",", "")
          ) || 0
        : 0,
      image:
        "https://community.cloudflare.steamstatic.com/economy/image/" +
        item.asset_description.icon_url
    }));
}

app.get("/api/skins", async (req, res) => {
  try {
    if (cache.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      console.log("CACHE HIT:", cache.length, "skin");
      return res.json({ skins: cache });
    }

    console.log("Steam'den çekiliyor...");

    const all = [];
    for (const query of QUERIES) {
      const results = await fetchQuery(query);
      all.push(...results);
    }

    // Duplicate temizle
    const seen = new Set();
    const skins = all.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });

    console.log("TOPLAM UNIQUE SKIN:", skins.length);

    if (skins.length === 0) {
      if (cache.length > 0) return res.json({ skins: cache });
      return res.json({ skins: [] });
    }

    cache = skins;
    lastFetch = Date.now();

    res.json({ skins });

  } catch (err) {
    console.error("ERROR:", err);
    if (cache.length > 0) return res.json({ skins: cache });
    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
