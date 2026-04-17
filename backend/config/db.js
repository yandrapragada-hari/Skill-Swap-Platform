const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve(__dirname, 'skill-swap.db');
let db;

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringifyJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    password: row.password,
    avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=6d28d9&color=fff`,
    location: row.location || '',
    availability: row.availability || '',
    bio: row.bio || '',
    teachSkills: parseJson(row.teachSkills, []),
    learnSkills: parseJson(row.learnSkills, []),
    completedSwaps: row.completedSwaps || 0,
    rating: row.rating || 0,
    totalRatings: row.totalRatings || 0,
    socialLinks: parseJson(row.socialLinks, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapConnection(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    requester: String(row.requester),
    recipient: String(row.recipient),
    status: row.status,
    message: row.message || '',
    sharedSkills: parseJson(row.sharedSkills, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMessage(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    conversationId: row.conversationId,
    participants: parseJson(row.participants, []).map(String),
    sender: String(row.sender),
    receiver: String(row.receiver),
    content: row.content,
    read: Boolean(row.read),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function openDatabase() {
  if (db) return db;

  db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT,
      location TEXT DEFAULT '',
      availability TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      teachSkills TEXT DEFAULT '[]',
      learnSkills TEXT DEFAULT '[]',
      completedSwaps INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      totalRatings INTEGER DEFAULT 0,
      socialLinks TEXT DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester INTEGER NOT NULL,
      recipient INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT DEFAULT '',
      sharedSkills TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (requester) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId TEXT NOT NULL,
      participants TEXT NOT NULL,
      sender INTEGER NOT NULL,
      receiver INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (sender) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(requester, recipient);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId, createdAt);
  `);

  const existingUserColumns = new Set(
    db.prepare('PRAGMA table_info(users)').all().map((column) => column.name)
  );
  const userMigrations = [
    ["bio", "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''"],
    ["teachSkills", "ALTER TABLE users ADD COLUMN teachSkills TEXT DEFAULT '[]'"],
    ["learnSkills", "ALTER TABLE users ADD COLUMN learnSkills TEXT DEFAULT '[]'"],
    ["completedSwaps", "ALTER TABLE users ADD COLUMN completedSwaps INTEGER DEFAULT 0"],
    ["socialLinks", "ALTER TABLE users ADD COLUMN socialLinks TEXT DEFAULT '{}'"],
    ["updatedAt", "ALTER TABLE users ADD COLUMN updatedAt TEXT"],
  ];

  userMigrations.forEach(([columnName, statement]) => {
    if (!existingUserColumns.has(columnName)) {
      db.exec(statement);
    }
  });

  db.exec(`
    UPDATE users
    SET
      bio = COALESCE(bio, ''),
      teachSkills = COALESCE(teachSkills, '[]'),
      learnSkills = COALESCE(learnSkills, '[]'),
      completedSwaps = COALESCE(completedSwaps, 0),
      socialLinks = COALESCE(socialLinks, '{}'),
      updatedAt = COALESCE(updatedAt, createdAt, CURRENT_TIMESTAMP)
  `);

  return db;
}

function getDb() {
  return openDatabase();
}

function listUsersExcept(userId) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE id != ? ORDER BY updatedAt DESC');
  return stmt.all(Number(userId)).map(mapUser);
}

function findUserById(userId) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
  return mapUser(stmt.get(Number(userId)));
}

function findUserByEmail(email) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
  return mapUser(stmt.get(String(email).trim().toLowerCase()));
}

function createUser(input) {
  const createdAt = nowIso();
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    avatar: input.avatar || null,
    location: input.location || '',
    availability: input.availability || '',
    bio: input.bio || '',
    teachSkills: stringifyJson(input.teachSkills, []),
    learnSkills: stringifyJson(input.learnSkills, []),
    completedSwaps: input.completedSwaps || 0,
    rating: input.rating || 0,
    totalRatings: input.totalRatings || 0,
    socialLinks: stringifyJson(input.socialLinks, {}),
    createdAt,
    updatedAt: createdAt,
  };

  const stmt = getDb().prepare(`
    INSERT INTO users (
      name, email, password, avatar, location, availability, bio,
      teachSkills, learnSkills, completedSwaps, rating, totalRatings,
      socialLinks, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    payload.name,
    payload.email,
    payload.password,
    payload.avatar,
    payload.location,
    payload.availability,
    payload.bio,
    payload.teachSkills,
    payload.learnSkills,
    payload.completedSwaps,
    payload.rating,
    payload.totalRatings,
    payload.socialLinks,
    payload.createdAt,
    payload.updatedAt
  );
  return findUserById(result.lastInsertRowid);
}

function updateUser(userId, updates) {
  const existing = findUserById(userId);
  if (!existing) return null;

  const next = {
    ...existing,
    ...updates,
    teachSkills: updates.teachSkills ?? existing.teachSkills,
    learnSkills: updates.learnSkills ?? existing.learnSkills,
    socialLinks: updates.socialLinks ?? existing.socialLinks,
    updatedAt: nowIso(),
  };

  const stmt = getDb().prepare(`
    UPDATE users
    SET name = ?, avatar = ?, location = ?, availability = ?, bio = ?,
        teachSkills = ?, learnSkills = ?, completedSwaps = ?, rating = ?,
        totalRatings = ?, socialLinks = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(
    next.name,
    next.avatar,
    next.location,
    next.availability,
    next.bio,
    stringifyJson(next.teachSkills, []),
    stringifyJson(next.learnSkills, []),
    next.completedSwaps,
    next.rating,
    next.totalRatings,
    stringifyJson(next.socialLinks, {}),
    next.updatedAt,
    Number(userId)
  );
  return findUserById(userId);
}

function findConnectionById(connectionId) {
  const stmt = getDb().prepare('SELECT * FROM connections WHERE id = ?');
  return mapConnection(stmt.get(Number(connectionId)));
}

function findConnectionBetween(a, b) {
  const stmt = getDb().prepare(`
    SELECT * FROM connections
    WHERE (requester = ? AND recipient = ?) OR (requester = ? AND recipient = ?)
    LIMIT 1
  `);
  return mapConnection(stmt.get(Number(a), Number(b), Number(b), Number(a)));
}

function createConnection(input) {
  const createdAt = nowIso();
  const stmt = getDb().prepare(`
    INSERT INTO connections (requester, recipient, status, message, sharedSkills, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    Number(input.requester),
    Number(input.recipient),
    input.status || 'pending',
    input.message || '',
    stringifyJson(input.sharedSkills, []),
    createdAt,
    createdAt
  );
  return findConnectionById(result.lastInsertRowid);
}

function updateConnection(connectionId, updates) {
  const existing = findConnectionById(connectionId);
  if (!existing) return null;

  const next = {
    ...existing,
    ...updates,
    updatedAt: nowIso(),
  };

  const stmt = getDb().prepare(`
    UPDATE connections
    SET status = ?, message = ?, sharedSkills = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(
    next.status,
    next.message || '',
    stringifyJson(next.sharedSkills, []),
    next.updatedAt,
    Number(connectionId)
  );
  return findConnectionById(connectionId);
}

function deleteConnection(connectionId) {
  getDb().prepare('DELETE FROM connections WHERE id = ?').run(Number(connectionId));
}

function listAcceptedConnectionsForUser(userId) {
  const stmt = getDb().prepare(`
    SELECT * FROM connections
    WHERE status = 'accepted' AND (requester = ? OR recipient = ?)
    ORDER BY updatedAt DESC
  `);
  return stmt.all(Number(userId), Number(userId)).map(mapConnection);
}

function listPendingConnectionsForUser(userId, kind) {
  const column = kind === 'incoming' ? 'recipient' : 'requester';
  const stmt = getDb().prepare(`
    SELECT * FROM connections
    WHERE ${column} = ? AND status = 'pending'
    ORDER BY createdAt DESC
  `);
  return stmt.all(Number(userId)).map(mapConnection);
}

function createMessage(input) {
  const createdAt = nowIso();
  const stmt = getDb().prepare(`
    INSERT INTO messages (conversationId, participants, sender, receiver, content, read, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.conversationId,
    stringifyJson(input.participants, []),
    Number(input.sender),
    Number(input.receiver),
    input.content,
    input.read ? 1 : 0,
    createdAt,
    createdAt
  );
  return findMessageById(result.lastInsertRowid);
}

function findMessageById(messageId) {
  const stmt = getDb().prepare('SELECT * FROM messages WHERE id = ?');
  return mapMessage(stmt.get(Number(messageId)));
}

function listMessagesByConversation(conversationId) {
  const stmt = getDb().prepare(`
    SELECT * FROM messages
    WHERE conversationId = ?
    ORDER BY createdAt ASC
  `);
  return stmt.all(conversationId).map(mapMessage);
}

function listMessagesForUser(userId) {
  const stmt = getDb().prepare(`
    SELECT * FROM messages
    WHERE sender = ? OR receiver = ?
    ORDER BY createdAt DESC
  `);
  return stmt.all(Number(userId), Number(userId)).map(mapMessage);
}

module.exports = {
  openDatabase,
  getDb,
  mapUser,
  findUserById,
  findUserByEmail,
  listUsersExcept,
  createUser,
  updateUser,
  findConnectionById,
  findConnectionBetween,
  createConnection,
  updateConnection,
  deleteConnection,
  listAcceptedConnectionsForUser,
  listPendingConnectionsForUser,
  createMessage,
  listMessagesByConversation,
  listMessagesForUser,
};
