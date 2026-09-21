# Weather-Driven Activity Ranking Service

A focused, single-file **TypeScript & Express** backend service that ranks how good the next 7 days will be for specific activities using weather data from **Open-Meteo**.

---

## 🚀 Key Features

* **Cache-Aside Strategy:** Stores 7-day weather forecasts in an in-memory map. If an incoming request is less than **1 hour old**, the service serves the cached data instead of calling the upstream API.
* **Deterministic Scoring Model:** Calculates a normalized score (0.0 to 10.0) based on weather metrics and ranks activities dynamically for each calendar day.
* **Minimalist Architecture:** Highly focused submission combining domain logic, local storage maps, endpoints, and data interfaces inside one file.

---

## 📊 Tracked Activities

The system evaluates weather profiles and returns a ranked list of these four exact activities:
1. **Skiing:** Requires sub-freezing limits (< 2°C) and fresh powder accumulation.
2. **Surfing:** Relies on optimal wind speeds; penalized heavily by downpours or heavy storms.
3. **Outdoor sightseeing:** Optimized around dry conditions, clear cloud gaps, and mild temperatures (sweet spot: 22°C).
4. **Indoor sightseeing:** Resilient baseline fallback option that climbs in score when bad weather disrupts outdoor alternatives.

---

## 🗺️ Supported Cities (Mock Geocoder)

For testing purposes, the following locations are pre-configured:
* `paris`
* `chamonix`
* `oahu`

---

## 📦 Project Structure Checklist

To run this Node.js service, ensure the following core files are placed together in your root project directory:

1. **`server.ts`** — Contains the entire backend logic, scoring framework, cache management, and server routing.
2. **`package.json`** — Manages installation dependencies, shortcut execution scripts, and lint workflows.
3. **`tsconfig.json`** — Configures your TypeScript compiler environment constraints.
4. **`eslint.config.js`** — Ensures strict code quality checks and static analysis safety parameters.

---

## 🛠️ Configuration & Setup

Create the following files in your project directory:

### `package.json`
```json
{
  "name": "weather-activity-ranker",
  "version": "1.0.0",
  "description": "A focused single-file TypeScript backend service that ranks 7-day activities using Open-Meteo weather forecasts and local in-memory caching.",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint server.ts"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.5",
    "@typescript-eslint/eslint-plugin": "^8.5.0",
    "@typescript-eslint/parser": "^8.5.0",
    "eslint": "^9.10.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.2"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["server.ts"]
}
```

### `eslint.config.js`
```javascript
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["server.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "no-console": "off",
      "eqeqeq": "error"
    }
  }
];
```

---

## 🏃 Execution

### 1. Install Dependencies
Run the install command to download all required modules:
```bash
npm install
```

### 2. Static Code Verification (Linting)
Run the linter to verify strict code safety and styling norms:
```bash
npm run lint
```

### 3. Launch the Application
* **Development Mode (Fast execution via `ts-node`):**
  ```bash
  npm run dev
  ```
* **Production Build (Compiles to standard JavaScript in the `/dist` directory):**
  ```bash
  npm run build
  npm start
  ```

Once initiated, the server will log: `Backend ranker service active at http://localhost:3000`

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

* **In-Memory Cache Scaling:** Utilizing a runtime `Map` ensures zero external database overhead for this exercise. The cache envelope groups dates under city identifiers for fast cache hit/miss evaluation.
* **Separation of Evaluation Weights:** Scoring calculations are kept completely separate from the API request parsing loops. This isolation ensures that modifying the scoring algorithm parameters will instantly fix data responses across already-cached payloads without invalidating current entries.
