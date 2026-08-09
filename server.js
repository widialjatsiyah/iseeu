require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

console.log({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  passwordLoaded: process.env.DB_PASSWORD,
  passwordLength: process.env.DB_PASSWORD?.length,
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then((conn) => {
    console.log('MySQL connected');
    conn.release();
  })
  .catch((err) => {
    console.error('MySQL connection failed:', err);
  });

app.get('/api/db-check', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ ok: true, result: rows[0].result });
  } catch (error) {
    console.error('DB check error:', error.code, error.message);
    res.status(500).json({ ok: false, error: error.message || 'DB check failed', code: error.code || 'UNKNOWN_ERROR' });
  }
});

app.post('/api/recordings', async (req, res) => {
  try {
    const { name, speaker = '', audioData, duration } = req.body;
    if (!audioData || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const createdAt = new Date();
    const [result] = await pool.execute(
      'INSERT INTO recordings (name, speaker, audio_blob, duration, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, speaker, Buffer.from(audioData, 'base64'), duration || 0, createdAt]
    );

    res.json({ id: result.insertId, name, speaker, duration, createdAt });
  } catch (error) {
    console.error('Save recording error:', error.code, error.message);
    res.status(500).json({ error: error.message || 'Could not save recording', code: error.code || 'UNKNOWN_ERROR' });
  }
});

app.get('/api/recordings', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, speaker, duration, created_at FROM recordings ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Fetch recordings error:', error.code, error.message);
    res.status(500).json({ error: error.message || 'Could not fetch recordings', code: error.code || 'UNKNOWN_ERROR' });
  }
});

app.get('/api/recordings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT id, name, duration, created_at, audio_blob FROM recordings WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    const recording = rows[0];
    res.setHeader('Content-Type', 'audio/webm');
    res.send(recording.audio_blob);
  } catch (error) {
    console.error('Fetch recording error:', error.code, error.message);
    res.status(500).json({ error: error.message || 'Could not fetch recording', code: error.code || 'UNKNOWN_ERROR' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Pastikan tidak ada proses lain yang menggunakan port ini atau atur environment variable PORT ke nilai lain.`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});
