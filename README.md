# Dompet

Aplikasi keuangan pribadi untuk iPhone — offline penuh, tanpa akun, tanpa server.
Bahasa Indonesia, mata uang IDR.

- Rencana produk & teknis: [`PLAN.md`](./PLAN.md)
- Kebijakan privasi: [`docs/PRIVACY.md`](./docs/PRIVACY.md)
- Skema database: [`docs/schema.sql`](./docs/schema.sql)
- Kode aplikasi: [`mobile/`](./mobile)

## Cepat mulai

```powershell
cd mobile
npm install
npm run typecheck
npm run lint
npx expo start
```

Modul native (SQLite, Face ID, notifikasi) butuh development build:

```powershell
npx eas-cli@latest build --platform ios --profile development
```
