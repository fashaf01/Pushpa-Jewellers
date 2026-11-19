<?php
/* Pushpa Jewellers — database tables (MySQL 5.7+ / MariaDB 10.3+).
   Created on first use and by the installer; every statement is safe to run again.
   JSON-shaped fields are kept as text and read/written by the PHP. */

const PJ_SCHEMA = [
    "CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(200) NOT NULL UNIQUE,
        name VARCHAR(80) NOT NULL DEFAULT '',
        role VARCHAR(10) NOT NULL DEFAULT 'staff',
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        INDEX sessions_user (user_id),
        CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS invites (
        email VARCHAR(200) NOT NULL PRIMARY KEY,
        name VARCHAR(80) NOT NULL DEFAULT '',
        role VARCHAR(10) NOT NULL DEFAULT 'staff',
        created_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS settings (
        id INT NOT NULL PRIMARY KEY,
        data LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS counters (
        name VARCHAR(40) NOT NULL PRIMARY KEY,
        value BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS products (
        id CHAR(36) NOT NULL PRIMARY KEY,
        sku VARCHAR(40) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'other',
        badge VARCHAR(40) NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        metal VARCHAR(20) NOT NULL DEFAULT 'yellow_gold',
        karat INT NULL,
        weight_g DECIMAL(10,3) NULL,
        stones VARCHAR(200) NOT NULL DEFAULT '',
        pricing_mode VARCHAR(10) NOT NULL DEFAULT 'gold_rate',
        making_type VARCHAR(10) NOT NULL DEFAULT 'percent',
        making_value DECIMAL(14,3) NOT NULL DEFAULT 0,
        stone_value DECIMAL(14,2) NOT NULL DEFAULT 0,
        fixed_price DECIMAL(14,2) NOT NULL DEFAULT 0,
        show_price TINYINT(1) NOT NULL DEFAULT 1,
        images LONGTEXT NOT NULL,
        stock LONGTEXT NOT NULL,
        low_stock_at INT NOT NULL DEFAULT 1,
        status VARCHAR(10) NOT NULL DEFAULT 'published',
        featured_rank INT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX products_updated (updated_at),
        INDEX products_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS stock_movements (
        id CHAR(36) NOT NULL PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        showroom VARCHAR(40) NOT NULL,
        delta INT NOT NULL,
        reason VARCHAR(20) NOT NULL,
        note VARCHAR(500) NOT NULL DEFAULT '',
        order_number VARCHAR(60) NOT NULL DEFAULT '',
        at DATETIME(3) NOT NULL,
        by_name VARCHAR(80) NOT NULL DEFAULT '',
        INDEX stock_movements_at (at),
        INDEX stock_movements_product (product_id, at),
        CONSTRAINT stock_movements_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS gold_rates (
        date DATE NOT NULL PRIMARY KEY,
        per_gram LONGTEXT NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        updated_by VARCHAR(80) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "CREATE TABLE IF NOT EXISTS orders (
        id CHAR(36) NOT NULL PRIMARY KEY,
        number VARCHAR(20) NOT NULL UNIQUE,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        channel VARCHAR(20) NOT NULL DEFAULT 'walk_in',
        showroom VARCHAR(40) NOT NULL,
        customer LONGTEXT NOT NULL,
        items LONGTEXT NOT NULL,
        subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
        discount DECIMAL(14,2) NOT NULL DEFAULT 0,
        total DECIMAL(14,2) NOT NULL DEFAULT 0,
        paid DECIMAL(14,2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(10) NOT NULL DEFAULT 'unpaid',
        payments LONGTEXT NOT NULL,
        fulfilment VARCHAR(10) NOT NULL DEFAULT 'pickup',
        due_date DATE NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        tracking LONGTEXT NOT NULL,
        notes TEXT NOT NULL,
        history LONGTEXT NOT NULL,
        INDEX orders_created (created_at),
        INDEX orders_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

/* Added after the first release. Each statement is safe to run again: a column that is already
   there (MySQL error 1060) is skipped, so a new install and an upgraded one end up the same. */
const PJ_SCHEMA_V2 = [
    /* the website's own details for a piece (its address slug, kind, filters, weight as printed,
       Instagram post, watch specifications...), kept with the product so the shop page can show them */
    "ALTER TABLE products ADD COLUMN web LONGTEXT NULL",
    /* order-tracking lookups from the website, counted per visitor so a number cannot be guessed at */
    "CREATE TABLE IF NOT EXISTS track_attempts (
        who CHAR(64) NOT NULL,
        at DATETIME(3) NOT NULL,
        INDEX track_attempts_who (who, at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

/* Runs once per schema version (a marker file in pj-data); cheap to repeat. */
function pj_ensure_schema(PDO $pdo, array $defaultSettings): void
{
    $dir = pj_data_dir();
    if (!is_file($dir . '/schema-v1.ok')) {
        foreach (PJ_SCHEMA as $sql) $pdo->exec($sql);
        $st = $pdo->prepare('INSERT IGNORE INTO settings (id, data) VALUES (1, ?)');
        $st->execute([jenc($defaultSettings)]);
        /* Order numbers start at PJ-1001 */
        $pdo->exec("INSERT IGNORE INTO counters (name, value) VALUES ('order_number', 1000)");
        @file_put_contents($dir . '/schema-v1.ok', now_iso());
    }
    if (!is_file($dir . '/schema-v2.ok')) {
        foreach (PJ_SCHEMA_V2 as $sql) {
            try { $pdo->exec($sql); }
            catch (PDOException $e) { if ((int) ($e->errorInfo[1] ?? 0) !== 1060) throw $e; }
        }
        @file_put_contents($dir . '/schema-v2.ok', now_iso());
    }
}
