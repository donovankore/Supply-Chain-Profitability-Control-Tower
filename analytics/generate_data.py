"""Generate a deterministic, realistic supply-chain order-line dataset.

The dataset is synthetic by design: it is safe to publish, reproducible, and
contains controlled data-quality defects so the ETL can demonstrate validation.
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "raw" / "supply_chain_orders.csv"
SEED = 20260813
ROWS = 36_000

REGIONS = {
    "West": ("Reno", 0.96),
    "South": ("Dallas", 0.92),
    "Midwest": ("Chicago", 0.94),
    "Northeast": ("Allentown", 0.90),
}
CATEGORIES = {
    "Electronics": (128.0, 0.66),
    "Home": (74.0, 0.61),
    "Beauty": (38.0, 0.55),
    "Fitness": (82.0, 0.59),
    "Office": (46.0, 0.57),
}
SUPPLIERS = [f"Supplier {letter}" for letter in "ABCDEFGHIJKL"]
CHANNELS = ["Direct", "Marketplace", "Wholesale"]


def weighted_choice(rng: random.Random, values: list[str], weights: list[int]) -> str:
    return rng.choices(values, weights=weights, k=1)[0]


def main() -> None:
    rng = random.Random(SEED)
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    start = date(2024, 1, 1)
    records: list[dict[str, object]] = []

    for index in range(ROWS):
        order_date = start + timedelta(days=rng.randrange(0, 731))
        region = weighted_choice(rng, list(REGIONS), [28, 27, 24, 21])
        warehouse, service_factor = REGIONS[region]
        category = weighted_choice(rng, list(CATEGORIES), [24, 22, 18, 17, 19])
        base_price, cost_ratio = CATEGORIES[category]
        supplier_number = (index + rng.randrange(0, 12)) % 12
        supplier = SUPPLIERS[supplier_number]
        supplier_drag = (supplier_number % 4) * 0.018
        units = max(1, int(rng.gammavariate(2.2, 2.1)))
        unit_price = round(base_price * rng.uniform(0.78, 1.28), 2)
        unit_cost = round(unit_price * (cost_ratio + rng.uniform(-0.035, 0.045)), 2)
        promised_days = weighted_choice(rng, ["2", "3", "4", "5", "6"], [8, 24, 34, 24, 10])
        promised_date = order_date + timedelta(days=int(promised_days))
        late_probability = min(0.38, 0.07 + (1 - service_factor) + supplier_drag)
        delay = rng.choices([-1, 0, 1, 2, 3, 5], weights=[8, 49, 18, 12, 8, 5], k=1)[0]
        if rng.random() > late_probability:
            delay = min(delay, 0)
        delivery_date = promised_date + timedelta(days=delay)
        freight = round((5.5 + units * 1.15) * rng.uniform(0.82, 1.45), 2)
        demand_forecast = max(1, round(units * rng.uniform(0.74, 1.28)))
        stock_pressure = 0.07 + (0.04 if category == "Electronics" else 0) + supplier_drag
        inventory_on_hand = 0 if rng.random() < stock_pressure else rng.randint(units, units + 42)
        returned_units = rng.choices([0, 1, 2], weights=[93, 6, 1], k=1)[0]
        returned_units = min(returned_units, units)
        channel = weighted_choice(rng, CHANNELS, [46, 37, 17])
        records.append(
            {
                "order_id": f"ORD-{100000 + index // 2}",
                "order_date": order_date.isoformat(),
                "promised_date": promised_date.isoformat(),
                "delivery_date": delivery_date.isoformat(),
                "region": region,
                "warehouse": warehouse,
                "category": category,
                "sku": f"{category[:3].upper()}-{100 + index % 120}",
                "supplier": supplier,
                "channel": channel,
                "units": units,
                "unit_price": unit_price,
                "unit_cost": unit_cost,
                "freight_cost": freight,
                "demand_forecast": demand_forecast,
                "inventory_on_hand": inventory_on_hand,
                "returned_units": returned_units,
            }
        )

    # Controlled defects: missing suppliers, invalid freight values, duplicates.
    for row in records[125:155]:
        row["supplier"] = ""
    for row in records[700:712]:
        row["freight_cost"] = -1
    records.extend(dict(row) for row in records[2000:2020])

    with RAW_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records):,} raw rows at {RAW_PATH}")


if __name__ == "__main__":
    main()
