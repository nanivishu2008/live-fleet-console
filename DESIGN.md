# Live Fleet Console — Design & Engineering Decisions

## 1. Rendering Budget and Performance

The fleet contains 2,000 vehicles and receives approximately 400 telemetry updates per second. Rendering every incoming event individually would cause excessive React renders and unnecessary work on the main thread.

To reduce rendering overhead, incoming vehicle updates are buffered and applied in batches. Updates are grouped by vehicle ID so that multiple updates for the same vehicle can be coalesced before rendering. The vehicle list uses virtualization to render only visible rows rather than mounting all 2,000 rows simultaneously. The map uses marker clustering to reduce visual clutter at lower zoom levels.

Performance is evaluated using Chrome DevTools Performance and React Profiler while the simulator is running at 400 events per second. The primary measurements are frame rate, scripting time, render duration, dropped frames, and memory usage.

At 4,000 events per second, the system may experience increased main-thread pressure. Update coalescing, reduced React state changes, and moving event processing into a Web Worker are possible strategies to maintain responsiveness.

## 2. State Management

Application state is divided according to its responsibility.

- **Server state:** Fleet summaries, vehicle lists, historical telemetry, and alerts are retrieved through REST APIs.
- **Live state:** Vehicle telemetry received through Server-Sent Events updates the latest vehicle information.
- **URL state:** Search queries, status filters, and battery range filters are reflected in query parameters so that views can be shared and restored.
- **Local UI state:** Loading indicators, chart interactions, connection status, selected filters, and temporary acknowledgement states are managed by React component state or Zustand.

This separation avoids mixing temporary interface state with backend data and makes components easier to maintain.

Request identifiers are used to prevent outdated API responses from replacing newer results when users change search or filter values quickly.

## 3. Event Ordering and Duplicate Handling

The stream may deliver duplicate events or events out of order because of simulated network faults, delays, or reconnections.

Each SSE event has an event ID. Processed event IDs are tracked to identify duplicate deliveries. A bounded collection is used to prevent the deduplication structure from growing indefinitely.

Vehicle updates are also compared using their `updated_at` timestamps. An update is accepted only when it is newer than the latest accepted timestamp for that vehicle. Older updates are discarded to prevent a vehicle from moving backwards to stale coordinates or telemetry.

During reconnection, the client resumes using the most recently processed event ID. The backend retains recent events to support replay, allowing the client to catch up after temporary disconnections.

## 4. Race Conditions

Two important race conditions were considered.

**Search request race:** A user may type multiple queries quickly while requests are still in progress. A slower response from an earlier query could overwrite results for a newer query. Request identifiers are used to ignore responses that no longer correspond to the latest request.

**Alert acknowledgement race:** Two operators or browser tabs may attempt to acknowledge the same alert. The backend uses alert version numbers for optimistic concurrency control. The client sends the expected version with the acknowledgement request. If the version is stale, the server returns HTTP 409 Conflict. The client refreshes the alert data and informs the operator instead of silently overwriting a newer change.

## 5. Accessibility

Accessibility is considered throughout the dashboard rather than being limited to individual controls.

Interactive elements are designed to support keyboard navigation and visible focus indicators. Buttons and filters use descriptive accessible labels. Status indicators include text so that state is not communicated through colour alone.

Important state changes, such as acknowledgement success or failure, are exposed through accessible status messages. Telemetry changes are not announced continuously because doing so would create excessive screen-reader interruptions.

The dashboard is designed to remain usable with high-contrast settings and responsive layouts.

## 6. Trade-offs

Three features were deprioritised in favour of implementing the core monitoring workflow.

- **Offline-first architecture:** The dashboard does not initially persist the entire fleet state locally. This reduces storage and synchronisation complexity but means a reload during a disconnection may require fresh data from the backend.
- **Web Worker event processing:** Event processing initially remains on the main thread. This simplifies state integration and debugging, but a Worker may be required if profiling shows significant main-thread pressure at higher event rates.
- **Historical replay scrubber:** Historical vehicle movement replay is not included in the core implementation. The focus is on current fleet monitoring and recent telemetry rather than replaying an entire fleet's historical movement.

These trade-offs keep the implementation focused on live monitoring, correctness, and resilience.

## 7. Bug Encountered and Resolution

During development, the fleet summary component initially failed because it attempted to access status values from an undefined response structure.

The frontend expected the summary data in a different structure than the backend actually returned. The API response contained the summary inside a nested `data` property.

The issue was identified by inspecting the backend response and the browser console error. The frontend data types and API handling were updated to match the actual response structure.

The fix was verified by successfully loading the fleet summary cards and confirming that the vehicle counts and average state of charge were displayed correctly.

This issue highlighted the importance of matching frontend types and data handling to the backend API contract.