import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

let cache = [];
let lastFetch = 0;
const CACHE_TTL = 60000;

const QUERIES = [
  "AK-47", "AWP", "M4A1-S", "M4A4",
  "Glock-18", "USP-S", "Desert Eagle",
  "P250", "MP9", "UMP-45",
  "Knife", "Karambit", "Butterfly"
];

const EXCLUDE = ["case", "capsule", "graffiti", "sticker", "key", "pass", "patch"];

function isValidSkin(name) {
  const n = name.toLowerCase();
  return !EXCLUDE.some(word => n.includes(word));
}

async function fetchQuery(query) {
  let all = [];

  for (let start = 0; start <= 200; start += 100) {
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
        console.warn(`[${query}] start=${start} → status ${response.status}`);
        break;
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) break;

      const parsed = data.results
        .filter(item => isValidSkin(item.name))
        .map(item => ({
          name: item.name,
          price: item.sell_price ? item.sell_price / 100 : 0,
          image:
            "https://community.cloudflare.steamstatic.com/economy/image/" +
            item.asset_description.icon_url
        }));

      all.push(...parsed);
      console.log(`[${query}] start=${start} → ${parsed.length} skin`);

      // Sonuç 100'den azsa sonraki sayfa yoktur
      if (data.results.length < 100) break;

      // Rate limit koruması
      await new Promise(res => setTimeout(res, 500));

    } catch (err) {
      console.error(`[${query}] start=${start} → hata:`, err.message);
      break;
    }
  }

  return all;
}

app.get("/api/skins", async (req, res) => {
  try {
    if (cache.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      console.log("CACHE HIT:", cache.length, "skins");
      return res.json({ skins: cache });
    }

    console.log("FETCHING from Steam...");

    // Query'leri sırayla çek (paralel yapınca Steam ban atar)
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

    console.log("TOTAL UNIQUE SKINS:", skins.length);

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
