# Weather-Driven Activity Ranking Service

A focused, single-file **TypeScript & Express** backend service that ranks the quality of the next 7 days for specific outdoor and indoor activities using weather data from **Open-Meteo**.

---

## 🚀 Key Features

* **Cache-Aside / Write-Through Strategy:** Stores 7-day weather profiles in an in-memory database mock map. If an incoming request is less than **1 hour old**, the service fetches the results locally instead of hitting the upstream API.
* **Deterministic Scoring Model:** Calculates normalized performance attributes (0.0 to 10.0) based on weather metrics and ranks them dynamically.
* **Single File Submission:** Highly focused code structure combining domain logic, local storage maps, endpoints, and data interfaces inside one file.

---

## 📊 Tracked Activities

The system processes weather profiles and returns a ranked array containing:
1. **Skiing:** Highly dependent on sub-freezing limits (< 2°C) and fresh powder accumulation.
2. **Surfing:** Relies on optimal moderate wind speeds; heavily penalized by downpours or heavy storms.
3. **Outdoor sightseeing:** Optimized around dry conditions, clear cloud gaps, and mild temperatures (sweet spot: 22°C).
4. **Indoor sightseeing:** Resilient baseline fallback option that climbs in score when bad weather disrupts outdoor alternatives.

---

## 🗺️ Supported Cities (Mock Geocoder)

For testing purposes, the following locations are pre-configured:
* `paris`
* `chamonix`
* `oahu`

---

## 📦 Project Structure

Ensure these three files are placed together in your root project directory:
* `server.ts` — The core application file containing the service, cache, scoring logic, and server setup.
* `package.json` — Manages scripts, application runtimes, and dependencies.
* `tsconfig.json` — Configures the TypeScript compiler.

---

## 🛠️ Setup & Execution

### 1. Installation

Run the following command to download all standard production and development dependencies:

```bash
npm install
```

### 2. Execution Scripts

The `package.json` includes pre-packaged workflows to simplify running the service:

* **Development Mode (Hot execution with `ts-node`):**
  ```bash
  npm run dev
  ```
* **Production Build (Compiles TypeScript to standard Javascript):**
  ```bash
  npm run build
  ```
* **Production Run (Launches the compiled build folder):**
  ```bash
  npm start
  ```

Once initialized via `npm run dev`, the engine is operational at `http://localhost:3000`.

---

## 🎯 API Reference

### Get Activity Rankings

* **Endpoint:** `/api/v1/ranking`
* **Method:** `GET`
* **Query Parameters:**
  * `city` (string, required): The target location (e.g., `paris`, `chamonix`, or `oahu`).

#### Sample Request
```http
GET http://localhost:3000/api/v1/ranking?city=paris
```

#### Sample Response Payload
```json
{
  "city": "paris",
  "forecastPeriodDays": 7,
  "source": "open_meteo_api",
  "timeline": [
    {
      "date": "2026-09-22",
      "rankings": [
        { "activity": "Outdoor sightseeing", "score": 8.4 },
        { "activity": "Indoor sightseeing", "score": 5.2 },
        { "activity": "Surfing", "score": 3.1 },
        { "activity": "Skiing", "score": 0.0 }
      ]
    },
    {
      "date": "2026-09-23",
      "rankings": [
        { "activity": "Indoor sightseeing", "score": 7.8 },
        { "activity": "Outdoor sightseeing", "score": 1.0 },
        { "activity": "Surfing", "score": 0.8 },
        { "activity": "Skiing", "score": 0.0 }
      ]
    }
  ]
}
```

---

## 🏗️ Architectural Tradeoffs

* **In-Memory Cache Scaling:** Utilizing a simple map ensures zero external database overhead for this exercise. The runtime envelope explicitly groups dates under city identifiers for efficient cache hit/miss evaluation.
* **Separation of Evaluation Weights:** Scoring calculations are kept completely separate from the API request parsing loops. This isolation ensures that modifying the algorithm weights will instantly fix data responses across already-cached payloads without invalidating current historical rows.
