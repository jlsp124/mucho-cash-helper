# Store pricing defaults — revision 3

Source priority: physical Prince George menu boards supplied by the store on 2026-10-03, then the supplied handwritten store reference, then existing defaults only where no physical price exists. All prices below are pre-tax CAD. This documentation is never shown in normal checkout.

| Entrée                                                          |                             Price |
| --------------------------------------------------------------- | --------------------------------: |
| Small / Regular / MUCHO Burrito                                 |          $10.75 / $12.45 / $15.75 |
| Single Taco / Taco Trio                                         |                    $4.45 / $12.45 |
| Bowl / Bowl with 2× Protein                                     |                   $13.75 / $16.75 |
| Veggie / Protein Quesadilla                                     |                   $10.95 / $13.95 |
| Honey Chili Chicken Small / Regular / MUCHO / Bowl              | $11.75 / $13.75 / $16.75 / $14.75 |
| Kids Meal (handwritten reference, approximately $7.30 with GST) |                             $6.95 |

Grilled Chicken, Crispy Chicken, Chorizo, Ancho Ground Beef, Pork Carnitas and Fajita Veggies are included. Steak, Beef Barbacoa and Shiitake Carnitas add $2 to the entrée, including a Taco Trio; there is no automatic per-taco multiplication. Protein Quesadilla starts at $13.95 before a premium surcharge. Honey Chili products offer only grilled/crispy chicken.

Guacamole adds $2.50 (handwritten approximately $2.65 with GST). MUCHO Burrito and Fajita Veggies include guacamole. The included-extra rules operate in the pricing engine and UI, including stale cart selections and full-price overrides. The 2× bowl already includes extra protein. Extra Protein adds $3 elsewhere. Queso retains its existing $3 fallback because no newer physical price was supplied.

| Side                           | Regular | MUCHO |
| ------------------------------ | ------: | ----: |
| Signature Spiced Mercado Fries |   $4.95 | $7.95 |
| Creamy Queso Mercado Fries     |   $5.95 | $8.95 |
| Loaded Nachos                  |   $5.95 |     — |
| Chips & Salsa                  |   $3.45 | $5.95 |
| Chips & Guac                   |   $4.45 | $7.45 |
| Chips & Queso                  |   $4.45 | $7.45 |

Creamy Queso Fries and Loaded Nachos optionally add any protein for $2. Salsa Flight is $6.95. Churro Fries (6 pieces) is $3.50; Chocolate Chunk Cookies (2 cookies) is $2.50.

| Drink                                                                | Price | Tax class      |
| -------------------------------------------------------------------- | ----: | -------------- |
| Pop Can                                                              | $2.25 | SODA           |
| Pop Bottle                                                           | $3.50 | SODA           |
| Jarritos                                                             | $3.75 | SODA           |
| Water Bottle                                                         | $2.95 | NON_SODA_DRINK |
| Juice Bottle                                                         | $3.75 | NON_SODA_DRINK |
| Premium Bottle (non-carbonated, represented by existing iced-tea ID) | $3.75 | NON_SODA_DRINK |

Stable IDs let existing deliberate drink prices/deposits migrate. Flavour variants, four-packs, fountain soda, alcohol and delivery bundles are disabled. Sweetened carbonated premium drinks must use SODA rather than the non-carbonated Premium Bottle category.

## Combo-Up

Chips & Salsa $4.45; Loaded Nachos $6.95; Signature Mercado Fries $5.95; Churro Fries $4.95. Each includes one Pop Can. One bundle may be selected per entrée and remains part of the same editable order line. The can's standalone price is never added to the bundle price.

The included soda PST base defaults to the standalone Pop Can price of $2.25, capped at the bundle price. This follows [BC's soda beverages sold with food rule](https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/publications/food-beverage-service-providers-retail-liquor-sellers): for beverages also sold separately, PST applies to the lesser of ordinary drink price and total bundled price. GST applies to the full order price. Managers can edit bundle prices, soda allocations, product-specific overrides and deposits under Extras in Menu & Prices. If the Pop Can price changes, review the included soda portion of each Combo-Up too.

Container deposits retain the existing [BC Return-It](https://www.return-it.ca/beverage/recycling/recycling-plastic-bottles/) default of 10 cents per container. A Combo-Up adds exactly one 10-cent deposit, separately from its pre-tax menu price. Deposits are editable and untaxed; changing them never adds a second drink price.

## Unsupplied physical prices

The following useful existing fallback prices remain editable: Salad $16.75; Queso extra $3; Honey Chili Sauce extra $1.25; Salsa 4oz $2.75; Guacamole/Queso 4oz $3.75; 10-inch Tortilla $0.55; signature Shiitake Burrito/Bowl $10.75/$13.75. These came from the previous delivery-menu defaults and have no supplied physical replacement. Extra Cheese, plain Chips and generic LTO remain unknown/disabled. Zesty Fries, signature Mucho's Way variants, bulk desserts, catering/delivery bundles and unneeded drink variants remain available only in settings, disabled by default.

Frozen earlier defaults are migration evidence only. Never change them to revise the current menu. Completed receipts retain their historical charged amounts. Revision 3 upgrades untouched v1/v2 prices and nested delivery modifiers automatically while preserving deliberate edits; no browser storage clearing is needed.
