# plan.md

## Objectives
- ✅ **Selesai**: Validasi **core flow** resep → transaksi POS → stok bahan berkurang akurat, bekerja **offline** (IndexedDB/Dexie) dan **sync** ke backend saat online **tanpa duplikasi** (idempotent).
- ✅ **Selesai**: Bangun MVP **PWA React** + **FastAPI** + **MongoDB** dengan UI **Bahasa Indonesia**, mencakup POS, stok, resep, laporan, sinkronisasi, dan cetak struk.
- ✅ **Selesai (Phase 3)**: Hardening sinkronisasi (retry/backoff) + audit stok per bahan (ledger history) + export laporan CSV + pengaturan print 58mm/80mm.
- ✅ **Selesai (Phase 4)**: Release readiness baseline:
  - Security hardening (JWT secret kuat + rate limit login)
  - Pagination untuk data besar
  - Backup/restore (admin)
  - Printing lebih robust (preview + test print thermal/ESC-POS-style via browser)
- ✅ **Selesai (Phase 5)**: Implementasi **Custom Roles + Permission Matrix** (kontrol menu & aksi berbasis permission) dan **setup export mobile** (Capacitor) untuk Android/iOS.

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
  - Auth + RBAC (awal):
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
  - Upgrade outbox `pendingSales` (Dexie) dengan field status + retry metadata.
  - State machine: `pending → syncing → synced` serta `retrying/failed`.
  - Implement **retry otomatis** dengan **exponential backoff + jitter**.
  - Partial failure handling: transaksi sukses ditandai synced, yang gagal masuk retrying/failed.
  - UI status sync ditingkatkan.
- ✅ Export laporan ke CSV:
  - Backend endpoint:
    - `GET /api/reports/export/sales` (CSV)
    - `GET /api/reports/export/ingredients` (CSV)
    - `GET /api/reports/export/usage?days=N` (CSV)
  - Frontend:
    - Reports page tombol **Export** (download via blob).
- ✅ Histori ledger per bahan:
  - Backend endpoint:
    - `GET /api/ingredients/{ingredient_id}/ledger?days=N&limit=M`
  - Frontend:
    - Tombol **Histori** per bahan.
- ✅ Perbaikan print settings (58mm/80mm):
  - Store settings diperluas: `print_width`, `auto_print`.
  - Settings → tab **Cetak Struk** dengan preview.

### Testing (hasil aktual)
- ✅ Phase 3 pass (agent-tested).

### Success criteria (status)
- ✅ Sync stabil saat jaringan putus-nyambung.
- ✅ Audit trail stok per bahan bisa ditelusuri via UI.
- ✅ Export laporan berjalan.
- ✅ Print settings 58/80mm dapat diatur.

---

## Phase 4 — Stabilization & Release Readiness **(COMPLETED ✅)**
> Phase 4 fokus pada baseline produksi: keamanan, performa data besar, backup, dan printing yang lebih siap untuk printer thermal.

### User stories (Phase 4)
1. Sebagai owner, saya ingin backup/restore data agar tidak takut kehilangan data.
2. Sebagai owner, saya ingin performa tetap cepat walau data banyak (transaksi/histori) dengan pagination.
3. Sebagai manager, saya ingin pencarian transaksi cepat agar bisa melayani komplain.
4. Sebagai owner, saya ingin keamanan sistem memadai sebelum dipakai produksi.
5. Sebagai owner, saya ingin opsi printing lebih robust.

### Implementation steps (hasil aktual)
- ✅ Security hardening:
  - JWT secret via env `JWT_SECRET` (fallback generate jika kosong/terlalu pendek).
  - Login rate limiting (in-memory).
- ✅ Data growth & performance:
  - Pagination endpoints:
    - `GET /api/sales/paginated`
    - `GET /api/stock-ledger/paginated`
- ✅ Backup/restore:
  - `GET /api/backup` (admin) download JSON
  - Restore master data:
    - `POST /api/restore/ingredients?mode=merge|replace`
    - `POST /api/restore/menus?mode=merge|replace`
- ✅ Printing improvements:
  - Settings → tombol **Test Print** (browser print).

### Testing (hasil aktual)
- ✅ Endpoint baseline berjalan (agent-tested).

### Success criteria (status)
- ✅ Security baseline terpenuhi.
- ✅ Pagination tersedia.
- ✅ Owner bisa backup & restore master data.

---

## Phase 5 — Custom Roles + Permission Matrix + Mobile Export (Capacitor) **(COMPLETED ✅)**
> Phase 5: user setuju memakai **custom roles** dan **permission matrix** untuk kontrol menu & aksi, serta setup **Capacitor** untuk ekspor SPA menjadi app Android/iOS.

### User stories (Phase 5)
1. Sebagai owner, saya bisa membuat role custom (mis. Barista, Supervisor) dan mengatur akses per fitur (matrix).
2. Sebagai owner, saya bisa assign role ke user.
3. Sebagai kasir/pegawai, saya hanya melihat menu navigasi yang sesuai permission.
4. Sebagai sistem, endpoint sensitif tetap terlindungi walau user mencoba akses langsung (server-side enforcement).
5. Sebagai owner, saya bisa menyiapkan project agar SPA dapat diekspor menjadi Android/iOS app (via Capacitor).

### Permission matrix (yang disepakati)
- Modul: `pos`, `menus`, `ingredients`, `sales_history`, `reports`, `settings`, `users_roles`
- Level: `none`, `view`, `manage`
- Implementasi permission code berbasis aksi (lebih granular) dan dikelompokkan per kategori UI:
  - **Akses Halaman**: `page.pos`, `page.menus`, `page.ingredients`, `page.reports`, `page.sales_history`, `page.settings`
  - **POS / Kasir**: `pos.create_sale`, `pos.void_sale`, `pos.apply_discount`
  - **Menu**: `menu.view`, `menu.create`, `menu.edit`, `menu.delete`
  - **Bahan & Stok**: `ingredient.view`, `ingredient.create`, `ingredient.edit`, `ingredient.delete`, `ingredient.adjust_stock`, `ingredient.view_ledger`
  - **Laporan**: `report.view_summary`, `report.view_sales`, `report.view_usage`, `report.export`
  - **Pengaturan**: `settings.store`, `settings.print`, `settings.sync`, `settings.backup`
  - **User**: `user.view`, `user.create`, `user.edit`, `user.delete`
  - **Role**: `role.view`, `role.create`, `role.edit`, `role.delete`

### Default roles (hasil aktual)
- ✅ **Owner**: full access (35 permissions)
- ✅ **Manager**: akses operasional + laporan (24 permissions)
- ✅ **Kasir**: POS only minimal (4 permissions: `page.pos`, `pos.create_sale`, `menu.view`, `ingredient.view`)

### Implementation steps (hasil aktual)
#### 5.1 Backend — model + default roles ✅
- ✅ `models.py`:
  - `AVAILABLE_PERMISSIONS`, `PERMISSION_CATEGORIES`, `DEFAULT_ROLE_PERMISSIONS`
  - `RoleCreate`, `RoleUpdate`
- ✅ `server.py` lifespan:
  - index `roles.name`
  - auto-create system roles: `owner`, `manager`, `kasir`

#### 5.2 Backend — Role CRUD endpoints ✅
- ✅ Endpoint:
  - `GET /api/permissions`
  - `GET /api/roles`
  - `POST /api/roles`
  - `GET /api/roles/{role_id}`
  - `PUT /api/roles/{role_id}`
  - `DELETE /api/roles/{role_id}` (block bila `is_system=True` dan/atau sedang dipakai user)

#### 5.3 Backend — permission checking middleware/dependency ✅
- ✅ Implement `require_permission(...)`:
  - resolve permission dari `user.role_id` → `roles.permissions`
  - fallback ke `role_name` + `DEFAULT_ROLE_PERMISSIONS` untuk kompatibilitas
  - return `403` jika tidak punya izin
- ✅ Proteksi endpoint sensitif (server-side) dengan permission:
  - Ingredients: create/update/delete/adjust
  - Menus: create/update/delete
  - Reports export
  - Settings update
  - Backup/restore
  - Users management
  - Roles management

#### 5.4 Backend — auth payload & user schema alignment ✅
- ✅ Login dan `/api/auth/me` mengembalikan:
  - `role` (role_name), `role_id`, dan `permissions` (effective)
- ✅ User management menggunakan `role_id` + `role_name`.

#### 5.5 Frontend — auth & permission-aware UI ✅
- ✅ `AuthContext` menyimpan `permissions` dan helper:
  - `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccessPage`, `can(...)`
- ✅ Routing guard berbasis permission (bukan roles hardcoded).
- ✅ Navigation menu (AppLayout) tampil sesuai permission user.

#### 5.6 Frontend — Roles management UI ✅
- ✅ Halaman `RolesPage`:
  - list roles + jumlah permission
  - create/edit role dengan **permission matrix UI** (group by category, select all per kategori)
  - delete role custom (dengan proteksi role masih dipakai)

#### 5.7 Frontend — User management dengan role assignment ✅
- ✅ Settings → Manajemen Pengguna:
  - dropdown role menggunakan data dari `/api/roles`
  - create user via `/api/auth/register` memakai `role_id`
  - update user memakai `role_id`

#### 5.8 Capacitor setup ✅
- ✅ Capacitor v6 dipasang (kompatibel Node 20):
  - `@capacitor/core@6`, `@capacitor/cli@6`, `@capacitor/android@6`, `@capacitor/ios@6`
- ✅ `capacitor.config.json` dibuat dengan `webDir: build`
- ✅ Dokumentasi build mobile: `frontend/MOBILE_BUILD.md`
- ℹ️ Catatan:
  - Setup project sudah siap; build APK butuh Android Studio.
  - Build iOS butuh macOS + Xcode.

### Testing (Phase 5)
- ✅ Backend API testing + permission enforcement
- ✅ Frontend UI validation:
  - RolesPage muncul dan permission matrix dialog berfungsi
  - Menu navigasi hide/show sesuai permission
- ✅ E2E testing: Phase 5 features **100% working** (agent-tested)

### Success criteria (Phase 5)
- ✅ Owner dapat membuat role custom dan mengatur permission.
- ✅ UI menu & aksi mengikuti permission matrix.
- ✅ Backend menolak akses tanpa permission (bukan hanya hide menu).
- ✅ Project memiliki setup Capacitor siap untuk export Android/iOS (setup, bukan jaminan signed binaries di environment ini).

---

## Phase 6 — Production Hardening (Future / Optional)
> Peningkatan untuk skala lebih besar & compliance.

### Potential upgrades
- Observability:
  - Request correlation id, structured logging, error reporting.
- Security:
  - Refresh token + rotation, password policy lebih ketat, audit log login.
  - Rate limit persisten (Redis) agar tidak hilang saat restart.
- Backup/restore:
  - Restore transactions/ledger secara aman (deduplication strategy) + preview + dry-run.
  - Scheduled backup otomatis.
- Printing:
  - Integrasi ESC/POS native (WebUSB/WebSerial) untuk printer tertentu (opsional, butuh whitelist device & user gesture).
- Performance:
  - Indexing lanjutan, caching agregasi reports, dan background job.

### Known follow-ups (non-blocking)
- Rate limiting login terkadang tidak terdeteksi di test otomatis (in-memory state + reload). Pertimbangkan Redis rate limit untuk produksi.
- Pastikan kontrak restore (ingredients/menus) konsisten antara frontend ↔ backend (422 sempat muncul di test lama).