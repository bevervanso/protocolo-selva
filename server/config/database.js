import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '..', 'data');
const dbPath = join(dataDir, 'protocolo-selva.db');

// Criar diretório de dados se não existir
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Inicializar SQL.js
const SQL = await initSqlJs();

// Carregar banco existente ou criar novo
let db;
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
  console.log('✅ Database loaded from file');
} else {
  db = new SQL.Database();
  console.log('✅ New database created');
}

// Função para salvar o banco no disco
export function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Salvar automaticamente a cada 30 segundos
setInterval(saveDatabase, 30000);

// Salvar ao encerrar o processo
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit();
});

// Criar tabelas
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    weight REAL,
    height REAL,
    goal TEXT DEFAULT 'lose',
    goal_weight REAL,
    quiz_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Garantir que a coluna quiz_completed existirá em versões anteriores do DB
try {
  db.run("ALTER TABLE profiles ADD COLUMN quiz_completed INTEGER DEFAULT 0");
} catch (e) {
  // Ignora erro se a coluna já existir
}

db.run(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    time TEXT,
    calories TEXT,
    protein TEXT,
    ingredients TEXT,
    steps TEXT,
    tip TEXT,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Salvar após criar tabelas
saveDatabase();

console.log('✅ Database initialized successfully');

// Wrapper para compatibilidade com a API do better-sqlite3
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        try {
          db.run(sql, params);
          const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
          const changes = db.getRowsModified();
          saveDatabase();
          return { lastInsertRowid: lastId, changes };
        } catch (e) {
          console.error('SQL Error:', e.message);
          throw e;
        }
      },
      get: (...params) => {
        try {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            return cols.reduce((obj, col, i) => {
              obj[col] = vals[i];
              return obj;
            }, {});
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('SQL Error:', e.message);
          return undefined;
        }
      },
      all: (...params) => {
        try {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            results.push(cols.reduce((obj, col, i) => {
              obj[col] = vals[i];
              return obj;
            }, {}));
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('SQL Error:', e.message);
          return [];
        }
      }
    };
  },
  exec: (sql) => {
    db.run(sql);
    saveDatabase();
  },
  pragma: () => { } // Não necessário para sql.js
};

export default dbWrapper;
