# plan.md

## Objectives
- ✅ **Selesai**: Validasi **core flow** resep → transaksi POS → stok bahan berkurang akurat, bekerja **offline** (IndexedDB/Dexie) dan **sync** ke backend saat online **tanpa duplikasi** (idempotent).
- ✅ **Selesai**: Bangun MVP **PWA React** + **FastAPI** + **MongoDB** dengan UI **Bahasa Indonesia**, mencakup POS, stok, resep, laporan, sinkronisasi, dan cetak struk.
- 🎯 **Selanjutnya (Phase 3)**: Hardening sinkronisasi + penyempurnaan audit stok + fitur lanjutan (export, perbaikan print, notifikasi/alert low stock yang lebih kuat), dan peningkatan keamanan/permission (sudah ada dasar RBAC).

---

## Phase 1 — Core POC (Isolation): Resep + Offline-first + Sync **(COMPLETED ✅)**
> Fokus: buktikan logika stok & sync dulu. Jangan lanjut ke app penuh sebelum core stabil.

### User stories (POC)
1. Sebagai owner, saya ingin mendefinisikan bahan (kopi, susu, gula aren) beserta satuan agar stok konsisten.
2. Sebagai owner, saya ingin membuat resep menu yang mengonsumsi beberapa bahan agar stok bisa dihitung otomatis.
3. Sebagai kasir, saya ingin mencatat penjualan menu saat offline agar operasional tetap jalan.
4. Sebagai sistem, saya ingin mengurangi stok bahan berdasarkan resep setiap transaksi agar stok real-time.
5. Sebagai sistem, saya ingin melakukan sync saat online dan mencegah transaksi dobel agar data backend benar.

### Implementation steps (hasil aktual)
- ✅ Definisikan model minimal (POC):
  - Ingredient: name, unit, stock_qty, low_stock_threshold
  - Menu: name, price, recipe[{ingredient_id, qty}]
  - Sale: client_id, created_at, items, total, device_id
  - StockLedger: sale_id + ingredient_id (unique), delta_qty, created_at (audit + idempotency)
- ✅ Buat **python test script** (isolated) untuk:
  - hitung kebutuhan bahan dari sale items
  - apply stock deduction
  - idempotency: sale yang sama 2x tidak mengurangi stok 2x
  - batch sync simulation
  - insufficient stock handling
  - low stock detection
  - ledger audit trail verification
- ✅ Hasil POC tervalidasi (6/6 test pass) dan menjadi dasar implementasi server sync.

### Next actions (status)
- ✅ Putuskan IndexedDB library: **Dexie**
- ✅ UUID generator: **uuid**
- ✅ Jalankan POC end-to-end dengan dataset contoh (Americano, Kopi Susu Gula Aren)

### Success criteria (status)
- ✅ Stok berkurang sesuai resep (toleransi 0) dan **tidak dobel** saat re-sync.
- ✅ Transaksi offline tersimpan & tersync.
- ✅ Ledger audit menunjukkan tiap pengurangan stok terikat ke sale.

---

## Phase 2 — V1 App Development (MVP) **(COMPLETED ✅)**
> Bangun aplikasi utuh di sekitar core yang sudah terbukti.

### User stories (V1)
1. Sebagai kasir, saya ingin layar POS cepat (search menu, tambah/kurang qty) agar antrian tidak menumpuk.
2. Sebagai kasir, saya ingin checkout menghasilkan nomor struk dan ringkasan agar transaksi jelas.
3. Sebagai owner, saya ingin melihat stok bahan + indikator “hampir habis” agar bisa reorder.
4. Sebagai owner, saya ingin laporan penjualan harian/mingguan/bulanan agar bisa evaluasi.
5. Sebagai owner, saya ingin histori transaksi dan detailnya agar bisa audit bila ada selisih.
6. Sebagai tim, kita butuh UI/UX konsisten (coffee-warm theme) dan Bahasa Indonesia.

### Implementation steps (hasil aktual)
- ✅ Frontend (React PWA-style, offline-first):
  - App Shell dengan sidebar + mobile header
  - Routing pages:
    - POS (/pos)
    - Menu (/menus)
    - Bahan/Stok (/ingredients)
    - Laporan (/reports)
    - Riwayat Transaksi (/sales)
    - Pengaturan (/settings)
    - Login (/login)
  - POS split layout: menu grid + cart panel, search, kategori
  - Checkout dialog + **receipt preview** + `window.print` (print CSS)
  - Offline-first:
    - IndexedDB via **Dexie**: pendingSales (outbox), cachedMenus, cachedIngredients
    - Auto-sync on `online` event + manual `Sync sekarang`
    - Header/banner indicator: Online/Offline + queued count
  - Low stock UI:
    - badge “Menipis”/“Habis”
    - filter stok menipis
  - Theme & tokens:
    - Coffee-warm tokens di `index.css` + semantic status tokens (success/warning/danger/info)
- ✅ Backend (FastAPI):
  - CRUD ingredients + stock adjustment endpoint
  - CRUD menus + recipe validation
  - Sales create + batch sync endpoint (`/api/sales/sync`) dengan idempotency berbasis `client_id` + ledger unique
  - Reports endpoints:
    - summary (total revenue, transactions, top menu, low stock list)
    - daily trend
    - ingredient usage dari stock ledger
  - Auth + RBAC (sudah di-include di V1):
    - JWT login
    - roles: owner/manager/kasir
    - default owner auto-create: admin@kedaiops.com / admin123
- ✅ End-to-end testing:
  - 100% pass (backend 19/19, frontend flows validated)
  - Core feature: recipe-based stock deduction verified akurat

### Next actions (status)
- ✅ Implement UI skeleton + connect ke API
- ✅ Implement reports endpoints + charts (Recharts)
- ✅ Run E2E test and fix

### Success criteria (status)
- ✅ POS usable di mobile (responsive) dan bisa transaksi offline.
- ✅ Laporan periode tampil konsisten dengan transaksi yang tersimpan.
- ✅ Cetak struk bekerja di browser umum.

---

## Phase 3 — Add More Features (Hardening + Advanced Ops) **(NEXT ⏭️)**
> Catatan: auth/RBAC sudah ada di V1. Phase 3 fokus ke hardening sync, audit stok yang lebih kuat, dan fitur operasional lanjutan.

### User stories (Phase 3)
1. Sebagai owner, saya ingin manajemen user lebih lengkap (reset password, nonaktifkan user, audit login) agar operasional aman.
2. Sebagai owner, saya ingin role/permission lebih granular (mis. kasir boleh lihat stok tapi tidak edit, manager boleh adjustment) agar kontrol rapi.
3. Sebagai manager, saya ingin koreksi stok (stock adjustment) dengan alasan + histori per bahan agar audit rapi.
4. Sebagai owner, saya ingin notifikasi low stock lebih jelas (threshold per bahan, daftar prioritas, opsi notifikasi) agar tidak kehabisan.
5. Sebagai owner, saya ingin export laporan (CSV) agar bisa dibuka di Excel.
6. Sebagai kasir, saya ingin mode offline lebih “tahan banting”: retry, partial failure handling, dan tampilan error yang jelas.
7. Sebagai owner, saya ingin laporan pemakaian bahan per periode berbasis ledger agar bisa menghitung kebutuhan restock.

### Implementation steps (revisi sesuai kondisi saat ini)
- Hardening Sync (offline-first):
  - Implement **outbox pattern** lebih lengkap:
    - status: pending → syncing → synced/failed
    - retry dengan exponential backoff
    - partial failure: hanya item gagal tetap di queue
  - Idempotency server:
    - pastikan unique index `sales.client_id` dan `stock_ledger(sale_id, ingredient_id)` tetap enforced
    - response sync detail + reason codes
  - Conflict handling:
    - server adalah source of truth untuk stok
    - setelah sync, client re-fetch stok/menus dan update cache
- Stock audit enhancements:
  - Ledger untuk adjustment sudah ada; tambah:
    - endpoint histori ledger per ingredient
    - ringkasan pemakaian vs restock per periode
  - Tambah “Stock opname” (optional): snapshot stok per tanggal
- Permissions hardening:
  - Definisikan permission matrix per feature
  - UI gating + backend enforcement per endpoint
- Low stock alerts:
  - Tambah konfigurasi threshold yang mudah + daftar “prioritas restock”
  - (Optional) push/email/whatsapp integration di fase lanjutan
- Export:
  - CSV export endpoint untuk sales, summary, ingredient usage
- Printing improvements:
  - Pengaturan toko (nama/alamat/footer) dipakai di template struk
  - Preset ukuran 58mm vs 80mm
  - (Optional) ESC/POS untuk thermal printer

### Next actions
- Konfirmasi scope Phase 3 (pilih 3–5 item prioritas):
  - A) Export CSV
  - B) Sync hardening + retry/backoff
  - C) Ledger/riwayat stok per bahan
  - D) Permission matrix lebih detail
  - E) Print settings 58/80mm
- Buat backlog terurut + estimasi (per sprint).

### Success criteria
- Sync stabil pada jaringan putus-nyambung (tidak ada duplikasi, transaksi gagal bisa retry).
- Audit trail stok lengkap (sale + adjustment + (optional) opname) dan bisa ditelusuri.
- Export laporan berjalan dan sesuai angka di dashboard.
- Role enforcement jelas dan tidak ada privilege escalation.

---

## Phase 4 — Stabilization & Release Readiness **(FUTURE)**

### User stories (Phase 4)
1. Sebagai owner, saya ingin backup/restore data agar tidak takut kehilangan data.
2. Sebagai owner, saya ingin pengaturan printer/format struk agar sesuai toko.
3. Sebagai manager, saya ingin pencarian transaksi cepat agar bisa melayani komplain.
4. Sebagai owner, saya ingin performa tetap cepat walau data banyak.
5. Sebagai owner, saya ingin monitoring error sederhana agar tahu bila ada masalah.

### Implementation steps
- Data migration/versioning IndexedDB (Dexie migrations) + strategi backward compatible.
- Performance:
  - pagination + server-side filtering untuk sales/history
  - indexes Mongo untuk query laporan
  - caching untuk menu/ingredient
- Printing:
  - robust print layout, optional ESC/POS adapter
- Observability:
  - basic error logging + request tracing
- Comprehensive testing + regression checklist.

### Success criteria
- Tidak ada data loss pada offline mode + refresh.
- App stabil untuk penggunaan harian (latency UI rendah, sync konsisten).
