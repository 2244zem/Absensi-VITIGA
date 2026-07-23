# Tutorial Setup — Absensi App

## Prasyarat
- Node.js 18+
- Akun Supabase (https://supabase.com)
- Akses ke Supabase Dashboard project ini

---

## 1. Jalankan Migration SQL

**Buka Supabase SQL Editor:**
1. Login ke https://supabase.com/dashboard
2. Pilih project **fxcpohjijtxnbosygbme**
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Copy seluruh isi file `supabase/migration.sql`
6. Paste ke SQL Editor
7. Klik **Run** (atau Ctrl+Enter)

File migration ada di: `supabase/migration.sql`

Migration ini akan:
- Menambah kolom `email` dan `is_active` di tabel `profiles`
- Membuat RPC functions (`get_attendance_stats`, `get_user_monthly_stats`, `check_cooldown`)
- Membuat tabel `notifications` + RLS policies
- Membuat trigger `auto_notify_attendance()` untuk notifikasi otomatis
- Menambah indexes performa
- Mengaktifkan Realtime untuk tabel `attendances` dan `notifications`

---

## 2. Deploy Edge Function `admin-api`

**Pertama, login ke Supabase CLI:**

```bash
npx supabase login
```

Akan muncul link untuk login via browser. Ikuti sampai selesai.

**Kedua, link project lokal ke Supabase project:**

```bash
npx supabase link --project-ref fxcpohjijtxnbosygbme
```

**Ketiga, deploy Edge Function:**

```bash
npx supabase functions deploy admin-api
```

**Keempat, set environment variables untuk Edge Function di Supabase Dashboard:**

1. Buka https://supabase.com/dashboard/project/fxcpohjijtxnbosygbme/functions
2. Klik fungsi `admin-api`
3. Klik **Environment Variables**
4. Tambah:
   - Key: `SUPABASE_URL` → Value: `https://fxcpohjijtxnbosygbme.supabase.co`
   - Key: `SUPABASE_SERVICE_ROLE_KEY` → Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Y3BvaGppanR4bmJvc3lnYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDcxOTE1NiwiZXhwIjoyMTAwMjk1MTU2fQ.mH6jV9mJ5J_qDmC6GLffLwDu-hURGGI6tdG4VwIHtLM`

**Verifikasi deploy berhasil:**

```bash
npx supabase functions list
```

Harus muncul `admin-api` dengan status `ACTIVE`.

---

## 3. Setup Environment Variables

File `.env` sudah ada dengan konfigurasi yang benar:

```
VITE_SUPABASE_URL=https://fxcpohjijtxnbosygbme.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_JRfWbvW2Lc1MQZ4bvLGzYg_IKQXFh_V
```

> **Catatan:** `VITE_SUPABASE_SERVICE_KEY` sudah tidak diperlukan lagi. Semua operasi admin (createUser, deleteUser, updateUser) dilakukan melalui Edge Function, bukan dari client bundle.

Pastikan file `.env` ada di root proyek (`D:\iqra\coding project\Absen-Web\Absensi\.env`).

---

## 4. Enable Realtime untuk tabel `attendances`

**Opsi A — Otomatis via SQL (sudah termasuk di migration.sql)**
Migration SQL sudah menjalankan:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```
Jika migration sudah di-run, Realtime sudah aktif.

**Opsi B — Manual via Dashboard (jika SQL gagal):**
1. Buka https://supabase.com/dashboard/project/fxcpohjijtxnbosygbme/database/replication
2. Di bagian **Publication tables**, pastikan **supabase_realtime** dipilih
3. Centang tabel: `attendances`, `notifications`, `qr_sessions`
4. Klik **Save**

---

## 5. Deploy ke Vercel

### 5.1 Setup Project

**Opsi A — via GitHub (rekomendasi):**
1. Push repo ke GitHub
2. Login ke https://vercel.com → **Add New → Project**
3. Import repo `2244zem/Absensi-VITIGA`
4. Framework terdeteksi otomatis sebagai **Vite**
5. Di **Environment Variables** tambah:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Klik **Deploy**

**Opsi B — via CLI:**
```bash
npx vercel --prod --yes
```

### 5.2 Matikan Vercel Authentication (biar bisa diakses publik)
Buka **Vercel Dashboard → Project → Settings → General** → matikan **Vercel Authentication**.

### 5.3 Auto-Deploy (Vercel GitHub Integration)
Setelah project diimport dari GitHub, Vercel otomatis deploy ulang setiap push ke `main`. Tidak perlu setup tambahan — cukup push, Vercel langsung membangun ulang. Cek di **Vercel Dashboard → Deployments**.

---

## Verifikasi Setup

Setelah semua langkah selesai, jalankan:

```bash
npm run dev
```

Akses di browser: `http://localhost:5173`

**Yang harus dicek setelah login admin:**
- Dashboard menampilkan QR Code (dari `qrcode.react`, bukan API eksternal)
- Notifikasi realtime muncul saat ada absensi sakit/izin/terlambat
- User CRUD (tambah/edit/hapus) berjalan tanpa error
- Menu **Waktu Shift** bisa mengatur jam datang (08:00), telat (10:00), pulang (18:00)

### Mode Uji Coba (Development Only)

Saat `npm run dev`, muncul dua toggle di halaman absensi:
1. **Lewati geofence** — test scan QR tanpa harus di radius kantor
2. **Lewati cooldown 20 menit** — test check-in → check-out tanpa nunggu

**Di production (Vercel):** tambah `?dev=1` di URL, misal `https://absensi-vitiga.vercel.app/attendance?dev=1` — toggle bypass akan muncul. Tanpa `?dev=1`, semua bypass tersembunyi.

---

> 📖 Tutorial lengkap dengan penjelasan fitur, struktur folder, tabel database, dan troubleshooting ada di **README.md**.
