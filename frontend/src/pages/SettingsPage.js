/**
 * Settings Page with Backup/Restore and ESC/POS Print
 */
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Store, Users, RefreshCw, Loader2, Plus, Pencil, Shield, Printer, AlertCircle, RotateCcw, Trash2, Download, Upload, Database, FileJson } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { settingsAPI, usersAPI, authAPI, backupAPI } from '../lib/api';
import { useSync } from '../contexts/SyncContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function SettingsPage() {
  const [storeSettings, setStoreSettings] = useState({
    store_name: '',
    address: '',
    phone: '',
    footer_text: '',
    print_width: '80mm',
    show_logo: false,
    auto_print: false
  });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { isOnline, pendingCount, retryingCount, failedCount, isSyncing, syncNow, lastSyncResult, getFailedSales, retrySale, deleteSale } = useSync();
  const { user: currentUser, hasRole } = useAuth();
  
  // User dialog
  const [userDialog, setUserDialog] = useState({ open: false, user: null });
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'kasir'
  });

  // Failed sales
  const [failedSales, setFailedSales] = useState([]);
  const [showFailedSales, setShowFailedSales] = useState(false);

  // Backup/Restore
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (failedCount > 0) {
      loadFailedSales();
    }
  }, [failedCount]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        settingsAPI.get(),
        hasRole('owner', 'manager') ? usersAPI.list() : Promise.resolve({ data: { users: [] } })
      ]);
      setStoreSettings(settingsRes.data.settings || {
        store_name: '',
        address: '',
        phone: '',
        footer_text: '',
        print_width: '80mm',
        show_logo: false,
        auto_print: false
      });
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFailedSales = async () => {
    const sales = await getFailedSales();
    setFailedSales(sales);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update(storeSettings);
      toast.success('Pengaturan tersimpan');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateUserDialog = () => {
    setUserDialog({ open: true, user: null });
    setUserForm({
      email: '',
      password: '',
      name: '',
      role: 'kasir'
    });
  };

  const handleSaveUser = async () => {
    if (!userForm.email || !userForm.name || (!userDialog.user && !userForm.password)) {
      toast.error('Lengkapi semua field');
      return;
    }

    try {
      if (userDialog.user) {
        await usersAPI.update(userDialog.user._id, {
          name: userForm.name,
          role: userForm.role,
          is_active: userForm.is_active
        });
        toast.success('User berhasil diperbarui');
      } else {
        await authAPI.register(userForm);
        toast.success('User berhasil ditambahkan');
      }
      setUserDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.detail || 'Gagal menyimpan user');
    }
  };

  const openEditUserDialog = (user) => {
    setUserDialog({ open: true, user });
    setUserForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      is_active: user.is_active !== false
    });
  };

  const handleSync = async () => {
    const result = await syncNow();
    if (result) {
      toast.success(`Sinkronisasi selesai. ${result.sales?.synced || 0} transaksi tersinkron.`);
      loadFailedSales();
    }
  };

  const handleRetrySale = async (saleId) => {
    await retrySale(saleId);
    toast.info('Transaksi akan dicoba ulang');
    loadFailedSales();
  };

  const handleDeleteSale = async (saleId) => {
    await deleteSale(saleId);
    toast.success('Transaksi dihapus');
    loadFailedSales();
  };

  // Backup handler
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await backupAPI.download();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kedaiops_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Gagal membuat backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.version || !data.data) {
          throw new Error('Invalid backup format');
        }
        setRestoreData(data);
        setRestoreDialog(true);
      } catch (err) {
        toast.error('File backup tidak valid');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleRestore = async (type) => {
    if (!restoreData?.data) return;

    setIsRestoring(true);
    try {
      if (type === 'ingredients' && restoreData.data.ingredients) {
        const result = await backupAPI.restoreIngredients(restoreData.data.ingredients, 'merge');
        toast.success(result.data.message);
      } else if (type === 'menus' && restoreData.data.menus) {
        const result = await backupAPI.restoreMenus(restoreData.data.menus, 'merge');
        toast.success(result.data.message);
      } else if (type === 'all') {
        if (restoreData.data.ingredients) {
          await backupAPI.restoreIngredients(restoreData.data.ingredients, 'merge');
        }
        if (restoreData.data.menus) {
          await backupAPI.restoreMenus(restoreData.data.menus, 'merge');
        }
        toast.success('Restore selesai');
      }
      setRestoreDialog(false);
      setRestoreData(null);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(error.response?.data?.detail || 'Gagal restore data');
    } finally {
      setIsRestoring(false);
    }
  };

  // ESC/POS Test Print
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (!printWindow) {
      toast.error('Popup diblokir. Izinkan popup untuk mencetak.');
      return;
    }

    const width = storeSettings.print_width === '58mm' ? '48mm' : '72mm';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Print</title>
        <style>
          @page { size: ${storeSettings.print_width} auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10px; 
            width: ${width}; 
            margin: 0 auto; 
            padding: 4mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center bold">${storeSettings.store_name || 'KEDAI KOPI'}</div>
        ${storeSettings.address ? `<div class="center" style="font-size:8px">${storeSettings.address}</div>` : ''}
        ${storeSettings.phone ? `<div class="center" style="font-size:8px">${storeSettings.phone}</div>` : ''}
        <div class="divider"></div>
        <div class="row"><span>Americano</span><span>1 x 25.000</span></div>
        <div class="row"><span>Kopi Susu</span><span>2 x 30.000</span></div>
        <div class="divider"></div>
        <div class="row bold"><span>TOTAL</span><span>Rp 85.000</span></div>
        <div class="row"><span>Tunai</span><span>Rp 100.000</span></div>
        <div class="row"><span>Kembali</span><span>Rp 15.000</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size:8px">${storeSettings.footer_text || 'Terima kasih!'}</div>
        <div class="center" style="font-size:8px">${new Date().toLocaleString('id-ID')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola pengaturan toko dan sistem
        </p>
      </div>

      <Tabs defaultValue="store" data-testid="settings-tabs">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Toko
          </TabsTrigger>
          <TabsTrigger value="print">
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
            {(pendingCount + retryingCount) > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount + retryingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
          {hasRole('owner', 'manager') && (
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User
            </TabsTrigger>
          )}
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Informasi Toko
              </CardTitle>
              <CardDescription>
                Informasi ini akan ditampilkan di struk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nama Toko</Label>
                <Input
                  id="store_name"
                  placeholder="Kedai Kopi"
                  value={storeSettings.store_name || ''}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, store_name: e.target.value }))}
                  data-testid="settings-store-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  placeholder="Jl. Contoh No. 123"
                  value={storeSettings.address || ''}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  placeholder="08123456789"
                  value={storeSettings.phone || ''}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer_text">Teks Footer Struk</Label>
                <Input
                  id="footer_text"
                  placeholder="Terima kasih!"
                  value={storeSettings.footer_text || ''}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Print Settings */}
        <TabsContent value="print">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Pengaturan Cetak Struk
              </CardTitle>
              <CardDescription>
                Sesuaikan untuk printer thermal ESC/POS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Lebar Kertas Struk</Label>
                <Select 
                  value={storeSettings.print_width || '80mm'} 
                  onValueChange={(v) => setStoreSettings(prev => ({ ...prev, print_width: v }))}
                  data-testid="settings-print-width-select"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm (Thermal Kecil)</SelectItem>
                    <SelectItem value="80mm">80mm (Thermal Standar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Print Setelah Checkout</Label>
                  <p className="text-xs text-muted-foreground">
                    Otomatis cetak setelah transaksi
                  </p>
                </div>
                <Switch
                  checked={storeSettings.auto_print || false}
                  onCheckedChange={(checked) => setStoreSettings(prev => ({ ...prev, auto_print: checked }))}
                  data-testid="settings-auto-print-switch"
                />
              </div>

              <Separator />

              {/* Receipt Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Preview Struk</Label>
                  <Button variant="outline" size="sm" onClick={handleTestPrint} data-testid="test-print-button">
                    <Printer className="h-4 w-4 mr-2" />
                    Test Print
                  </Button>
                </div>
                <div 
                  className="border rounded-lg p-4 bg-white text-black font-mono text-xs mx-auto"
                  style={{ 
                    width: storeSettings.print_width === '58mm' ? '180px' : '240px',
                    transition: 'width 0.3s ease'
                  }}
                  data-testid="receipt-preview"
                >
                  <div className="text-center border-b border-dashed pb-2 mb-2">
                    <p className="font-bold">{storeSettings.store_name || 'KEDAI KOPI'}</p>
                    {storeSettings.address && <p className="text-[10px]">{storeSettings.address}</p>}
                    {storeSettings.phone && <p className="text-[10px]">{storeSettings.phone}</p>}
                  </div>
                  <div className="space-y-1 border-b border-dashed pb-2 mb-2">
                    <div className="flex justify-between">
                      <span>Americano</span>
                      <span>1 x 25.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kopi Susu</span>
                      <span>2 x 30.000</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>Rp 85.000</span>
                  </div>
                  <p className="text-center text-[10px] mt-2 text-gray-500">
                    {storeSettings.footer_text || 'Terima kasih!'}
                  </p>
                </div>
              </div>

              <Alert>
                <Printer className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> Untuk printer thermal, gunakan browser Chrome dan atur ukuran kertas di dialog cetak sesuai lebar printer (58mm atau 80mm).
                </AlertDescription>
              </Alert>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  'Simpan Pengaturan'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Status Sinkronisasi
              </CardTitle>
              <CardDescription>
                Auto retry dengan exponential backoff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="font-medium">Status Koneksi</p>
                    <p className="text-sm text-muted-foreground">
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-secondary text-center">
                  <p className="text-2xl font-semibold tabular-nums">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-100 text-center">
                  <p className="text-2xl font-semibold tabular-nums text-amber-700">{retryingCount}</p>
                  <p className="text-xs text-amber-600">Retrying</p>
                </div>
                <div className="p-4 rounded-lg bg-red-100 text-center">
                  <p className="text-2xl font-semibold tabular-nums text-red-700">{failedCount}</p>
                  <p className="text-xs text-red-600">Gagal</p>
                </div>
              </div>

              {lastSyncResult && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium">Hasil Sync Terakhir:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tersinkron: {lastSyncResult.sales?.synced || 0}, 
                    Gagal: {lastSyncResult.sales?.failed || 0}
                    {lastSyncResult.sales?.retrying > 0 && `, Retry: ${lastSyncResult.sales.retrying}`}
                  </p>
                </div>
              )}

              {failedCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ada {failedCount} transaksi gagal.
                    <Button 
                      variant="link" 
                      className="h-auto p-0 ml-2" 
                      onClick={() => setShowFailedSales(!showFailedSales)}
                    >
                      {showFailedSales ? 'Sembunyikan' : 'Lihat'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {showFailedSales && failedSales.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedSales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-xs">
                            {sale.clientId?.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            Rp {sale.data?.total?.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-xs text-red-600 max-w-[150px] truncate">
                            {sale.errorMessage || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRetrySale(sale.id)}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSale(sale.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button onClick={handleSync} disabled={isSyncing || !isOnline} className="w-full" data-testid="settings-sync-now-button">
                {isSyncing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Menyinkronkan...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Sync Sekarang</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup/Restore */}
        <TabsContent value="backup">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                  Backup Data
                </CardTitle>
                <CardDescription>
                  Download semua data (bahan, menu, transaksi 90 hari)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleBackup} disabled={isBackingUp} data-testid="backup-download-button">
                  {isBackingUp ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat backup...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Download Backup (JSON)</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                  Restore Data
                </CardTitle>
                <CardDescription>
                  Upload file backup untuk mengembalikan data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="restore-upload-button">
                  <Upload className="h-4 w-4 mr-2" />
                  Pilih File Backup (.json)
                </Button>

                <Alert>
                  <FileJson className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Catatan:</strong> Restore hanya menambahkan data baru (merge mode). Data transaksi tidak di-restore untuk mencegah duplikasi.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        {hasRole('owner', 'manager') && (
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                    Manajemen Pengguna
                  </CardTitle>
                  <CardDescription>
                    Kelola akses pengguna
                  </CardDescription>
                </div>
                {hasRole('owner') && (
                  <Button onClick={openCreateUserDialog} data-testid="settings-add-user-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {hasRole('owner') && <TableHead className="text-right">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active !== false ? 'default' : 'secondary'}>
                              {user.is_active !== false ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          {hasRole('owner') && (
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditUserDialog(user)} disabled={user._id === currentUser?._id}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={(open) => setUserDialog({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              {userDialog.user ? 'Edit User' : 'Tambah User Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_name">Nama</Label>
              <Input id="user_name" placeholder="Nama lengkap" value={userForm.name} onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_email">Email</Label>
              <Input id="user_email" type="email" placeholder="email@contoh.com" value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))} disabled={!!userDialog.user} />
            </div>

            {!userDialog.user && (
              <div className="space-y-2">
                <Label htmlFor="user_password">Password</Label>
                <Input id="user_password" type="password" placeholder="Min. 6 karakter" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="user_role">Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm(prev => ({ ...prev, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasir">Kasir</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userDialog.user && (
              <div className="flex items-center justify-between">
                <Label htmlFor="user_active">User Aktif</Label>
                <Switch id="user_active" checked={userForm.is_active !== false} onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, is_active: checked }))} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog({ open: false, user: null })}>Batal</Button>
            <Button onClick={handleSaveUser}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
              Restore Data
            </DialogTitle>
            <DialogDescription>
              File backup dari: {restoreData?.created_at ? new Date(restoreData.created_at).toLocaleString('id-ID') : '-'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold">{restoreData?.data?.ingredients?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Bahan</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold">{restoreData?.data?.menus?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Menu</p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Mode: <strong>Merge</strong> - Hanya menambahkan data baru, tidak menimpa yang sudah ada.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRestoreDialog(false)}>Batal</Button>
            <Button variant="outline" onClick={() => handleRestore('ingredients')} disabled={isRestoring || !restoreData?.data?.ingredients?.length}>
              Restore Bahan
            </Button>
            <Button variant="outline" onClick={() => handleRestore('menus')} disabled={isRestoring || !restoreData?.data?.menus?.length}>
              Restore Menu
            </Button>
            <Button onClick={() => handleRestore('all')} disabled={isRestoring}>
              {isRestoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Restore Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsPage;
