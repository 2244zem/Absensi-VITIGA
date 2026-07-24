Berikut adalah skema struktur folder lengkap untuk proyek React + TypeScript + Tailwind CSS berbasis Supabase.

Struktur ini sudah mengisolasi setiap komponen kecil, state condition (seperti delay cooldown, status geofencing, status lembur, dan kamera/lampiran surat dokter), serta pembagian *role* antara Admin dan Employee.

---1. Analisis & Solusi Anti-Kecurangan (Anti-Titip Absen)Sistem absensi tradisional yang hanya mengandalkan QR Code per hari masih rentan diakali (contoh: karyawan A mengambil foto QR dengan HP lain, lalu mengirim gambarnya via WhatsApp ke karyawan B yang ada di rumah).Berikut adalah 4 Lapis Keamanan (Security Layer) yang kita terapkan:Celah ManipulasiSolusi & Strategi PMFoto QR dikirim via WADynamic Rotating QR Code: Admin tidak memajang QR statis, melainkan QR Code yang berganti token setiap 15-30 detik di Dashboard Admin Office (layar/TV kantor).Pake Fake GPSMulti-Point Geofencing + Network Check: Lokasi user dihitung menggunakan Haversine Formula (radius maks. 50–100 meter dari koordinat kantor).Titip HP / Multi-LoginDevice Lock: Satu akun hanya bisa aktif di 1 perangkat (session binding). Jika login di HP teman, session di HP asal langsung terputus.Spam Scan / Double ScanDelay Cooldown: Sistem memberlakukan delay minimal 20–30 menit setelah Absen Masuk sebelum tombol Absen Pulang dapat diakses.2. Koordinat Kantor (Geofencing Master Data)Terdapat 3 titik lokasi utama yang dikunci dalam sistem:Bandung (Antapani): Latitude: -6.91101, Longitude: 107.65880 (Radius 150m)Yogyakarta (Bantul): Latitude: -7.77545, Longitude: 110.35066 (Radius 150m)Jakarta Utara (Kelapa Gading): Latitude: -6.15316, Longitude: 106.90382 (Radius 150m)
Surabaya (Gayungan): Latitude: -7.31558, Longitude: 112.72804 (Radius 150m)3. Database Schema Blueprint (Supabase + PostgreSQL)Jalankan skrip SQL berikut di SQL Editor Supabase Anda untuk menyiapkan tabel, tipe enum, dan Row Level Security (RLS).SQL-- 1. Create Custom Types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE attendance_status AS ENUM ('hadir', 'hadir_lembur', 'sakit', 'izin');
CREATE TYPE attendance_type AS ENUM ('masuk', 'pulang');

-- 2. Offices Table (Geofencing Master)
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial office data
INSERT INTO offices (name, address, latitude, longitude) VALUES
('Kantor Bandung', 'Jl. Setra Dago Bar. No.9, Antapani Kulon, Kec. Antapani, Kota Bandung, Jawa Barat 40291', -6.91101, 107.65880),
('Kantor Yogyakarta', 'Perumahan Taman Griya Indah VI Blok D No.8A, Kembang, Ngestiharjo, Kec. Kasihan, Kabupaten Bantul, DIY', -7.77545, 110.35066),
('Kantor Jakarta', 'Jl. Janur Elok VI Blok QE13 No.5, Klp. Gading Bar., Jakarta Utara', -6.15316, 106.90382),
('Kantor Surabaya', 'Central Park A. Yani Residence Kav. 5, Ketintang, Kec. Gayungan, Surabaya, Jawa Timur', -7.31558, 112.72804);

-- 3. Profiles Table (Linked with Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    office_id UUID REFERENCES offices(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dynamic QR Code Tokens
CREATE TABLE qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Attendance Records
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices(id),
    check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    status attendance_status NOT NULL DEFAULT 'hadir',
    is_overtime BOOLEAN DEFAULT FALSE,
    checkin_lat DOUBLE PRECISION,
    checkin_lng DOUBLE PRECISION,
    proof_url TEXT, -- Untuk foto/surat izin/sakit
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

7. Tampilan Dashboard Admin & Statistik
Admin akan memiliki halaman ringkasan statistik yang menampilkan:
Tabel Statistik Aktivitas: Kolom Nama, Kantor, Jam Masuk, Jam Pulang, Status (Hadir, Hadir (Lembur), Sakit, Izin), serta tautan Surat Dokter (Proof).
Filter & Search Bar: Berdasarkan Rentang Tanggal, Nama Karyawan, Cabang Kantor, dan Status Absensi.
Tampilan QR Display: Komponen layar lebar untuk menampilkan QR Code berganti otomatis (mencegah screenshot proxy).

1. Pohon Folder Proyek (`src/`)

```text
src/
├── assets/
│   ├── images/                 # Logo perusahaan, placeholder avatar, ilustrasi
│   └── icons/                  # SVG custom jika tidak menggunakan Lucide React
│
├── components/
│   ├── ui/                     # Komponen UI Generik / Atom
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx           # Badge status: Hadir, Hadir (Lembur), Sakit, Izin
│   │   ├── Table.tsx           # Reusable Table dengan pagination & sorting
│   │   ├── Spinner.tsx
│   │   ├── DatePicker.tsx
│   │   ├── Toast.tsx           # Alert notifikasi sukses / gagal absensi
│   │   └── Card.tsx
│   │
│   ├── layout/                 # Container & Frame Aplikasi
│   │   ├── AdminLayout.tsx     # Layout khusus Admin (Sidebar + Header + Content)
│   │   ├── EmployeeLayout.tsx  # Layout khusus Karyawan (Top Nav + Bottom Nav Mobile)
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageHeader.tsx
│   │
│   ├── auth/                   # Penjaga Akses & Keamanan
│   │   ├── ProtectedRoute.tsx  # Memastikan user sudah login
│   │   └── RoleGuard.tsx       # Memastikan user memiliki role 'admin' atau 'employee'
│   │
│   ├── attendance/             # Komponen Spesifik Absensi
│   │   ├── DynamicQRDisplay.tsx    # Display QR Code di layar kantor (Admin)
│   │   ├── QRScannerModal.tsx       # Modal kamera HP scan QR (Employee)
│   │   ├── LocationStatusCard.tsx   # Indicator status GPS & radius kantor (Pass / Fail)
│   │   ├── CooldownLockMessage.tsx  # Pesan peringatan delay 20-30 menit
│   │   ├── OvertimeBadge.tsx        # Indikator otomatis jika absensi > jam 18:00
│   │   └── LiveCheckInFeed.tsx      # Stream realtime karyawan yang baru saja absen
│   │
│   └── leave/                  # Komponen Spesifik Pengajuan Izin / Sakit
│       ├── CameraCaptureModal.tsx   # Fitur ambil foto surat dokter via kamera HP
│       ├── FileUploader.tsx         # Fitur upload PDF/Image bukti sakit
│       └── MedicalProofViewer.tsx   # Modal preview surat dokter oleh Admin
│
├── context/                    # React Context State Management
│   ├── AuthContext.tsx         # Menyimpan user session, profile, & role
│   └── OfficeContext.tsx       # Menyimpan data lokasi kantor & geofence active
│
├── hooks/                      # Custom Custom React Hooks (Business Logic)
│   ├── useAuth.ts              # Login, Logout, Fetch User Profile
│   ├── useGeofence.ts          # Menghitung koordinat GPS & jarak ke kantor
│   ├── useDynamicQR.ts         # Logic auto-refresh token QR 15-30 detik (Admin)
│   ├── useAttendanceCooldown.ts# Logic validasi jeda 20-30 menit Masuk vs Pulang
│   ├── useUploadProof.ts       # Upload foto/file surat dokter ke Supabase Storage
│   └── useAttendanceStats.ts   # Fetch data statistik & filter laporan absensi
│
├── pages/                      # Halaman Utama Aplikasi
│   ├── auth/
│   │   └── LoginPage.tsx       # Halaman Login (Tanpa Register)
│   │
│   ├── admin/                  # Tampilan Admin
│   │   ├── DashboardAdminPage.tsx    # Display Dynamic QR & Quick Stats
│   │   ├── ManageUsersPage.tsx       # Form create akun karyawan & assign kantor
│   │   └── AttendanceReportsPage.tsx # Tabel statistik absensi, filter, & export
│   │
│   └── employee/               # Tampilan Karyawan / Employee
│       ├── AttendanceActionPage.tsx # Toggle Masuk/Pulang, Geofence Check, & Scan QR
│       ├── LeaveFormPage.tsx        # Form Izin / Sakit + Kamera / Upload Surat Dokter
│       └── UserProfilePage.tsx      # Ringkasan statistik & riwayat absensi pribadi
│
├── services/                   # Supabase Client & Direct API Calls
│   ├── supabaseClient.ts       # Inisialisasi Supabase JS Client
│   ├── api/
│   │   ├── auth.ts             # Function admin create user & login
│   │   ├── attendances.ts      # Function insert checkin, checkout, & fetch report
│   │   ├── qr.ts               # Function generate & validate QR session token
│   │   └── offices.ts          # Function fetch master data kantor & koordinat
│   └── storage.ts              # Function upload & fetch file di bucket Supabase
│
├── types/                      # TypeScript Definitions
│   ├── database.types.ts       # Type yang digenerate dari schema Supabase
│   ├── attendance.ts           # Type status (hadir, hadir_lembur, sakit, izin)
│   ├── user.ts                 # Type Profile, Role (admin, employee)
│   └── office.ts               # Type Kantor, Latitude, Longitude, Radius
│
├── utils/                      # Helper & Utility Functions
│   ├── haversine.ts            # Rumus kalkulasi jarak koordinat GPS (Meter)
│   ├── dateFormatter.ts        # Format tanggal, jam, & durasi lembur
│   ├── constants.ts            # Konstanta (Coordinating Points, Delay Minutes, dll)
│   └── validators.ts           # Validasi format email, ukuran file upload, dll.
│
├── App.tsx                     # Router Setup (React Router DOM)
├── main.tsx                    # Root Entrypoint
└── index.css                   # Tailwind CSS Directives & Custom Styles

```

---

## 2. Penjelasan Detail Penanganan Kondisi (Conditions Mapping)

| Fitur & Kondisi Sistem | File Komponen / Hook Penanggung Jawab | Deskripsi Penanganan |
| --- | --- | --- |
| **Pencegahan Public Register** | `pages/auth/LoginPage.tsx` | Hanya ada form Login. Akun dibuat via `services/api/auth.ts` oleh Admin. |
| **Verifikasi Geofencing GPS** | `hooks/useGeofence.ts` & `LocationStatusCard.tsx` | Menghitung posisi lokasi user terhadap 3 titik koordinat kantor dengan `haversine.ts`. Menampilkan alert merah jika radius > 50 meter. |
| **Delay Cooldown 20–30 Menit** | `hooks/useAttendanceCooldown.ts` & `CooldownLockMessage.tsx` | Mengecek selisih waktu `check_in` terakhir dengan waktu sekarang. Jika < 20–30 menit, tombol **Absen Pulang** dikunci (*disabled*). |
| **Validasi Jam Lembur** | `AttendanceActionPage.tsx` & `OvertimeBadge.tsx` | Jika waktu scan melebihi jam normal kerja (misal di atas 18:00), status absensi otomatis diset sebagai `hadir_lembur` dengan label **Hadir (Lembur)**. |
| **Dynamic Refresh QR Token** | `hooks/useDynamicQR.ts` & `DynamicQRDisplay.tsx` | Admin menjalankan interval timer 15–30 detik untuk *insert/update* token baru ke tabel `qr_sessions` di Supabase. |
| **Surat Dokter (Kamera/File)** | `CameraCaptureModal.tsx` & `FileUploader.tsx` | Karyawan dapat mengambil foto langsung dari WebCam/Kamera HP atau memilih file dari galeri/storage yang langsung di-upload ke Supabase Storage via `services/storage.ts`. |
| **Hak Akses Role** | `components/auth/RoleGuard.tsx` | Mencegah Karyawan membuka halaman Admin (`/admin/*`) dan sebaliknya, dialihkan kembali ke dashboard masing-masing. |

---

## 3. Contoh Definisi TypeScript Key Types (`src/types/attendance.ts`)

```typescript
export type UserRole = 'admin' | 'employee';

export type AttendanceStatus = 'hadir' | 'hadir_lembur' | 'sakit' | 'izin';

export type AttendanceType = 'masuk' | 'pulang';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  office_id: string;
  check_in: string;
  check_out?: string | null;
  status: AttendanceStatus;
  is_overtime: boolean;
  checkin_lat: number;
  checkin_lng: number;
  proof_url?: string | null;
  notes?: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
  office?: {
    name: string;
  };
}

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceInMeters: number;
  userLat: number;
  userLng: number;
  officeRadius: number;
}

```

---

## 4. Langkah Setup Awal Proyek

1. **Jalankan Instalasi Dependency Utama:**
```bash
npm create vite@latest office-attendance -- --template react-ts
cd office-attendance
npm install @supabase/supabase-js react-router-dom lucide-react html5-qrcode
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

```


2. **Setup Tailwind Config (`tailwind.config.js`):**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          base: '#F0E9D3',      // Base Primary Light Sand
          secondary: '#C2E000', // Vibrant Chartreuse / Accent
          dark: '#1C1917',      // Charcoal Text
        }
      }
    },
  },
  plugins: [],
}

```