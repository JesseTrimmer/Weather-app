import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const US_STATES = {
  al:"alabama", ak:"alaska", az:"arizona", ar:"arkansas", ca:"california",
  co:"colorado", ct:"connecticut", de:"delaware", fl:"florida", ga:"georgia",
  hi:"hawaii", id:"idaho", il:"illinois", in:"indiana", ia:"iowa",
  ks:"kansas", ky:"kentucky", la:"louisiana", me:"maine", md:"maryland",
  ma:"massachusetts", mi:"michigan", mn:"minnesota", ms:"mississippi", mo:"missouri",
  mt:"montana", ne:"nebraska", nv:"nevada", nh:"new hampshire", nj:"new jersey",
  nm:"new mexico", ny:"new york", nc:"north carolina", nd:"north dakota", oh:"ohio",
  ok:"oklahoma", or:"oregon", pa:"pennsylvania", ri:"rhode island", sc:"south carolina",
  sd:"south dakota", tn:"tennessee", tx:"texas", ut:"utah", vt:"vermont",
  va:"virginia", wa:"washington", wv:"west virginia", wi:"wisconsin", wy:"wyoming"
};

function interpretWeatherCode(code, isDay = true) {
  const d = isDay ? "day" : "night";
  if (code === 0)  return { condition: "Clear",         icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/113.png" };
  if (code <= 2)   return { condition: "Partly Cloudy", icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/116.png" };
  if (code === 3)  return { condition: "Overcast",      icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/122.png" };
  if (code <= 48)  return { condition: "Foggy",         icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/248.png" };
  if (code <= 57)  return { condition: "Drizzle",       icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/266.png" };
  if (code <= 67)  return { condition: "Rain",          icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/296.png" };
  if (code <= 77)  return { condition: "Snow",          icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/338.png" };
  if (code <= 82)  return { condition: "Rain Showers",  icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/308.png" };
  if (code <= 86)  return { condition: "Snow Showers",  icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/368.png" };
  if (code <= 99)  return { condition: "Thunderstorm",  icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/389.png" };
  return                  { condition: "Unknown",        icon: "//cdn.weatherapi.com/weather/64x64/" + d + "/113.png" };
}

app.get("/api/weather", async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: "City required" });

  try {
    const parts = city.split(",").map(p => p.trim());
    const cityName = parts[0];
    const stateHint = parts[1] ? parts[1].toLowerCase() : null;

    const geoRes = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(cityName) + "&count=10&language=en&format=json"
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }

    let match = geoData.results[0];
    if (stateHint) {
      const fullStateName = US_STATES[stateHint] || stateHint;
      const stateMatch = geoData.results.find(r => {
        const admin = (r.admin1 || "").toLowerCase();
        return admin === fullStateName || admin.includes(stateHint);
      });
      if (stateMatch) match = stateMatch;
    }

    const { latitude, longitude, name, admin1, country } = match;
    const displayCity = admin1 ? name + ", " + admin1 : name + ", " + country;

    // Fetch daily + hourly together
    const weatherRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude +
      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
      "&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=8"
    );
    const weatherData = await weatherRes.json();

    const current = weatherData.current;
    const daily   = weatherData.daily;
    const hourly  = weatherData.hourly;

    const { condition, icon } = interpretWeatherCode(daily.weather_code[0], current.is_day === 1);

    const weekly = daily.time.slice(1, 8).map((date, i) => {
      const idx = i + 1;
      const { condition: dayCondition, icon: dayIcon } = interpretWeatherCode(daily.weather_code[idx], true);
      return {
        date,
        high: Math.round(daily.temperature_2m_max[idx]),
        low: Math.round(daily.temperature_2m_min[idx]),
        icon: dayIcon,
        precipChance: daily.precipitation_probability_max[idx] ?? 0,
        precipType: dayCondition,
      };
    });

    // Find current hour index in hourly array
    const nowStr = current.time;
    const nowIndex = hourly.time.findIndex(t => t === nowStr);
    const startIdx = nowIndex >= 0 ? nowIndex : 0;

    const hourlyForecast = hourly.time.slice(startIdx, startIdx + 24).map((time, i) => {
      const idx = startIdx + i;
      const isDay = hourly.is_day[idx] === 1;
      const { condition: hCondition, icon: hIcon } = interpretWeatherCode(hourly.weather_code[idx], isDay);
      return {
        time,
        hour: new Date(time + ":00").getHours(),
        temp: Math.round(hourly.temperature_2m[idx]),
        condition: hCondition,
        icon: hIcon,
        precipChance: hourly.precipitation_probability[idx] ?? 0,
        windMph: Math.round(hourly.wind_speed_10m[idx]),
        isDay,
      };
    });

    res.json({
      city: displayCity,
      currentTemp: Math.round(current.temperature_2m),
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      condition,
      icon,
      precipChance: daily.precipitation_probability_max[0] ?? 0,
      precipType: condition,
      humidity: current.relative_humidity_2m,
      windMph: Math.round(current.wind_speed_10m),
      weekly,
      hourly: hourlyForecast,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log("Backend running at http://localhost:" + PORT);
});