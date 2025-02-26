const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (result.length > 0) {
        res.json({ success: true, user: result[0] });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    }
  );
});

// Signup (Manual user creation)
router.post('/signup', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Check if username already exists (since username is UNIQUE in schema)
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Insert new user (non-admin by default)
    db.query(
      'INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)',
      [username, password],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Failed to add user' });
        }
        res.json({ success: true, userId: result.insertId });
      }
    );
  });
});

module.exports = router;