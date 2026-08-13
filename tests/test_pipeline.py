import json
import unittest
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]


class PipelineOutputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.clean = pd.read_csv(ROOT / "data" / "processed" / "order_lines_clean.csv")
        cls.dashboard = json.loads((ROOT / "data" / "dashboard.json").read_text())

    def test_required_fields_are_complete(self):
        required = ["order_id", "order_date", "supplier", "region", "category"]
        self.assertEqual(int(self.clean[required].isna().sum().sum()), 0)

    def test_financial_values_are_non_negative(self):
        fields = ["unit_price", "unit_cost", "freight_cost", "net_revenue"]
        self.assertTrue((self.clean[fields] >= 0).all().all())

    def test_service_rates_are_valid(self):
        overall = self.dashboard["overall"]
        for key in ["margin_rate", "on_time_rate", "fill_rate", "stockout_rate", "forecast_accuracy"]:
            self.assertGreaterEqual(overall[key], 0)
            self.assertLessEqual(overall[key], 1)

    def test_dashboard_has_24_months(self):
        self.assertEqual(len(self.dashboard["monthly"]), 24)


if __name__ == "__main__":
    unittest.main()
