# Mucho Cash Helper

A mobile-first emergency **cash calculation helper** for the Mucho Burrito location at 1600 15th Ave, Prince George, BC. Unofficial internal tool; **not an official Mucho Burrito application or POS**. No card payments, accounts, customer information, backend, database or cash-drawer integration.

**Deployment target:** https://jlsp124.github.io/mucho-cash-helper/

**Repository target:** https://github.com/jlsp124/mucho-cash-helper

## Price provenance and unresolved values

Defaults use the current [Prince George Uber Eats menu](https://www.ubereats.com/ca/store/mucho-burrito-1600-15th-ave-unit-145/3J5voFnUUfG2JOdE4Erf_w), checked on 2026-10-03. Actual item configurators were opened for Small, Regular and Mucho burritos, Bowl/Salad, Quesadilla, and the nested Single Taco/Taco Trio groups. Regular burrito modifiers were cross-checked in the [Prince George DoorDash configurator](https://www.doordash.com/en-CA/store/mucho-burrito-prince-george-2344087/). This research used the options and prices inside the item builders, not just search snippets. [Detailed provenance](docs/pricing-seeds.md) records the base menu and modifier evidence. Checkout makes no menu/network requests.

| Protein              | Burritos / Bowl / Salad |   Taco Solo | Taco Trio (same protein on all 3) |         Quesadilla |
| -------------------- | ----------------------: | ----------: | --------------------------------: | -----------------: |
| Grilled Chicken      |                Included |    Included |                          Included |             +$3.75 |
| Crispy Chicken       |                Included | Not exposed |                       Not exposed | Extra protein only |
| Chorizo              |                Included |    Included |                          Included |             +$3.75 |
| Ancho Ground Beef    |                Included |    Included |                          Included |             +$3.75 |
| Pork Carnitas        |                Included |    Included |                          Included |             +$3.75 |
| Veggies / no protein |                Included |    Included |                          Included |           Included |
| Steak                |                  +$2.95 |      +$2.00 |                            +$6.00 |             +$3.75 |
| Beef Barbacoa        |                  +$2.95 |      +$2.00 |                            +$6.00 |             +$3.75 |
| Shiitake Carnitas    |                  +$2.95 |      +$3.75 |                           +$11.25 |             +$3.75 |

Guacamole **2oz** and Queso **2oz** add **$3.00** each; Extra Protein adds **$3.75** for every protein exposed in the burrito/bowl/quesadilla extra-protein group. Honey Chili Pepper Sauce adds **$1.25**; on a trio it applies to all three tacos (**$3.75**). The Mucho burrito also exposes a **$2.75 Salsa Side**. Options absent from a product's configurator are excluded there by default; availability and prices remain editable. The existing trio flow chooses one protein for all three tacos. Mixed-protein trios and combo meal composition need separately configured prices/products; they are not inferred from a base price.

**Delivery prices are not verified physical-register prices.** The official [Mucho ordering platform](https://muchoburrito.order-online.ai/en-CA), with Parkwood Place / 1600 15th Avenue Unit 145 selected, was also inspected. Its takeout Regular Burrito was $12.75, premium proteins +$2.00, Guacamole/Queso 2oz +$2.50, Honey sauce +$1.00, and extra meat +$3.00 (extra Shiitake +$2.00). These are a distinct channel, so this release consistently uses the requested Uber Eats/DoorDash values rather than mixing the two price schedules. Every number can be changed to match the register.

**Genuinely unresolved:** Extra Cheese has no paid modifier exposed in the inspected PG Uber Eats, DoorDash or official regular-burrito configurator. Plain chips, fountain soda and the generic local LTO placeholder have no current public price. They remain blank and disabled, editable in Menu & Prices; no number is invented. Standard bundles and Corona Cero retain their existing disabled state. Bundle premium/combo variants and local LTOs need exact local configuration before enabling. Container deposits default to **10¢ per can/bottle, 40¢ per four-pack**, based on [BC Return-It](https://www.return-it.ca/beverage/recycling/recycling-plastic-bottles/). Retailer recycling fees and whether a channel already includes a deposit were not exposed in the restaurant menu; deposits remain separately editable. Provenance, caveats and verification metadata are kept out of the employee-facing screens.

## Checkout

Choose a product/size, protein and paid extras. Free toppings are omitted. Tap **View order**, choose the total cash received, then follow the bill/coin breakdown. Insufficient tender shows the remaining amount and cannot complete the order. **Done / Next order** archives the receipt and clears the cart. Quantity, protein/extras, removal, undo and confirmed clear are available in the order sheet. Active carts survive reloads; an unfinished tender is recalculated after reload. History stores the last 20 completed receipts, with no customer data.

## Prices & transfers

Open the top **Menu & Prices** icon. Search and edit products, proteins or extras. Products are grouped by category. Products support name, category, base price, tax class, refundable deposit, availability, LTO flag and entrée customization. Add custom products, proteins or extras without a deployment.

Protein pricing is independent per protein. Expand a product's advanced section to replace the global upcharge or set a **full entrée price**. Full prices replace the base-plus-protein portion; extras are still added. Extras can also have product/size overrides. Product-specific availability controls can enable or omit individual modifiers. Zero means included; blank means unknown. Explicit custom unknowns still require a concise price entry before adding that item, and never silently become free. Normal shipped orders need no setup or verification.

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

Configuration, cart snapshots and history remain under `mucho-cash-helper:v1` in `localStorage`; the storage/config schema remains version 1. **`config.defaultsVersion: 2`** is the separate shipped-data revision, independent of app version 1.1.0. Missing data revisions identify original v1 configurations. Migration compares each saved field with `src/legacy-defaults.ts`, a frozen copy of the original menu. Untouched prices/unknown modifiers/deposits receive current defaults; deliberate amounts (including store zero), product overrides, enabled flags, tax classes/rates, and custom entries survive. Old imports migrate too. Items omitted from a custom import remain omitted; new extras are added within schema limits. Migration is idempotent. Existing cart prices and completed receipt snapshots are preserved; edit or re-add a line to apply new menu prices.

Runtime schemas validate data; damaged records recover valid independent sections and show a storage-error notice. If storage is blocked/full, the current session works but the app reports it cannot save. Data belongs to that browser/profile; clearing site data or using a different installed/browser context can remove or separate it. JSON exports are the portable backup. Updates prompt before reload and are deferred until the active order is finished.

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

Browser tests run against the production preview, including offline reload, actual order flows, price persistence, explicit custom unknown-price blocking, mobile 320/375/390/430px and desktop, keyboard dialogs and light/dark accessibility. Existing calculation fixtures remain separate from `e2e/defaults.spec.ts`, which exercises untouched shipped prices, product-specific differences, food + canned soda, multi-item cash/history/offline flows and the actual original v1 localStorage shape. Unit tests cover field-level migration, history/cart preservation and every enabled product/modifier combination. Screenshots/traces go to ignored `test-results/`.

`src/menu.ts` holds shipped data, `src/model.ts` the versioned schemas, `src/money.ts` pure calculations, `src/storage.ts` safe serialization, and `src/Settings.tsx` the menu editor.

## Deployment

Public repository with GitHub Pages in **GitHub Actions** mode. `.github/workflows/pages.yml` validates lint, unit tests, TypeScript, the production build and browser tests before uploading `dist` and deploying. Pull requests validate without publishing. Vite base, manifest start/scope and service-worker navigation fallback are `/mucho-cash-helper/`. The app uses sheets rather than path routes, so refreshing the Pages URL works without server rewrites. If renaming the repository, update these paths together.
