import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, ShoppingCart, ClipboardList, XCircle, Settings } from 'lucide-react';
import { CustomerList } from './CustomerList';
import { ProductList } from './ProductList';
import { OrderList } from './OrderList';
import { CreateOrderDialog } from './CreateOrderDialog';
import { ThemeToggle } from './theme-toggle';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export function OrderDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
  });
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('app-currency') || 'USD';
  });
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const [ordersResult, pendingOrdersResult, cancelledOrdersResult] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);

      setStats({
        totalOrders: ordersResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        cancelledOrders: cancelledOrdersResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('app-currency', newCurrency);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management Dashboard</h1>
          <p className="text-muted-foreground">Manage your customers, products, and orders</p>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button onClick={() => setShowCreateOrder(true)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <OrderList onDataChange={fetchStats} />
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4">
          <CustomerList onDataChange={fetchStats} />
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <ProductList onDataChange={fetchStats} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Application Settings
              </CardTitle>
              <CardDescription>Configure your application preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This currency will be used as the default for new orders.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateOrderDialog 
        open={showCreateOrder} 
        onOpenChange={setShowCreateOrder}
        onOrderCreated={fetchStats}
        defaultCurrency={currency}
      />
    </div>
  );
}