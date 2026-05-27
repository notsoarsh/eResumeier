/**
 * Authentication & Authorization Service
 * Report Section 3.1 (II): Manages user identity, credential validation,
 * JWT issuance, and role-based access enforcement for all protected API endpoints.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

class AuthService {
  async register({ email, password, role, firstName, lastName, employerDetails }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, employer_details)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, role, first_name, last_name, created_at`,
      [email, passwordHash, role, firstName, lastName, employerDetails || null]
    );

    return result.rows[0];
  }

  async login({ email, password }) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    };
  }

  async getUserById(userId) {
    const result = await pool.query(
      'SELECT user_id, email, role, first_name, last_name, is_active, created_at FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new AuthService();
