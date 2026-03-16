// ================================
// DOM REFERENCES
// ================================
const form           = document.getElementById("searchForm");
const weatherCard    = document.getElementById("weatherCard");
const weeklyEl       = document.getElementById("weeklyForecast");
const forecastHeader = document.getElementById("forecastHeader");
const hourlySection  = document.getElementById("hourlySection");
const hourlyStrip    = document.getElementById("hourlyStrip");
const loader         = document.getElementById("loader");

const cityInput      = document.getElementById("cityInput");
const stateInput     = document.getElementById("stateInput");

const cityEl         = document.getElementById("city");
const iconEl         = document.getElementById("icon");
const conditionEl    = document.getElementById("condition");
const currentTempEl  = document.getElementById("currentTemp");
const highLowEl      = document.getElementById("highLow");
const precipEl       = document.getElementById("precip");
const humidityEl     = document.getElementById("humidity");
const windEl         = document.getElementById("wind");

// ================================
// FORM SUBMIT
// ================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const city  = cityInput.value.trim();
  const state = stateInput.value.trim();

  if (!city) {
    alert("Please enter a city.");
    return;
  }

  weatherCard.classList.add("hidden");
  weeklyEl.classList.add("hidden");
  forecastHeader.classList.add("hidden");
  hourlySection.classList.add("hidden");
  loader.classList.remove("hidden");

  const query = state ? `${city}, ${state}` : city;

  try {
    const res = await fetch(
  `https://plant-weather.onrender.com/api/weather?city=${encodeURIComponent(query)}`
);

    if (!res.ok) throw new Error("Fetch failed");

    const data = await res.json();

    updateWeatherUI(data);
    updateWeeklyUI(data.weekly);
    updateHourlyUI(data.hourly);

  } catch (err) {
    console.error(err);
    alert("Unable to fetch weather. Please try again.");
  } finally {
    loader.classList.add("hidden");
  }
});

// ================================
// TODAY WEATHER
// ================================
function updateWeatherUI(data) {
  cityEl.textContent      = data.city;
  iconEl.src              = `https:${data.icon}`;
  iconEl.alt              = data.condition;
  conditionEl.textContent = data.condition;
  currentTempEl.textContent = `${Math.round(data.currentTemp)}°F`;
  highLowEl.textContent   = `${Math.round(data.high)}° / ${Math.round(data.low)}°F`;
  precipEl.textContent    = `${data.precipType} — ${data.precipChance}% chance`;
  humidityEl.textContent  = `${data.humidity}%`;
  windEl.textContent      = `${data.windMph} mph`;

  weatherCard.classList.remove("hidden");
}

// ================================
// WEEKLY FORECAST
// ================================
function updateWeeklyUI(weekly) {
  weeklyEl.innerHTML = "";

  weekly.slice(0, 7).forEach((day) => {
    const el = document.createElement("div");
    el.className = "week-day";

    const dayName = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
    const fullDate = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const precipColor = day.precipChance >= 50 ? "#7ec8e3" : "rgba(240,237,232,0.45)";

    el.innerHTML = `
      <span class="day-name">${dayName}<br><small style="font-weight:300;opacity:0.5;font-size:0.68rem">${fullDate}</small></span>
      <img src="https:${day.icon}" alt="${day.precipType}" />
      <div class="day-center">
        <span class="day-condition">${day.precipType}</span>
        <span class="day-precip" style="color:${precipColor}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6 10 4 14 4 17a8 8 0 0 0 16 0c0-3-2-7-8-15z"/></svg>
          ${day.precipChance}% precip
        </span>
      </div>
      <div class="day-right">
        <span class="day-high">${Math.round(day.high)}°</span>
        <span class="day-low">${Math.round(day.low)}°</span>
      </div>
    `;

    weeklyEl.appendChild(el);
  });

  forecastHeader.classList.remove("hidden");
  weeklyEl.classList.remove("hidden");
}

// ================================
// HOURLY FORECAST
// ================================
function updateHourlyUI(hourly) {
  hourlyStrip.innerHTML = "";

  hourly.forEach((hour, i) => {
    const el = document.createElement("div");
    el.className = "hour-card" + (i === 0 ? " is-now" : "");

    const label = i === 0 ? "Now" : formatHour(hour.hour);
    const showPrecip = hour.precipChance > 0;

    el.innerHTML = `
      <span class="hour-time">${label}</span>
      <img src="https:${hour.icon}" alt="${hour.condition}" />
      <span class="hour-temp">${hour.temp}°</span>
      ${showPrecip ? `
        <span class="hour-precip">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6 10 4 14 4 17a8 8 0 0 0 16 0c0-3-2-7-8-15z"/></svg>
          ${hour.precipChance}%
        </span>` : `<span class="hour-precip" style="opacity:0">—</span>`}
      <span class="hour-wind">${hour.windMph} mph</span>
    `;

    hourlyStrip.appendChild(el);
  });

  hourlySection.classList.remove("hidden");
}

// ================================
// HELPERS
// ================================
function formatHour(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}