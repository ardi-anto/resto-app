/**
 * Settings Page
 */
import React, { useState, useEffect } from 'react';
import { Settings, Store, Users, RefreshCw, Loader2, Plus, Pencil, Shield } from 'lucide-react';
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
import { settingsAPI, usersAPI, authAPI } from '../lib/api';
import { useSync } from '../contexts/SyncContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function SettingsPage() {
  const [storeSettings, setStoreSettings] = useState({
    store_name: '',
    address: '',
    phone: '',
    footer_text: ''
  });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { isOnline, pendingCount, isSyncing, syncNow, lastSyncResult } = useSync();
  const { user: currentUser, hasRole } = useAuth();
  
  // User dialog
  const [userDialog, setUserDialog] = useState({ open: false, user: null });
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'kasir'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        settingsAPI.get(),
        hasRole('owner', 'manager') ? usersAPI.list() : Promise.resolve({ data: { users: [] } })
      ]);
      setStoreSettings(settingsRes.data.settings || {});
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
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
        // Update user
        await usersAPI.update(userDialog.user._id, {
          name: userForm.name,
          role: userForm.role,
          is_active: userForm.is_active
        });
        toast.success('User berhasil diperbarui');
      } else {
        // Create user
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
    }
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
        <TabsList className="mb-6">
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Toko
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sinkronisasi
          </TabsTrigger>
          {hasRole('owner', 'manager') && (
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Pengguna
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

        {/* Sync Settings */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Status Sinkronisasi
              </CardTitle>
              <CardDescription>
                Kelola sinkronisasi data offline
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

              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <div>
                  <p className="font-medium">Transaksi Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Transaksi yang belum tersinkron ke server
                  </p>
                </div>
                <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                  {pendingCount}
                </Badge>
              </div>

              {lastSyncResult && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium">Hasil Sync Terakhir:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tersinkron: {lastSyncResult.sales?.synced || 0}, 
                    Gagal: {lastSyncResult.sales?.failed || 0}
                  </p>
                </div>
              )}

              <Button 
                onClick={handleSync} 
                disabled={isSyncing || !isOnline}
                className="w-full"
                data-testid="settings-sync-now-button"
              >
                {isSyncing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Menyinkronkan...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Sync Sekarang</>
                )}
              </Button>
            </CardContent>
          </Card>
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
                    Kelola akses pengguna ke sistem
                  </CardDescription>
                </div>
                {hasRole('owner') && (
                  <Button onClick={openCreateUserDialog} data-testid="settings-add-user-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah User
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
                          <TableCell>{user.email}</TableCell>
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
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openEditUserDialog(user)}
                                disabled={user._id === currentUser?._id}
                              >
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
              <Input
                id="user_name"
                placeholder="Nama lengkap"
                value={userForm.name}
                onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_email">Email</Label>
              <Input
                id="user_email"
                type="email"
                placeholder="email@contoh.com"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={!!userDialog.user}
              />
            </div>

            {!userDialog.user && (
              <div className="space-y-2">
                <Label htmlFor="user_password">Password</Label>
                <Input
                  id="user_password"
                  type="password"
                  placeholder="Min. 6 karakter"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="user_role">Role</Label>
              <Select 
                value={userForm.role} 
                onValueChange={(v) => setUserForm(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <Switch
                  id="user_active"
                  checked={userForm.is_active !== false}
                  onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog({ open: false, user: null })}>Batal</Button>
            <Button onClick={handleSaveUser}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsPage;
