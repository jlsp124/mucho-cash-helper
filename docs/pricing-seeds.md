# Default menu-data notes

The checked-in menu values are development defaults for the public project. They are useful for exercising the pricing engine, migrations, tax handling, modifier rules and browser tests, but they are **not intended to be an authoritative price list for any restaurant location**.

Real deployments should verify and maintain their own configuration through the app's editable settings and versioned JSON import/export flow.

## Configuration model

Each product can define a base price, category, tax class, refundable deposit, availability, and optional customization rules. Proteins and extras can be priced globally or overridden for individual products. A full-price override can replace the normal base-plus-protein calculation while still allowing other extras to be applied.

Included extras are represented explicitly so they remain non-chargeable even when an old cart snapshot or product override is involved. Optional bundles can carry a configurable soda allocation and refundable container deposit without double-counting the standalone drink price.

## Taxes and cash handling

Tax classes and rates are centralized in configuration. Money is stored as integer Canadian cents and taxes are rounded deterministically.

For the default Canadian configuration, cash is rounded once to the nearest $0.05 while electronic payments retain the exact calculated total. Refundable deposits are represented separately from taxable line amounts.

The bundled-soda handling was designed around British Columbia's public guidance for soda beverages sold with food:

- https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/publications/food-beverage-service-providers-retail-liquor-sellers

Container-deposit defaults can be reviewed against public Return-It guidance:

- https://www.return-it.ca/beverage/recycling/recycling-plastic-bottles/

## Versioned defaults and migrations

The app keeps frozen earlier default sets only as migration baselines. New default revisions can add or correct fields while preserving deliberate user changes where the old state can be distinguished from an untouched shipped value.

Completed receipts always retain their historical charged amounts. Active cart snapshots are repriced only when they can be safely matched to current configuration.

This migration system is intentionally conservative: when the software cannot reliably determine whether a stored value was a deliberate edit or an untouched old default, it prefers preserving the user's stored value rather than silently changing it.
