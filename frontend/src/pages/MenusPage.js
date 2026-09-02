/**
 * Menu Management Page
 */
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Coffee, Loader2, X, ChevronDown, Image, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { menusAPI, ingredientsAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Default categories
const DEFAULT_CATEGORIES = ['Umum', 'Kopi', 'Non-Kopi', 'Makanan', 'Snack'];

export function MenusPage() {
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Umum',
    price: '',
    is_active: true,
    image_url: '',
    recipe: []
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom category state
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  
  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, menu: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menusRes, ingredientsRes, categoriesRes] = await Promise.all([
        menusAPI.list(),
        ingredientsAPI.list(),
        menusAPI.getCategories()
      ]);
      setMenus(menusRes.data.menus);
      setIngredients(ingredientsRes.data.ingredients);
      // Merge default categories with existing ones from menus
      const existingCats = categoriesRes.data.categories || [];
      const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCats])];
      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMenus = menus.filter(menu => {
    const matchSearch = !searchQuery || 
      menu.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === 'all' || menu.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const openCreateForm = () => {
    setEditingMenu(null);
    setFormData({
      name: '',
      category: 'Umum',
      price: '',
      is_active: true,
      image_url: '',
      recipe: []
    });
    setShowCustomCategory(false);
    setCustomCategory('');
    setIsFormOpen(true);
  };

  const openEditForm = (menu) => {
    setEditingMenu(menu);
    // Check if category is custom (not in defaults)
    const isCustomCat = !DEFAULT_CATEGORIES.includes(menu.category);
    setFormData({
      name: menu.name,
      category: isCustomCat ? '__custom__' : menu.category,
      price: menu.price.toString(),
      is_active: menu.is_active,
      image_url: menu.image_url || '',
      recipe: menu.recipe || []
    });
    setShowCustomCategory(isCustomCat);
    setCustomCategory(isCustomCat ? menu.category : '');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.price) {
      toast.error('Nama dan harga harus diisi');
      return;
    }

    // Validate custom category
    const finalCategory = formData.category === '__custom__' ? customCategory.trim() : formData.category;
    if (!finalCategory) {
      toast.error('Kategori harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        category: finalCategory,
        price: parseFloat(formData.price),
        recipe: formData.recipe.map(r => ({
          ingredient_id: r.ingredient_id,
          qty: parseFloat(r.qty)
        }))
      };

      if (editingMenu) {
        await menusAPI.update(editingMenu._id, data);
        toast.success('Menu berhasil diperbarui');
      } else {
        await menusAPI.create(data);
        toast.success('Menu berhasil ditambahkan');
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error(error.response?.data?.detail || 'Gagal menyimpan menu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryChange = (value) => {
    if (value === '__custom__') {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category: '__custom__' }));
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.menu) return;

    try {
      await menusAPI.delete(deleteDialog.menu._id);
      toast.success('Menu berhasil dihapus');
      setDeleteDialog({ open: false, menu: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error(error.response?.data?.detail || 'Gagal menghapus menu');
    }
  };

  // Recipe management
  const addRecipeItem = () => {
    if (ingredients.length === 0) {
      toast.error('Tambahkan bahan terlebih dahulu');
      return;
    }
    setFormData(prev => ({
      ...prev,
      recipe: [...prev.recipe, { ingredient_id: '', qty: '' }]
    }));
  };

  const updateRecipeItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeRecipeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index)
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getIngredientName = (id) => {
    const ing = ingredients.find(i => i._id === id);
    return ing ? `${ing.name} (${ing.unit})` : 'Unknown';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Manajemen Menu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola menu dan resep bahan
          </p>
        </div>
        <Button onClick={openCreateForm} data-testid="menu-create-button">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Menu
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Belum ada menu</p>
              <Button variant="link" onClick={openCreateForm}>Tambah menu pertama</Button>
            </div>
          ) : (
            <Table data-testid="menu-list-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Resep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMenus.map(menu => (
                  <TableRow key={menu._id}>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{menu.category}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(menu.price)}</TableCell>
                    <TableCell>
                      {menu.recipe?.length > 0 ? (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              {menu.recipe.length} bahan
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <div className="text-xs space-y-1">
                              {menu.recipe.map((r, i) => (
                                <div key={i} className="text-muted-foreground" data-testid="menu-recipe-row">
                                  {getIngredientName(r.ingredient_id)}: {r.qty}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                        {menu.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditForm(menu)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteDialog({ open: true, menu })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-lg" data-testid="menu-edit-drawer">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: 'var(--font-display)' }}>
              {editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] pr-4">
            <div className="space-y-4 py-4">
              {/* Image Preview & URL */}
              <div className="space-y-2">
                <Label>Gambar Menu</Label>
                <div className="flex gap-3">
                  <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                    {formData.image_url ? (
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={cn(
                      "flex flex-col items-center justify-center text-muted-foreground",
                      formData.image_url && "hidden"
                    )}>
                      <Image className="h-8 w-8 mb-1 opacity-50" />
                      <span className="text-xs">No Image</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="URL gambar (https://...)"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Masukkan URL gambar dari internet atau kosongkan untuk menggunakan ikon default
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Menu *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Americano"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {/* Show custom categories from existing menus */}
                      {categories
                        .filter(cat => !DEFAULT_CATEGORIES.includes(cat))
                        .map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))
                      }
                      <Separator className="my-1" />
                      <SelectItem value="__custom__">
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Kategori Baru...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomCategory && (
                    <Input
                      placeholder="Nama kategori baru"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2"
                      autoFocus
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Harga (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="25000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Menu Aktif</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <Separator />

              {/* Recipe Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Resep Bahan</Label>
                  <Button variant="outline" size="sm" onClick={addRecipeItem}>
                    <Plus className="h-3 w-3 mr-1" /> Tambah Bahan
                  </Button>
                </div>

                {formData.recipe.length === 0 ? (
                  <Card className="bg-secondary/50">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      <p>Belum ada bahan ditambahkan</p>
                      <p className="text-xs">Tambahkan bahan untuk menghitung stok otomatis</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {formData.recipe.map((item, index) => (
                      <div key={index} className="flex items-center gap-2" data-testid="menu-recipe-row">
                        <Select
                          value={item.ingredient_id}
                          onValueChange={(v) => updateRecipeItem(index, 'ingredient_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pilih bahan" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map(ing => (
                              <SelectItem key={ing._id} value={ing._id}>
                                {ing.name} ({ing.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Jumlah"
                          value={item.qty}
                          onChange={(e) => updateRecipeItem(index, 'qty', e.target.value)}
                          className="w-24"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() => removeRecipeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="menu-save-button">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, menu: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Menu</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus menu "{deleteDialog.menu?.name}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, menu: null })}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MenusPage;
