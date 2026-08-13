-- 1. Executive monthly performance: profitability and service in one view.
SELECT
    month,
    ROUND(SUM(net_revenue), 2) AS revenue,
    ROUND(SUM(contribution_margin), 2) AS contribution_margin,
    ROUND(100.0 * SUM(contribution_margin) / NULLIF(SUM(net_revenue), 0), 1) AS margin_pct,
    ROUND(100.0 * AVG(on_time), 1) AS on_time_pct,
    ROUND(100.0 * AVG(stockout_flag), 1) AS stockout_pct
FROM order_lines
GROUP BY month
ORDER BY month;

-- 2. Suppliers that combine material spend with service risk.
WITH supplier_scorecard AS (
    SELECT
        supplier,
        SUM(net_revenue) AS revenue_supported,
        SUM(contribution_margin) AS contribution_margin,
        AVG(on_time) AS on_time_rate,
        AVG(stockout_flag) AS stockout_rate,
        COUNT(DISTINCT order_id) AS orders
    FROM order_lines
    GROUP BY supplier
)
SELECT
    supplier,
    ROUND(revenue_supported, 2) AS revenue_supported,
    ROUND(100.0 * contribution_margin / NULLIF(revenue_supported, 0), 1) AS margin_pct,
    ROUND(100.0 * on_time_rate, 1) AS on_time_pct,
    ROUND(100.0 * stockout_rate, 1) AS stockout_pct,
    orders
FROM supplier_scorecard
WHERE revenue_supported >= (SELECT AVG(revenue_supported) FROM supplier_scorecard)
ORDER BY on_time_rate ASC, revenue_supported DESC;

-- 3. Region/category combinations where service failures threaten margin.
SELECT
    region,
    category,
    ROUND(SUM(net_revenue), 2) AS revenue,
    ROUND(SUM(contribution_margin), 2) AS contribution_margin,
    ROUND(100.0 * AVG(on_time), 1) AS on_time_pct,
    ROUND(100.0 * AVG(stockout_flag), 1) AS stockout_pct
FROM order_lines
GROUP BY region, category
HAVING AVG(on_time) < 0.90 OR AVG(stockout_flag) > 0.10
ORDER BY contribution_margin ASC;

-- 4. Quantified opportunity: conservative recovery assumptions.
SELECT
    ROUND(SUM(CASE WHEN on_time = 0 THEN freight_cost * 0.22 ELSE 0 END), 2)
        AS recoverable_late_freight_cost,
    ROUND(SUM(CASE WHEN stockout_flag = 1 THEN net_revenue * 0.08 ELSE 0 END), 2)
        AS recoverable_stockout_revenue_proxy
FROM order_lines;
