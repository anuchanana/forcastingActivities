import express, { Request, Response, NextFunction } from "express";
import axios from "axios";

const app = express();
const PORT = 3000;

// ==========================================
// 1. Interfaces & Domain Types
// ==========================================
interface WeatherMetrics {
  tempMax: number;
  precipitation: number;
  snowfall: number;
  windSpeed: number;
  cloudCover: number;
}

interface CachedForecast {
  forecastDate: string; // Format: YYYY-MM-DD
  weatherData: WeatherMetrics;
}

// Custom wrapper to bundle array elements along with a timestamp for eviction
interface CacheEnvelope {
  fetchedAt: Date;
  forecasts: CachedForecast[];
}

interface ActivityScore {
  activity: string;
  score: number;
}

// ==========================================
// 2. Geocoder Registry
// ==========================================
const MOCK_GEOCODE: Record<string, { lat: number; lon: number }> = {
  chamonix: { lat: 45.9227, lon: 6.8685 },
  oahu: { lat: 21.4389, lon: -158.0001 },
  paris: { lat: 48.8566, lon: 2.3522 },
};

// ==========================================
// 3. Persistent In-Memory Store
// ==========================================
const dbMockCache = new Map<string, CacheEnvelope>();
const CACHE_EXPIRATION_HOURS = 1;

// ==========================================
// 4. Activity Scoring Framework
// ==========================================
function calculateRankedActivities(metrics: WeatherMetrics): ActivityScore[] {
  const { tempMax, precipitation, snowfall, windSpeed, cloudCover } = metrics;
  
  const scores: Record<string, number> = {
    "Skiing": 0.0,
    "Surfing": 0.0,
    "Outdoor sightseeing": 0.0,
    "Indoor sightseeing": 0.0
  };

  // 1. Skiing: Cold temperatures below freezing point with fresh snow accumulations.
  if (tempMax > 2) {
    scores["Skiing"] = 0.0;
  } else {
    scores["Skiing"] = Math.min(10.0, snowfall * 2.0 + Math.max(0, 5 - precipitation));
  }

  // 2. Surfing: Relies on balanced wind forces. Cancelled out by storms or severe downpours.
  if (windSpeed < 10 || windSpeed > 45 || precipitation > 10) {
    scores["Surfing"] = 2.0;
  } else {
    scores["Surfing"] = Math.min(10.0, windSpeed / 4.0 - precipitation * 0.5);
  }

  // 3. Outdoor Sightseeing: Thrives in warm clear days (22°C optimal baseline) without downpours.
  if (precipitation > 2.0 || tempMax < 5 || tempMax > 35) {
    scores["Outdoor sightseeing"] = 1.0;
  } else {
    const tempFactor = Math.max(0, 10 - Math.abs(22 - tempMax) * 0.5);
    const rainPenalty = Math.max(0, 10 - precipitation * 4);
    const cloudPenalty = (100 - cloudCover) / 10;
    scores["Outdoor sightseeing"] = tempFactor * 0.5 + rainPenalty * 0.3 + cloudPenalty * 0.2;
  }

  // 4. Indoor Sightseeing: Insulated counter-choice. Scores lift whenever outdoor conditions degrade.
  const baseIndoor = 5.0;
  const badWeatherBonus = Math.min(5.0, precipitation * 1.5 + Math.max(0, (10 - tempMax) * 0.2));
  scores["Indoor sightseeing"] = Math.min(10.0, baseIndoor + badWeatherBonus);

  // Parse dictionary to structured elements ordered from best ranking option to worst
  return Object.entries(scores)
    .map(([activity, score]) => ({ 
      activity, 
      score: Math.max(0, Math.round(score * 10) / 10) 
    }))
    .sort((a, b) => b.score - a.score);
}

// ==========================================
// 5. API Endpoint Controller Route
// ==========================================
app.get("/api/v1/ranking", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const cityParam = req.query.city;
    if (!cityParam || typeof cityParam !== "string") {
      return res.status(400).json({ error: "Query parameter 'city' is required as a string." });
    }

    const cityName = cityParam.toLowerCase().trim();
    const coords = MOCK_GEOCODE[cityName];

    if (!coords) {
      return res.status(404).json({ 
        error: `City '${cityParam}' is out of scope. Please choose from: 'chamonix', 'oahu', or 'paris'.` 
      });
    }

    const cacheEnvelope = dbMockCache.get(cityName);
    const now = new Date();
    let useCache = false;

    if (cacheEnvelope) {
      const ageInHours = (now.getTime() - cacheEnvelope.fetchedAt.getTime()) / (1000 * 60 * 60);
      if (ageInHours < CACHE_EXPIRATION_HOURS && cacheEnvelope.forecasts.length >= 7) {
        useCache = true;
      }
    }

    let forecasts: CachedForecast[] = [];

    if (useCache && cacheEnvelope) {
      forecasts = cacheEnvelope.forecasts;
    } else {
      // Fetch fresh raw records directly from the Open-Meteo endpoint
      const openMeteoUrl = `https://open-meteo.com{coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,precipitation_sum,snowfall_sum,wind_speed_10m_max,cloud_cover_mean&timezone=auto`;
      const response = await axios.get(openMeteoUrl);
      
      const daily = response.data?.daily;
      if (!daily || !daily.time) {
        return res.status(502).json({ error: "Upstream failure structural payload data missing from Open-Meteo." });
      }

      // Map dynamic array intervals to our database entities
      forecasts = daily.time.slice(0, 7).map((timeStr: string, index: number) => {
        const metrics: WeatherMetrics = {
          tempMax: daily.temperature_2m_max[index] ?? 20,
          precipitation: daily.precipitation_sum[index] ?? 0,
          snowfall: daily.snowfall_sum[index] ?? 0,
          windSpeed: daily.wind_speed_10m_max[index] ?? 0,
          cloudCover: daily.cloud_cover_mean[index] ?? 0,
        };

        return {
          forecastDate: timeStr,
          weatherData: metrics,
        };
      });

      // Persist results locally in map
      dbMockCache.set(cityName, {
        fetchedAt: now,
        forecasts: forecasts,
      });
    }

    // Transform metric fields into final ordered array lists
    const timeline = forecasts.map((day) => ({
      date: day.forecastDate,
      rankings: calculateRankedActivities(day.weatherData),
    }));

    return res.json({
      city: cityParam,
      forecastPeriodDays: timeline.length,
      source: useCache ? "local_persistence_cache" : "open_meteo_api",
      timeline,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Internal service crash." });
  }
});

// Start Core Application Server Loop
app.listen(PORT, () => {
  console.log(`Backend ranker service active at http://localhost:${PORT}`);
});
