import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { buildSchema } from "graphql";
import { createHandler } from "graphql-http/lib/use/express";

const app = express();
const PORT = 3000;

// ==========================================
// 1. Interfaces & Types
// ==========================================
interface WeatherMetrics {
  tempMax: number;
  precipitation: number;
  snowfall: number;
  windSpeed: number;
  cloudCover: number;
}

interface CachedForecast {
  forecastDate: string; 
  weatherData: WeatherMetrics;
}

interface CacheEnvelope {
  fetchedAt: Date;
  forecasts: CachedForecast[];
}

interface ActivityScore {
  activity: string;
  score: number;
}

// ==========================================
// 2. Constants & Data Stores
// ==========================================
const MOCK_GEOCODE: Record<string, { lat: number; lon: number }> = {
  chamonix: { lat: 45.9227, lon: 6.8685 },
  oahu: { lat: 21.4389, lon: -158.0001 },
  paris: { lat: 48.8566, lon: 2.3522 },
};

const dbMockCache = new Map<string, CacheEnvelope>();
const CACHE_EXPIRATION_HOURS = 1;

// ==========================================
// 3. Domain Core: Scoring System
// ==========================================
function calculateRankedActivities(metrics: WeatherMetrics): ActivityScore[] {
  const { tempMax, precipitation, snowfall, windSpeed, cloudCover } = metrics;
  
  const scores: Record<string, number> = {
    "Skiing": 0.0,
    "Surfing": 0.0,
    "Outdoor sightseeing": 0.0,
    "Indoor sightseeing": 0.0
  };

  if (tempMax > 2) {
    scores["Skiing"] = 0.0;
  } else {
    scores["Skiing"] = Math.min(10.0, snowfall * 2.0 + Math.max(0, 5 - precipitation));
  }

  if (windSpeed < 10 || windSpeed > 45 || precipitation > 10) {
    scores["Surfing"] = 2.0;
  } else {
    scores["Surfing"] = Math.min(10.0, windSpeed / 4.0 - precipitation * 0.5);
  }

  if (precipitation > 2.0 || tempMax < 5 || tempMax > 35) {
    scores["Outdoor sightseeing"] = 1.0;
  } else {
    const tempFactor = Math.max(0, 10 - Math.abs(22 - tempMax) * 0.5);
    const rainPenalty = Math.max(0, 10 - precipitation * 4);
    const cloudPenalty = (100 - cloudCover) / 10;
    scores["Outdoor sightseeing"] = tempFactor * 0.5 + rainPenalty * 0.3 + cloudPenalty * 0.2;
  }

  const baseIndoor = 5.0;
  const badWeatherBonus = Math.min(5.0, precipitation * 1.5 + Math.max(0, (10 - tempMax) * 0.2));
  scores["Indoor sightseeing"] = Math.min(10.0, baseIndoor + badWeatherBonus);

  return Object.entries(scores)
    .map(([activity, score]) => ({ 
      activity, 
      score: Math.max(0, Math.round(score * 10) / 10) 
    }))
    .sort((a, b) => b.score - a.score);
}

// ==========================================
// 4. Data Fetching Shared Orchestrator
// ==========================================
async function getOrFetchForecasts(city: string): Promise<CachedForecast[]> {
  const cityName = city.toLowerCase().trim();
  const coords = MOCK_GEOCODE[cityName];

  if (!coords) {
    throw new Error(`City '${city}' out of scope. Try: 'chamonix', 'oahu', or 'paris'.`);
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

  if (useCache && cacheEnvelope) {
    return cacheEnvelope.forecasts;
  }

  const openMeteoUrl = `https://open-meteo.com{coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,precipitation_sum,snowfall_sum,wind_speed_10m_max,cloud_cover_mean&timezone=auto`;
  const response = await axios.get(openMeteoUrl);
  
  const daily = response.data?.daily;
  if (!daily || !daily.time) {
    throw new Error("Upstream structural payload failure from Open-Meteo.");
  }

  const forecasts = daily.time.slice(0, 7).map((timeStr: string, index: number) => {
    const metrics: WeatherMetrics = {
      tempMax: daily.temperature_2m_max[index] ?? 20,
      precipitation: daily.precipitation_sum[index] ?? 0,
      snowfall: daily.snowfall_sum[index] ?? 0,
      windSpeed: daily.wind_speed_10m_max[index] ?? 0,
      cloudCover: daily.cloud_cover_mean[index] ?? 0,
    };
    return { forecastDate: timeStr, weatherData: metrics };
  });

  dbMockCache.set(cityName, { fetchedAt: now, forecasts });
  return forecasts;
}

// ==========================================
// 5. GraphQL Schema & Resolvers Setup
// ==========================================
const gqSchema = buildSchema(`
  type ActivityScore {
    activity: String!
    score: Float!
  }

  type DailyRanking {
    date: String!
    rankings: [ActivityScore!]!
  }

  type RankingPayload {
    city: String!
    forecastPeriodDays: Int!
    timeline: [DailyRanking!]!
  }

  type Query {
    getRankings(city: String!): RankingPayload!
  }
`);

const gqRootResolver = {
  getRankings: async ({ city }: { city: string }) => {
    const forecasts = await getOrFetchForecasts(city);
    const timeline = forecasts.map((day) => ({
      date: day.forecastDate,
      rankings: calculateRankedActivities(day.weatherData),
    }));

    return {
      city,
      forecastPeriodDays: timeline.length,
      timeline,
    };
  },
};

// Bind modern GraphQL Middleware Handler
app.all("/graphql", createHandler({ schema: gqSchema, rootValue: gqRootResolver }));

// ==========================================
// 6. Legacy REST Controller Route (Optional Coexistence)
// ==========================================
app.get("/api/v1/ranking", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const cityParam = req.query.city;
    if (!cityParam || typeof cityParam !== "string") {
      return res.status(400).json({ error: "Query parameter 'city' is required as a string." });
    }
    const forecasts = await getOrFetchForecasts(cityParam);
    const timeline = forecasts.map((day) => ({
      date: day.forecastDate,
      rankings: calculateRankedActivities(day.weatherData),
    }));

    return res.json({ city: cityParam, forecastPeriodDays: timeline.length, timeline });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Internal server crash." });
  }
});

// Start Core App
app.listen(PORT, () => {
  console.log(`Backend ranker operating at http://localhost:${PORT}`);
  console.log(`GraphQL target endpoint available at http://localhost:${PORT}/graphql`);
});
