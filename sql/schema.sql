DROP TABLE IF EXISTS order_lines;

CREATE TABLE order_lines (
    order_id TEXT NOT NULL,
    order_date DATE NOT NULL,
    promised_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    region TEXT NOT NULL,
    warehouse TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT NOT NULL,
    supplier TEXT NOT NULL,
    channel TEXT NOT NULL,
    units INTEGER NOT NULL CHECK (units > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost DECIMAL(12, 2) NOT NULL CHECK (unit_cost >= 0),
    freight_cost DECIMAL(12, 2) NOT NULL CHECK (freight_cost >= 0),
    demand_forecast INTEGER NOT NULL,
    inventory_on_hand INTEGER NOT NULL,
    returned_units INTEGER NOT NULL,
    net_revenue DECIMAL(14, 2) NOT NULL,
    contribution_margin DECIMAL(14, 2) NOT NULL,
    on_time INTEGER NOT NULL CHECK (on_time IN (0, 1)),
    stockout_flag INTEGER NOT NULL CHECK (stockout_flag IN (0, 1)),
    month TEXT NOT NULL
);

CREATE INDEX idx_order_lines_month ON order_lines(month);
CREATE INDEX idx_order_lines_supplier ON order_lines(supplier);
CREATE INDEX idx_order_lines_region_category ON order_lines(region, category);
