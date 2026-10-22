/**
 * Veritabanı katmanı (PostgreSQL). Tablolar uygulama açılırken yoksa oluşturulur.
 * Oyuncunun gizli anahtarı veritabanında düz değil, SHA-256 özeti olarak tutulur.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import pg from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  text NOT NULL UNIQUE,
  name        text NOT NULL,
  shop        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed        integer NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score       integer,
  day         integer,
  finished    boolean,
  log         jsonb
);

CREATE INDEX IF NOT EXISTS runs_score_idx ON runs (score DESC) WHERE finished_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS runs_player_idx ON runs (player_id);
`;

export interface Player {
  id: string;
  name: string;
  shop: string;
}

export interface Run {
  id: string;
  playerId: string;
  seed: number;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface ScoreRow {
  rank: number;
  playerId: string;
  name: string;
  shop: string;
  score: number;
  day: number;
  finished: boolean;
}

export type Period = "all" | "week";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export class Db {
  constructor(readonly pool: pg.Pool) {}

  static connect(url: string) {
    return new Db(new pg.Pool({ connectionString: url, max: 10 }));
  }

  async migrate() {
    await this.pool.query(SCHEMA);
  }

  close() {
    return this.pool.end();
  }

  async createPlayer(name: string, shop: string): Promise<Player & { token: string }> {
    const token = randomBytes(32).toString("base64url");
    const { rows } = await this.pool.query(
      "INSERT INTO players (token_hash, name, shop) VALUES ($1, $2, $3) RETURNING id, name, shop",
      [hash(token), name, shop],
    );
    return { ...rows[0], token };
  }

  async playerByToken(token: string): Promise<Player | null> {
    const { rows } = await this.pool.query("SELECT id, name, shop FROM players WHERE token_hash = $1", [hash(token)]);
    return rows[0] ?? null;
  }

  async updatePlayer(id: string, name: string, shop: string) {
    await this.pool.query("UPDATE players SET name = $2, shop = $3 WHERE id = $1", [id, name, shop]);
  }

  async createRun(playerId: string): Promise<Run> {
    // Tohumu sunucu seçer: oyuncu kolay bir müşteri dizisi denk gelene kadar tohum deneyemez
    const seed = randomInt(1, 2 ** 31 - 1);
    const { rows } = await this.pool.query(
      `INSERT INTO runs (player_id, seed) VALUES ($1, $2)
       RETURNING id, player_id AS "playerId", seed, started_at AS "startedAt", finished_at AS "finishedAt"`,
      [playerId, seed],
    );
    return rows[0];
  }

  async getRun(id: string): Promise<Run | null> {
    const { rows } = await this.pool.query(
      `SELECT id, player_id AS "playerId", seed, started_at AS "startedAt", finished_at AS "finishedAt" FROM runs WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Oyunu bitmiş olarak işaretler. Aynı oyun iki kez gönderilirse ikincisi false döner. */
  async finishRun(id: string, score: number, day: number, finished: boolean, log: unknown): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE runs SET finished_at = now(), score = $2, day = $3, finished = $4, log = $5
       WHERE id = $1 AND finished_at IS NULL`,
      [id, score, day, finished, JSON.stringify(log)],
    );
    return r.rowCount === 1;
  }

  /** Her oyuncunun en iyi oyunu tek satır olarak sıralanır. */
  async leaderboard(period: Period, limit = 10, playerId?: string): Promise<{ rows: ScoreRow[]; me?: ScoreRow }> {
    const since = period === "week" ? "AND r.finished_at >= date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul'" : "";
    const sql = `
      WITH best AS (
        SELECT DISTINCT ON (r.player_id) r.player_id, r.score, r.day, r.finished, r.finished_at
        FROM runs r
        WHERE r.finished_at IS NOT NULL ${since}
        ORDER BY r.player_id, r.score DESC, r.finished_at ASC
      ), ranked AS (
        SELECT RANK() OVER (ORDER BY b.score DESC) AS rank, b.*, p.name, p.shop
        FROM best b JOIN players p ON p.id = b.player_id
      )
      SELECT rank::int, player_id AS "playerId", name, shop, score, day, finished
      FROM ranked
      WHERE rank <= $1 OR player_id = $2
      ORDER BY rank, finished_at`;
    const { rows } = await this.pool.query(sql, [limit, playerId ?? null]);
    return {
      rows: rows.filter((r) => r.rank <= limit).slice(0, limit),
      me: playerId ? rows.find((r) => r.playerId === playerId) : undefined,
    };
  }
}
