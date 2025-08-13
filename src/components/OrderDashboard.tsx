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
                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                    <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                    <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                    <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                    <SelectItem value="RUB">RUB - Russian Ruble</SelectItem>
                    <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                    <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                    <SelectItem value="CLP">CLP - Chilean Peso</SelectItem>
                    <SelectItem value="COP">COP - Colombian Peso</SelectItem>
                    <SelectItem value="PEN">PEN - Peruvian Sol</SelectItem>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                    <SelectItem value="MAD">MAD - Moroccan Dirham</SelectItem>
                    <SelectItem value="TND">TND - Tunisian Dinar</SelectItem>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="QAR">QAR - Qatari Riyal</SelectItem>
                    <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                    <SelectItem value="BHD">BHD - Bahraini Dinar</SelectItem>
                    <SelectItem value="OMR">OMR - Omani Rial</SelectItem>
                    <SelectItem value="JOD">JOD - Jordanian Dinar</SelectItem>
                    <SelectItem value="LBP">LBP - Lebanese Pound</SelectItem>
                    <SelectItem value="ILS">ILS - Israeli Shekel</SelectItem>
                    <SelectItem value="THB">THB - Thai Baht</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                    <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                    <SelectItem value="TWD">TWD - Taiwan Dollar</SelectItem>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="NPR">NPR - Nepalese Rupee</SelectItem>
                    <SelectItem value="MMK">MMK - Myanmar Kyat</SelectItem>
                    <SelectItem value="KHR">KHR - Cambodian Riel</SelectItem>
                    <SelectItem value="LAK">LAK - Lao Kip</SelectItem>
                    <SelectItem value="BND">BND - Brunei Dollar</SelectItem>
                    <SelectItem value="FJD">FJD - Fijian Dollar</SelectItem>
                    <SelectItem value="PGK">PGK - Papua New Guinea Kina</SelectItem>
                    <SelectItem value="ISK">ISK - Icelandic Krona</SelectItem>
                    <SelectItem value="BGN">BGN - Bulgarian Lev</SelectItem>
                    <SelectItem value="RON">RON - Romanian Leu</SelectItem>
                    <SelectItem value="HRK">HRK - Croatian Kuna</SelectItem>
                    <SelectItem value="RSD">RSD - Serbian Dinar</SelectItem>
                    <SelectItem value="MKD">MKD - North Macedonian Denar</SelectItem>
                    <SelectItem value="ALL">ALL - Albanian Lek</SelectItem>
                    <SelectItem value="BAM">BAM - Bosnia-Herzegovina Convertible Mark</SelectItem>
                    <SelectItem value="UAH">UAH - Ukrainian Hryvnia</SelectItem>
                    <SelectItem value="BYN">BYN - Belarusian Ruble</SelectItem>
                    <SelectItem value="MDL">MDL - Moldovan Leu</SelectItem>
                    <SelectItem value="GEL">GEL - Georgian Lari</SelectItem>
                    <SelectItem value="AMD">AMD - Armenian Dram</SelectItem>
                    <SelectItem value="AZN">AZN - Azerbaijani Manat</SelectItem>
                    <SelectItem value="KZT">KZT - Kazakhstani Tenge</SelectItem>
                    <SelectItem value="UZS">UZS - Uzbekistani Som</SelectItem>
                    <SelectItem value="KGS">KGS - Kyrgyzstani Som</SelectItem>
                    <SelectItem value="TJS">TJS - Tajikistani Somoni</SelectItem>
                    <SelectItem value="TMT">TMT - Turkmenistani Manat</SelectItem>
                    <SelectItem value="AFN">AFN - Afghan Afghani</SelectItem>
                    <SelectItem value="IRR">IRR - Iranian Rial</SelectItem>
                    <SelectItem value="IQD">IQD - Iraqi Dinar</SelectItem>
                    <SelectItem value="SYP">SYP - Syrian Pound</SelectItem>
                    <SelectItem value="YER">YER - Yemeni Rial</SelectItem>
                    <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                    <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                    <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                    <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                    <SelectItem value="DJF">DJF - Djiboutian Franc</SelectItem>
                    <SelectItem value="SOS">SOS - Somali Shilling</SelectItem>
                    <SelectItem value="CDF">CDF - Congolese Franc</SelectItem>
                    <SelectItem value="AOA">AOA - Angolan Kwanza</SelectItem>
                    <SelectItem value="MZN">MZN - Mozambican Metical</SelectItem>
                    <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                    <SelectItem value="BWP">BWP - Botswana Pula</SelectItem>
                    <SelectItem value="NAD">NAD - Namibian Dollar</SelectItem>
                    <SelectItem value="SZL">SZL - Swazi Lilangeni</SelectItem>
                    <SelectItem value="LSL">LSL - Lesotho Loti</SelectItem>
                    <SelectItem value="MGA">MGA - Malagasy Ariary</SelectItem>
                    <SelectItem value="MUR">MUR - Mauritian Rupee</SelectItem>
                    <SelectItem value="SCR">SCR - Seychellois Rupee</SelectItem>
                    <SelectItem value="KMF">KMF - Comorian Franc</SelectItem>
                    <SelectItem value="CVE">CVE - Cape Verdean Escudo</SelectItem>
                    <SelectItem value="GMD">GMD - Gambian Dalasi</SelectItem>
                    <SelectItem value="GNF">GNF - Guinean Franc</SelectItem>
                    <SelectItem value="LRD">LRD - Liberian Dollar</SelectItem>
                    <SelectItem value="SLL">SLL - Sierra Leonean Leone</SelectItem>
                    <SelectItem value="BIF">BIF - Burundian Franc</SelectItem>
                    <SelectItem value="XOF">XOF - West African CFA Franc</SelectItem>
                    <SelectItem value="XAF">XAF - Central African CFA Franc</SelectItem>
                    <SelectItem value="STN">STN - São Tomé and Príncipe Dobra</SelectItem>
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