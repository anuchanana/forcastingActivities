# Weather-Driven Activity Ranking Service

A focused, single-file **TypeScript & Express** backend service that ranks the quality of the next 7 days for specific outdoor and indoor activities using weather data from **Open-Meteo**.

---

## 🚀 Key Features

* **Cache-Aside / Write-Through Strategy:** Automatically stores 7-day weather profiles in an in-memory database mock map. If an incoming request is less than **1 hour old**, the service fetches the results locally instead of hitting the upstream API.
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

## 🛠️ Setup & Execution

### 1. Installation

Clone or download the `server.ts` file, initialize your workspace, and install the required dependencies:

```bash
npm init -y
npm install express axios
npm install --save-dev typescript @types/node @types/express ts-node
```

### 2. Configuration (`tsconfig.json`)

Generate or update a standard `tsconfig.json` profile to map the compiler limits cleanly:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["server.ts"]
}
```

### 3. Run the Server

Launch the development engine runtime loop directly using `ts-node`:

```bash
npx ts-node server.ts
```
The console will confirm operational health: `Backend ranker service active at http://localhost:3000`

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
