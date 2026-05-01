import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/skins", async (req, res) => {
  try {
    const response = await fetch(
      "https://steamcommunity.com/market/search/render/?appid=730&norender=1&count=50"
    );

    const data = await response.json();

    const skins = data.results.map(item => ({
      name: item.name,
      price: item.sell_price_text
        ? item.sell_price_text.replace("$", "").replace(",", ".")
        : "0",
      image:
        "https://community.cloudflare.steamstatic.com/economy/image/" +
        item.asset_description.icon_url
    }));

    res.json({ skins });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
