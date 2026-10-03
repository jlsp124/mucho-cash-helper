# Mucho Cash Helper

A mobile-first emergency **cash calculation helper** for the Mucho Burrito location at 1600 15th Ave, Prince George, BC. Unofficial internal tool; **not an official Mucho Burrito application or POS**. No card payments, accounts, customer information, backend, database or cash-drawer integration.

**Deployment target:** https://jlsp124.github.io/mucho-cash-helper/

**Repository target:** https://github.com/jlsp124/mucho-cash-helper

## Before using at work

**Public online menu pricing is initial seed information only. Compare every seed against the actual store register before relying on it.** Shipped prices combine the supplied Prince George seeds with the [current 1600 15th Ave, unit 145 public delivery menu](https://www.ubereats.com/ca/store/mucho-burrito-1600-15th-ave-unit-145/3J5voFnUUfG2JOdE4Erf_w), checked on 2026-10-03. The [national menu](https://muchoburrito.com/menu/) was also checked for category coverage. These are delivery/public prices, not verified register prices. [Seed provenance](docs/pricing-seeds.md) documents the values and remaining unknowns. Group bundles and Corona Cero ship disabled pending local availability and pricing/tax checks; enable them in Settings after verification. Premium bundle variants should be separate custom products with their exact configured total.

All nine protein upcharges and paid extras start **unknown**, including proteins that may be included. Missing product prices and refundable bottled/canned drink deposits also start unknown. Selecting an unknown required price opens a one-time entry on the item sheet. Enter the store amount or explicitly confirm an included modifier / no deposit. The value is saved on this device. Unknown never means $0. Known online seeds remain visibly unverified in Settings and in the entrée builder until verified against the register.

## Checkout

Choose a product/size, protein and paid extras. Free toppings are omitted. Tap **View order**, choose the total cash received, then follow the bill/coin breakdown. Insufficient tender shows the remaining amount and cannot complete the order. **Done / Next order** archives the receipt and clears the cart. Quantity, protein/extras, removal, undo and confirmed clear are available in the order sheet. Active carts survive reloads; an unfinished tender is recalculated after reload. History stores the last 20 completed receipts, with no customer data.

## Prices & transfers

Open the top **Settings** icon → **Menu & pricing**. Search and edit products, proteins or extras. Products support name, category, base price, tax class, refundable deposit, availability, LTO flag and entrée customization. Add custom products, proteins or extras without a deployment.

Protein pricing is independent per protein. A product/size override can replace the global upcharge or set a **full entrée price**. Full prices replace the base-plus-protein portion; extras are still added. Extras can also have product/size overrides. Enter 0 only when a value is included at the store. Check **Verified against store register** after comparing it. Blank means unknown.

**Transfer** exports/imports validated versioned JSON or copies it to the clipboard. On browsers that deny clipboard access, a selectable JSON field appears. File upload and pasted JSON are supported; replacement requires confirmation. Configuration contains menu, modifiers, deposits and tax rates, not cart/history. **Export a backup** before resetting to shipped defaults. Reset and clear history both require confirmation. Editing prices preserves active cart snapshots; edit or re-add an existing cart line to apply new prices.

## Money & BC tax

Prices and arithmetic use **integer Canadian cents**. Rates live in centralized configuration as basis points. Defaults:

| Tax class      | GST | PST |
| -------------- | --- | --- |
| FOOD           | 5%  | 0%  |
| NON_SODA_DRINK | 5%  | 0%  |
| SODA           | 5%  | 7%  |
| EXEMPT         | 0%  | 0%  |

Sweetened carbonated beverages, including diet sodas, and fountain soda use SODA. GST and PST are rounded **half-up to the cent on their respective aggregate order bases**. Only soda contributes to the PST base. Refundable deposits are separate, untaxed line amounts. The final subtotal + GST + PST + deposits rounds once to the nearest **$0.05**. Individual items and tax lines are never nickel-rounded. Receipts show the rounding adjustment.

Custom tender accepts nickel increments; no pennies. Change uses $100/$50/$20/$10/$5 bills, $2/$1 coins and 25¢/10¢/5¢ coins. The breakdown minimizes pieces for these Canadian denominations. Inventory of the physical cash drawer is not tracked. Individual price/tender and order totals are bounded at $10,000; split unusually large orders.

## Local storage & offline

React + TypeScript + Vite, clean CSS and system fonts. No remote fonts, menu calls or runtime checkout services. A generated Workbox service worker precaches the entire app shell and assets. After **Offline ready** appears, checkout, Settings, reloads and history work without internet.

- iPhone: Safari → Share → **Add to Home Screen**.
- Android: browser menu → **Install app**.
- Desktop: use the browser's install control.

Configuration, cart snapshots and history are stored under `mucho-cash-helper:v1` in `localStorage`. Runtime schemas validate data; damaged records recover valid independent sections and show a warning. If storage is blocked/full, the current session works but the app warns it cannot save. Data belongs to that browser/profile; clearing site data or using a different installed/browser context can remove or separate it. JSON exports are the portable backup. Updates prompt before reload and are deferred until the active order is finished.

## Development & checks

Node 24 and npm:

```sh
npm ci
npm run dev
# Open http://localhost:5173/mucho-cash-helper/
npm run lint
npm test
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
# Or all checks:
npm run check
```

Browser tests run against the production preview, including offline reload, actual order flows, price persistence, unknown-price blocking, mobile 320/375/390/430px and desktop, keyboard dialogs and light/dark accessibility. Browser QA prices are explicit **test fixtures**, not shipped menu values. Screenshots/traces go to ignored `test-results/`.

`src/menu.ts` holds shipped data, `src/model.ts` the versioned schemas, `src/money.ts` pure calculations, `src/storage.ts` safe serialization, and `src/Settings.tsx` the menu editor.

## Deployment

Public repository with GitHub Pages in **GitHub Actions** mode. `.github/workflows/pages.yml` validates lint, unit tests, TypeScript, the production build and browser tests before uploading `dist` and deploying. Pull requests validate without publishing. Vite base, manifest start/scope and service-worker navigation fallback are `/mucho-cash-helper/`. The app uses sheets rather than path routes, so refreshing the Pages URL works without server rewrites. If renaming the repository, update these paths together.
