# iSeeYou Voice Recorder Web App

Aplikasi terpisah untuk merekam suara, menyimpan ke MySQL, dan memutar kembali rekaman.

## Struktur
- `public/index.html` — frontend statis untuk webview
- `public/styles.css` — styling UI
- `public/app.js` — logika perekaman, simpan, dan pemutaran
- `server.js` — backend Express API dengan koneksi MySQL
- `package.json` — dependensi Node
- `init.sql` — skrip SQL untuk membuat database dan tabel

## Setup
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Buat database MySQL `iseeyou` dan tabel:
   ```sql
   CREATE DATABASE IF NOT EXISTS iseeyou CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE iseeyou;
   CREATE TABLE IF NOT EXISTS recordings (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     audio_blob LONGBLOB NOT NULL,
     duration INT NOT NULL,
     created_at DATETIME NOT NULL
   );
   ```
3. Konfigurasi koneksi MySQL menggunakan variabel lingkungan:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`

4. Jalankan server:
   ```bash
   npm start
   ```

5. Buka browser ke `http://localhost:3000`

## Fitur
- Rekaman suara di browser dengan `MediaRecorder`
- Upload audio ke backend sebagai Base64
- Simpan audio ke MySQL dalam kolom `LONGBLOB`
- Daftar rekaman tersedia dan dapat diputar kembali

## Catatan
- Aplikasi ini dirancang untuk dokter pasien/keluarga menggunakan webview, bukan prototipe HTML statis.
- Pastikan browser mendukung `MediaRecorder` dan izin mikrofon diberikan.
