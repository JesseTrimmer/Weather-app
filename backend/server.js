import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.WEATHER_API_KEY;

app.use(cors());
app.use(express.json());

if (!API_KEY) {
  console.error("❌ WEATHER_API_KEY missing");
  process.exit(1);
}

app.get("/api/weather", async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: "City required" });

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=9`
    );

    if (!response.ok) throw new Error("API failed");

    const data = await response.json();

    // ✅ Get location-local date (YYYY-MM-DD)
    const locationDate = data.location.localtime.split(" ")[0];

    // ✅ Find today's forecast by DATE, not index
    const todayForecast = data.forecast.forecastday.find(
      day => day.date === locationDate
    );

    // ✅ Get ONLY future days (tomorrow → next 6 days)
    const weekly = data.forecast.forecastday
      .filter(day => day.date > locationDate)
      .slice(0, 7)
      .map(day => ({
        date: day.date,
        high: day.day.maxtemp_f,
        low: day.day.mintemp_f,
        icon: day.day.condition.icon,
        precipChance: Number(day.day.daily_chance_of_rain) || 0
      }));

    res.json({
      city: data.location.name,
      currentTemp: data.current.temp_f,
      high: todayForecast.day.maxtemp_f,
      low: todayForecast.day.mintemp_f,
      condition: data.current.condition.text,
      precipChance: Number(todayForecast.day.daily_chance_of_rain) || 0,
      precipType: todayForecast.day.condition.text,
      humidity: data.current.humidity,
      windMph: data.current.wind_mph,
      icon: data.current.condition.icon,
      weekly
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});