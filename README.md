# BENTUR — Starter Project

Starter MVP BENTUR: katalog masalah, pencarian/filter, formulir masalah, Collision Lab, dan penyimpanan menggunakan FastAPI + SQLAlchemy + Neon PostgreSQL. Frontend HTML/CSS/JavaScript dibuat tanpa build step dan disajikan oleh FastAPI/Vercel.

## 1. Yang dibutuhkan

- Python 3.12 atau lebih baru
- VS Code
- Akun Neon (PostgreSQL)
- Akun Vercel

## 2. Siapkan database Neon

1. Buka https://console.neon.tech dan buat project PostgreSQL.
2. Dari menu **Connect**, salin connection string. Pilih pooled connection string bila tersedia; string biasanya mencakup `sslmode=require` dan host berisi `-pooler`.
3. Jangan letakkan connection string di file frontend atau commit ke GitHub.

## 3. Jalankan secara lokal di Windows PowerShell

Buka folder `bentur-starter` di VS Code. Di terminal VS Code jalankan:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Buka file `.env`, lalu ganti nilai `DATABASE_URL` dengan connection string milik Neon. Simpan file. Jika PowerShell menolak aktivasi virtual environment, jalankan perintah ini untuk sesi terminal saat ini, lalu aktivasi ulang:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Untuk Collision Lab, tambahkan `GEMINI_API_KEY` dan `GEMINI_MODEL` ke `.env`. Gunakan API key dari Google AI Studio dan jangan pernah menaruhnya di frontend atau mengunggah `.env`. Collision Lab menggunakan endpoint streaming `POST /api/collisions/stream`, sehingga teks muncul bertahap sebelum jawaban lengkap disimpan ke database. Model default `gemini-3.5-flash-lite` dipilih untuk latensi rendah; generasi memakai thinking rendah, batas 300 token, dan timeout 45 detik. Jika Gemini gagal atau timeout, UI menampilkan error dan jawaban yang belum selesai tidak disimpan.

Mulai website:

```powershell
uvicorn app:app --reload
```

Buka http://127.0.0.1:8000. Dokumentasi API tersedia di http://127.0.0.1:8000/docs dan pemeriksaan kesehatan di http://127.0.0.1:8000/api/health. Pada database baru, beberapa masalah contoh dimasukkan otomatis agar Collision Lab langsung bisa dicoba.

## 4. Deploy di Vercel

1. Simpan project ke repository GitHub (pastikan `.env` tidak ikut ter-commit; `.gitignore` sudah mengabaikannya).
2. Di Vercel pilih **Add New → Project**, import repository `bentur-starter`.
3. Pada pengaturan Environment Variables, tambahkan:
   - **Name:** `DATABASE_URL`
   - **Value:** connection string Neon yang sama
   - Pilih environments yang diperlukan: Production, Preview, dan Development.
   - Tambahkan **Name:** `GEMINI_API_KEY`, **Value:** API key dari Google AI Studio.
   - Tambahkan **Name:** `GEMINI_MODEL`, **Value:** `gemini-3.5-flash-lite` (atau model teks lain yang tersedia).
4. Biarkan Vercel mendeteksi FastAPI otomatis. Jangan menambahkan Build Command frontend; asset sudah ada di folder `public`.
5. Klik Deploy. Setelah selesai, buka URL deployment lalu coba tambah masalah dan buat tabrakan ide.
6. Jika menambah atau mengubah Environment Variable setelah deploy, lakukan redeploy agar nilainya digunakan.

Alternatif deploy melalui CLI: pasang Node.js LTS, jalankan `npm i -g vercel`, lalu dari folder project jalankan `vercel login` dan `vercel`. Ikuti prompt dan tambahkan `DATABASE_URL` pada pengaturan project di Vercel. Setelah tes berhasil, gunakan `vercel --prod`.

## 5. Endpoints

- `GET /api/health` — status API dan konfigurasi database
- `GET /api/stats` — jumlah masalah dan tabrakan
- `GET /api/problems` — daftar masalah; mendukung query `q` dan `category`
- `POST /api/problems` — menambah masalah
- `GET /api/collisions` — riwayat tabrakan ide
- `POST /api/collisions` — membuat dan menyimpan tantangan
- `POST /api/collisions/stream` — membuat tantangan Gemini dan mengirim hasil secara bertahap (SSE)
- `GET /docs` — dokumentasi interaktif FastAPI

## Catatan

- Schema dibuat otomatis saat aplikasi mulai.
- UI awal belum memiliki login, akun pengguna, moderasi, atau pembatasan spam. Tambahkan autentikasi dan perlindungan penyalahgunaan sebelum membuka website ke publik secara luas.
- `.env` berisi rahasia database. Jangan unggah atau bagikan file itu.
