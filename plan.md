# plan.md

## Objectives
- ✅ **Selesai**: Validasi **core flow** resep → transaksi POS → stok bahan berkurang akurat, bekerja **offline** (IndexedDB/Dexie) dan **sync** ke backend saat online **tanpa duplikasi** (idempotent).
- ✅ **Selesai**: Bangun MVP **PWA React** + **FastAPI** + **MongoDB** dengan UI **Bahasa Indonesia**, mencakup POS, stok, resep, laporan, sinkronisasi, dan cetak struk.
- ✅ **Selesai (Phase 3)**: Hardening sinkronisasi (retry/backoff) + audit stok per bahan (ledger history) + export laporan CSV + pengaturan print 58mm/80mm, semuanya lulus test 100%.
- 🎯 **Selanjutnya (Phase 4)**: Stabilization & release readiness: keamanan JWT/secret hardening, backup/restore, performa (pagination/index), observability, serta peningkatan printing (ESC/POS opsional).

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
  - Auth + RBAC:
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

## Phase 3 — Add More Features (Hardening + Advanced Ops) **(COMPLETED ✅)**
> Phase 3 fokus ke hardening sync, audit stok yang lebih kuat, dan fitur operasional lanjutan.

### User stories (Phase 3)
1. Sebagai kasir, saya ingin mode offline lebih “tahan banting”: retry, partial failure handling, dan tampilan error yang jelas.
2. Sebagai owner/manager, saya ingin export laporan (CSV) agar bisa dibuka di Excel.
3. Sebagai manager/owner, saya ingin histori pergerakan stok per bahan agar audit rapi.
4. Sebagai owner, saya ingin pengaturan ukuran struk (58mm/80mm) agar sesuai printer thermal.

### Implementation steps (hasil aktual)
- ✅ Hardening Sync (offline-first):
  - Upgrade outbox `pendingSales` (Dexie v2) dengan field status + retry metadata.
  - State machine: `pending → syncing → synced` serta `retrying/failed`.
  - Implement **retry otomatis** dengan **exponential backoff + jitter** (configurable max retries).
  - Partial failure handling: transaksi sukses ditandai synced, yang gagal masuk retrying/failed.
  - UI status sync ditingkatkan:
    - counts: pending, retrying, failed
    - actions: retry / delete untuk transaksi failed (di Settings → Sinkronisasi)
- ✅ Export laporan ke CSV:
  - Backend endpoint:
    - `GET /api/reports/export/sales` (CSV)
    - `GET /api/reports/export/ingredients` (CSV)
    - `GET /api/reports/export/usage?days=N` (CSV)
  - Frontend:
    - Reports page menambahkan tombol **Export** (dropdown 3 opsi), download via blob.
- ✅ Histori ledger per bahan:
  - Backend endpoint:
    - `GET /api/ingredients/{ingredient_id}/ledger?days=N&limit=M`
    - Mengembalikan ledger + summary period (sales_usage/restock_total/waste_total) + running balance.
  - Frontend:
    - Tombol **Histori** di setiap baris bahan → membuka sheet berisi summary + tabel riwayat.
- ✅ Perbaikan print settings (58mm/80mm):
  - Store settings diperluas:
    - `print_width: "58mm" | "80mm"`
    - `auto_print` (UI toggle)
  - Settings → tab **Cetak Struk**:
    - selector lebar kertas + **live receipt preview** yang berubah sesuai pilihan.

### Testing (hasil aktual)
- ✅ 100% pass Phase 3:
  - Backend: 27/27 tests passed
  - Frontend: semua flow export/ledger/print/sync status terverifikasi

### Success criteria (status)
- ✅ Sync stabil saat jaringan putus-nyambung (retry/backoff, partial failure, no duplication).
- ✅ Audit trail stok per bahan bisa ditelusuri via UI.
- ✅ Export laporan berjalan dan sesuai angka di dashboard.
- ✅ Print settings 58/80mm dapat diatur dan preview sesuai.

---

## Phase 4 — Stabilization & Release Readiness **(FUTURE)**

### User stories (Phase 4)
1. Sebagai owner, saya ingin backup/restore data agar tidak takut kehilangan data.
2. Sebagai owner, saya ingin performa tetap cepat walau data banyak (transaksi/histori).
3. Sebagai manager, saya ingin pencarian transaksi cepat agar bisa melayani komplain.
4. Sebagai owner, saya ingin monitoring error sederhana agar tahu bila ada masalah.
5. Sebagai owner, saya ingin keamanan sistem memadai (secret, token policy, audit) sebelum dipakai produksi.
6. Sebagai owner, saya ingin opsi printing lebih robust (template final + opsional ESC/POS) agar kompatibel dengan thermal printer.

### Implementation steps
- Security hardening:
  - Ganti `JWT_SECRET` default menjadi minimal 32 bytes (hilangkan InsecureKeyLengthWarning).
  - Tambah rate limit login (opsional), refresh token/rotation (opsional), dan password policy.
- Data growth & performance:
  - Pagination + server-side filtering untuk sales/history.
  - Index Mongo tambahan untuk query laporan (created_at, items.menu_id jika perlu).
  - Optimasi cache refresh setelah sync (stale-while-revalidate sederhana).
- Offline storage stability:
  - Strategi migration Dexie yang backward compatible (versi schema selanjutnya).
  - UI troubleshooting untuk outbox (export/debug log sederhana).
- Backup/restore:
  - Endpoint export/import JSON (admin only) atau dump CSV/JSON.
- Observability:
  - Basic error logging (server) + correlation id per request.
  - Frontend error boundary + logging minimal.
- Printing improvements:
  - Template struk final menggunakan store settings (nama/alamat/footer) secara penuh.
  - Preset CSS lebih robust untuk 58mm/80mm (margin, font scaling).
  - (Optional) ESC/POS adapter untuk thermal printer.

### Success criteria
- Tidak ada data loss pada offline mode + refresh.
- App stabil untuk penggunaan harian (latency UI rendah, sync konsisten).
- Security baseline terpenuhi (secret kuat, minimal audit trail).
- Siap dipakai produksi skala UMKM.
