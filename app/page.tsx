import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Supply Chain Profitability Control Tower | Donovan Kore",
  description:
    "An executive analytics portfolio project connecting margin, fulfillment, inventory risk, and supplier performance.",
};

export default function Home() {
  return <Dashboard />;
}
