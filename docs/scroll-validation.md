# Register scroll investigation

Baseline: main `84f2d26`, before this cleanup. Code inspection found no scroll/touch listeners, scroll-driven React updates, pointer capture, or synchronous layout reads during scrolling. Each sheet has one vertical `.sheet-content` scroll container, a fixed header/footer, and native dialog behavior. Category navigation, the fixed cart dock, sticky payment controls, transform entrance animation and backdrop blur are retained.

## Reproduced defect and targeted fix

Completing an order through **Other → Calculate change → Done**, or confirming **Clear order**, unmounts overlapping dialogs. Each dialog previously saved its own body overflow value. The outer dialog restored the unlocked value, then the inner dialog restored `hidden`. With zero open dialogs, the document remained locked. Both regression paths failed on the unchanged production build in Chromium and WebKit. The custom-cash path was also reproduced through the live browser UI, with zero dialogs and `body.style.overflow === 'hidden'` afterward.

Sheets now share a count of active locks. The first open sheet captures the original body overflow; only the last closing sheet restores it. This handles simultaneous parent/child closure without touching native scrolling, momentum, focus restoration, keyboard handling, dialog headers/footers, or visual effects. No new scrolling listeners or libraries are introduced.

## Validation and limits

`e2e/scroll.spec.ts` checks both previously failing paths and phone widths 320/375/390/430 plus tablet widths 768/820/1024 and 1180 landscape. It covers vertical menus with a visible cart dock, horizontal phone categories, long carts, builder content when it overflows, Settings, 20-entry history, repeated sheet opening/closing, fixed sheet headers and scrolling after e-transfer completion. Header spacing is checked after removing the location line. Measurements wait for the existing sheet entrance animation to finish; animations are not disabled to pass tests.

Chromium and WebKit runs verify scroll reachability and lock cleanup. Manual browser inspection checks menu and sheet behavior at the same viewport sizes. These checks do not measure subjective frame-rate smoothness on physical iPhone/iPad hardware or installed iOS PWAs. No such hardware session is connected. Backdrop/compositing jank was not established, so no speculative blur, sticky, fixed-layer, animation or scroll-container changes were made.

For focused WebKit checks after a production build:

```sh
npx playwright install webkit
npx playwright test e2e/scroll.spec.ts e2e/restoration.spec.ts --browser webkit
```
