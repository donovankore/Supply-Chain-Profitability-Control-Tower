"""Clean the raw data, calculate business KPIs, and publish dashboard data."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "raw" / "supply_chain_orders.csv"
CLEAN_PATH = ROOT / "data" / "processed" / "order_lines_clean.csv"
DASHBOARD_PATH = ROOT / "data" / "dashboard.json"
QA_PATH = ROOT / "outputs" / "data_quality_report.json"


def weighted_metrics(frame: pd.DataFrame) -> dict[str, float | int]:
    revenue = frame["net_revenue"].sum()
    contribution = frame["contribution_margin"].sum()
    units = frame["units"].sum()
    forecast_error = frame["forecast_abs_error"].sum()
    return {
        "line_count": int(len(frame)),
        "orders": int(frame["order_id"].nunique()),
        "revenue": round(float(revenue), 2),
        "contribution_margin": round(float(contribution), 2),
        "margin_rate": round(float(contribution / revenue), 4) if revenue else 0,
        "on_time_rate": round(float(frame["on_time"].mean()), 4),
        "fill_rate": round(float((frame["units"] - frame["returned_units"]).sum() / units), 4),
        "stockout_rate": round(float(frame["stockout_flag"].mean()), 4),
        "forecast_accuracy": round(float(1 - forecast_error / units), 4),
    }


def main() -> None:
    raw = pd.read_csv(RAW_PATH)
    initial_rows = len(raw)
    duplicate_rows = int(raw.duplicated().sum())
    missing_supplier = int(raw["supplier"].isna().sum())
    invalid_freight = int((raw["freight_cost"] < 0).sum())

    clean = raw.drop_duplicates().copy()
    clean = clean.dropna(subset=["supplier", "order_id", "order_date"])
    clean = clean.loc[clean["freight_cost"] >= 0].copy()
    for column in ["order_date", "promised_date", "delivery_date"]:
        clean[column] = pd.to_datetime(clean[column], errors="raise")

    numeric_columns = [
        "units", "unit_price", "unit_cost", "freight_cost", "demand_forecast",
        "inventory_on_hand", "returned_units",
    ]
    clean[numeric_columns] = clean[numeric_columns].apply(pd.to_numeric, errors="raise")
    clean["returned_units"] = clean[["returned_units", "units"]].min(axis=1)
    clean["gross_revenue"] = clean["units"] * clean["unit_price"]
    clean["return_value"] = clean["returned_units"] * clean["unit_price"]
    clean["net_revenue"] = clean["gross_revenue"] - clean["return_value"]
    clean["cogs"] = (clean["units"] - clean["returned_units"]) * clean["unit_cost"]
    clean["contribution_margin"] = clean["net_revenue"] - clean["cogs"] - clean["freight_cost"]
    clean["on_time"] = (clean["delivery_date"] <= clean["promised_date"]).astype(int)
    clean["lead_time_days"] = (clean["delivery_date"] - clean["order_date"]).dt.days
    clean["forecast_abs_error"] = (clean["units"] - clean["demand_forecast"]).abs()
    clean["stockout_flag"] = (clean["inventory_on_hand"] == 0).astype(int)
    clean["month"] = clean["order_date"].dt.to_period("M").astype(str)

    clean = clean.sort_values(["order_date", "order_id", "sku"])
    CLEAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    CLEAN_PATH.parent.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN_PATH, index=False, date_format="%Y-%m-%d")

    monthly = []
    for month, group in clean.groupby("month", sort=True):
        monthly.append({"month": month, **weighted_metrics(group)})

    segments = []
    for (month, region, category), group in clean.groupby(["month", "region", "category"], sort=True):
        segments.append({"month": month, "region": region, "category": category, **weighted_metrics(group)})

    suppliers = []
    for supplier, group in clean.groupby("supplier"):
        metrics = weighted_metrics(group)
        suppliers.append({
            "supplier": supplier,
            **metrics,
            "avg_lead_time": round(float(group["lead_time_days"].mean()), 1),
            "freight_per_order": round(float(group["freight_cost"].sum() / group["order_id"].nunique()), 2),
        })
    suppliers.sort(key=lambda item: (item["on_time_rate"], -item["revenue"]))

    products = []
    for (sku, category), group in clean.groupby(["sku", "category"]):
        metrics = weighted_metrics(group)
        risk_score = (
            (1 - metrics["on_time_rate"]) * 35
            + metrics["stockout_rate"] * 40
            + (1 - metrics["forecast_accuracy"]) * 25
        )
        products.append({"sku": sku, "category": category, **metrics, "risk_score": round(risk_score, 1)})
    products.sort(key=lambda item: item["risk_score"], reverse=True)

    overall = weighted_metrics(clean)
    late_orders = clean.loc[clean["on_time"] == 0]
    opportunity = round(float(late_orders["freight_cost"].sum() * 0.22 + clean.loc[clean["stockout_flag"] == 1, "net_revenue"].sum() * 0.08), 2)
    dashboard = {
        "metadata": {
            "title": "Supply Chain Profitability Control Tower",
            "generated_at": "2026-08-13",
            "period": "Jan 2024 - Dec 2025",
            "data_type": "Synthetic, deterministic portfolio dataset",
            "clean_rows": len(clean),
        },
        "overall": overall,
        "opportunity_value": opportunity,
        "monthly": monthly,
        "segments": segments,
        "suppliers": suppliers,
        "product_risks": products[:12],
    }
    DASHBOARD_PATH.write_text(json.dumps(dashboard, indent=2), encoding="utf-8")

    QA_PATH.parent.mkdir(parents=True, exist_ok=True)
    qa = {
        "initial_rows": initial_rows,
        "duplicate_rows_removed": duplicate_rows,
        "missing_supplier_rows_removed": missing_supplier,
        "invalid_freight_rows_removed": invalid_freight,
        "clean_rows": len(clean),
        "clean_duplicate_rows": int(clean.duplicated().sum()),
        "clean_missing_required_values": int(clean[["order_id", "supplier", "order_date"]].isna().sum().sum()),
        "clean_negative_financial_values": int((clean[["unit_price", "unit_cost", "freight_cost"]] < 0).sum().sum()),
    }
    QA_PATH.write_text(json.dumps(qa, indent=2), encoding="utf-8")
    print(json.dumps({"overall": overall, "opportunity_value": opportunity, "quality": qa}, indent=2))


if __name__ == "__main__":
    main()
