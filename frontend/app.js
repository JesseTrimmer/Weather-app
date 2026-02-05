// ================================
// DOM REFERENCES
// ================================
const form = document.getElementById("searchForm");
const weatherCard = document.getElementById("weatherCard");
const weeklyEl = document.getElementById("weeklyForecast");
const loader = document.getElementById("loader");

const cityInput = document.getElementById("cityInput");
const stateInput = document.getElementById("stateInput");

const cityEl = document.getElementById("city");
const iconEl = document.getElementById("icon");
const conditionEl = document.getElementById("condition");
const currentTempEl = document.getElementById("currentTemp");
const highLowEl = document.getElementById("highLow");
const precipEl = document.getElementById("precip");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");

// ================================
// FORM SUBMIT
// ================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const city = cityInput.value.trim();
  const state = stateInput.value.trim();

  if (!city) {
    alert("Please enter a city 🌱");
    return;
  }

  // Reset UI
  weatherCard.classList.add("hidden");
  weeklyEl.classList.add("hidden");
  loader.classList.remove("hidden");

  const query = state ? `${city}, ${state}` : city;

  try {
    const res = await fetch(
      `http://localhost:3000/api/weather?city=${encodeURIComponent(query)}`
    );

    if (!res.ok) throw new Error("Fetch failed");

    const data = await res.json();

    // Day 0 → TODAY
    updateWeatherUI(data);

    // Day 1–7 → WEEKLY
    updateWeeklyUI(data.weekly);

  } catch (err) {
    console.error(err);
    alert("Unable to fetch weather 🌧️");
  } finally {
    loader.classList.add("hidden");
  }
});

// ================================
// TODAY WEATHER (DAY 0 ONLY)
// ================================
function updateWeatherUI(data) {
  cityEl.textContent = data.city;

  iconEl.src = `https:${data.icon}`;
  iconEl.alt = data.condition;

  conditionEl.textContent = data.condition;
  currentTempEl.textContent = `🌡️ ${Math.round(data.currentTemp)}°F`;

  highLowEl.textContent =
    `⬆️ ${Math.round(data.high)}°F / ⬇️ ${Math.round(data.low)}°F`;

  precipEl.textContent =
    `${getPrecipIcon(data.precipType)} ${data.precipType} (${data.precipChance}%)`;

  humidityEl.textContent = `💧 Humidity: ${data.humidity}%`;
  windEl.textContent = `🍃 Wind: ${data.windMph} mph`;

  weatherCard.classList.remove("hidden");
}

// ================================
// WEEKLY FORECAST (TOMORROW → NEXT 6 DAYS)
// ================================
function updateWeeklyUI(weekly) {
  weeklyEl.innerHTML = "";

  // weekly already contains tomorrow → next 6 days
  weekly.forEach(day => {
    const el = document.createElement("div");
    el.className = "week-day";

    const dayName = new Date(day.date).toLocaleDateString("en-US", {
      weekday: "short"
    });

    el.innerHTML = `
      <p>${dayName}</p>
      <img src="https:${day.icon}" alt="">
      <p>${Math.round(day.high)}° / ${Math.round(day.low)}°</p>
      <p>${day.precipChance}%</p>
    `;

    weeklyEl.appendChild(el);
  });

  weeklyEl.classList.remove("hidden");
}
// ================================
// PRECIP ICON HELPER
// ================================
function getPrecipIcon(type) {
  if (!type) return "☀️";

  const t = type.toLowerCase();
  if (t.includes("snow")) return "❄️";
  if (t.includes("rain")) return "🌧️";

  return "☀️";
}