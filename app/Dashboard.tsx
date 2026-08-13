"use client";

import { useMemo, useState } from "react";
import dashboardData from "../data/dashboard.json";

type MetricRow = {
  month: string;
  region?: string;
  category?: string;
  line_count: number;
  orders: number;
  revenue: number;
  contribution_margin: number;
  margin_rate: number;
  on_time_rate: number;
  fill_rate: number;
  stockout_rate: number;
  forecast_accuracy: number;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("en-US");
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function aggregate(rows: MetricRow[]) {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const contribution = rows.reduce((sum, row) => sum + row.contribution_margin, 0);
  const lineCount = rows.reduce((sum, row) => sum + row.line_count, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const weight = lineCount || 1;
  return {
    revenue,
    contribution_margin: contribution,
    line_count: lineCount,
    orders,
    margin_rate: revenue ? contribution / revenue : 0,
    on_time_rate: rows.reduce((sum, row) => sum + row.on_time_rate * row.line_count, 0) / weight,
    fill_rate: rows.reduce((sum, row) => sum + row.fill_rate * row.line_count, 0) / weight,
    stockout_rate: rows.reduce((sum, row) => sum + row.stockout_rate * row.line_count, 0) / weight,
    forecast_accuracy: rows.reduce((sum, row) => sum + row.forecast_accuracy * row.line_count, 0) / weight,
  };
}

function KpiCard({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "neutral" | "good" | "risk" }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-label"><span>{label}</span><span aria-hidden="true">↗</span></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

export default function Dashboard() {
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const [year, setYear] = useState("2025");
  const [recovery, setRecovery] = useState(50);

  const segments = dashboardData.segments as MetricRow[];
  const filtered = useMemo(
    () => segments.filter((row) =>
      (region === "All regions" || row.region === region) &&
      (category === "All categories" || row.category === category) &&
      row.month.startsWith(year)),
    [region, category, year, segments],
  );
  const metrics = aggregate(filtered);
  const monthly = useMemo(() => {
    const months = [...new Set(filtered.map((row) => row.month))];
    return months.map((month) => ({ month, ...aggregate(filtered.filter((row) => row.month === month)) }));
  }, [filtered]);
  const maxRevenue = Math.max(...monthly.map((row) => row.revenue), 1);
  const regions = ["All regions", "West", "South", "Midwest", "Northeast"];
  const categories = ["All categories", "Electronics", "Home", "Beauty", "Fitness", "Office"];
  const selectedOpportunity = dashboardData.opportunity_value * (metrics.revenue / dashboardData.overall.revenue);
  const scenarioValue = selectedOpportunity * (recovery / 50);

  const regionScorecards = ["West", "South", "Midwest", "Northeast"].map((name) => ({
    name,
    ...aggregate(segments.filter((row) => row.region === name && row.month.startsWith(year) && (category === "All categories" || row.category === category))),
  }));

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kore Analytics home">
          <span className="brand-mark">DK</span>
          <span>Kore Analytics</span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#overview">Overview</a>
          <a href="#suppliers">Suppliers</a>
          <a href="#methodology">Methodology</a>
        </nav>
        <a className="contact-link" href="mailto:donovankore9@gmail.com">Contact ↗</a>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="eyebrow"><span className="live-dot" /> Portfolio case study · Updated Aug 2026</div>
          <h1>Supply Chain<br /><em>Profitability</em> Control Tower</h1>
          <p className="hero-copy">A decision system that connects service failures to margin impact—helping leaders prioritize supplier, inventory, and fulfillment actions.</p>
        </div>
        <aside className="hero-callout">
          <span>Executive brief</span>
          <strong>{wholeMoney.format(dashboardData.opportunity_value)}</strong>
          <p>annualized recovery opportunity across late freight and stockout exposure.</p>
          <a href="#insights">See the recommendation <span>↓</span></a>
        </aside>
      </section>

      <section className="dashboard-shell" id="overview">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / EXECUTIVE VIEW</span>
            <h2>Performance at a glance</h2>
          </div>
          <div className="filters" aria-label="Dashboard filters">
            <label>Year<select value={year} onChange={(event) => setYear(event.target.value)}><option>2025</option><option>2024</option></select></label>
            <label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </div>

        <div className="kpi-grid">
          <KpiCard label="Net revenue" value={money.format(metrics.revenue)} note={`${integer.format(metrics.line_count)} order lines analyzed`} />
          <KpiCard label="Contribution margin" value={money.format(metrics.contribution_margin)} note={`${percent(metrics.margin_rate)} after freight`} tone="good" />
          <KpiCard label="On-time delivery" value={percent(metrics.on_time_rate)} note="Target: 95.0%" tone={metrics.on_time_rate >= .95 ? "good" : "risk"} />
          <KpiCard label="Stockout rate" value={percent(metrics.stockout_rate)} note="Target: below 8.0%" tone={metrics.stockout_rate <= .08 ? "good" : "risk"} />
        </div>

        <div className="analysis-grid">
          <article className="panel revenue-panel">
            <div className="panel-head"><div><span>Monthly trend</span><h3>Revenue and margin</h3></div><div className="legend"><span><i className="legend-bar" />Revenue</span><span><i className="legend-dot" />Margin</span></div></div>
            <div className="chart" aria-label="Monthly revenue bar chart">
              {monthly.map((row) => (
                <div className="chart-column" key={row.month}>
                  <span className="margin-tag">{Math.round(row.margin_rate * 100)}%</span>
                  <div className="bar-track"><div className="bar" style={{ height: `${Math.max(8, row.revenue / maxRevenue * 100)}%` }} /></div>
                  <span>{new Date(`${row.month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span>
                </div>
              ))}
            </div>
            <p className="chart-note"><span>Signal</span> Margin remains resilient, but service performance is below the 95% target.</p>
          </article>

          <article className="panel service-panel">
            <div className="panel-head"><div><span>Service health</span><h3>Regional scorecard</h3></div><span className="target-pill">95% target</span></div>
            <div className="scorecard-head"><span>Region</span><span>On-time</span><span>Stockouts</span><span>Margin</span></div>
            {regionScorecards.map((row) => (
              <div className="scorecard-row" key={row.name}>
                <strong>{row.name}</strong>
                <span className={row.on_time_rate < .92 ? "metric-risk" : ""}>{percent(row.on_time_rate)}</span>
                <span className={row.stockout_rate > .11 ? "metric-risk" : ""}>{percent(row.stockout_rate)}</span>
                <span>{percent(row.margin_rate)}</span>
              </div>
            ))}
            <div className="health-summary"><span>Forecast accuracy</span><strong>{percent(metrics.forecast_accuracy)}</strong><div><i style={{ width: `${metrics.forecast_accuracy * 100}%` }} /></div></div>
          </article>
        </div>
      </section>

      <section className="supplier-section" id="suppliers">
        <div className="section-heading light">
          <div><span className="section-index">02 / SUPPLIER RISK</span><h2>Where value is leaking</h2></div>
          <p>Prioritization combines material revenue exposure, delivery reliability, lead time, and freight intensity.</p>
        </div>
        <div className="supplier-table" role="table" aria-label="Supplier risk ranking">
          <div className="supplier-row table-header" role="row"><span>Supplier</span><span>Revenue supported</span><span>On-time</span><span>Lead time</span><span>Risk</span></div>
          {dashboardData.suppliers.slice(0, 6).map((supplier, index) => {
            const risk = supplier.on_time_rate < .91 ? "High" : supplier.on_time_rate < .93 ? "Medium" : "Low";
            return <div className="supplier-row" role="row" key={supplier.supplier}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><strong>{supplier.supplier}</strong></span>
              <span>{money.format(supplier.revenue)}</span>
              <span>{percent(supplier.on_time_rate)}</span>
              <span>{supplier.avg_lead_time} days</span>
              <span><i className={`risk-badge ${risk.toLowerCase()}`}>{risk}</i></span>
            </div>;
          })}
        </div>
      </section>

      <section className="decision-section" id="insights">
        <div className="insight-copy">
          <span className="section-index">03 / DECISION SUPPORT</span>
          <h2>Turn risk into a<br /><em>funded action plan.</em></h2>
          <p>The model isolates recoverable value rather than presenting KPIs alone. Adjust the recovery assumption to frame a conservative or ambitious operating plan.</p>
          <div className="recommendation">
            <span>Recommended first move</span>
            <strong>Launch a 60-day supplier recovery sprint</strong>
            <p>Focus on the bottom three suppliers, tighten reorder points for high-risk SKUs, and review weekly OTIF exceptions.</p>
          </div>
        </div>
        <article className="scenario-card">
          <span>Scenario simulator</span>
          <h3>Potential value recovered</h3>
          <strong>{wholeMoney.format(scenarioValue)}</strong>
          <div className="range-label"><span>Recovery assumption</span><b>{recovery}%</b></div>
          <input aria-label="Recovery assumption" type="range" min="25" max="75" step="5" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} />
          <div className="range-presets" aria-label="Recovery presets">
            <button type="button" onClick={() => setRecovery(25)}>Conservative</button>
            <button type="button" onClick={() => setRecovery(50)}>Base case</button>
            <button type="button" onClick={() => setRecovery(75)}>Ambitious</button>
          </div>
          <div className="scenario-lines"><p><span>Late freight efficiency</span><b>{wholeMoney.format(scenarioValue * .42)}</b></p><p><span>Stockout recovery proxy</span><b>{wholeMoney.format(scenarioValue * .58)}</b></p></div>
          <small>Illustrative scenario, not a financial forecast. Assumptions are documented below.</small>
        </article>
      </section>

      <section className="methodology" id="methodology">
        <div><span className="section-index">04 / METHODOLOGY</span><h2>Built for scrutiny,<br />not just screenshots.</h2></div>
        <div className="method-grid">
          <article><b>01</b><h3>Generate</h3><p>Deterministic synthetic order-line data with known quality defects and realistic operational patterns.</p></article>
          <article><b>02</b><h3>Validate</h3><p>Schema checks, duplicate removal, missing-value rules, financial controls, and automated tests.</p></article>
          <article><b>03</b><h3>Analyze</h3><p>Python transformations and SQL business questions connect service metrics to contribution margin.</p></article>
          <article><b>04</b><h3>Decide</h3><p>An executive interface turns analysis into prioritized actions and transparent recovery scenarios.</p></article>
        </div>
        <div className="assumption-note"><strong>Data disclosure</strong><p>This portfolio uses synthetic, deterministic data so the full workflow can be published safely. The business logic, controls, calculations, and recommendations are reproducible.</p></div>
      </section>

      <footer>
        <div><span className="brand-mark">DK</span><strong>Jean Michel Donovan Kore</strong></div>
        <p>MS Business Analytics · Financial, Operations & Supply Chain Analytics</p>
        <div><a href="https://www.linkedin.com/in/donovankore">LinkedIn ↗</a><a href="https://github.com/donovankore">GitHub ↗</a></div>
      </footer>
    </main>
  );
}
