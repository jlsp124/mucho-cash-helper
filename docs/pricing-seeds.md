# Shipped price provenance

These are observed Prince George delivery-menu values, not verified physical-register prices. Source metadata stays in configuration/source documentation and is not displayed during checkout.

Checked 2026-10-03: [Prince George menu, 1600 15th Ave, unit 145](https://www.ubereats.com/ca/store/mucho-burrito-1600-15th-ave-unit-145/3J5voFnUUfG2JOdE4Erf_w). The public menu identified the exact restaurant and CAD prices. No menu request is made by the app; this is development-time source information only.

| Public item                                | Online seed (CAD) |
| ------------------------------------------ | ----------------: |
| Regular Build Your Own Burrito             |            $15.45 |
| Loaded Nachos                              |             $8.40 |
| MUCHO Churro Fries                         |            $14.95 |
| Spiced Mercado Fries - Creamy Queso        |             $7.20 |
| Spiced Mercado Fries - Zesty Fresca        |             $7.20 |
| MUCHO's Way Bowl                           |            $16.75 |
| Tortilla Chips with Queso Cheese           |             $5.95 |
| Build Your Own Bowl/Salad                  |            $16.75 |
| Build Your Own Quesadilla                  |            $13.55 |
| Spiced Signature                           |             $5.99 |
| MUCHO Build Your Own Burrito               |            $19.15 |
| Tortilla Chips with Guacamole              |             $5.95 |
| 4 Canned Pepsi Drinks                      |             $8.95 |
| Regular Honey Chili Pepper Chicken Burrito |            $16.70 |
| Honey Chili Pepper Chicken Bowl            |            $18.00 |
| Salsa Flight                               |             $7.95 |
| Build Your Own Bowl Bar (Serves 4-6)       |            $84.00 |
| Signature Shiitake Carnitas Burrito        |            $10.75 |
| Signature Shiitake Carnitas Bowl           |            $13.75 |
| Small Build Your Own Burrito               |            $13.45 |
| Build Your Own Taco                        |             $5.45 |
| Burrito Bundle - 10 Pcs                    |            $94.95 |
| Burrito Bundle - 4 Pcs                     |            $49.95 |
| Burrito Bundle - 6 Pcs                     |            $69.95 |
| Take Home Taco Kit (Serves 6)              |            $84.99 |
| Take Home Taco Kit (Serves 4)              |            $59.99 |
| Take Home Taco Kit (Serves 8)              |           $109.99 |
| MUCHO's Way Burrito                        |            $13.45 |
| Tortilla Chips with Salsa                  |             $4.95 |
| Salsa (4oz)                                |             $2.75 |
| Guacamole (4oz)                            |             $3.75 |
| Queso Cheese (4oz)                         |             $3.75 |
| 10" Tortilla                               |             $0.55 |
| Churro Fries                               |             $3.95 |
| Chocolate Chunk Cookies                    |             $2.95 |
| MUCHO Cookies                              |            $12.95 |
| Canned Pop                                 |             $3.25 |
| Bottled Pop                                |             $4.25 |
| Jarritos                                   |             $4.25 |
| Aquafina Bottled Water                     |             $3.25 |
| Pure Leaf Iced Tea                         |             $4.25 |
| Dole                                       |             $4.25 |
| Montellier Sparkling Water                 |             $3.95 |
| Corona Cero                                |             $6.95 |
| 4 Bottled Pepsi Drinks                     |            $13.95 |
| 4 Jarritos                                 |            $13.95 |

Actual configurators confirmed Taco Trio: Single Taco $5.45 + Trio $9.90 = **$15.35**. Spiced Signature offers MUCHO +$3.63 = **$9.62**; Zesty Fresca and Creamy Queso each offer MUCHO +$3.00 = **$10.20**. Canned/bottled variants inherit the menu's Pop price; water, tea and juice correspond to Aquafina, Pure Leaf and Dole. All remain editable.

## Actual modifier evidence

Small, Regular and Mucho burritos and Bowl/Salad: Grilled Chicken, Crispy Chicken Tender, Chorizo, Pork Carnitas and Ancho Ground Beef included; Steak, Beef Barbacoa and Shiitake Carnitas **+$2.95** each. Fajita Veggies and No Protein are included, represented by Veggies. The Regular Burrito was independently checked in the [PG DoorDash configurator](https://www.doordash.com/en-CA/store/mucho-burrito-prince-george-2344087/), which agreed.

Quesadilla: every exposed primary meat/shiitake option **+$3.75**; No Protein included. Crispy Chicken Tender is only in the extra-protein group. Product-specific overrides prevent applying the burrito schedule to quesadillas.

MUCHO's Way Burrito and Bowl expose the same included / +$2.95 protein schedule, with no standalone paid extras. The $13.45 signature burrito is Small; the configurator offers Regular +$2.00 and MUCHO +$5.70. Other sizes can use the corresponding BYO product or a custom signature product.

Single Taco and each of the three nested Trio groups: Chicken, Chorizo, Pork Carnitas and Ancho Ground Beef included; Steak/Barbacoa **+$2.00 per taco**, Shiitake **+$3.75 per taco**. Crispy Chicken absent. The helper's single-protein Trio charges +$6.00 or +$11.25 for all three. Mixed-protein trios require separately configured products/prices.

Guacamole **2oz** and Queso **2oz**: **+$3.00** each in burrito/bowl/quesadilla add-ons. Extra Protein: **+$3.75** for all eight exposed proteins. Honey Chili Pepper Sauce: **+$1.25** on burritos/bowls and per taco; Trio **+$3.75** for all three. Mucho Burrito additionally exposes Salsa **+$2.75**. Taco builders do not expose guacamole, queso or extra protein; these are excluded there by default. Cheese/plant-based cheese are included choices, not evidence for an Extra Cheese charge. The 4oz sides above are separate products, not substitutes for these 2oz modifiers.

Zesty Fresca and Creamy Queso Fries expose optional proteins: Chicken, Pork Carnitas, Ancho Ground Beef, Chorizo and Crispy Chicken **+$2.40**; Steak/Barbacoa **+$2.95**; Shiitake **+$3.75**. They allow up to two proteins. This release retains one-tap plain fries; optional/multiple-protein fries can be configured as custom products. Optional drinks are separate cart products. Combo meal composition and bundle premiums are not inferred from standalone prices.

## Other channels and unresolved values

The official [PG location](https://locations.muchoburrito.com/en-ca/bc/prince-george/MB0133) links to [Mucho's ordering platform](https://muchoburrito.order-online.ai/en-CA). With Parkwood Place / 1600 15th Avenue Unit 145 selected for takeout, Regular Burrito was **$12.75**, Small $10.75, Mucho $15.75, Bowl $13.75, Quesadilla $10.95, Single Taco $4.45 / Trio $12.45. Regular Burrito premium proteins +$2.00, guacamole/queso 2oz +$2.50, honey sauce +$1.00, extra meat +$3.00 and extra Shiitake +$2.00. Defaults consistently use the requested delivery channel rather than combining these distinct schedules.

**Unresolved:** Extra Cheese has no paid modifier in the inspected PG delivery or official regular-burrito builders. Plain chips, fountain soda and unlisted local LTOs have no exposed current price. Unknown entries remain blank/disabled and editable. Standard bundles and Corona Cero retain their prior disabled state; bundle premium variants and local beverage tax classification need store-specific configuration.

Refundable deposits use the [BC Return-It container deposit](https://www.return-it.ca/beverage/recycling/recycling-plastic-bottles/): **10¢ per can/bottle, 40¢ per four-pack**. Restaurant-specific recycling fees and whether the menu already includes the deposit were not exposed; deposits remain separately editable. Honey Chili LTO products retain editable enabled/LTO flags. No unresolved charge is invented or silently treated as free.
