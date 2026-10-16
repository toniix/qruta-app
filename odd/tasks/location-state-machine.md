# Feature: location-state-machine

## Objective
Replace the redundant GPS/location boolean flags in the citizen frontend with one status per async
resource, and fix the INICIO (HomePage) pill that flashes "Sin ubicación activa" while reverse
geocoding is still in flight.

## Problem
`useGeolocation` exposes two stored booleans, `hasCustomLocation` and `gpsReady`, that are always set
together in the same `onSuccess` block and are consumed as `hasCustomLocation || gpsReady` in ~40
places. They carry no independent information.

The visible bug: `isLocating` (GPS only) flips to `false` the instant coordinates arrive, but
`userAddress` is only populated after a *separate* reverse-geocode HTTP round trip. HomePage's pill
keys its loading state only on `isLocating`, so during that gap it renders the fallback
"Sin ubicación activa" even though GPS already succeeded.

## Why
- Removing the duplicated flags makes the location model explainable: one status per resource.
- The pill must treat "coordinates resolved, address still resolving" as a loading state, not as
  "no location", which is the user-visible defect.

## Scope
In scope (citizen frontend only):
- `src/hooks/useGeolocation.js` — single `gpsStatus`, `location` defaults to `null`.
- `src/contexts/RouteContext.jsx` — `addressStatus` replaces `loadingAddress`; migrate off
  `hasCustomLocation`.
- `src/pages/citizen/HomePage.jsx` — pill fix + flag migration.
- `src/components/common/Header.jsx` — flag migration + address loading state.
- `src/pages/citizen/HomeMapPage.jsx` — flag migration.
- `src/pages/citizen/NearbyRoutesPage.jsx` — flag migration.
- Tests for the new status machine and the pill.

Out of scope (documented, not changed):
- `error` and `gpsPermissionState` stay as independent concerns (failure and permission).
- The terminal "geocode failed → Sin ubicación activa" copy is preserved (product decision).
- `gpsReady` prop passed to `InteractiveMap` is unused by that component (pre-existing dead prop).
- `setLocation` is exported but unused by any consumer (pre-existing).

## Target model

### `useGeolocation` returned surface
- `location`: `{ lat, lng, accuracy } | null` — `null` until GPS success (was `ICA_DEFAULT`).
- `gpsStatus`: `'idle' | 'locating' | 'ready' | 'error'` — the single stored GPS state.
- `gpsReady`: derived `gpsStatus === 'ready'`.
- `isLocating`: derived `gpsStatus === 'locating'`.
- `error`, `gpsPermissionState`, `setGpsPermissionState`, `checkPermissionState`, `requestLocation`,
  `setLocation`: kept as-is.
- Removed: stored `hasCustomLocation`, stored `gpsReady`.

### `RouteContext` returned surface
- `addressStatus`: `'idle' | 'loading' | 'ready' | 'error'` — replaces `loadingAddress`.
- `userAddress`: kept.
- Added to context: `gpsStatus`, `addressStatus`.
- Removed from context: `hasCustomLocation`, `loadingAddress`.

### Pill decision (HomePage)
```
isResolvingLocation =
  isLocating || (gpsReady && (addressStatus === 'idle' || addressStatus === 'loading'))
```
- address available → address pill
- `isResolvingLocation` → spinner "Detectando tu ubicación…"
- otherwise → "Sin ubicación activa"

`addressStatus === 'idle'` covers the single frame between GPS-ready and the geocoding effect
starting; a terminal `'error'` never spins forever.

## Migration map (existing `hasCustomLocation` usages)
- `hasCustomLocation || gpsReady` → `gpsReady`
- `!hasCustomLocation && !gpsReady` → `!gpsReady`
- `hasCustomLocation` alone → `gpsReady`
- dependency arrays `[hasCustomLocation, gpsReady, ...]` → `[gpsReady, ...]`

## Tasks

- [x] **T1 — useGeolocation status machine** (`src/hooks/useGeolocation.js`)
  - Store `gpsStatus` instead of `isLocating`/`hasCustomLocation`/`gpsReady`; derive `gpsReady` and
    `isLocating`; default `location` to `null`.
  - Set `'locating'` on request start, `'ready'` on success, `'error'` on failure/unavailable.
  - Check: `npx vitest run src/hooks/useGeolocation.test.jsx`
  - Evidence: RED first — `Test Files 1 failed (1) / Tests 5 failed (5)` (`expected undefined to be
    'ready'`, `expected undefined to be 'error'`). After T1: `Test Files 1 passed (1) / Tests 5 passed
    (5)`. `location` now defaults to `null` (no `ICA_DEFAULT`).

- [x] **T2 — RouteContext address status** (`src/contexts/RouteContext.jsx`)
  - Replace `loadingAddress` with `addressStatus`; geocode effect sets `'loading'` → `'ready'` /
    `'error'` (including the `reverseGeocode` returning `null` path); reset to `'idle'` when GPS is
    not ready.
  - Migrate `hasCustomLocation` usages and dependency arrays per the migration map.
  - Update `contextValue` + its dependency array: drop `hasCustomLocation` and `loadingAddress`, add
    `gpsStatus` and `addressStatus`.
  - Check: `npx vitest run` (no regression in existing suites)
  - Evidence: `npx vitest run` → `Test Files 6 passed (6) / Tests 41 passed (41)`; no regression.
    `grep -rn "hasCustomLocation\|loadingAddress" src` → no matches.
    Deviation (observable behavior unchanged): instead of a `setAddressStatus('idle')` call inside the
    geocode effect, the exposed `addressStatus` is derived — `gpsReady ? rawAddressStatus : 'idle'` —
    because a synchronous `setState` in that effect trips the `react-hooks/set-state-in-effect` rule
    (which the base already violates twice). Stored value renamed to `rawAddressStatus`; context still
    exposes `addressStatus`.

- [x] **T3 — Consumers and pill fix** (`HomePage.jsx`, `Header.jsx`, `HomeMapPage.jsx`,
  `NearbyRoutesPage.jsx`)
  - HomePage: add `addressStatus` to the destructure, drop `hasCustomLocation`; derive
    `isResolvingLocation`; use it for the pill spinner branch; migrate `:385`, `:476`, `:495`.
  - Header: use `gpsReady`; treat `isLocating || addressStatus === 'loading'` as "Ubicando...".
  - HomeMapPage: `:526` `!gpsReady`; `:562` `gpsReady={gpsReady}`; drop `hasCustomLocation` from the
    destructure.
  - NearbyRoutesPage: `:49` `!gpsReady`; `:127`/`:138`/`:146` `gpsReady`; drop `hasCustomLocation`.
  - Check: `npx vitest run src/pages/citizen/HomePage.test.jsx`
  - Evidence: RED first — `Test Files 1 failed (1) / Tests 1 failed | 2 passed (3)` (pill rendered
    "Sin ubicación activa" instead of the spinner). After T3: `Test Files 1 passed (1) / Tests 3
    passed (3)`. `grep -rn "hasCustomLocation" frontend/src` → no matches.

- [x] **T4 — Full checks** (`frontend`)
  - `npx vitest run` and `npm run lint` both clean.
  - Evidence: `npx vitest run` → `Test Files 6 passed (6) / Tests 41 passed (41)`.
    `npm run lint` → **3 errors, all pre-existing on the base** (verified against `HEAD` via
    `git show HEAD:<file> | npx eslint --stdin`): `src/components/community/PostCard.jsx:23`
    (`no-unused-vars`, file outside allowed surfaces) and
    `src/contexts/RouteContext.jsx:209` + `:220` (`react-hooks/set-state-in-effect`, effects untouched
    by this task). This change introduces **no** new lint error (base 3 → after 3).
    `npm run lint` is therefore not clean on this base and cannot be made clean without editing
    `PostCard.jsx` (out of scope).

- [x] **T5 — Verifier correction: reset stale `rawAddressStatus` on GPS re-request**
  (`src/contexts/RouteContext.jsx`, `src/contexts/RouteContext.test.jsx`)
  - Independent verifier found the T2 derivation (`gpsReady ? rawAddressStatus : 'idle'`) was not
    behavior-preserving: the geocode effect early-return nulled `userAddress` but left
    `rawAddressStatus` stale, so every GPS re-request painted one frame of "Sin ubicación activa".
  - Fix: `setRawAddressStatus("idle")` inside the existing
    `if (lastGeocodeCoordsRef.current !== null)` early-return block (conditional setState, lint-clean);
    derivation kept as render-time guard; its misleading comment rewritten.
  - New `RouteContext.test.jsx` drives the exact counterexample (ready/A → locating →
    ready/fresh-coords) and asserts no render frame ever pairs `addressStatus='ready'` with null
    `userAddress` (history-slice assertion — final-state assertions cannot catch the frame).
  - Check: `npx vitest run src/contexts/RouteContext.test.jsx` RED→GREEN; full suite green; lint
    adds no new error.
  - Evidence: RED — `1 failed` (`expected [ { addressStatus: 'ready', userAddress: null } ] to
    deeply equal []`); GREEN — `Test Files 1 passed (1) / Tests 1 passed (1)`; full
    `Test Files 7 passed (7) / Tests 42 passed (42)`; `npm run lint` → same 3 pre-existing base
    errors only; `grep -rn "hasCustomLocation\|loadingAddress" src` → empty.

## Test-first plan
- `src/hooks/useGeolocation.test.jsx`: RED first — assert the desired API (`gpsStatus` transitions,
  `gpsReady`/`isLocating` derivations, `location` starts `null`) fails against the current hook, then
  implement T1 to GREEN.
- `src/pages/citizen/HomePage.test.jsx`: RED first — with `useRoutes` mocked to
  `{ gpsReady: true, addressStatus: 'loading', isLocating: false, ... }`, assert the pill shows
  "Detectando tu ubicación…" and NOT "Sin ubicación activa".

## Acceptance criteria
- No stored duplicate state: `hasCustomLocation` no longer exists anywhere in `src/`.
- Only one stored GPS status and one stored address status.
- HomePage pill never shows "Sin ubicación activa" while GPS is ready and the address is still
  resolving.
- `location` is `null` until GPS resolves (no phantom Ica coordinates as `userLocation`).
- All existing tests still pass; new tests pass; lint clean.

## Delivery strategy
`ask-on-risk` (default). Forecast: well under the ~400 authored-line delivery budget; single PR.

## Progress log
- 2026-10-16 — Feature document created. Route: delegated writer (6 non-trivial files, writer
  trigger fired). Branch to be created off `master` before the first commit.
- 2026-10-16 — T1–T3 implemented with RED→GREEN evidence. T4: `npx vitest run` green (41/41).
  `npm run lint` reports 3 pre-existing errors on the base (`PostCard.jsx:23`, `RouteContext.jsx:209`,
  `:220`); this task adds none. T2's literal effect-reset was replaced by a derived `addressStatus`
  (`gpsReady ? rawAddressStatus : 'idle'`) to satisfy the `react-hooks/set-state-in-effect` rule with
  identical observable behavior. "lint clean" acceptance criterion is unmet only by base debt outside
  the allowed surfaces.
- 2026-10-16 — Parent verification, independent of the writer: full suite `Test Files 6 passed (6) /
  Tests 41 passed (41)`; `grep -rn "hasCustomLocation\|loadingAddress" frontend/src` → no matches;
  base-lint proof via `git show HEAD:<file> | npx eslint --stdin` shows the same 3 errors pre-exist
  (`PostCard.jsx:23`, `RouteContext.jsx` base :222 + second set-state-in-effect), so this change adds
  none. T3 ticked after reviewing the diff (all four consumers migrated) and both new test files
  (behavioral, RED-guaranteed: they assert the new API and the exact pill regression).
- 2026-10-16 — Blocker surfaced: a second, active `opencode` session shares this exact worktree
  (PIDs 139521 / 141398) and is editing unrelated backend files (stop-image / Supabase storage
  feature, untouched by this task). The feature branch was created at 01:04, which moved the shared
   HEAD. Work-unit commit stages frontend files + this document ONLY; the backend changes are left
   untouched and unstaged.
- 2026-10-16 — T5 verifier correction committed: `setRawAddressStatus("idle")` in the geocode
  effect early-return + new `RouteContext.test.jsx` (RED→GREEN). Parent-verified: full suite
  `Test Files 7 passed (7) / Tests 42 passed (42)`; targeted eslint on both touched files shows
  only the pre-existing `:209`/`:220` errors; full `npm run lint` → same 3 base errors.
