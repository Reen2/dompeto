# Kebijakan Privasi — Dompet

**Terakhir diperbarui: 15 November 2026**

Dompet adalah aplikasi pencatat keuangan pribadi yang berjalan sepenuhnya di perangkat
kamu. Kebijakan ini menjelaskan data apa yang ada di aplikasi dan bagaimana data itu
diperlakukan. Singkatnya: **kami tidak mengumpulkan data apa pun.**

## 1. Data yang kami kumpulkan

**Tidak ada.** Dompet tidak memiliki akun, tidak memiliki server, dan tidak mengirim
data ke mana pun. Aplikasi ini tidak memakai analitik, iklan, atau SDK pelacakan pihak
ketiga.

## 2. Data yang tersimpan di perangkatmu

Dompet menyimpan data berikut secara lokal di iPhone kamu:

- Dompet/rekening dan saldo awal yang kamu masukkan
- Transaksi, kategori, anggaran, tagihan berulang, target tabungan, utang/piutang, wishlist
- Preferensi tampilan (tema, nama panggilan, pengingat)

Data ini hanya bisa diakses oleh aplikasi Dompet di perangkatmu. Menghapus aplikasi
akan menghapus data tersebut, kecuali kamu sudah membuat file backup.

## 3. PIN dan Face ID

Jika kamu mengaktifkan kunci aplikasi, PIN 6 digit disimpan sebagai hash SHA-256 dengan
salt di iOS Keychain (melalui `expo-secure-store`), bukan sebagai teks biasa. PIN tidak
pernah dikirim ke mana pun dan tidak dapat dipulihkan. Face ID diproses sepenuhnya oleh
iOS; Dompet hanya menerima jawaban "cocok" atau "tidak cocok".

## 4. Backup dan ekspor

Kamu dapat membuat file backup (JSON) atau ekspor transaksi (CSV). File tersebut dibuat
di perangkatmu dan hanya dibagikan ke tujuan yang kamu pilih sendiri (misalnya Files,
iCloud Drive, atau email). File backup **tidak terenkripsi**, jadi simpan di tempat
pribadi dan jangan bagikan ke orang lain.

## 5. Notifikasi

Jika kamu mengaktifkan pengingat, Dompet menjadwalkan notifikasi **lokal** di perangkat.
Tidak ada server yang mengirim notifikasi, dan isi notifikasi tidak keluar dari iPhone.

## 6. Anak-anak

Dompet tidak ditujukan untuk anak di bawah 13 tahun dan tidak mengumpulkan data pribadi
siapa pun.

## 7. Perubahan kebijakan

Jika kebijakan ini berubah, versi terbaru akan diterbitkan di halaman ini dengan tanggal
pembaruan baru.

## 8. Kontak

Pertanyaan tentang privasi: **[isi alamat email kamu]**

---

*Aplikasi ini menggunakan Expo dan pustaka open source lain. Tidak satu pun dari pustaka
tersebut mengirim data ke pihak ketiga ketika aplikasi berjalan.*
