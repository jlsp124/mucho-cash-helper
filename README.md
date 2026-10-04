# Mucho Cash Helper

A tablet and phone **cash and e-transfer checkout helper** for the Mucho Burrito location at 1600 15th Ave, Prince George, BC. Unofficial internal tool; **not an official Mucho Burrito application or POS**. No card payments, accounts, customer information, backend, database or cash-drawer integration.

**Deployment target:** https://jlsp124.github.io/mucho-cash-helper/

**Repository target:** https://github.com/jlsp124/mucho-cash-helper

## Price provenance and unresolved values

Physical Prince George menu-board prices supplied by the store on 2026-10-03 are authoritative. The handwritten store reference supplies guacamole ($2.50 pre-tax) and kids ($6.95 pre-tax). Existing delivery defaults are retained only for items with no supplied physical price. [Detailed pricing](docs/pricing-seeds.md) records all current prices, fallbacks and tax treatment. Source metadata never appears in the normal register UI.

No shared/global configuration service or Cloudflare backend exists in the fetched repository (main at d3552a8). Local settings and JSON transfers remain available offline; no network service is required by checkout.

## Checkout

On tablets (768px and wider), the four main entrée sections appear together. Phones keep category tabs. Choose a product/size, protein, optional extras and one optional Combo-Up. MUCHO burritos and Fajita Veggies include guacamole; the builder makes that extra non-chargeable. Veggie and Protein Quesadillas use separate base prices. Combo-Up includes one Pop Can, without adding a separately priced drink. Free toppings are omitted. Tap **View order**, choose the total cash received, then follow the bill/coin breakdown. Insufficient tender shows the remaining amount and cannot complete the order. **Done / Next order** archives the receipt and clears the cart. Alternatively, **Paid with e-transfer** immediately archives the exact electronic total and returns to ordering, with no tender or change screen. Payment method is saved on every receipt; electronic receipts have zero change and no denominations. Old receipts are treated as cash. Quantity, protein/extras/combos, removal, undo and confirmed clear are available in the order sheet. Active carts survive reloads; an unfinished tender is recalculated after reload. History stores the last 20 completed receipts, with no customer data.

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

Sweetened carbonated beverages, including diet sodas, and fountain soda use SODA. GST and PST are rounded **half-up to the cent on their respective aggregate order bases**. Only soda contributes to the PST base. Refundable deposits are separate, untaxed line amounts. The exact total is subtotal + GST + PST + deposits. **E-transfer uses this exact amount. Only cash rounds once to the nearest $0.05**. Individual items and tax lines are never nickel-rounded. Receipts show the rounding adjustment.

Custom tender accepts nickel increments; no pennies. Change uses $100/$50/$20/$10/$5 bills, $2/$1 coins and 25¢/10¢/5¢ coins. The breakdown minimizes pieces for these Canadian denominations. Inventory of the physical cash drawer is not tracked. Individual price/tender and order totals are bounded at $10,000; split unusually large orders.

## Local storage & offline

React + TypeScript + Vite, clean CSS and system fonts. No remote fonts, menu calls or runtime checkout services. A generated Workbox service worker precaches the entire app shell and assets. Once the app shell has cached, checkout, Settings, reloads and history work without internet. Offline support has no persistent status badge. Storage failures still produce an actionable notice.

- iPhone: Safari → Share → **Add to Home Screen**.
- Android: browser menu → **Install app**.
- Desktop: use the browser's install control.

Configuration, cart snapshots and history remain under `mucho-cash-helper:v1` in `localStorage`; the storage/config schema remains version 1. **config.defaultsVersion: 4** is a shipped-data revision separate from the schema. Missing revisions identify v1 configurations. Migration uses frozen v1/v2/v3 baselines (src/legacy-defaults.ts, src/defaults-v2.ts and src/defaults-v3.ts). Untouched fields get physical defaults. Nested product-specific override entries are compared individually, so old taco/quesadilla delivery surcharges are removed while deliberate manager changes survive. Explicit store prices, changed numeric values, zero/unknown prices, availability, tax classes/rates, deposits and custom items are preserved. Omitted old products remain omitted; new menu entries are added within schema limits. Import/reload migration is idempotent. Active lines that still match the saved menu are repriced during defaults migration; unmatched snapshots and all completed receipt amounts are preserved. Historical cash receipts gain an exact total derived from cash minus rounding and paymentMethod CASH. Revision 4 restores untouched v3 accidental non-drink disables; edited records that remain disabled are conservatively preserved. V3 active carts and every paid receipt retain their snapshots and amounts. An explicit disable identical to an untouched shipped v3 false is indistinguishable because v3 stored no availability-edit marker.

Runtime schemas validate data; damaged records recover valid independent sections and show a storage-error notice. If storage is blocked/full, the current session works but the app reports it cannot save. Data belongs to that browser/profile; clearing site data or using a different installed/browser context can remove or separate it. JSON exports are the portable backup. Cached app updates apply silently between orders, after persisted state is saved; active orders and open editors defer reload.

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

Browser tests run against the production preview, including offline reload, actual order flows, price persistence, explicit custom unknown-price blocking, phone 320/375/390/430px, tablet 768/820/1024px, landscape and desktop, keyboard dialogs and light/dark accessibility. Existing calculation fixtures remain separate from `e2e/defaults.spec.ts`, which exercises untouched shipped prices, product-specific differences, food + canned soda, multi-item cash/history/offline flows and original v1 and currently deployed v2 localStorage shapes. Unit tests cover field-level migration, historical payment migration, safe active-cart repricing and every enabled product/modifier combination. Screenshots/traces go to ignored `test-results/`. The cleanup also checks installed-v3 restoration and native scrolling across nested sheet transitions; [scroll investigation](docs/scroll-validation.md) records the reproduced lock bug, conservative fix and device-validation limits.

`src/menu.ts` holds shipped data, `src/model.ts` the versioned schemas, `src/money.ts` pure calculations, `src/storage.ts` safe serialization, and `src/Settings.tsx` the menu editor.

## Deployment

Public repository with GitHub Pages in **GitHub Actions** mode. `.github/workflows/pages.yml` validates lint, unit tests, TypeScript, the production build and browser tests before uploading `dist` and deploying. Pull requests validate without publishing. Vite base, manifest start/scope and service-worker navigation fallback are `/mucho-cash-helper/`. The app uses sheets rather than path routes, so refreshing the Pages URL works without server rewrites. If renaming the repository, update these paths together.
