CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".orders (
    id          TEXT PRIMARY KEY,
    num1        TEXT NOT NULL DEFAULT '',
    num2        TEXT NOT NULL DEFAULT '',
    title       TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT '',
    cls         TEXT NOT NULL DEFAULT 'МС',
    deadline    TEXT NOT NULL DEFAULT '',
    priority    TEXT NOT NULL DEFAULT 'Обычный',
    status      TEXT NOT NULL DEFAULT 'Не начат',
    progress    INTEGER NOT NULL DEFAULT 0,
    closed_at   BIGINT,
    operations  JSONB NOT NULL DEFAULT '[]',
    materials   JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".workers (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT '',
    load            INTEGER NOT NULL DEFAULT 0,
    available       BOOLEAN NOT NULL DEFAULT TRUE,
    qualification   TEXT NOT NULL DEFAULT 'III',
    skills          JSONB NOT NULL DEFAULT '[]',
    description     TEXT NOT NULL DEFAULT '',
    workplace_num   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".equipment (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT '',
    count           INTEGER NOT NULL DEFAULT 1,
    busy            INTEGER NOT NULL DEFAULT 0,
    state           TEXT NOT NULL DEFAULT 'Исправно',
    workplace_num   TEXT NOT NULL DEFAULT '',
    note            TEXT NOT NULL DEFAULT '',
    has_uci         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".stock (
    id      SERIAL PRIMARY KEY,
    name    TEXT NOT NULL,
    steel   TEXT NOT NULL DEFAULT '',
    spec    TEXT NOT NULL DEFAULT '',
    qty     NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit    TEXT NOT NULL DEFAULT 'шт',
    ord     TEXT
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".kb_items (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Прочее',
    description TEXT NOT NULL DEFAULT '',
    photo_url   TEXT,
    tags        JSONB NOT NULL DEFAULT '[]',
    files       JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".shifts (
    id          SERIAL PRIMARY KEY,
    date        TEXT NOT NULL,
    worker      TEXT NOT NULL,
    ord         TEXT NOT NULL,
    operation   TEXT NOT NULL,
    plan_qty    INTEGER NOT NULL DEFAULT 1,
    hours       NUMERIC(5,1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".plant_tasks (
    id                  SERIAL PRIMARY KEY,
    title               TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT '',
    estimated_hours     NUMERIC(6,1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "t_p45187164_production_planning_".ai_settings (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    system_prompt   TEXT NOT NULL DEFAULT '',
    user_docs       TEXT NOT NULL DEFAULT '',
    function_url    TEXT NOT NULL DEFAULT '',
    doc_files       JSONB NOT NULL DEFAULT '[]'
);

INSERT INTO "t_p45187164_production_planning_".ai_settings (id, function_url)
VALUES (1, 'https://functions.poehali.dev/a570be4e-feb4-4a70-9be3-920449b6d5d1')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_status ON "t_p45187164_production_planning_".orders(status);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON "t_p45187164_production_planning_".shifts(date);
CREATE INDEX IF NOT EXISTS idx_kb_category ON "t_p45187164_production_planning_".kb_items(category);
