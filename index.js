import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/skins", async (req, res) => {
  try {
    console.log("API HIT");

    const response = await fetch(
      "https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=50",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      }
    );

    console.log("FETCH STATUS:", response.status);

    if (!response.ok) {
      return res.status(500).json({
        error: "Steam API blocked or failed",
        status: response.status
      });
    }

    const data = await response.json();
    console.log("RESULT COUNT:", data.results?.length);

    if (!data.results || data.results.length === 0) {
      return res.json({ skins: [] });
    }

    const skins = data.results.map(item => ({
      name: item.name,
      price: item.sell_price_text
        ? parseFloat(
            item.sell_price_text.replace(/[^\d.]/g, "")
          ) || 0
        : 0,
      image:
        "https://community.cloudflare.steamstatic.com/economy/image/" +
        item.asset_description.icon_url
    }));

    res.json({ skins });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
