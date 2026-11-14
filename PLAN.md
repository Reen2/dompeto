# Dompet — catatan keuangan pribadi untuk iPhone

> Status: **MVP selesai secara fungsional.** Semua layar, data layer, keamanan, dan
> backup sudah ada. Yang belum: ikon/splash final, screenshot App Store, build EAS,
> dan submit ke App Store.

Dompet adalah aplikasi keuangan pribadi berbahasa Indonesia yang **sepenuhnya offline**.
Tidak ada akun, tidak ada server, tidak ada pelacakan. Data tinggal di iPhone masing-masing
pengguna, dan setiap teman yang memasang aplikasi ini punya datanya sendiri.

---

## 1. Ringkasan keputusan

| Aspek | Keputusan | Alasan |
|---|---|---|
| Platform | iPhone (iOS 16+), portrait | Target utama; Android ikut terbawa Expo tapi tidak diuji |
| Teknologi | Expo SDK 58, React Native 0.88, React 19, TypeScript strict | Build iOS dari Windows lewat EAS, tanpa Mac |
| Distribusi | EAS Build → TestFlight → App Store (gratis) | Teman bisa memasang sendiri |
| Data | `expo-sqlite` + SQL tulisan tangan | Tanpa ORM, tanpa langkah build tambahan |
| Sinkronisasi | Tidak ada. Backup file JSON manual | Menghindari auth + backend + biaya bulanan |
| Input | Manual + template cepat + transaksi berulang | Cepat, andal, bisa dipakai satu tangan |
| Mata uang | IDR, integer rupiah (tanpa float) | Tidak pernah salah pembulatan |
| Login | Tidak ada. PIN 6 digit + Face ID + auto-lock | Data tetap di perangkat |
| Bahasa | Indonesia saja | Audiens awal: teman-teman |
| Desain | "Quiet luxury": ivory hangat, arang gelap, aksen champagne | Tenang, tidak seperti aplikasi bank |

**Prinsip:** satu tangan, 3 tap untuk mencatat, jalan penuh tanpa internet, angka tidak pernah salah.

---

## 2. Fitur yang sudah jadi

### Inti
- **Dompet/rekening**: tunai, bank, e-wallet, kartu kredit (limit + tanggal tagihan/jatuh tempo),
  investasi, lain-lain. Saldo berjalan otomatis, arsip tanpa merusak riwayat, sembunyikan dari total.
- **Kategori**: pemasukan & pengeluaran, ikon SF Symbol, warna, subkategori 1 level, arsip,
  kategori sistem yang tidak bisa dihapus.
- **Transaksi**: pemasukan, pengeluaran, transfer antar dompet (dengan biaya admin),
  tanggal, dompet, kategori, catatan, payee, tag, lampiran struk, transaksi berulang terkait.
- **Input cepat**: keypad besar, chip nominal cepat (+10rb/+50rb/+100rb), saran kategori
  dari teks catatan/payee, tombol simpan selalu terlihat.
- **Daftar transaksi**: dikelompokkan per hari dengan subtotal, pencarian teks, filter
  tipe/dompet/kategori/periode, edit & hapus dengan konfirmasi.

### Otomatisasi & perencanaan
- **Anggaran**: per kategori atau total, periode bulanan/mingguan, rollover, ambang peringatan.
  Progress bar + sisa + status aman/waspada/lewat.
- **Transaksi berulang & tagihan**: harian/mingguan/bulanan/tahunan, interval bebas,
  auto-post atau konfirmasi manual, `next_run` dihitung otomatis saat app dibuka.
- **Notifikasi lokal**: pengingat tagihan H-3, H-1, H, dan pengingat harian mencatat (20.00).
- **Target tabungan**: target nominal, deadline, alokasi per bulan, catat setoran.
- **Utang & piutang**: sisa pokok, jatuh tempo, cicilan, riwayat pembayaran, integrasi ke dompet.
- **Wishlist / daftar impuls**: daftar keinginan dengan prioritas, "sudah dibeli" → catat transaksi.

### Laporan
- Ringkasan periode: pemasukan, pengeluaran, selisih, rata-rata harian, tingkat tabungan.
- Cashflow 6 bulan (grouped bars), tren kumulatif harian, donut per kategori,
  pengeluaran terbesar, heatmap harian, jumlah hari tanpa pengeluaran, net worth per bulan.

### Data & keamanan
- Backup JSON lengkap (semua tabel) lewat share sheet → Files/iCloud Drive.
- Ekspor CSV semua transaksi (UTF-8 BOM, siap dibuka di Numbers/Excel/Sheets).
- Restore dari file JSON dengan validasi, hanya mengganti tabel konten; preferensi
  perangkat (nama, tema, PIN, pengingat) tetap di perangkat.
- PIN 6 digit (SHA-256 + salt di SecureStore), Face ID, auto-lock (langsung / 1 / 5 menit).
- Mode sembunyikan saldo, tema terang/gelap/sistem, haptics, empty state yang mengajari,
  Dynamic Type & VoiceOver label di kontrol penting.
- Reset semua data dengan konfirmasi.

### Belum dibuat (sengaja ditunda)
- Widget Home/Lock Screen, App Intents/Siri, OCR struk, multi-currency, sync antar perangkat,
  import CSV dengan pemetaan kolom, enkripsi database (SQLCipher).

---

## 3. Stack & struktur

```
Dompet/
├─ PLAN.md                  # dokumen ini
├─ docs/
│  ├─ schema.sql            # DDL referensi
│  └─ PRIVACY.md            # kebijakan privasi (untuk App Store)
└─ mobile/                  # aplikasi Expo
   ├─ app.json              # nama, bundle id, ikon, plugin, infoPlist
   ├─ eas.json              # profil development / preview / production
   └─ src/
      ├─ app/               # expo-router: setiap file = layar
      │  ├─ _layout.tsx     # gate: settings → DB → onboarding → lock → Stack
      │  ├─ (tabs)/         # Beranda, Transaksi, Anggaran, Laporan, Lainnya
      │  ├─ transaction/    # /new, /[id]
      │  ├─ settings/       # security, backup, appearance
      │  └─ wallets|categories|recurring|goals|debts|wishlist
      ├─ components/        # ui, sheet, charts, pin-pad, lock-screen, icon, transaction-row
      ├─ db/                # index (koneksi + useQuery), schema (migrasi), queries, types
      ├─ hooks/             # use-theme
      ├─ lib/               # money, dates, theme, icons, backup, notifications, id
      ├─ screens/           # onboarding, transaction-editor (non-route)
      └─ store/             # settings (context + SecureStore)
```

### Lapisan data reaktif (tanpa library)
`src/db/index.ts` menyediakan:
- `getDb()` — buka SQLite, jalankan migrasi versioned, seed kategori pertama kali.
- `notifyChanged()` — dipanggil setelah setiap mutasi.
- `useQuery(loader, deps)` — hook kecil yang menjalankan ulang query saat versi data global
  atau `deps` berubah. Memakai stale-while-revalidate supaya layar tidak berkedip.

### Aturan teknis
1. Uang selalu **integer rupiah**. Tidak ada float di jalur uang.
2. Tanggal transaksi disimpan `YYYY-MM-DD` (lokal), di-parse pada jam 12 siang lokal
   agar tidak bergeser karena DST/timezone.
3. Soft delete untuk dompet & kategori; transaksi dihapus permanen dengan konfirmasi.
4. Setiap perubahan skema = migrasi baru di `src/db/schema.ts`; migrasi lama tidak diedit.
5. Semua agregasi laporan lewat SQL, bukan loop di JS.
6. Tidak ada `any`; logika uang hanya di `src/lib/money.ts` dan `src/db/queries.ts`.

---

## 4. Perintah

```powershell
cd mobile
npm install
npx expo start            # dev server (Expo Go untuk modul bawaan)
npm run lint              # eslint
npm run typecheck         # tsc --noEmit
npx expo-doctor           # cek dependency & konfigurasi
```

Modul native (SQLite, Face ID, notifikasi, SecureStore) **tidak ada di Expo Go**.
Untuk mencoba di iPhone perlu development build:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile development
```

---

## 5. Rilis ke App Store

1. **Apple Developer Program** ($99/tahun) — daftar sebagai Individual, verifikasi KTP.
2. Ganti `ios.bundleIdentifier` di `app.json` bila `id.dompet.app` sudah dipakai
   (harus unik secara global dan tidak bisa diubah setelah build pertama diunggah).
3. Ikon 1024×1024 tanpa alpha (`assets/expo.icon` / `assets/images/icon.png`) dan splash final.
4. Screenshot wajib: 6.9" dan 6.5" (3–10 buah), menampilkan UI asli.
5. App Privacy: **Data Not Collected** — ini nilai jual utama.
6. Privacy Policy URL (isi `docs/PRIVACY.md`, hosting GitHub Pages).
7. Export compliance: `ITSAppUsesNonExemptEncryption = false` sudah di `app.json`.
8. Build & unggah:
   ```powershell
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios
   ```
9. TestFlight internal → uji di iPhone sendiri → submit review (1–3 hari).

Checklist detail ada di bagian 8.

---

## 6. Aturan bisnis & edge case

| Kasus | Perilaku |
|---|---|
| Nominal 0 / negatif | Ditolak dengan pesan jelas |
| Transfer ke dompet yang sama | Ditolak |
| Hapus dompet yang punya transaksi | Ditolak, tawarkan arsip |
| Hapus kategori yang dipakai | Ditolak, tawarkan arsip |
| Saldo minus (kartu kredit) | Diizinkan, ditandai merah |
| Transaksi tanggal masa depan | Diizinkan, belum masuk saldo berjalan sampai tanggalnya |
| Edit instance hasil auto-post | Hanya instance itu, bukan rule |
| Angka > 999 miliar | Tetap presisi (64-bit), tampilan disingkat "1,2 T" |
| Restore backup | Validasi `app: "dompet"` + hanya kolom yang ada di skema sekarang |
| App dibunuh saat menulis | Transaksi SQLite atomik, tidak ada data setengah jadi |
| Lupa PIN | Tidak bisa dipulihkan; satu-satunya jalan hapus data. Karena itu backup didorong di UI |
| Dynamic Type besar | Layout tidak terpotong (text membungkus, nominal tabular) |

---

## 7. Checklist kualitas sebelum rilis

**Fungsional**
- [ ] Catat pengeluaran ≤3 tap dari Beranda.
- [ ] Saldo total = Σ saldo dompet; saldo dompet = saldo awal ± transaksi (uji 100 transaksi).
- [ ] Transfer tidak mengubah total saldo, hanya distribusi.
- [ ] Edit & hapus transaksi mengoreksi saldo dengan benar.
- [ ] Anggaran reset di awal periode; rollover akurat.
- [ ] Recurring memposting tepat sekali per periode walau app dibuka berkali-kali.
- [ ] Backup JSON → restore di DB kosong → data identik.
- [ ] CSV terbuka rapi di Numbers (tidak ada karakter rusak).
- [ ] Kunci muncul setelah background sesuai timeout; Face ID gagal → fallback PIN.

**Non-fungsional**
- [ ] 10.000 transaksi: list & laporan tetap responsif.
- [ ] Tidak ada `float` di jalur uang (grep audit).
- [ ] Dark & light mode tanpa kontras rusak.
- [ ] Dynamic Type terbesar: tidak ada teks terpotong.
- [ ] Mode pesawat: semua fitur tetap jalan.
- [ ] iPhone kecil (SE) & besar (Pro Max) diuji.
- [ ] VoiceOver: tombol ikon punya label, target sentuh ≥44pt.
- [ ] 30 menit pemakaian acak tanpa crash.

---

## 8. Checklist App Store

- [ ] Apple Developer Program aktif, perjanjian pajak/bank diisi.
- [ ] Nama "Dompet" tidak melanggar merek (cek App Store & trademark).
- [ ] Deskripsi jujur, tanpa klaim menggantikan perencana keuangan / saran investasi.
- [ ] Privacy Policy URL hidup (wajib, meski tidak mengumpulkan data).
- [ ] App Privacy answers konsisten ("Data Not Collected").
- [ ] Screenshot UI asli, bukan mockup.
- [ ] Ikon 1024×1024 tanpa transparansi.
- [ ] `NSFaceIDUsageDescription` terisi jelas & sopan.
- [ ] Tidak ada link pembayaran eksternal (Guideline 3.1.1).
- [ ] Tidak ada fitur pinjaman/kredit (butuh lisensi — dihindari).
- [ ] Review notes: jelaskan app offline, tanpa login, tanpa akun demo.
- [ ] Tidak ada placeholder / tombol mati (Guideline 2.1 & 4.2).
- [ ] Usia 4+ (tidak ada konten sensitif).

---

## 9. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kehilangan data pengguna | Fatal untuk app keuangan | Backup JSON + pengingat backup + transaksi atomik |
| Salah hitung | Kepercayaan hilang | Integer + query agregat SQL + uji manual |
| Ditolak App Store | Tertunda | Ikuti checklist §8; rilis sederhana dulu |
| Build iOS gagal di EAS | Blokir rilis | Kunci versi dependency, build rutin sejak awal |
| Scope creep | Tidak pernah rilis | Backlog v1.1 dikunci; fokus polish |
| PIN lupa | Data tidak bisa dibuka | Peringatan jelas + dorong backup berkala |

---

## 10. Langkah berikutnya (urut)

1. Ganti ikon & splash dengan identitas Dompet (champagne di ivory/arang).
2. Jalankan development build di iPhone, uji alur nyata 1–2 hari (dogfooding).
3. Ambil screenshot App Store dari build production.
4. Isi App Store Connect: nama, subtitle, deskripsi, kata kunci, kategori Finance, harga gratis.
5. Host `docs/PRIVACY.md` (GitHub Pages) → tempel URL.
6. `eas build` + `eas submit` → TestFlight → review.
