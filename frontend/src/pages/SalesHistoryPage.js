/**
 * Sales History Page
 */
import React, { useState, useEffect } from 'react';
import { Search, Receipt, Loader2, Calendar, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { salesAPI } from '../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchSales();
  }, [page, dateRange]);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const params = {
        limit,
        skip: page * limit,
      };
      if (dateRange.from) {
        params.start_date = dateRange.from.toISOString();
      }
      if (dateRange.to) {
        params.end_date = dateRange.to.toISOString();
      }

      const response = await salesAPI.list(params);
      setSales(response.data.sales);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: id });
  };

  const totalPages = Math.ceil(total / limit);

  const openReceipt = (sale) => {
    setSelectedSale(sale);
    setReceiptOpen(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar semua transaksi penjualan
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start" data-testid="sales-date-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}</>
                    ) : (
                      format(dateRange.from, 'dd MMM yyyy')
                    )
                  ) : (
                    'Pilih Tanggal'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDateRange({ from: null, to: null })}
                  >
                    Reset
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex-1" />
            
            <div className="text-sm text-muted-foreground flex items-center">
              Total: {total} transaksi
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Belum ada transaksi</p>
            </div>
          ) : (
            <Table data-testid="sales-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => (
                  <TableRow key={sale._id} data-testid="sales-transaction-row">
                    <TableCell className="text-sm">
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sale.client_id?.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sale.items?.slice(0, 2).map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item.menu_name} x{item.qty}
                          </Badge>
                        ))}
                        {sale.items?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{sale.items.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openReceipt(sale)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {page + 1} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="sales-receipt-preview-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Receipt className="h-5 w-5" />
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="receipt-print font-mono text-sm">
              <div className="text-center border-b pb-3 mb-3">
                <h3 className="font-bold">KEDAI KOPI</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(selectedSale.created_at)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {selectedSale.client_id}
                </p>
              </div>
              
              <div className="space-y-1 border-b pb-3 mb-3">
                {selectedSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.menu_name}</span>
                    <span className="tabular-nums">
                      {item.qty} x {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(selectedSale.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Bayar</span>
                <span className="capitalize">{selectedSale.payment_method}</span>
              </div>
              
              {selectedSale.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Catatan: {selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>Tutup</Button>
            <Button onClick={() => window.print()}>
              <Receipt className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalesHistoryPage;
