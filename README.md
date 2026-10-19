# Mucho Cash Helper

A personal **offline-first checkout workflow experiment** built for tablet and phone use. It explores fast order entry, configurable menu data, Canadian cash handling, local persistence, and resilient browser behaviour in a restaurant-style environment.

This is an independent project and **not an official Mucho Burrito application or POS system**. It has no card-processing integration, customer accounts, customer information, shared backend, cash-drawer integration, or connection to restaurant systems.

**Live demo:** https://jlsp124.github.io/mucho-cash-helper/

## Why I built it

The project started from noticing that a repetitive real-world workflow could be made faster with a small purpose-built tool. The interesting engineering problem was not the UI alone: the app also needed deterministic money calculations, editable configuration, safe local persistence, offline support, migrations between shipped defaults, and enough automated testing that changes would not silently alter checkout behaviour.

## Checkout workflow

The interface is optimized for touch devices. Users can choose products, sizes, proteins, extras and bundles, review an order, enter cash received, and get a bill/coin change breakdown. An alternate electronic-payment path records the exact total without cash rounding.

Completed receipts are stored locally with no customer data. Active carts survive reloads, and settings can be exported or imported as validated versioned JSON.

## Configurable menu data

Products, modifiers, availability, tax classes, deposits and prices are editable from the app. The repository ships with example/default configuration used for development and testing; deployments should verify and maintain their own configuration rather than treating checked-in defaults as authoritative real-world pricing.

Configuration migrations preserve deliberate local edits where possible while allowing newer default fields and products to be introduced safely. Historical completed receipts retain their original charged amounts.

## Money model

Money is represented as **integer Canadian cents** rather than floating-point currency values. Tax rates are centralized in configuration and calculations are covered by unit and browser tests.

The app supports Canadian cash denominations and rounds cash totals once to the nearest $0.05 while keeping electronic totals exact. Refundable deposits are represented separately from taxable line amounts.

## Local-first and offline behaviour

The app is built with React, TypeScript and Vite. A generated service worker precaches the application shell so the checkout workflow can continue without a network connection after installation.

Configuration, active cart state and recent receipt history live in browser storage. Runtime schemas validate persisted data, and damaged or incompatible sections fail safely instead of being trusted blindly.

There is no runtime menu API or required cloud service.

## Engineering highlights

- React + TypeScript + Vite
- Zod runtime validation
- offline-capable PWA with Workbox
- integer-cent money calculations
- editable versioned configuration
- safe local-storage migrations
- import/export of validated JSON settings
- responsive phone and tablet layouts
- unit tests for calculations and migrations
- Playwright end-to-end, responsive, accessibility and offline tests
- GitHub Actions validation and Pages deployment

## Development

Requires Node 24+ and npm.

```sh
npm ci
npm run dev
```

Run the full validation suite:

```sh
npm run check
```

Individual checks are also available:

```sh
npm run lint
npm test
npm run typecheck
npm run build
npm run test:e2e
```

The browser suite exercises real order flows, persistence, migration behaviour, offline reloads, keyboard accessibility, and phone/tablet/desktop layouts.

## Deployment

The public demo is deployed through GitHub Pages using GitHub Actions. Pull requests validate the project without publishing. The application is intentionally self-contained and does not require credentials or production infrastructure.

## Scope

This repository is best understood as a software-engineering project around a real-world workflow: rapid interaction design, deterministic financial logic, local-first reliability, configuration management, testing, and deployment. It is not presented as software produced for or endorsed by Mucho Burrito.
