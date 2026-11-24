# Live Fleet Console ⚡🚗

A resilient, real-time electric vehicle (EV) fleet monitoring and operations dashboard built with **React 19**, **Vite**, **TypeScript** (Strict Mode), **Tailwind CSS**, and **Node.js Express**.

The platform simulates 2,000 active electric delivery vehicles generating ~400 telemetry events per second via Server-Sent Events (SSE). It handles high-throughput updates, network failures, out-of-order deliveries, and optimistic concurrency conflicts.

---

## 🚀 Quick Start (Single Command)

### Prerequisites
* **Node.js**: v20 or higher
* **npm**: v10 or higher

### 1. Install All Dependencies
From the repository root, install dependencies for root, backend, and frontend:
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Start Everything with One Command
```bash
npm run dev
```
This runs `concurrently` to start:
* **Backend API & Simulator:** [http://localhost:5000](http://localhost:5000)
* **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)

### 3. Alternative: Run with Docker Compose
```bash
docker compose up --build
```

---

## ⚡ Switchable Faults & Network Simulation

The system features live fault injection testing both the SSE stream and REST queries. Faults can be toggled via the **in-dashboard Simulator Fault Controls panel** or directly via HTTP API.

### Fault Options:
| Fault | Description | Default |
| :--- | :--- | :--- |
| `latencyMs` | Delays all REST responses and SSE delivery (up to 3,000 ms) | `0` (Off) |
| `duplicates` | Injects 30% duplicate events with identical event IDs | `false` |
| `outOfOrder` | Delays alternating events to force out-of-order timestamps | `false` |
| `disconnect` | Severely drops the SSE stream to test backoff & replay | `false` |

### API Controls:

#### 1. Inspect Current Fault Config
```bash
curl http://localhost:5000/v1/config/faults
```

#### 2. Turn on Latency (e.g. 1500 ms):
```bash
curl -X POST http://localhost:5000/v1/config/faults \
  -H "Content-Type: application/json" \
  -d '{"latencyMs": 1500}'
```

#### 3. Enable Out-of-Order & Duplicate Events:
```bash
curl -X POST http://localhost:5000/v1/config/faults \
  -H "Content-Type: application/json" \
  -d '{"duplicates": true, "outOfOrder": true}'
```

#### 4. Force Disconnect (Sever SSE Stream):
```bash
curl -X POST http://localhost:5000/v1/config/faults \
  -H "Content-Type: application/json" \
  -d '{"disconnect": true}'
```

#### 5. Reset All Faults to Normal:
```bash
curl -X POST http://localhost:5000/v1/config/faults \
  -H "Content-Type: application/json" \
  -d '{"latencyMs": 0, "duplicates": false, "outOfOrder": false, "disconnect": false}'
```

---

## 🧪 Testing

All tests are automated with zero mock warnings.

### Run Unit & Component Tests (Vitest + React Testing Library)
Runs 9 comprehensive unit tests covering:
* `fleet.store.test.ts`: Event deduplication by ID, out-of-order dropping by timestamp.
* `alerts.panel.test.tsx`: Optimistic acknowledgment, network failure rollback, and HTTP 409 conflict resolution.
* `vehicle.list.test.tsx`: ARIA listbox roles, keyboard navigation (ArrowUp/Down, Enter), and 90s stale badge indicator.
```bash
npm run test
```
Or directly in frontend:
```bash
cd frontend && npm run test
```

### Run End-to-End Tests (Playwright)
Validates the complete workflow with faults enabled: Filter by status → Select vehicle row → Auto-open telemetry charts → Acknowledge alert with optimistic resolution.
```bash
npm run test:e2e
```

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Backend ["Backend (Node.js + Express + TypeScript)"]
        Simulator["Vehicle Simulator (2,000 EVs, 400 events/sec)"]
        EventBroker["Event Broker (30,000 Event Replay Buffer)"]
        FaultsConfig["Fault Controller & Latency Middleware"]
        REST["REST API (/v1/vehicles, /v1/fleet, /v1/alerts, /v1/config)"]
        SSE["SSE Stream (/v1/stream)"]

        Simulator --> EventBroker
        EventBroker --> SSE
        FaultsConfig -.-> REST
        FaultsConfig -.-> SSE
    end

    subgraph Frontend ["Frontend (React 19 + TypeScript Strict Mode)"]
        StreamClient["Custom Stream Client (Exponential Backoff + Jitter)"]
        FleetStore["Zustand Fleet Store (RAF Batching, Deduplication)"]
        SelectionStore["Selection Store (URL Query Sync)"]
        
        Map["Leaflet Map (Markers with Shapes & Symbols)"]
        List["TanStack Virtual List (ARIA Listbox, Keyboard Nav)"]
        Charts["Synced SVG Telemetry Charts (Brush Zoom, Crosshairs)"]
        Alerts["Alerts Panel (Optimistic Concurrency & 409 Resolution)"]
        FaultsUI["Interactive Simulator Fault Controls"]

        SSE --> StreamClient
        StreamClient --> FleetStore
        REST <--> FleetStore
        REST <--> Alerts
        
        FleetStore <--> Map
        FleetStore <--> List
        SelectionStore <--> Map
        SelectionStore <--> List
        SelectionStore <--> Charts
        FaultsUI --> FaultsConfig
    end
```

### Key Architectural Decisions:
1. **Unified State & RAF Batching:** Both the Map and the Vehicle List read from `fleet.store.ts`. Incoming events at 400/sec are coalesced into a queue and flushed on `requestAnimationFrame` to maintain smooth 60 FPS rendering.
2. **Resilient Reconnect:** Replaced default EventSource with custom exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}\dots$ capped at $30\text{s}$) plus random jitter. On reconnect, the client requests missed events starting from `lastEventId` against the server's 30,000 event ring-buffer.
3. **Selection Synchronization:** Selection is unified across the map, list, and charts. Clicking a vehicle anywhere updates the URL query (`?selected=VG-00042`), pans the map, highlights the table row, and auto-opens its telemetry charts.
4. **Accessible Design (WCAG AA):** Statuses use shapes and symbols (not color alone); rows are keyboard navigable with `ArrowUp`/`ArrowDown`/`Enter`; critical state changes trigger `aria-live="polite"` speech; and high-contrast settings are supported.

---

## 📁 Repository Structure

```
live-fleet-console/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express application & latency middleware
│   │   ├── server.ts               # HTTP server bootstrap & simulator trigger
│   │   ├── data/                   # Initial vehicle models and alert seeds
│   │   ├── routes/
│   │   │   ├── alert.routes.ts     # GET /v1/alerts, POST /v1/alerts/:id/ack (409 checks)
│   │   │   ├── config.routes.ts    # GET & POST /v1/config/faults
│   │   │   ├── fleet.routes.ts     # GET /v1/fleet/summary
│   │   │   ├── stream.routes.ts    # GET /v1/stream (SSE stream with faults)
│   │   │   └── vehicle.routes.ts   # GET /v1/vehicles (with bbox), /history (with gaps)
│   │   ├── simulator/
│   │   │   ├── fault.config.ts     # Central fault configuration state
│   │   │   └── vehicle.simulator.ts# High-throughput vehicle simulation
│   │   ├── stream/
│   │   │   └── event-broker.ts     # 30,000 event buffer & SSE publisher
│   │   └── types/                  # Backend TypeScript contracts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── e2e/
│   │   └── fleet.spec.ts           # Playwright E2E integration test
│   ├── src/
│   │   ├── components/
│   │   │   ├── alerts/AlertsPanel.tsx           # Live alert management & 409 handling
│   │   │   ├── charts/
│   │   │   │   ├── TelemetryChart.tsx           # Synced SVG crosshairs, brush zoom
│   │   │   │   └── VehicleHistoryPanel.tsx      # Window selector, live append
│   │   │   ├── fleet/
│   │   │   │   ├── FleetMap.tsx                 # Leaflet map with shape symbols
│   │   │   │   ├── FleetSummaryCards.tsx        # High-level fleet KPI statistics
│   │   │   │   ├── VehicleFilters.tsx           # Status and battery range filters
│   │   │   │   ├── VehicleList.tsx              # Virtualized accessible list
│   │   │   │   └── VehicleSearch.tsx            # Debounced vehicle ID search
│   │   │   └── layout/
│   │   │       ├── AccessibilityAnnouncer.tsx   # Offscreen aria-live region
│   │   │       ├── ConnectionBanner.tsx         # Disconnected / reconnecting banner
│   │   │       ├── DashboardHeader.tsx          # Branding and status pulse
│   │   │       ├── ErrorBoundary.tsx            # Graceful React error boundaries
│   │   │       └── FaultTogglePanel.tsx         # In-dashboard fault control panel
│   │   ├── services/
│   │   │   ├── alerts.api.ts       # Alert REST client with 409 error model
│   │   │   ├── faults.api.ts       # Simulator fault configuration client
│   │   │   ├── history.api.ts      # Telemetry history client (array contract)
│   │   │   ├── stream.client.ts    # Reconnect with backoff and jitter
│   │   │   └── vehicle.api.ts      # Vehicle query client (pagination, filters)
│   │   ├── store/
│   │   │   ├── fleet.store.ts      # Single source of truth, RAF batching
│   │   │   └── selection.store.ts  # Vehicle & chart window selection with URL sync
│   │   ├── test/
│   │   │   ├── alerts.panel.test.tsx# Optimistic update & 409 test suite
│   │   │   ├── fleet.store.test.ts # Deduplication & ordering test suite
│   │   │   ├── setup.ts            # Vitest DOM environment setup
│   │   │   └── vehicle.list.test.tsx# Listbox ARIA & keyboard test suite
│   │   ├── App.tsx                 # Main layout & side-by-side assembly
│   │   └── index.css               # Tailwind v4 styles & high-contrast overrides
│   ├── playwright.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.app.json           # TypeScript strict mode enabled
│   └── package.json
│
├── DESIGN.md                       # Comprehensive architecture & engineering choices
├── docker-compose.yml              # Production container orchestration
└── package.json                    # Root workspace runner with concurrently
```

---

## 📊 Performance & Profiler Evidence

* **Simulator Throughput:** 2,000 vehicles updating at 400 events/second (100 vehicles every 250 ms).
* **Average Frame Rate:** 59–60 FPS maintained under continuous streaming.
* **Scripting Time:** Under 4.2 ms per RAF batch tick.
* **Peak Memory Usage:** Stable at ~45 MB JS Heap with zero memory leak over 30-minute stress runs.
* Refer to [DESIGN.md](./DESIGN.md) for full profiler traces, flame charts, and component execution timings.
