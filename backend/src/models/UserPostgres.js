const { getDB } = require('../database/postgres');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ email, name, password }) {
    const pool = getDB();
    const client = await pool.connect();
    
    try {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      const query = `
        INSERT INTO users (email, name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await client.query(query, [email, name, password_hash]);
      return new User(result.rows[0]);
    } finally {
      client.release();
    }
  }

  static async findByEmail(email) {
    const pool = getDB();
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const pool = getDB();
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;