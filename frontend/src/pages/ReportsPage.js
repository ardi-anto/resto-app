/**
 * Reports Dashboard Page
 */
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportsAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [usageData, setUsageData] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [summaryRes, dailyRes, usageRes] = await Promise.all([
        reportsAPI.summary(startDate.toISOString(), new Date().toISOString()),
        reportsAPI.daily(days),
        reportsAPI.ingredientUsage(days)
      ]);

      setSummary(summaryRes.data);
      setDailyData(dailyRes.data.daily || []);
      setUsageData(usageRes.data.usage || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Gagal memuat laporan');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}jt`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}rb`;
    }
    return value.toString();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Laporan & Analitik
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau performa penjualan dan pemakaian bahan
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod} data-testid="reports-date-range">
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 hari terakhir</SelectItem>
            <SelectItem value="14">14 hari terakhir</SelectItem>
            <SelectItem value="30">30 hari terakhir</SelectItem>
            <SelectItem value="60">60 hari terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Pendapatan"
          value={formatCurrency(summary?.total_revenue || 0)}
          icon={DollarSign}
          isLoading={isLoading}
          testId="reports-kpi-total-sales"
        />
        <KPICard
          title="Total Transaksi"
          value={summary?.total_transactions || 0}
          icon={ShoppingBag}
          isLoading={isLoading}
        />
        <KPICard
          title="Rata-rata / Transaksi"
          value={formatCurrency(
            summary?.total_transactions > 0 
              ? summary.total_revenue / summary.total_transactions 
              : 0
          )}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <KPICard
          title="Stok Menipis"
          value={summary?.low_stock_count || 0}
          icon={AlertTriangle}
          variant={summary?.low_stock_count > 0 ? 'warning' : 'default'}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2" data-testid="reports-chart-sales-trend">
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              Tren Penjualan
            </CardTitle>
            <CardDescription>Pendapatan harian dalam periode</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : dailyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada data di rentang ini</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatShortCurrency}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Pendapatan']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Menus Chart */}
        <Card data-testid="reports-chart-top-menu">
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              Menu Terlaris
            </CardTitle>
            <CardDescription>Berdasarkan jumlah terjual</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : !summary?.top_menus?.length ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada data</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.top_menus.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="_id" 
                    type="category" 
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value) => [value, 'Terjual']}
                  />
                  <Bar 
                    dataKey="qty_sold" 
                    fill="hsl(var(--chart-1))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ingredient Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              Pemakaian Bahan
            </CardTitle>
            <CardDescription>Bahan yang paling banyak terpakai</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : usageData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Belum ada data pemakaian</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usageData.slice(0, 8).map((item, index) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name || 'Unknown'}</p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {item.total_used?.toLocaleString('id-ID')} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Bahan Stok Menipis
            </CardTitle>
            <CardDescription>Segera lakukan restok</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !summary?.low_stock_items?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-accent">Semua stok masih aman!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.low_stock_items.map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2 rounded-lg bg-[hsl(var(--warning-bg))]">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Tersisa: {item.stock_qty} {item.unit} (Min: {item.low_stock_threshold})
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Restok
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, variant = 'default', isLoading, testId }) {
  return (
    <Card className={cn(
      variant === 'warning' && 'border-amber-300 bg-[hsl(var(--warning-bg))]'
    )} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            variant === 'warning' ? "bg-amber-100" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              variant === 'warning' ? "text-amber-600" : "text-primary"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-xl font-semibold tabular-nums truncate">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportsPage;
