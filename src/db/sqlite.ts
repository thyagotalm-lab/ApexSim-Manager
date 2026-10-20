import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

// Using Node.js native SQLite DatabaseSync (available in Node 22.5+)
// Safely loaded with fallback for older Node versions without top-level await
let DatabaseSyncClass: any = null;
try {
  const sqliteMod = nodeRequire('node:sqlite');
  DatabaseSyncClass = sqliteMod.DatabaseSync;
} catch {
  DatabaseSyncClass = null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'apexsim.sqlite');

let databaseInstance: any = null;

/**
 * Safely recovers from a corrupted SQLite file by closing handles, removing corrupted files,
 * and rebuilding a pristine database from canonical JSON data.
 */
export function recoverCorruptedDatabase(): any {
  console.warn('[ApexSim DB] Malformed database disk image detected. Rebuilding clean SQLite database from canonical JSON data...');
  if (databaseInstance) {
    try {
      databaseInstance.close?.();
    } catch {
      // ignore
    }
    databaseInstance = null;
  }

  const filesToRemove = [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`];
  for (const f of filesToRemove) {
    try {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    } catch (e) {
      console.warn(`[ApexSim DB] Note: could not remove file ${f}:`, e);
    }
  }

  if (!DatabaseSyncClass) return null;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    databaseInstance = new DatabaseSyncClass(DB_PATH);
    databaseInstance.exec('PRAGMA foreign_keys = ON;');
    databaseInstance.exec('PRAGMA journal_mode = WAL;');
    databaseInstance.exec('PRAGMA synchronous = NORMAL;');
    databaseInstance.exec('PRAGMA busy_timeout = 5000;');
    initSchema(databaseInstance);
    return databaseInstance;
  } catch (recreateErr) {
    console.error('[ApexSim DB] Critical error rebuilding database:', recreateErr);
    return null;
  }
}

/**
 * Initializes and returns the SQLite Relational Database instance with automatic corruption detection.
 */
export function getRelationalDatabase(): any {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (!DatabaseSyncClass) {
    console.warn('[ApexSim DB] Notice: Native node:sqlite not supported in current Node version. Relational tables running in safe fallback.');
    return null;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    databaseInstance = new DatabaseSyncClass(DB_PATH);

    // Enable foreign keys, WAL mode, normal sync and busy timeout
    databaseInstance.exec('PRAGMA foreign_keys = ON;');
    databaseInstance.exec('PRAGMA journal_mode = WAL;');
    databaseInstance.exec('PRAGMA synchronous = NORMAL;');
    databaseInstance.exec('PRAGMA busy_timeout = 5000;');

    // Verify database integrity on open
    try {
      const integrity = databaseInstance.prepare('PRAGMA integrity_check(1);').get() as any;
      if (integrity && integrity.integrity_check && integrity.integrity_check !== 'ok') {
        console.warn('[ApexSim DB] Database integrity check failed:', integrity.integrity_check);
        return recoverCorruptedDatabase();
      }
    } catch (integrityErr: any) {
      const errStr = String(integrityErr?.message || integrityErr).toLowerCase();
      if (errStr.includes('malformed') || errStr.includes('corrupt')) {
        return recoverCorruptedDatabase();
      }
    }

    initSchema(databaseInstance);
    return databaseInstance;
  } catch (err: any) {
    const errStr = String(err?.message || err).toLowerCase();
    if (errStr.includes('malformed') || errStr.includes('corrupt')) {
      return recoverCorruptedDatabase();
    }
    console.warn('[ApexSim DB] Warning initializing SQLite instance:', err);
    return null;
  }
}

/**
 * Creates the normalized relational schema.
 */
function initSchema(db: any) {
  db.exec(`
    -- 1. Users / Drivers Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar TEXT,
      role TEXT DEFAULT 'pilot',
      country TEXT,
      racing_number INTEGER,
      gaming_platform TEXT,
      gaming_id TEXT,
      discord_tag TEXT,
      team_name TEXT,
      team_tag TEXT,
      sim_rating INTEGER DEFAULT 3000,
      safety_rating REAL DEFAULT 80.0,
      races INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      podiums INTEGER DEFAULT 0,
      poles INTEGER DEFAULT 0,
      qualifications INTEGER DEFAULT 0,
      total_points REAL DEFAULT 0,
      best_finish INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Championships Table
    CREATE TABLE IF NOT EXISTS championships (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      simulator TEXT NOT NULL,
      category TEXT NOT NULL,
      season TEXT NOT NULL,
      status TEXT DEFAULT 'Inscrições Abertas',
      banner_url TEXT,
      rules_doc TEXT,
      rules_pdf_url TEXT,
      rules_pdf_name TEXT,
      rules_pdf_size TEXT,
      max_grid INTEGER DEFAULT 20,
      default_race_day TEXT,
      default_race_time TEXT,
      scoring_rule_json TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Championship Admins (N:N relationship)
    CREATE TABLE IF NOT EXISTS championship_admins (
      championship_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (championship_id, user_id),
      FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
    );

    -- 4. Official Teams per Championship
    CREATE TABLE IF NOT EXISTS official_teams (
      id TEXT PRIMARY KEY,
      championship_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      color TEXT,
      simulator TEXT,
      FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
    );

    -- 5. Stages / Calendar Rounds
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      championship_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      track_name TEXT NOT NULL,
      country TEXT,
      date TEXT,
      time TEXT,
      weather TEXT,
      laps INTEGER DEFAULT 0,
      is_sprint INTEGER DEFAULT 0,
      status TEXT DEFAULT 'AGENDADA',
      pole_driver_id TEXT,
      pole_driver_name TEXT,
      fastest_lap_driver_id TEXT,
      fastest_lap_driver_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
    );

    -- 6. Registrations Table
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      championship_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      team_name TEXT,
      team_tag TEXT,
      car_number INTEGER,
      car_model TEXT,
      simulator TEXT,
      status TEXT DEFAULT 'PENDENTE',
      registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
    );

    -- 7. Race Results (Main & Sprint)
    CREATE TABLE IF NOT EXISTS race_results (
      id TEXT PRIMARY KEY,
      stage_id TEXT NOT NULL,
      race_type TEXT DEFAULT 'main',
      driver_id TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      team_name TEXT,
      car_number INTEGER,
      grid_position INTEGER,
      finish_position INTEGER,
      points REAL DEFAULT 0,
      status TEXT DEFAULT 'FINISHED',
      gap TEXT,
      penalty_seconds REAL DEFAULT 0,
      penalty_points INTEGER DEFAULT 0,
      dotd_votes INTEGER DEFAULT 0,
      best_lap_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
    );

    -- 8. Steward Protests & Penalties
    CREATE TABLE IF NOT EXISTS steward_protests (
      id TEXT PRIMARY KEY,
      championship_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      incident_lap INTEGER,
      reporter_user_id TEXT,
      reporter_name TEXT,
      reported_driver_id TEXT,
      reported_driver_name TEXT,
      video_url TEXT,
      description TEXT,
      status TEXT DEFAULT 'ABERTO',
      verdict_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
    );

    -- 9. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      link_tab TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_stages_champ ON stages(championship_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_champ ON registrations(championship_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_race_results_stage ON race_results(stage_id);
    CREATE INDEX IF NOT EXISTS idx_race_results_driver ON race_results(driver_id);
    CREATE INDEX IF NOT EXISTS idx_protests_stage ON steward_protests(stage_id);
  `);
}

/**
 * Runs an ETL migration populating the SQLite Relational Database from JSON source files.
 */
export function runRelationalETLMigration(): {
  usersCount: number;
  championshipsCount: number;
  stagesCount: number;
  resultsCount: number;
  registrationsCount: number;
} {
  const db = getRelationalDatabase();
  if (!db) {
    return {
      usersCount: 0,
      championshipsCount: 0,
      stagesCount: 0,
      resultsCount: 0,
      registrationsCount: 0,
    };
  }

  const usersFile = path.join(DATA_DIR, 'users.json');
  const champsFile = path.join(DATA_DIR, 'championships.json');
  const notifsFile = path.join(DATA_DIR, 'notifications.json');

  let rawUsers: any[] = [];
  let rawChamps: any[] = [];
  let rawNotifs: any[] = [];

  try {
    if (fs.existsSync(usersFile)) {
      rawUsers = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    }
    if (fs.existsSync(champsFile)) {
      rawChamps = JSON.parse(fs.readFileSync(champsFile, 'utf-8'));
    }
    if (fs.existsSync(notifsFile)) {
      rawNotifs = JSON.parse(fs.readFileSync(notifsFile, 'utf-8'));
    }
  } catch (err) {
    console.error('[Relational DB] Error reading source JSON files for ETL:', err);
  }

  let usersCount = 0;
  let championshipsCount = 0;
  let stagesCount = 0;
  let resultsCount = 0;
  let registrationsCount = 0;

  // Execute within transaction for ACID integrity
  db.exec('BEGIN TRANSACTION;');

  try {
    // 1. Migrate Users
    const upsertUser = db.prepare(`
      INSERT INTO users (
        id, name, email, avatar, role, country, racing_number,
        gaming_platform, gaming_id, discord_tag, team_name, team_tag,
        sim_rating, safety_rating, races, wins, podiums, poles,
        qualifications, total_points, best_finish, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        avatar = excluded.avatar,
        role = excluded.role,
        country = excluded.country,
        gaming_platform = excluded.gaming_platform,
        gaming_id = excluded.gaming_id,
        discord_tag = excluded.discord_tag,
        team_name = excluded.team_name,
        team_tag = excluded.team_tag,
        sim_rating = excluded.sim_rating,
        safety_rating = excluded.safety_rating,
        races = excluded.races,
        wins = excluded.wins,
        podiums = excluded.podiums,
        poles = excluded.poles,
        qualifications = excluded.qualifications,
        total_points = excluded.total_points,
        best_finish = excluded.best_finish,
        updated_at = CURRENT_TIMESTAMP;
    `);

    for (const u of rawUsers) {
      if (!u || !u.id || !u.name) continue;
      const stats = u.stats || {};
      upsertUser.run(
        String(u.id),
        String(u.name),
        String(u.email || ''),
        String(u.avatar || ''),
        String(u.role || 'pilot'),
        String(u.country || 'Brasil 🇧🇷'),
        Number(u.racingNumber || 0),
        String(u.gamingPlatform || ''),
        String(u.gamingId || u.steamId || ''),
        String(u.discordTag || ''),
        String(u.teamName || ''),
        String(u.teamTag || ''),
        Number(stats.simRating || 3000),
        Number(stats.safetyRating || 80.0),
        Number(stats.races || 0),
        Number(stats.wins || 0),
        Number(stats.podiums || 0),
        Number(stats.poles || 0),
        Number(stats.qualifications || 0),
        Number(stats.totalPoints || 0),
        Number(stats.bestFinish || 0)
      );
      usersCount++;
    }

    // Purge removed users from SQLite
    const validUserIds = rawUsers.map((u) => String(u.id));
    if (validUserIds.length > 0) {
      const placeholders = validUserIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).run(...validUserIds);
    }

    // Clear registrations to ensure fresh state from sanitized championships
    db.prepare('DELETE FROM registrations').run();

    // 2. Migrate Championships & Nested Relational Elements
    const upsertChamp = db.prepare(`
      INSERT INTO championships (
        id, name, slug, simulator, category, season, status,
        banner_url, rules_doc, rules_pdf_url, rules_pdf_name, rules_pdf_size,
        max_grid, default_race_day, default_race_time, scoring_rule_json, is_deleted, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        simulator = excluded.simulator,
        category = excluded.category,
        season = excluded.season,
        status = excluded.status,
        banner_url = excluded.banner_url,
        rules_doc = excluded.rules_doc,
        rules_pdf_url = excluded.rules_pdf_url,
        max_grid = excluded.max_grid,
        scoring_rule_json = excluded.scoring_rule_json,
        is_deleted = excluded.is_deleted,
        updated_at = CURRENT_TIMESTAMP;
    `);

    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO championship_admins (championship_id, user_id) VALUES (?, ?);
    `);

    const insertTeam = db.prepare(`
      INSERT OR REPLACE INTO official_teams (id, championship_id, name, code, color, simulator)
      VALUES (?, ?, ?, ?, ?, ?);
    `);

    const insertStage = db.prepare(`
      INSERT OR REPLACE INTO stages (
        id, championship_id, round_number, track_name, country, date, time, weather,
        laps, is_sprint, status, pole_driver_id, pole_driver_name, fastest_lap_driver_id, fastest_lap_driver_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    const insertResult = db.prepare(`
      INSERT OR REPLACE INTO race_results (
        id, stage_id, race_type, driver_id, driver_name, team_name, car_number,
        grid_position, finish_position, points, status, gap, penalty_seconds,
        penalty_points, dotd_votes, best_lap_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    const insertReg = db.prepare(`
      INSERT OR REPLACE INTO registrations (
        id, championship_id, user_id, driver_name, team_name, team_tag,
        car_number, car_model, simulator, status, registered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const c of rawChamps) {
      if (!c || !c.id || !c.name) continue;

      upsertChamp.run(
        String(c.id),
        String(c.name),
        String(c.slug || ''),
        String(c.simulator || 'F1 24'),
        String(c.category || 'PRO'),
        String(c.season || '2026'),
        String(c.status || 'Inscrições Abertas'),
        String(c.bannerUrl || ''),
        String(c.rulesDoc || ''),
        String(c.rulesPdfUrl || ''),
        String(c.rulesPdfName || ''),
        String(c.rulesPdfSize || ''),
        Number(c.maxGrid || 20),
        String(c.defaultRaceDay || ''),
        String(c.defaultRaceTime || ''),
        JSON.stringify(c.scoringRule || {}),
        c.isDeleted ? 1 : 0
      );
      championshipsCount++;

      // Admins
      if (Array.isArray(c.admins)) {
        for (const adminId of c.admins) {
          if (adminId) insertAdmin.run(String(c.id), String(adminId));
        }
      }

      // Official Teams
      if (Array.isArray(c.officialTeams)) {
        for (const team of c.officialTeams) {
          if (team && team.id) {
            insertTeam.run(
              String(team.id),
              String(c.id),
              String(team.name || ''),
              String(team.code || ''),
              String(team.color || '#ef4444'),
              String(team.simulator || c.simulator || '')
            );
          }
        }
      }

      // Stages & Results
      if (Array.isArray(c.stages)) {
        for (const st of c.stages) {
          if (!st || !st.id) continue;
          insertStage.run(
            String(st.id),
            String(c.id),
            Number(st.roundNumber || 1),
            String(st.trackName || 'Circuito'),
            String(st.country || ''),
            String(st.date || ''),
            String(st.time || ''),
            String(st.weather || 'Limpo'),
            Number(st.laps || 0),
            st.isSprintWeekend ? 1 : 0,
            String(st.status || 'AGENDADA'),
            st.polePosition?.driverId || '',
            st.polePosition?.driverName || '',
            st.fastestLap?.driverId || '',
            st.fastestLap?.driverName || ''
          );
          stagesCount++;

          // Main Race & Sprint Results
          const allStageResults = Array.isArray(st.results) ? st.results : [];
          for (const res of allStageResults) {
            if (!res || !res.driverId) continue;
            const resId = `${st.id}_${res.raceType || 'main'}_${res.driverId}`;
            insertResult.run(
              resId,
              String(st.id),
              String(res.raceType || 'main'),
              String(res.driverId),
              String(res.driverName || 'Piloto'),
              String(res.teamName || ''),
              Number(res.number || 0),
              res.gridPosition !== undefined ? Number(res.gridPosition) : null,
              res.finishPosition !== undefined ? Number(res.finishPosition) : null,
              Number(res.points || 0),
              String(res.status || 'FINISHED'),
              String(res.gap || ''),
              Number(res.penaltySeconds || 0),
              Number(res.penaltyPoints || 0),
              Number(res.dotdVotes || 0),
              String(res.bestLapTime || '')
            );
            resultsCount++;
          }
        }
      }

      // Registrations
      if (Array.isArray(c.registrations)) {
        for (const reg of c.registrations) {
          if (!reg || !reg.id) continue;
          insertReg.run(
            String(reg.id),
            String(c.id),
            String(reg.userId || ''),
            String(reg.driverName || 'Piloto'),
            String(reg.teamName || ''),
            String(reg.teamTag || ''),
            Number(reg.carNumber || 0),
            String(reg.carModel || ''),
            String(reg.simulator || c.simulator || ''),
            String(reg.status || 'PENDENTE'),
            String(reg.registeredAt || new Date().toISOString())
          );
          registrationsCount++;
        }
      }
    }

    // 3. Migrate Notifications
    const insertNotif = db.prepare(`
      INSERT OR REPLACE INTO notifications (
        id, user_id, title, message, type, read, link_tab, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
    for (const n of rawNotifs) {
      if (!n || !n.id) continue;
      insertNotif.run(
        String(n.id),
        n.userId ? String(n.userId) : null,
        String(n.title || ''),
        String(n.message || ''),
        String(n.type || 'SYSTEM'),
        n.read ? 1 : 0,
        String(n.linkTab || ''),
        String(n.createdAt || new Date().toISOString())
      );
    }

    // Clean out deleted users from SQLite
    const deletedFile = path.join(DATA_DIR, 'deleted_users.json');
    if (fs.existsSync(deletedFile)) {
      try {
        const deletedIds = JSON.parse(fs.readFileSync(deletedFile, 'utf-8'));
        if (Array.isArray(deletedIds)) {
          const delUserStmt = db.prepare(`DELETE FROM users WHERE LOWER(id) = ? OR LOWER(email) = ? OR LOWER(name) = ?`);
          const delRegStmt = db.prepare(`DELETE FROM registrations WHERE LOWER(user_id) = ? OR LOWER(driver_name) = ?`);
          const delResStmt = db.prepare(`DELETE FROM race_results WHERE LOWER(driver_id) = ? OR LOWER(driver_name) = ?`);
          for (const d of deletedIds) {
            const clean = String(d).toLowerCase().trim();
            delUserStmt.run(clean, clean, clean);
            delRegStmt.run(clean, clean);
            delResStmt.run(clean, clean);
          }
        }
      } catch (e) {
        console.warn('Error purging deleted users in SQLite ETL:', e);
      }
    }

    db.exec('COMMIT;');
    console.log(
      `[Relational DB] ETL Migration successful: ${usersCount} users, ${championshipsCount} championships, ${stagesCount} stages, ${resultsCount} race results, ${registrationsCount} registrations.`
    );
  } catch (txErr: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore rollback failure on malformed db
    }
    console.error('[Relational DB] ETL Migration transaction rolled back due to error:', txErr);

    const errStr = String(txErr?.message || txErr).toLowerCase();
    if (errStr.includes('malformed') || errStr.includes('corrupt')) {
      console.warn('[Relational DB] Corrupted disk image detected in ETL. Triggering auto-recovery...');
      recoverCorruptedDatabase();
    }
  }

  return {
    usersCount,
    championshipsCount,
    stagesCount,
    resultsCount,
    registrationsCount,
  };
}

/**
 * Returns summary statistics and health status of the relational database.
 */
export function getRelationalDatabaseStats() {
  const db = getRelationalDatabase();
  if (!db) {
    return {
      engine: 'SQLite 3 (Offline / JSON Data Store Active)',
      dbPath: DB_PATH,
      status: 'STANDBY',
      tables: {
        users: 0,
        championships: 0,
        stages: 0,
        race_results: 0,
        registrations: 0,
        championship_admins: 0,
        official_teams: 0,
        steward_protests: 0,
        notifications: 0,
      },
      lastChecked: new Date().toISOString(),
    };
  }

  const getCount = (table: string): number => {
    try {
      const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
      return row?.cnt || 0;
    } catch {
      return 0;
    }
  };

  return {
    engine: 'SQLite 3 (ACID Relational Engine with Foreign Keys & WAL)',
    dbPath: DB_PATH,
    status: 'ONLINE',
    tables: {
      users: getCount('users'),
      championships: getCount('championships'),
      stages: getCount('stages'),
      race_results: getCount('race_results'),
      registrations: getCount('registrations'),
      championship_admins: getCount('championship_admins'),
      official_teams: getCount('official_teams'),
      steward_protests: getCount('steward_protests'),
      notifications: getCount('notifications'),
    },
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Computes official driver standings directly via an optimized SQL aggregation query.
 */
export function queryDriverStandingsSQL(championshipId: string) {
  const db = getRelationalDatabase();
  if (!db) return [];

  const query = db.prepare(`
    SELECT
      r.driver_id as driverId,
      r.driver_name as driverName,
      r.team_name as teamName,
      r.car_number as number,
      COALESCE(SUM(r.points), 0) as totalPoints,
      COUNT(CASE WHEN r.status != 'DNS' THEN 1 END) as racesCount,
      COUNT(CASE WHEN r.finish_position = 1 THEN 1 END) as wins,
      COUNT(CASE WHEN r.finish_position BETWEEN 1 AND 3 THEN 1 END) as podiums,
      COUNT(CASE WHEN r.grid_position = 1 THEN 1 END) as poles,
      COALESCE(MIN(r.finish_position), 99) as bestFinish
    FROM stages s
    JOIN race_results r ON s.id = r.stage_id
    WHERE s.championship_id = ?
      AND LOWER(r.driver_name) NOT IN ('huryel felipe', 'piloto de testes', 'tyko moura')
      AND LOWER(r.driver_name) NOT LIKE '%huryel%'
      AND LOWER(r.driver_id) NOT IN ('user_1791773958462_898s', 'user_1791048231452_xa2l', 'user_1791049287095_z3as', 'user_1791244365686_k1vw')
    GROUP BY r.driver_id, r.driver_name, r.team_name, r.car_number
    ORDER BY totalPoints DESC, wins DESC, podiums DESC, bestFinish ASC;
  `);

  return query.all(championshipId);
}

/**
 * Computes official constructor standings directly via SQL aggregation.
 */
export function queryConstructorStandingsSQL(championshipId: string) {
  const db = getRelationalDatabase();
  if (!db) return [];

  const query = db.prepare(`
    SELECT
      r.team_name as teamName,
      COALESCE(SUM(r.points), 0) as totalPoints,
      COUNT(CASE WHEN r.finish_position = 1 THEN 1 END) as wins,
      COUNT(CASE WHEN r.finish_position BETWEEN 1 AND 3 THEN 1 END) as podiums
    FROM stages s
    JOIN race_results r ON s.id = r.stage_id
    WHERE s.championship_id = ?
      AND r.team_name IS NOT NULL
      AND r.team_name != ''
      AND LOWER(r.driver_name) NOT IN ('huryel felipe', 'piloto de testes', 'tyko moura')
      AND LOWER(r.driver_name) NOT LIKE '%huryel%'
      AND LOWER(r.driver_id) NOT IN ('user_1791773958462_898s', 'user_1791048231452_xa2l', 'user_1791049287095_z3as', 'user_1791244365686_k1vw')
    GROUP BY r.team_name
    ORDER BY totalPoints DESC, wins DESC, podiums DESC;
  `);

  return query.all(championshipId);
}
