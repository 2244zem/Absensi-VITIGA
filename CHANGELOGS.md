Anda adalah Senior Fullstack Software Engineer yang bertugas membangun Aplikasi Web Absensi Perkantoran menggunakan React, TypeScript, Tailwind CSS, dan Supabase PostgreSQL.

Gunakan seluruh spesifikasi, aturan bisnis, dan kredensial yang tercantum di dalam berkas CLAUDE.md berikut:

1. KREDENSIAL SUPABASE:
- SUPABASE_URL: https://fxcpohjijtxnbosygbme.supabase.co
- SUPABASE_PUBLISHABLE_KEY: sb_publishable_JRfWbvW2Lc1MQZ4bvLGzYg_IKQXFh_V
-SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
- DB_HOST: db.fxcpohjijtxnbosygbme.supabase.co
- DB_PORT: 5432
- DB_NAME: postgres
- DB_USER: postgres

2. KETENTUAN UTAMA APLIKASI:
- Tidak ada fitur registrasi publik (Hanya ada halaman Login). Akun dibuat oleh Admin.
- Terdapat dua peran (role): Admin dan Employee.
- Fitur utama Absensi: Pilihan Absen Masuk dan Absen Pulang.
- Fitur Anti-Kecurangan 1 (Dynamic QR Code): Admin meregenerasi QR token yang kadaluarsa setiap 15-30 detik. Karyawan wajib scan via akun yang terautentikasi.
- Fitur Anti-Kecurangan 2 (Geofencing GPS): Validasi posisi user menggunakan rumus Haversine terhadap 3 titik lokasi kantor (Bandung, Bantul, Jakarta Utara). Jika jarak lebih besar dari 50 meter, absensi ditolak.
- Fitur Anti-Kecurangan 3 (Delay Cooldown): Terapkan batas jeda waktu 20-30 menit setelah Absen Masuk sebelum tombol/aksi Absen Pulang dapat dijalankan.
- Fitur Izin dan Sakit: Menyediakan form khusus dengan lampiran surat dokter/bukti berupa foto kamera langsung atau unggah dokumen ke Supabase Storage bucket 'medical-documents'.
- Status Absensi: Status dapat bernilai 'hadir', 'hadir_lembur' (jika bekerja melebihi jam normal/setelah jam 18:00), 'sakit', dan 'izin'.
- Fitur Statistik dan Profil:
  - Dashboard Admin: Menampilkan tabel statistik absensi seluruh karyawan, fitur pencarian (search), filter berdasarkan tanggal dan status, serta tombol ekspor data.
  - Halaman Karyawan: Profil pengguna beserta ringkasan statistik kehadiran (Hadir, Sakit, Izin, Lembur).

3. STRUKTUR FILE YANG HARUS DIBUAT:
- src/services/supabaseClient.ts (Inisialisasi Supabase Client menggunakan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY).
- src/utils/haversine.ts (Fungsi perhitungan jarak koordinat GPS dalam meter).
- src/components/ProtectedRoute.tsx (Penjaga rute berdasarkan sesi login dan role).
- src/pages/Login.tsx (Halaman login karyawan dan admin).
- src/pages/admin/DashboardAdmin.tsx (Layar generator QR Code dinamis dan statistik cepat).
- src/pages/admin/ManageUsers.tsx (Form admin untuk membuat akun karyawan baru).
- src/pages/admin/AttendanceReports.tsx (Tabel data statistik lengkap dengan filter search, tanggal, dan status).
- src/pages/employee/AttendanceAction.tsx (Tampilan absen masuk/pulang, integrasi kamera QR scanner, validasi lokasi, dan jeda delay 20-30 menit).
- src/pages/employee/LeaveForm.tsx (Form pengajuan sakit/izin + upload file/kamera).
- src/pages/employee/UserProfile.tsx (Profil karyawan dan histori catatan absensi).

Buatkan source code produksi yang lengkap, aman, terstruktur rapi, tanpa placeholder, dan siap dijalankan.


prompt 
Berikut adalah revisi lengkap prompt Stitch AI dengan penyesuaian kode warna sekunder/aksen terbaru:

* **Base / Background Primary:** `#F0E9D3` (Warm Sand / Beige)
* **Secondary / Accent / CTA:** `#C23E00` (Vibrant Red-Orange / Burnt Orange)
* **Text / Neutral:** `#1C1917` (Dark Charcoal)
* **Card Container:** `#FFFFFF` (Crisp White)

Di bawah ini terdapat **18 Prompt Stitch AI terpisah** yang mencakup seluruh *page*, *modal*, *state*, dan *komponen khusus* untuk sistem absensi.

---

### CATEGORY 1: AUTHENTICATION & ACCESS CONTROL

#### Prompt 1: Login Page (Standard State)

```text
Design a clean, modern corporate Login Page for a web-based Office Attendance Application.

Color Palette:
- Base Background: #F0E9D3
- Primary Accent & CTA Buttons: #C23E00 (with white text #FFFFFF for strong contrast)
- Card Container: #FFFFFF with soft drop shadow
- Main Text: #1C1917

Layout & Structure:
- Centered modern authentication card on top of #F0E9D3 background.
- Brand logo on top with app title "Presensi Perkantoran" and subtitle "Masuk ke Akun Anda".
- Notice box: "Sistem hanya mendukung login akun dari Admin. Tidak ada registrasi publik."
- Form Input fields: Email Address and Password with a show/hide toggle icon.
- Main Action Button: "Masuk / Login" styled in bold #C23E00 background with white text.
- Footer text: "Butuh bantuan akun? Hubungi Tim HR / Admin."

```

#### Prompt 2: Login Page (Error & Access Denied State)

```text
Design an error alert state view on the Login Page when authentication fails or unauthorized access is detected.

Color Palette:
- Base Background: #F0E9D3
- Secondary Accent: #C23E00
- Alert Container: #FFFFFF with red border accents
- Text: #1C1917

Layout & Features:
- Same centered login card layout as standard login page.
- Top Alert Banner: Red-orange bordered warning box containing an icon and text: "Akses Ditolak: Email atau Password salah, atau Akun Anda telah dinonaktifkan oleh Admin."
- Form fields show active red outline state.
- Primary button "Coba Lagi" in #C23E00 with active press state.

```

---

### CATEGORY 2: ADMIN DASHBOARD & DISPLAY

#### Prompt 3: Admin Dashboard (Dynamic QR Code TV Display View)

```text
Design a widescreen TV/Monitor Screen Dashboard for Office Admins to display Dynamic Rotating QR Codes.

Color Palette:
- Base Background: #F0E9D3
- Primary Accent & Live Indicators: #C23E00
- Display Containers: #FFFFFF
- Text: #1C1917

Layout & Features:
- Top Header: Admin Bar with Office Location Switcher (Kantor Bandung, Kantor Bantul, Kantor Jakarta Utara), Live Date/Time Clock.
- Main Center Card (#FFFFFF):
  - High-contrast Dynamic QR Code in center.
  - A circular countdown progress ring in #C23E00 showing 15-30 seconds cooldown timer before the QR refreshes automatically.
  - Helper text: "Scan QR menggunakan kamera HP untuk Absen Masuk / Pulang."
- Bottom Status Row: 4 summary pill badges (Total Hadir, Hadir Lembur, Sakit/Izin, Belum Absen) highlighted with #C23E00 accents.

```

#### Prompt 4: Admin Live Attendance Feed Component (Real-Time Feed)

```text
Design a Real-Time Live Attendance Feed Sidebar Widget for the Admin Dashboard.

Color Palette:
- Container Card: #FFFFFF
- Accent Color: #C23E00
- Text: #1C1917

Layout & Features:
- Card Title: "Live Feed Kehadiran Hari Ini" with a pulsing red-orange dot (#C23E00) indicating live updates.
- Vertical scrollable activity stream listing recent employee check-ins.
- Entry items show: Employee Avatar, Full Name, Time (e.g. 08:05 WIB), Location Branch, and Status Badge ("Hadir" or "Hadir (Lembur)").
- Highlighting new items with a subtle #C23E00 left border strip.

```

---

### CATEGORY 3: ADMIN MANAGEMENT & REPORTS

#### Prompt 5: Admin User Management Page (Employee List & Account Creation)

```text
Design an Admin User Management Page for creating and assigning employee accounts.

Color Palette:
- Base Background: #F0E9D3
- Primary Action Button & Accents: #C23E00
- Data Table Card: #FFFFFF
- Text: #1C1917

Layout & Features:
- Top Header: Title "Kelola Akun Karyawan" with a main CTA button "+ Tambah Akun Baru" styled in #C23E00.
- Search & Filter Bar: Name/Email search input, Dropdown filter for Assigned Office Location (Bandung, Bantul, Jakarta).
- Main Data Table (#FFFFFF card):
  - Columns: Avatar, Nama Lengkap, Email, Penempatan Kantor, Role (Admin/Employee), Status Akun, Aksi (Edit, Reset Session, Nonaktifkan).
  - Pagination control at the bottom with #C23E00 active page highlight.

```

#### Prompt 6: Admin Create Account Modal Dialog

```text
Design a Modal Pop-up Dialog for Admin to create a new employee account.

Color Palette:
- Modal Overlay: Semi-transparent dark overlay
- Modal Container: #FFFFFF
- Accent & Submit Button: #C23E00
- Text: #1C1917

Layout & Features:
- Modal Title: "Tambah Akun Karyawan Baru" with a close button (X).
- Form Inputs:
  1. Nama Lengkap (Text Input)
  2. Email Perusahaan (Email Input)
  3. Password Default (Password Input)
  4. Select Penempatan Kantor (Dropdown: Bandung / Bantul / Jakarta Utara)
  5. Select Role (Radio button: Karyawan / Admin)
- Action Buttons: "Batal" (Ghost/Gray) and "Simpan Akun" (#C23E00 background).

```

#### Prompt 7: Admin Attendance Reports & Analytics Page

```text
Design a comprehensive Attendance Analytics and Reports Page with advanced data filters for HR/Admin.

Color Palette:
- Base Background: #F0E9D3
- Primary Accent & Export CTA: #C23E00
- Table Card: #FFFFFF
- Text: #1C1917

Layout & Features:
- Top Header: Title "Laporan & Statistik Absensi" with an "Export CSV/Excel" action button styled in #C23E00.
- 4 Quick Stat Summary Cards: Total Kehadiran, Total Lembur, Total Sakit, Total Izin.
- Filter Toolbar Row:
  - Search input (Name/ID).
  - Date Range Picker (Start Date to End Date).
  - Status Dropdown (Semua, Hadir, Hadir (Lembur), Sakit, Izin).
  - Office Location Dropdown.
- Main Table (#FFFFFF):
  - Columns: Tanggal, Nama Karyawan, Cabang Kantor, Jam Masuk, Jam Pulang, Status Badge, Dokumen Bukti (Link preview Surat Dokter if Sakit/Izin).

```

#### Prompt 8: Admin Medical Certificate Inspector Modal

```text
Design a Modal Dialog Component for inspecting uploaded doctor certificates/medical proofs for sick/leave requests.

Color Palette:
- Modal Container: #FFFFFF
- Accent Controls: #C23E00
- Text: #1C1917

Layout & Features:
- Modal Header: "Detail Bukti Surat Dokter - [Nama Karyawan]".
- Content Area: High-resolution image/PDF preview container showing the uploaded medical letter photo.
- Metadata Side Panel: Tanggal Pengajuan, Jenis (Sakit/Izin), Catatan Karyawan.
- Action Buttons: "Tutup" and "Download Dokumen" styled with #C23E00 outline.

```

#### Prompt 9: Admin GPS Geofence Inspector Modal

```text
Design a Map Modal Component showing the exact GPS check-in location of an employee versus the office coordinate center.

Color Palette:
- Modal Container: #FFFFFF
- Pin & Radius Highlight: #C23E00
- Text: #1C1917

Layout & Features:
- Modal Header: "Verifikasi Lokasi Absensi GPS".
- Interactive Map Box: Map showing Office Location with a 50m radius circular boundary shaded in light #C23E00 accent.
- Marker Pin: Employee's actual check-in location pin.
- Info Strip: Calculated distance (e.g. "Jarak dari kantor: 14 meter - DI DALAM RADIUS").

```

---

### CATEGORY 4: EMPLOYEE MOBILE INTERFACE

#### Prompt 10: Employee Home / Attendance Action Page (Main View)

```text
Design a Mobile-First Employee Main Attendance Page for QR Scanning and Check-in/Check-out toggling.

Color Palette:
- Base Background: #F0E9D3
- Primary Accent & Action CTA: #C23E00
- Container Cards: #FFFFFF
- Text: #1C1917

Layout & Features:
- Top Bar: Greeting "Halo, [Nama Karyawan]", active assigned office location badge ("Kantor Bandung"), current date/time display.
- Segmented Control Switcher: "Absen Masuk" tab vs "Absen Pulang" tab.
- Location Status Card (#FFFFFF): Shows live GPS status "Terdeteksi di Kantor Bandung (Jarak 12m)" with a green/accent check mark.
- Primary CTA Button: Large prominent "Buka Kamera & Scan QR" button styled in #C23E00 with white text and camera icon.

```

#### Prompt 11: Employee QR Scanner Modal Component

```text
Design a Full-Screen Camera QR Scanner Modal for mobile employees scanning the office QR code.

Color Palette:
- Background: Dark overlay with viewport scanner frame
- Reticle/Target Box Accent: #C23E00
- Control Buttons: #FFFFFF / #C23E00

Layout & Features:
- Viewfinder Frame: Square scanning target box with vibrant #C23E00 corners and horizontal animated laser line.
- Header: "Arahkan Kamera ke QR Code Kantor" with a close button (X).
- Bottom Helper Controls: Torch Light toggle button and Switch Camera button.

```

#### Prompt 12: Employee Attendance Cooldown Lock Screen (Delay 20-30 Min)

```text
Design an Alert State Screen when an employee attempts to Check-out (Absen Pulang) before the 20-30 minute cooldown period expires.

Color Palette:
- Base Background: #F0E9D3
- Warning & Cooldown Highlights: #C23E00
- Card Container: #FFFFFF
- Text: #1C1917

Layout & Features:
- Lock Warning Banner: Card showing a padlocked icon and a #C23E00 alert header "Absen Pulang Terkunci".
- Countdown Timer: Large digital clock display showing remaining cooldown time (e.g., "18 Menit 32 Detik lagi").
- Informational Text: "Sistem memberlakukan jeda minimal 20-30 menit setelah Absen Masuk untuk mencegah manipulasi."
- Disabled "Absen Pulang" button with grayed out style.

```

#### Prompt 13: Employee Geofence Out-of-Bounds Error Screen

```text
Design an Error Result Screen when an employee attempts to scan attendance outside the allowed 50-meter office radius.

Color Palette:
- Base Background: #F0E9D3
- Alert Accent & Primary CTA: #C23E00
- Card Container: #FFFFFF
- Text: #1C1917

Layout & Features:
- Centered Error Card (#FFFFFF):
  - Large red-orange cross icon (#C23E00).
  - Error Title: "Absensi Gagal: Di Luar Area Kantor".
  - Distance Info Badge: "Jarak Anda saat ini: 240 meter dari Kantor Bandung (Maksimal 50 meter)."
  - Troubleshooting Checklist: "Pastikan GPS aktif", "Mendekat ke area kantor", "Matikan Fake GPS / VPN".
  - Action Button: "Coba Lagi / Refresh GPS" in #C23E00 background.

```

#### Prompt 14: Employee Overtime Attendance Confirmation Screen (Status: Hadir - Lembur)

```text
Design a Confirmation Badge View when an employee checks in or checks out past normal working hours (e.g. after 18:00 WIB).

Color Palette:
- Base Background: #F0E9D3
- Overtime Badge Highlight: #C23E00
- Container Card: #FFFFFF
- Text: #1C1917

Layout & Features:
- Success Card (#FFFFFF):
  - Checkmark icon with #C23E00 overtime tag badge "Hadir (Lembur)".
  - Timestamp display (e.g. "22 Juli 2026 - 19:45 WIB").
  - Informational Message: "Absensi Anda secara otomatis dicatat sebagai Status Lembur."
  - Action Button: "Kembali ke Beranda" in #C23E00.

```

---

### CATEGORY 5: LEAVE, SICK REQUESTS & PROFILE

#### Prompt 15: Employee Leave & Sick Request Form Page

```text
Design a Mobile-Friendly Leave & Sick Form Page for submitting absence requests with doctor certificates.

Color Palette:
- Base Background: #F0E9D3
- Accent CTA: #C23E00
- Form Card: #FFFFFF
- Text: #1C1917

Layout & Features:
- Header: "Form Pengajuan Izin / Sakit" with a back navigation arrow.
- Form Elements (#FFFFFF Card):
  1. Radio Chip Selector: "Sakit (Wajib Surat Dokter)" vs "Izin Khusus".
  2. Date Picker Range: Tanggal Mulai to Tanggal Selesai.
  3. Textarea: "Alasan / Catatan Izin".
  4. Attachment Section Header: "Lampiran Surat Dokter / Bukti".
- Submit Button: "Kirim Pengajuan" in bold #C23E00 background.

```

#### Prompt 16: Employee Medical Proof Camera Capture Component

```text
Design a Camera Capture & Upload Component within the leave form for capturing physical doctor's letters ("Surat Sakti Dokter").

Color Palette:
- Card/Box Frame: #FFFFFF with dotted #C23E00 border
- Accent Buttons: #C23E00
- Text: #1C1917

Layout & Features:
- Dual Input Trigger Box:
  - Button 1: "Ambil Foto Kamera Langsung" (with camera icon).
  - Button 2: "Unggah File Gambar / PDF" (with upload icon).
- Live Image Preview Container: Displays thumbnail image of captured doctor note with a remove/retake button.

```

#### Prompt 17: Employee Profile & Personal Attendance History Page

```text
Design an Employee Profile Dashboard showing monthly statistics and attendance history logs.

Color Palette:
- Base Background: #F0E9D3
- Primary Accent & Badges: #C23E00
- Content Cards: #FFFFFF
- Text: #1C1917

Layout & Features:
- Top Profile Card (#FFFFFF): Employee Avatar, Full Name, Email, Assigned Office Location, and Employee ID.
- Monthly Summary Stat Bar (4 Cards): Total Hadir, Total Hadir (Lembur), Total Sakit, Total Izin.
- Filter Section: Month/Year selector dropdown.
- Attendance History List:
  - Rows displaying Date, Check-in Time, Check-out Time, Status Badge ("Hadir", "Hadir (Lembur)", "Sakit", "Izin"), and GPS verification badge.

```

#### Prompt 18: Employee Attendance Detail Record Modal

```text
Design a Modal Component displaying complete details for a single personal attendance record item.

Color Palette:
- Modal Container: #FFFFFF
- Accent Badges & Highlights: #C23E00
- Text: #1C1917

Layout & Features:
- Modal Header: "Detail Presensi - 22 Juli 2026".
- Information Grid:
  - Jam Masuk & Jam Pulang timestamps.
  - Duration worked / Overtime hours.
  - Verified Office Location & Coordinates.
  - Status Pill: "Hadir (Lembur)" in #C23E00 style.
- Action Button: "Tutup" in ghost style or #C23E00 outline.

```