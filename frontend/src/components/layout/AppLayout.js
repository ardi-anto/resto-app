/**
 * Main App Layout with Sidebar Navigation
 */
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Coffee, Package, ShoppingCart, BarChart3, Settings, Users,
  Menu, X, LogOut, Wifi, WifiOff, RefreshCw, ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/pos', icon: ShoppingCart, label: 'Kasir (POS)', roles: ['owner', 'manager', 'kasir'] },
  { path: '/menus', icon: Coffee, label: 'Menu', roles: ['owner', 'manager'] },
  { path: '/ingredients', icon: Package, label: 'Bahan / Stok', roles: ['owner', 'manager'] },
  { path: '/reports', icon: BarChart3, label: 'Laporan', roles: ['owner', 'manager'] },
  { path: '/settings', icon: Settings, label: 'Pengaturan', roles: ['owner'] },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncNow } = useSync();

  const filteredNavItems = navItems.filter(item => 
    item.roles.some(role => hasRole(role))
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setSidebarOpen(true)}
          data-testid="mobile-menu-button"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-primary" />
          <span className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>KedaiOps</span>
        </div>

        <SyncStatusButton 
          isOnline={isOnline} 
          pendingCount={pendingCount} 
          isSyncing={isSyncing} 
          onSync={syncNow} 
        />
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-card border-r">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>KedaiOps</h1>
              <p className="text-xs text-muted-foreground">POS & Stok Otomatis</p>
            </div>
          </div>

          {/* Sync Status */}
          <div className="px-4 py-3 border-b">
            <SyncStatusBanner 
              isOnline={isOnline} 
              pendingCount={pendingCount} 
              isSyncing={isSyncing} 
              onSync={syncNow} 
            />
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/pos' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    data-testid={`nav-${item.path.slice(1)}`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={logout}
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-primary" />
                <span className="font-semibold">KedaiOps</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="p-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Link>
                );
              })}
            </nav>
            
            <Separator className="my-3" />
            
            <div className="px-4">
              <SyncStatusBanner 
                isOnline={isOnline} 
                pendingCount={pendingCount} 
                isSyncing={isSyncing} 
                onSync={syncNow} 
              />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function SyncStatusButton({ isOnline, pendingCount, isSyncing, onSync }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onSync}
      disabled={isSyncing || !isOnline}
      className="relative"
      data-testid="pos-sync-status-indicator"
    >
      {isSyncing ? (
        <RefreshCw className="h-5 w-5 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-5 w-5 text-accent" />
      ) : (
        <WifiOff className="h-5 w-5 text-amber-500" />
      )}
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
          {pendingCount}
        </span>
      )}
    </Button>
  );
}

function SyncStatusBanner({ isOnline, pendingCount, isSyncing, onSync }) {
  return (
    <div 
      className={cn(
        "rounded-lg p-3 text-sm",
        isOnline ? "bg-[hsl(var(--success-bg))]" : "bg-[hsl(var(--warning-bg))]"
      )}
      data-testid="sync-banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-[hsl(var(--success-fg))]" />
          ) : (
            <WifiOff className="h-4 w-4 text-[hsl(var(--warning-fg))]" />
          )}
          <span className={isOnline ? "text-[hsl(var(--success-fg))]" : "text-[hsl(var(--warning-fg))]"}>  
            {isOnline ? 'Online' : 'Mode Offline'}
          </span>
        </div>
        
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs" data-testid="sync-queue-count">
            {pendingCount} pending
          </Badge>
        )}
      </div>
      
      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-2 h-8"
          onClick={onSync}
          disabled={isSyncing}
          data-testid="sync-now-button"
        >
          {isSyncing ? (
            <><RefreshCw className="h-3 w-3 mr-2 animate-spin" /> Menyinkronkan...</>
          ) : (
            <><RefreshCw className="h-3 w-3 mr-2" /> Sync Sekarang</>
          )}
        </Button>
      )}
    </div>
  );
}

export default AppLayout;
