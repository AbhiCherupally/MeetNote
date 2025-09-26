const { Pool } = require('pg');

let pool;

const connectDB = async () => {
  try {
    // Use DATABASE_URL from Render Postgres
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    console.log('📦 PostgreSQL Connected to Render');
    
    // Create tables if they don't exist
    await createTables(client);
    client.release();

    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createTables = async (client) => {
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Meetings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        meeting_url TEXT,
        status VARCHAR(20) DEFAULT 'scheduled',
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transcripts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id),
        content TEXT NOT NULL,
        speaker VARCHAR(100),
        timestamp_offset INTEGER DEFAULT 0,
        confidence FLOAT DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Highlights table
    await client.query(`
      CREATE TABLE IF NOT EXISTS highlights (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id),
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'manual',
        timestamp_offset INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Meeting summaries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_summaries (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id),
        summary TEXT,
        action_items JSONB DEFAULT '[]',
        key_points JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

const getDB = () => {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
};

module.exports = { connectDB, getDB };