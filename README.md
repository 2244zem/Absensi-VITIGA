# Absensi VITIGA — Aplikasi Presensi Perkantoran

Aplikasi absensi berbasis web dengan **QR Code dinamis**, **geofencing GPS**, dan **deteksi keterlambatan/lembur otomatis**. Dibangun dengan React, TypeScript, Tailwind CSS, dan Supabase.

## Fitur

- **Dynamic QR Code** — Token QR berganti setiap 25 detik, mencegah screenshot/titip absen
- **Multi-Point Geofencing** — Validasi lokasi GPS (radius 50m) di 3 kantor (Bandung, Yogyakarta, Jakarta)
- **Delay Cooldown 20 menit** — Mencegah spam absen masuk/pulang
- **Deteksi Lembur Otomatis** — Scan di atas jam 18:00 → status otomatis "Hadir (Lembur)"
- **Device Lock** — Satu akun hanya aktif di satu perangkat
- **Role-based Access** — Role Admin & Employee dengan halaman terpisah
- **Realtime Dashboard** — Live feed kehadiran via Supabase Realtime
- **CRUD Shift** — Atur jam datang, jam telat, dan jam pulang per kantor
- **Laporan & Statistik** — Filter tanggal, status, cabang; export data
- **Surat Dokter** — Upload/photo bukti sakit/izin

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS 4 + Lucide Icons |
| Backend/Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| QR Scanner | html5-qrcode |
| Deploy | Vercel + GitHub Actions |

---

## 1. Persiapan

### Prasyarat

- **Node.js** 18+ (disarankan 20)
- **npm** 9+
- **Akun Supabase** (gratis) di https://supabase.com
- **Git** + **Akun GitHub**
- **Akun Vercel** (gratis) di https://vercel.com

### Clone Repository

```bash
git clone https://github.com/2244zem/Absensi-VITIGA.git
cd Absensi-VITIGA
```

---

## 2. Setup Supabase

### 2.1 Buat Project Supabase

1. Login ke https://supabase.com/dashboard
2. Klik **New Project**
3. Isi nama project, password database, region **Asia Southeast Asia** (Singapore)
4. Tunggu provisioning selesai (~2 menit)

### 2.2 Jalankan Migration SQL

1. Buka **SQL Editor** di sidebar Supabase
2. Klik **New Query**
3. Copy seluruh isi file `supabase/migration.sql` dari project ini
4. Paste ke editor, klik **Run**
5. Tunggu semua query selesai (hijau semua)

> Migration ini membuat tabel: `offices`, `profiles`, `qr_sessions`, `attendances`, `notifications`, `office_shifts` — plus fungsi RPC, trigger, index, dan RLS policies.

### 2.3 Seed Data Kantor

Migration sudah menyisipkan 3 kantor (Bandung, Yogyakarta, Jakarta). Verifikasi di **Table Editor** → tabel `offices` harus berisi 3 baris.

### 2.4 Buat User Admin Pertama

Karena registrasi publik dinonaktifkan, buat admin lewat **Authentication → Users → Invite user** atau via **SQL Editor**:

```sql
-- 1. Buat user via Supabase Auth (gunakan UI dashboard)
-- 2. Setelah itu, isi profile manual:
INSERT INTO profiles (id, full_name, email, role, office_id)
SELECT id, 'Admin', email, 'admin', (SELECT id FROM offices LIMIT 1)
FROM auth.users
WHERE email = 'admin@email.com';
```

Atau gunakan fungsi **Edge Function** `admin-api` (lihat langkah 2.5).

### 2.5 Deploy Edge Function (Opsional — untuk Manajemen User)

```bash
# Login ke Supabase CLI
npx supabase login

# Link project lokal ke Supabase Cloud
npx supabase link --project-ref <PROJECT_REF>

# Deploy fungsi admin-api
npx supabase functions deploy admin-api

# Set environment variables di dashboard:
# Buka https://supabase.com/dashboard/project/<PROJECT_REF>/functions/admin-api
# Tambah: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 2.6 Aktifkan Realtime

Di **Supabase Dashboard → Database → Replication**:
- Pilih publication **supabase_realtime**
- Centang tabel: `attendances`, `notifications`, `qr_sessions`
- Klik **Save**

Atau sudah otomatis via migration (langkah 2.2).

---

## 3. Environment Variables

Buat file `.env` di root proyek:

```env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY_PUBLISHABLE>
```

Dapatkan nilai dari **Supabase Dashboard → Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public key` → `VITE_SUPABASE_ANON_KEY`

> ⚠️ **Jangan commit file `.env` ke GitHub** — sudah di-gitignore secara default. Jangan pernah ekspos `service_role_key` ke client.

---

## 4. Menjalankan Lokal (Development)

```bash
npm install
npm run dev
```

Buka **http://localhost:5173**.

### Mode Uji Coba (Bypass Geofence)

Saat `npm run dev`, akan muncul toggle **"Mode Uji Coba: lewati cek lokasi"** di halaman absensi. Aktifkan untuk mengetes scan QR tanpa perlu berada di radius kantor. Toggle ini **otomatis hilang di build production**.

---

## 5. Struktur Folder Penting

```
src/
├── components/
│   ├── admin/          # Modal komponen admin
│   ├── attendance/     # QR Scanner, Geofence, Cooldown
│   ├── auth/           # ProtectedRoute, RoleGuard
│   ├── employee/       # Komponen karyawan
│   ├── layout/         # AdminLayout, EmployeeLayout
│   └── ui/             # Button, Input, Modal, Table, dll
├── context/            # AuthContext, OfficeContext
├── hooks/              # useAuth, useGeofence, useDynamicQR, dll
├── pages/
│   ├── admin/          # Dashboard, Manage Users, Reports, Shifts
│   ├── auth/           # Login
│   └── employee/       # Absensi, Izin, Profil
├── services/api/       # Supabase queries (auth, attendances, qr, offices, shifts)
├── types/              # TypeScript interfaces
└── utils/              # haversine, dateFormatter, timezone, validators
```

---

## 6. Deploy ke Vercel

### 6.1 Setup Project di Vercel

**Opsi A — via GitHub (rekomendasi):**

1. Push repository ke GitHub (sudah dilakukan)
2. Login ke https://vercel.com
3. Klik **Add New → Project**
4. Import repository `2244zem/Absensi-VITIGA`
5. Framework preset akan terdeteksi otomatis sebagai **Vite**
6. Di **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` → isi dari `.env`
   - `VITE_SUPABASE_ANON_KEY` → isi dari `.env`
7. Klik **Deploy**

**Opsi B — via CLI:**

```bash
# Deploy pertama (buat project)
npx vercel --prod --yes

# Set environment variables di dashboard Vercel
# Project → Settings → Environment Variables
```

### 6.2 Setelah Deploy

- URL: `https://absensi-vitiga.vercel.app` (atau sesuai nama project)
- Kamera & GPS otomatis jalan karena Vercel pakai **HTTPS**
- Toggle bypass geofence **tidak muncul** di production (hanya untuk development)
- Agar bisa diakses publik tanpa login Vercel: buka **Vercel Dashboard → Project → Settings → General** → matikan **Vercel Authentication**

---

## 7. Auto-Deploy (Vercel GitHub Integration)

Setelah project diimport dari GitHub ke Vercel, setiap **push ke branch `main`** otomatis redeploy — tanpa perlu konfigurasi tambahan.

Cukup:
```bash
git add .
git commit -m "update"
git push origin main
```

Vercel otomatis mendeteksi push, build ulang, dan deploy ke production. Cek progresnya di **Vercel Dashboard → Deployments**.

> Jika ingin deploy manual dari CLI: `npx vercel --prod --yes`

---

## 8. Troubleshooting

### QR Scan tidak bekerja / "QR Code tidak valid"

- Pastikan **Realtime** di Supabase sudah aktif untuk tabel `qr_sessions`
- Cek **RLS policy** — employee harus bisa SELECT `qr_sessions`:

```sql
CREATE POLICY "Anyone can read qr_sessions"
  ON qr_sessions FOR SELECT
  USING (true);
```

- Token QR hanya berlaku **25 detik** — scan segera

### Kamera tidak muncul di HP

- Pastikan akses via **HTTPS** (Vercel otomatis HTTPS)
- Di Chrome Android, izinkan akses kamera saat diminta
- Jika pakai local dev via LAN (`http://192.168.x.x:5173`), kamera diblokir — gunakan tunnel seperti `cloudflared tunnel --url http://localhost:5173`

### Build gagal di Vercel

- Pastikan **Environment Variables** sudah di-set di Vercel dashboard (bukan cuma di `.env`)
- Cek log build di Vercel Dashboard → Deployments → klik deployment terakhir → **View Build Logs**

### Halaman kosong / blank setelah login

- Buka **Console** browser — kemungkinan error CORS atau env vars tidak terbaca
- Pastikan URL Supabase tidak typo

---

## 9. Tabel Database

### `offices` — Master lokasi kantor
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| name | VARCHAR | Nama kantor |
| address | TEXT | Alamat |
| latitude | DOUBLE | Koordinat |
| longitude | DOUBLE | Koordinat |
| radius_meters | INT | Radius geofence (default 50m) |

### `profiles` — Profil user
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | PK, FK → auth.users |
| full_name | VARCHAR | Nama lengkap |
| role | ENUM | 'admin' / 'employee' |
| office_id | UUID | FK → offices |
| email | VARCHAR | |
| is_active | BOOLEAN | |

### `qr_sessions` — Token QR dinamis
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| office_id | UUID | FK → offices |
| token | TEXT | UUID unik, diganti tiap 25 detik |
| expires_at | TIMESTAMPTZ | Waktu kedaluwarsa |

### `attendances` — Catatan absensi
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| office_id | UUID | FK → offices |
| check_in | TIMESTAMPTZ | Jam masuk |
| check_out | TIMESTAMPTZ | Jam pulang |
| status | ENUM | hadir/hadir_lembur/sakit/izin |
| is_overtime | BOOLEAN | |
| checkin_lat/lng | DOUBLE | Titik GPS saat absen |
| proof_url | TEXT | Bukti sakit/izin |

### `office_shifts` — Pengaturan jam kerja (ditambahkan)
| Kolom | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| id | UUID | | PK |
| office_id | UUID | | FK → offices (unique) |
| check_in_time | TIME | 08:00 | Jam datang default |
| late_threshold | TIME | 10:00 | Batas jam telat |
| check_out_time | TIME | 18:00 | Jam pulang default |

---

## 10. Akun & Role

### Admin
- Halaman: `/admin` — dashboard QR, `/admin/manage-users`, `/admin/reports`, `/admin/offices`, `/admin/shifts`
- Fitur: generate QR, CRUD karyawan, lihat laporan, atur shift

### Employee
- Halaman: `/attendance` — absen masuk/pulang, `/leave` — izin/sakit, `/profile`
- Fitur: scan QR, upload surat dokter, lihat riwayat

---

## Lisensi

Hak cipta VISITIGA. Internal use only.
