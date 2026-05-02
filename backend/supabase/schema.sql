

CREATE TABLE IF NOT EXISTS hero_progress (
  session_id          TEXT PRIMARY KEY,
  level               INTEGER     NOT NULL DEFAULT 1,
  xp                  INTEGER     NOT NULL DEFAULT 0,
  max_hp              INTEGER     NOT NULL DEFAULT 100,
  attack              INTEGER     NOT NULL DEFAULT 15,
  defense             INTEGER     NOT NULL DEFAULT 10,
  magic               INTEGER     NOT NULL DEFAULT 8,
  skill_points        INTEGER     NOT NULL DEFAULT 0,
  gold                INTEGER     NOT NULL DEFAULT 0,
  shards              INTEGER     NOT NULL DEFAULT 0,
  hp_potions          INTEGER     NOT NULL DEFAULT 0,
  mp_potions          INTEGER     NOT NULL DEFAULT 0,
  learned_moves       TEXT[]      NOT NULL DEFAULT ARRAY['slash','shield_up','battle_cry','second_wind'],
  equipped_moves      TEXT[]      NOT NULL DEFAULT ARRAY['slash','shield_up','battle_cry','second_wind'],
  inventory           TEXT[]      NOT NULL DEFAULT '{}',
  equipment           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  purchased_upgrades  TEXT[]      NOT NULL DEFAULT '{}',
  settings            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_saves (
  session_id            TEXT PRIMARY KEY,
  current_monster_index INTEGER     NOT NULL DEFAULT 0,
  defeated_monster_ids  TEXT[]      NOT NULL DEFAULT '{}',
  run_config            JSONB       NOT NULL,
  hero_snapshot         JSONB,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
