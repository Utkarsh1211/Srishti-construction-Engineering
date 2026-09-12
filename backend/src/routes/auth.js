const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const result = await pool.query('select * from users where username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // long-lived — this is a 2-person internal tool, not re-logging in daily
    );

    res.json({
      success: true,
      token,
      user: { user_id: user.user_id, username: user.username, name: user.name }
    });
  })
);
// commenting out for now, since we don't need user registration in this internal tool. If we ever do, we can uncomment and use it.
// router.post(
//   '/register',
//   asyncHandler(async (req, res) => {
//     const { username, password, name } = req.body;
//     if (!username || !password || !name) {
//       return res.status(400).json({ success: false, error: 'Username, password, and name are required' });
//     }

//     const existingUser = await pool.query('select * from users where username = $1', [username]);
//     if (existingUser.rows.length > 0) {
//       return res.status(409).json({ success: false, error: 'Username already exists' });
//     }

//     const password_hash = await bcrypt.hash(password, 10);
//     const result = await pool.query(
//       'insert into users (username, password_hash, name) values ($1, $2, $3) returning *',
//       [username, password_hash, name]
//     );
//     const user = result.rows[0];

//     const token = jwt.sign(
//       { user_id: user.user_id, username: user.username, name: user.name },
//       process.env.JWT_SECRET,
//       { expiresIn: '30d' }
//     );

//     res.status(201).json({
//       success: true,
//       token,
//       user: { user_id: user.user_id, username: user.username, name: user.name }
//     });
//   })
// );

module.exports = router;
