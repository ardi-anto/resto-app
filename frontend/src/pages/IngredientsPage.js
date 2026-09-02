/**
 * Ingredients/Stock Management Page
 */
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Loader2, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { ingredientsAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'gram',
    stock_qty: '',
    low_stock_threshold: '',
    price_per_unit: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Adjust stock dialog
  const [adjustDialog, setAdjustDialog] = useState({ open: false, ingredient: null });
  const [adjustData, setAdjustData] = useState({ qty_change: '', reason: 'restock', notes: '' });
  
  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, ingredient: null });

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await ingredientsAPI.list();
      setIngredients(response.data.ingredients);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      toast.error('Gagal memuat data bahan');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredIngredients = ingredients.filter(ing => {
    const matchSearch = !searchQuery || 
      ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLowStock = !showLowStockOnly || 
      ing.stock_qty <= ing.low_stock_threshold;
    return matchSearch && matchLowStock;
  });

  const lowStockCount = ingredients.filter(ing => ing.stock_qty <= ing.low_stock_threshold).length;

  const openCreateForm = () => {
    setEditingIngredient(null);
    setFormData({
      name: '',
      unit: 'gram',
      stock_qty: '',
      low_stock_threshold: '',
      price_per_unit: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      stock_qty: ingredient.stock_qty.toString(),
      low_stock_threshold: ingredient.low_stock_threshold.toString(),
      price_per_unit: ingredient.price_per_unit?.toString() || ''
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama bahan harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: formData.name,
        unit: formData.unit,
        stock_qty: parseFloat(formData.stock_qty) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 0,
        price_per_unit: parseFloat(formData.price_per_unit) || 0
      };

      if (editingIngredient) {
        await ingredientsAPI.update(editingIngredient._id, data);
        toast.success('Bahan berhasil diperbarui');
      } else {
        await ingredientsAPI.create(data);
        toast.success('Bahan berhasil ditambahkan');
      }

      setIsFormOpen(false);
      fetchIngredients();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast.error(error.response?.data?.detail || 'Gagal menyimpan bahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustData.qty_change) {
      toast.error('Masukkan jumlah perubahan');
      return;
    }

    try {
      await ingredientsAPI.adjust({
        ingredient_id: adjustDialog.ingredient._id,
        qty_change: parseFloat(adjustData.qty_change),
        reason: adjustData.reason,
        notes: adjustData.notes
      });
      toast.success('Stok berhasil disesuaikan');
      setAdjustDialog({ open: false, ingredient: null });
      setAdjustData({ qty_change: '', reason: 'restock', notes: '' });
      fetchIngredients();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.detail || 'Gagal menyesuaikan stok');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.ingredient) return;

    try {
      await ingredientsAPI.delete(deleteDialog.ingredient._id);
      toast.success('Bahan berhasil dihapus');
      setDeleteDialog({ open: false, ingredient: null });
      fetchIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast.error(error.response?.data?.detail || 'Gagal menghapus bahan');
    }
  };

  const getStockStatus = (ing) => {
    if (ing.stock_qty === 0) return 'empty';
    if (ing.stock_qty <= ing.low_stock_threshold) return 'low';
    return 'ok';
  };

  const getStockPercentage = (ing) => {
    if (ing.low_stock_threshold === 0) return 100;
    const maxStock = ing.low_stock_threshold * 5; // Assume max is 5x threshold
    return Math.min(100, (ing.stock_qty / maxStock) * 100);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Manajemen Bahan & Stok
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola bahan baku dan pantau stok
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Bahan
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bahan</p>
                <p className="text-2xl font-semibold tabular-nums">{ingredients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={lowStockCount > 0 ? 'border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-bg))]' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                lowStockCount > 0 ? "bg-[hsl(var(--warning-fg))]/10" : "bg-secondary"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  lowStockCount > 0 ? "text-[hsl(var(--warning-fg))]" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stok Menipis</p>
                <p className="text-2xl font-semibold tabular-nums">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari bahan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="ingredients-search-input"
              />
            </div>
            <Button
              variant={showLowStockOnly ? 'default' : 'outline'}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Stok Menipis ({lowStockCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Belum ada bahan</p>
              <Button variant="link" onClick={openCreateForm}>Tambah bahan pertama</Button>
            </div>
          ) : (
            <Table data-testid="ingredients-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map(ing => {
                  const status = getStockStatus(ing);
                  return (
                    <TableRow key={ing._id} className={status === 'low' ? 'bg-[hsl(var(--warning-bg))]/50' : ''}>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>{ing.unit}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums font-medium">
                              {ing.stock_qty.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {ing.low_stock_threshold} min
                            </span>
                          </div>
                          <Progress 
                            value={getStockPercentage(ing)} 
                            className={cn(
                              "h-1.5",
                              status === 'empty' && "[&>div]:bg-destructive",
                              status === 'low' && "[&>div]:bg-amber-500",
                              status === 'ok' && "[&>div]:bg-accent"
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {status === 'empty' ? (
                          <Badge variant="destructive" data-testid="ingredient-low-stock-badge">
                            Habis
                          </Badge>
                        ) : status === 'low' ? (
                          <Badge 
                            className="bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-fg))] border-[hsl(var(--warning-border))]"
                            data-testid="ingredient-low-stock-badge"
                          >
                            Menipis
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Cukup</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setAdjustDialog({ open: true, ingredient: ing });
                              setAdjustData({ qty_change: '', reason: 'restock', notes: '' });
                            }}
                            data-testid="ingredient-adjust-stock-button"
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Sesuaikan
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditForm(ing)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, ingredient: ing })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: 'var(--font-display)' }}>
              {editingIngredient ? 'Edit Bahan' : 'Tambah Bahan Baru'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Bahan *</Label>
              <Input
                id="name"
                placeholder="Contoh: Kopi Arabica"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Satuan</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gram">gram</SelectItem>
                  <SelectItem value="kg">kilogram (kg)</SelectItem>
                  <SelectItem value="ml">mililiter (ml)</SelectItem>
                  <SelectItem value="liter">liter</SelectItem>
                  <SelectItem value="pcs">pcs (buah)</SelectItem>
                  <SelectItem value="kotak">kotak</SelectItem>
                  <SelectItem value="botol">botol</SelectItem>
                  <SelectItem value="sachet">sachet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_qty">Stok Awal</Label>
                <Input
                  id="stock_qty"
                  type="number"
                  placeholder="0"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_qty: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold">Batas Minimum</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  placeholder="100"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_per_unit">Harga per Satuan (Rp) - Opsional</Label>
              <Input
                id="price_per_unit"
                type="number"
                placeholder="1000"
                value={formData.price_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: e.target.value }))}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={(open) => setAdjustDialog({ open, ingredient: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Sesuaikan Stok</DialogTitle>
            <DialogDescription>
              {adjustDialog.ingredient?.name} - Stok saat ini: {adjustDialog.ingredient?.stock_qty} {adjustDialog.ingredient?.unit}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jenis Perubahan</Label>
              <Select 
                value={adjustData.reason} 
                onValueChange={(v) => setAdjustData(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restok (Tambah)</SelectItem>
                  <SelectItem value="waste">Terbuang/Kadaluarsa</SelectItem>
                  <SelectItem value="correction">Koreksi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty_change">Jumlah Perubahan</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setAdjustData(prev => ({
                    ...prev,
                    qty_change: Math.abs(parseFloat(prev.qty_change) || 0).toString()
                  }))}
                  className="shrink-0"
                >
                  <TrendingUp className="h-4 w-4 text-accent" />
                </Button>
                <Input
                  id="qty_change"
                  type="number"
                  placeholder="Masukkan jumlah"
                  value={adjustData.qty_change}
                  onChange={(e) => setAdjustData(prev => ({ ...prev, qty_change: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setAdjustData(prev => ({
                    ...prev,
                    qty_change: (-Math.abs(parseFloat(prev.qty_change) || 0)).toString()
                  }))}
                  className="shrink-0"
                >
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Positif untuk menambah, negatif untuk mengurangi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Contoh: Restok dari supplier A"
                value={adjustData.notes}
                onChange={(e) => setAdjustData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog({ open: false, ingredient: null })}>Batal</Button>
            <Button onClick={handleAdjust}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, ingredient: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Bahan</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus "{deleteDialog.ingredient?.name}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, ingredient: null })}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IngredientsPage;
