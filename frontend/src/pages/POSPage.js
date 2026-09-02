/**
 * POS (Point of Sale) Page - Main cashier interface
 */
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Search, Loader2, Check, Receipt } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { menusAPI } from '../lib/api';
import { useSync } from '../contexts/SyncContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import syncManager from '../lib/sync';

export function POSPage() {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState(['Semua']);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const { isOnline, addPendingSale } = useSync();

  // Fetch menus
  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from API
      if (isOnline) {
        const [menusRes, catsRes] = await Promise.all([
          menusAPI.list(null, true),
          menusAPI.getCategories()
        ]);
        setMenus(menusRes.data.menus);
        setCategories(['Semua', ...catsRes.data.categories]);
        // Cache for offline
        await syncManager.cacheMenus();
      } else {
        // Use cached menus
        const cached = await syncManager.getCachedMenus();
        setMenus(cached);
        const cats = [...new Set(cached.map(m => m.category))];
        setCategories(['Semua', ...cats]);
      }
    } catch (error) {
      console.error('Error fetching menus:', error);
      // Fallback to cache
      const cached = await syncManager.getCachedMenus();
      if (cached.length > 0) {
        setMenus(cached);
        toast.info('Menggunakan data offline');
      } else {
        toast.error('Gagal memuat menu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter menus
  const filteredMenus = useMemo(() => {
    return menus.filter(menu => {
      const matchCategory = selectedCategory === 'Semua' || menu.category === selectedCategory;
      const matchSearch = !searchQuery || 
        menu.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch && menu.is_active;
    });
  }, [menus, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (menu) => {
    setCart(prev => {
      const existing = prev.find(item => item.menu_id === menu._id);
      if (existing) {
        return prev.map(item => 
          item.menu_id === menu._id 
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        menu_id: menu._id,
        menu_name: menu.name,
        price: menu.price,
        qty: 1,
        subtotal: menu.price
      }];
    });
    toast.success(`${menu.name} +1`, { duration: 1000 });
  };

  const updateQty = (menuId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.menu_id === menuId) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty, subtotal: newQty * item.price };
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const removeFromCart = (menuId) => {
    setCart(prev => prev.filter(item => item.menu_id !== menuId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      const saleData = {
        items: cart,
        total: cartTotal,
        payment_method: paymentMethod,
      };

      // Add to pending sales (works offline)
      const result = await addPendingSale(saleData);
      
      // Create receipt
      const receipt = {
        ...result.data,
        items: cart,
        total: cartTotal,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      };
      
      setLastReceipt(receipt);
      setCheckoutOpen(false);
      setReceiptOpen(true);
      clearCart();
      toast.success('Transaksi berhasil!');
      
      // Refresh menus to get updated stock
      if (isOnline) {
        setTimeout(fetchMenus, 1000);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Transaksi gagal');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col min-h-0 border-r">
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="pos-search-input"
              />
            </div>
          </div>
          
          {/* Category Tabs */}
          <ScrollArea className="w-full" orientation="horizontal">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="h-9" data-testid="pos-category-tabs">
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="px-4">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </ScrollArea>
        </div>

        {/* Menu Grid */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada menu ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMenus.map(menu => (
                <MenuCard 
                  key={menu._id} 
                  menu={menu} 
                  onAdd={() => addToCart(menu)}
                  onUpdateQty={updateQty}
                  formatCurrency={formatCurrency}
                  cartQty={cart.find(c => c.menu_id === menu._id)?.qty || 0}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Panel - Desktop */}
      <div className="hidden lg:flex lg:w-96 flex-col bg-card" data-testid="pos-cart-panel">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <ShoppingCart className="h-5 w-5" />
            Keranjang
            {cartItemCount > 0 && (
              <Badge variant="secondary">{cartItemCount}</Badge>
            )}
          </h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs">Tap menu untuk menambahkan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <CartItem 
                  key={item.menu_id}
                  item={item}
                  onUpdateQty={(delta) => updateQty(item.menu_id, delta)}
                  onRemove={() => removeFromCart(item.menu_id)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        <div className="p-4 border-t bg-secondary/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-semibold tabular-nums">{formatCurrency(cartTotal)}</span>
          </div>
          
          <div className="flex gap-2">
            {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCart}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button 
              className="flex-1 h-11" 
              disabled={cart.length === 0}
              onClick={() => setCheckoutOpen(true)}
              data-testid="pos-checkout-button"
            >
              Bayar ({cartItemCount} item)
            </Button>
          </div>
        </div>
      </div>

      {/* Cart Bottom Bar - Mobile */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-card border-t shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{cartItemCount} item</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(cartTotal)}</p>
            </div>
            <Button 
              className="h-12 px-8"
              onClick={() => setCheckoutOpen(true)}
              data-testid="pos-checkout-button-mobile"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Bayar
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Konfirmasi Pembayaran</DialogTitle>
            <DialogDescription>
              Total: {formatCurrency(cartTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metode Pembayaran</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} data-testid="pos-payment-method-select">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Ringkasan Pesanan</p>
              {cart.map(item => (
                <div key={item.menu_id} className="flex justify-between text-sm">
                  <span>{item.menu_name} x{item.qty}</span>
                  <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Batal</Button>
            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              data-testid="pos-confirm-payment-button"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Konfirmasi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Receipt className="h-5 w-5" />
              Struk Transaksi
            </DialogTitle>
          </DialogHeader>

          {lastReceipt && (
            <div className="receipt-print font-mono text-sm" data-testid="receipt-preview">
              <div className="text-center border-b pb-3 mb-3">
                <h3 className="font-bold">KEDAI KOPI</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastReceipt.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              
              <div className="space-y-1 border-b pb-3 mb-3">
                {lastReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.menu_name}</span>
                    <span className="tabular-nums">
                      {item.qty} x {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(lastReceipt.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Bayar</span>
                <span className="capitalize">{lastReceipt.payment_method}</span>
              </div>
              
              <p className="text-center text-xs text-muted-foreground mt-4">
                Terima kasih!
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>Tutup</Button>
            <Button onClick={() => window.print()} data-testid="receipt-print-button">
              <Receipt className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuCard({ menu, onAdd, onUpdateQty, formatCurrency, cartQty }) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden",
        cartQty > 0 && "ring-2 ring-primary"
      )}
      data-testid="pos-menu-item-card"
    >
      <CardContent className="p-3">
        <div className="aspect-square bg-secondary rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
          {menu.image_url ? (
            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">☕</span>
          )}
          
          {/* Quantity badge */}
          {cartQty > 0 && (
            <div className="absolute top-1 right-1 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium shadow-md z-10">
              {cartQty}
            </div>
          )}
          
          {/* Plus/Minus overlay - shown when item in cart */}
          {cartQty > 0 ? (
            <div 
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-9 w-9 rounded-full bg-white/90 hover:bg-white text-foreground shadow-md"
                onClick={(e) => { e.stopPropagation(); onUpdateQty(menu._id, -1); }}
                data-testid={`menu-minus-${menu._id}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-white font-semibold text-lg min-w-[2rem] text-center tabular-nums drop-shadow-md">
                {cartQty}
              </span>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-9 w-9 rounded-full bg-white/90 hover:bg-white text-foreground shadow-md"
                onClick={(e) => { e.stopPropagation(); onUpdateQty(menu._id, 1); }}
                data-testid={`menu-plus-${menu._id}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Click area for adding - shown when item not in cart */
            <div 
              className="absolute inset-0 flex items-center justify-center"
              onClick={onAdd}
            />
          )}
        </div>
        <div onClick={cartQty === 0 ? onAdd : undefined} className={cartQty > 0 ? "" : "cursor-pointer"}>
          <h3 className="font-medium text-sm truncate">{menu.name}</h3>
          <p className="text-sm text-primary font-semibold tabular-nums">
            {formatCurrency(menu.price)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CartItem({ item, onUpdateQty, onRemove, formatCurrency }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.menu_name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} / item</p>
      </div>
      
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.qty}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="text-right">
        <p className="font-medium text-sm tabular-nums">{formatCurrency(item.subtotal)}</p>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default POSPage;
