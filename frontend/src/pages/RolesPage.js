/**
 * Roles & Permissions Management Page
 */
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, Loader2, Users, Check, X, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { rolesAPI, permissionsAPI, usersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [categories, setCategories] = useState({});
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { hasPermission } = useAuth();

  // Role dialog
  const [roleDialog, setRoleDialog] = useState({ open: false, role: null });
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes, usersRes] = await Promise.all([
        rolesAPI.list(),
        permissionsAPI.list(),
        hasPermission('user.view') ? usersAPI.list() : Promise.resolve({ data: { users: [] } })
      ]);
      setRoles(rolesRes.data.roles || []);
      setPermissions(permsRes.data.permissions || {});
      setCategories(permsRes.data.categories || {});
      setUsers(usersRes.data.users || []);
      
      // Expand all categories by default
      const expanded = {};
      Object.keys(permsRes.data.categories || {}).forEach(cat => {
        expanded[cat] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Gagal memuat data roles');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserCountForRole = (roleId) => {
    return users.filter(u => u.role_id === roleId).length;
  };

  const openCreateDialog = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setRoleDialog({ open: true, role: null });
  };

  const openEditDialog = (role) => {
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: [...role.permissions]
    });
    setRoleDialog({ open: true, role });
  };

  const handlePermissionToggle = (permCode) => {
    setRoleForm(prev => {
      const newPerms = prev.permissions.includes(permCode)
        ? prev.permissions.filter(p => p !== permCode)
        : [...prev.permissions, permCode];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleCategoryToggle = (categoryPerms) => {
    const allSelected = categoryPerms.every(p => roleForm.permissions.includes(p));
    setRoleForm(prev => {
      let newPerms;
      if (allSelected) {
        newPerms = prev.permissions.filter(p => !categoryPerms.includes(p));
      } else {
        newPerms = [...new Set([...prev.permissions, ...categoryPerms])];
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error('Nama role harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      if (roleDialog.role) {
        // Update
        await rolesAPI.update(roleDialog.role._id, roleForm);
        toast.success('Role berhasil diperbarui');
      } else {
        // Create
        await rolesAPI.create(roleForm);
        toast.success('Role berhasil dibuat');
      }
      setRoleDialog({ open: false, role: null });
      fetchData();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error(error.response?.data?.detail || 'Gagal menyimpan role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteDialog.role) return;

    setIsSaving(true);
    try {
      await rolesAPI.delete(deleteDialog.role._id);
      toast.success('Role berhasil dihapus');
      setDeleteDialog({ open: false, role: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.detail || 'Gagal menghapus role');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="roles-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Role & Permission</h1>
          <p className="text-muted-foreground">Kelola akses user berdasarkan role</p>
        </div>
        {hasPermission('role.create') && (
          <Button onClick={openCreateDialog} data-testid="create-role-btn">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Role
          </Button>
        )}
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Daftar Role
          </CardTitle>
          <CardDescription>
            Role menentukan hak akses user di aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Role</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-center">Jumlah Permission</TableHead>
                <TableHead className="text-center">Jumlah User</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role._id} data-testid={`role-row-${role.name}`}>
                  <TableCell className="font-medium capitalize">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{role.permissions?.length || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {getUserCountForRole(role._id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {role.is_system ? (
                      <Badge>Sistem</Badge>
                    ) : (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {hasPermission('role.edit') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                          data-testid={`edit-role-${role.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('role.delete') && !role.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialog({ open: true, role })}
                          data-testid={`delete-role-${role.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ open: false, role: null })}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {roleDialog.role ? 'Edit Role' : 'Tambah Role Baru'}
            </DialogTitle>
            <DialogDescription>
              {roleDialog.role?.is_system 
                ? 'Role sistem - hanya permission yang bisa diubah'
                : 'Atur nama dan permission untuk role ini'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Nama Role</Label>
                <Input
                  id="role-name"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="Contoh: Supervisor"
                  disabled={roleDialog.role?.is_system}
                  data-testid="role-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Deskripsi (opsional)</Label>
                <Input
                  id="role-desc"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Deskripsi singkat"
                  data-testid="role-desc-input"
                />
              </div>
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Permission Matrix</Label>
                <Badge variant="secondary">
                  {roleForm.permissions.length} / {Object.keys(permissions).length} dipilih
                </Badge>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {Object.entries(categories).map(([category, categoryPerms]) => {
                    const selectedInCategory = categoryPerms.filter(p => roleForm.permissions.includes(p)).length;
                    const allSelected = selectedInCategory === categoryPerms.length;
                    const someSelected = selectedInCategory > 0 && !allSelected;

                    return (
                      <Collapsible
                        key={category}
                        open={expandedCategories[category]}
                        onOpenChange={() => toggleCategory(category)}
                      >
                        <Card className="overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div 
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              data-testid={`category-${category}`}
                            >
                              <div className="flex items-center gap-3">
                                {expandedCategories[category] ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">{category}</span>
                                <Badge variant="outline" className="text-xs">
                                  {selectedInCategory}/{categoryPerms.length}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCategoryToggle(categoryPerms);
                                  }}
                                  className="h-7 text-xs"
                                >
                                  {allSelected ? 'Hapus Semua' : 'Pilih Semua'}
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Separator />
                            <div className="p-3 grid grid-cols-2 gap-2">
                              {categoryPerms.map((permCode) => (
                                <div
                                  key={permCode}
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                                >
                                  <Checkbox
                                    id={permCode}
                                    checked={roleForm.permissions.includes(permCode)}
                                    onCheckedChange={() => handlePermissionToggle(permCode)}
                                    data-testid={`perm-${permCode}`}
                                  />
                                  <Label
                                    htmlFor={permCode}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {permissions[permCode] || permCode}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setRoleDialog({ open: false, role: null })}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isSaving}
              data-testid="save-role-btn"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {roleDialog.role ? 'Simpan Perubahan' : 'Buat Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, role: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Role</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus role "{deleteDialog.role?.name}"? 
              Aksi ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {getUserCountForRole(deleteDialog.role?._id) > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Role ini masih digunakan oleh {getUserCountForRole(deleteDialog.role?._id)} user. 
                Pindahkan user ke role lain terlebih dahulu.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, role: null })}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isSaving || getUserCountForRole(deleteDialog.role?._id) > 0}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RolesPage;
