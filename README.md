# 🏗️ BRICS Workshop — Sistem Simulasi Pembangunan

Sistem manajemen workshop simulasi pembangunan menggunakan BRICS. Dibangun dengan **Next.js 14 + Firebase Firestore**, siap deploy ke **Vercel** (gratis).

---

## 📋 Fitur Lengkap

### Untuk Tim (Peserta)
- Pilih tim dari halaman utama
- Input pembelian material & SDM per hari
- Data yang sudah disubmit **terkunci otomatis** (tidak bisa diubah)
- Progress bar budget real-time dengan warning warna
- Riwayat pembelian lengkap per hari

### Untuk Penyelenggara (Admin)
- **Monitoring**: Pantau semua tim — pengeluaran, progress bar, detail per hari, rekapan material
- **Leaderboard**: Ranking tim berdasarkan keuntungan (pendapatan − pengeluaran)
- **Kelola Tim**: Tambah/hapus tim (3–4 tim per workshop)
- **Pengaturan**: Edit nama workshop, jumlah hari, max pengeluaran, harga material & SDM
- **Export CSV**: Download rekap lengkap semua tim (bisa dibuka di Excel)

---

## 🚀 Cara Setup & Deploy

### Langkah 1 — Setup Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Klik **"Add project"** → beri nama → Create
3. Di sidebar kiri, klik **"Firestore Database"** → **"Create database"**
   - Pilih mode **Production**
   - Pilih region terdekat (contoh: `asia-southeast1`)
4. Di tab **"Rules"**, ganti isi rules dengan ini lalu **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Rules ini terbuka untuk kemudahan workshop. Jika ingin lebih aman, tambahkan autentikasi setelah workshop selesai.

5. Klik **⚙️ Project Settings** (ikon gear di sidebar)
6. Scroll ke bawah ke **"Your apps"** → klik ikon **`</>`** (Web)
7. Daftarkan app → copy nilai konfigurasi yang muncul

### Langkah 2 — Setup Project Lokal

```bash
# Clone atau ekstrak folder brics-workshop
cd brics-workshop

# Install dependencies
npm install

# Buat file environment dari template
cp .env.example .env.local
```

Edit `.env.local` dengan nilai dari Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nama-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nama-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nama-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

```bash
# Jalankan lokal untuk test
npm run dev
# Buka http://localhost:3000
```

### Langkah 3 — Deploy ke Vercel

**Cara termudah (via GitHub):**

1. Push project ke GitHub repository
2. Buka [vercel.com](https://vercel.com) → **"New Project"** → import repo
3. Di bagian **"Environment Variables"**, tambahkan semua variabel dari `.env.local`
4. Klik **Deploy** → selesai!

**Atau via Vercel CLI:**

```bash
npm install -g vercel
vercel

# Ikuti instruksi, lalu tambahkan env vars di Vercel Dashboard:
# Settings → Environment Variables
```

### Langkah 4 — Pertama Kali Buka

1. Buka URL Vercel yang diberikan
2. Sistem otomatis **inisialisasi data** material dari Excel (18 item)
3. Klik **"Masuk sebagai Penyelenggara"** → password default: **`admin123`**
4. Segera ganti password di tab **Pengaturan**!
5. Buat tim di tab **"Kelola Tim"** (3–4 tim)
6. Bagikan URL ke semua peserta

---

## 📁 Struktur Project

```
brics-workshop/
├── src/
│   ├── app/
│   │   ├── page.tsx          ← Landing page (pilih tim / login admin)
│   │   ├── team/page.tsx     ← Halaman tim (input harian + riwayat)
│   │   ├── admin/page.tsx    ← Dashboard penyelenggara (4 tab)
│   │   ├── layout.tsx        ← Root layout
│   │   └── globals.css       ← Global styles + Tailwind
│   ├── components/
│   │   └── Leaderboard.tsx   ← Komponen leaderboard tim
│   ├── lib/
│   │   ├── firebase.ts       ← Konfigurasi Firebase
│   │   ├── db.ts             ← Semua operasi database
│   │   ├── defaultData.ts    ← Data material & SDM default (dari Excel)
│   │   ├── exportExcel.ts    ← Export rekap ke CSV
│   │   └── utils.ts          ← Format Rupiah, helper functions
│   └── types/
│       └── index.ts          ← TypeScript types
├── .env.example              ← Template env variables
├── .gitignore
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 🔧 Database Structure (Firestore)

```
workshops/
  └── main-workshop/          ← Satu dokumen settings global
      ├── namaWorkshop
      ├── jumlahHari
      ├── maxPengeluaran
      ├── jumlahPendapatan
      ├── adminPassword
      └── materials[]         ← Array 18 item material & SDM

teams/
  └── {teamId}/
      ├── namaTeam
      ├── workshopId
      └── createdAt

submissions/
  └── {submissionId}/
      ├── teamId
      ├── workshopId
      ├── hari                ← Nomor hari (1, 2, 3, ...)
      ├── entries[]           ← Array item yang dibeli
      ├── totalHari           ← Total pengeluaran hari itu
      ├── locked: true        ← Selalu true setelah submit
      └── submittedAt
```

---

## 🎯 Alur Penggunaan Workshop

1. **Sebelum workshop**: Penyelenggara setup pengaturan, buat tim, bagikan URL
2. **Setiap hari**: Tiap tim membuka URL → pilih tim → input pembelian → submit & kunci
3. **Pemantauan**: Penyelenggara buka `/admin` → monitor real-time semua tim
4. **Akhir workshop**: Lihat leaderboard → export CSV untuk rekap final

---

## ❓ FAQ

**Q: Bisakah peserta mengubah data yang sudah disubmit?**
A: Tidak bisa. Data langsung terkunci (locked: true) saat disubmit.

**Q: Bagaimana jika tim salah memilih nama tim?**
A: Kembali ke halaman utama dan pilih tim yang benar. Data tersimpan per teamId.

**Q: Apakah Firebase gratis cukup?**
A: Ya. Spark plan (gratis) Firestore mendukung 50.000 read + 20.000 write per hari — lebih dari cukup untuk workshop.

**Q: Bisa berapa tim maksimal?**
A: Tidak ada batas teknis. Secara praktis 3–6 tim ideal.

**Q: Export CSV bisa dibuka di Excel?**
A: Ya. File menggunakan BOM UTF-8 agar karakter Rupiah dan Indonesia terbaca benar di Excel.
