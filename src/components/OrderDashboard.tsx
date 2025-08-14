import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, ShoppingCart, ClipboardList, XCircle, Settings, FileText } from 'lucide-react';
import { CustomerList } from './CustomerList';
import { ProductList } from './ProductList';
import { OrderList } from './OrderList';
import { CreateOrderDialog } from './CreateOrderDialog';
import { ThemeToggle } from './theme-toggle';
import { OrderStatusSettings } from './OrderStatusSettings';
import { LanguageSelector } from './LanguageSelector';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

interface InvoiceSettings {
  id: string;
  company_name: string;
  phone_number: string;
  facebook_account: string;
  instagram_account: string;
  snapchat_account: string;
  address_line1: string;
  address_line2: string;
  city: string;
  country: string;
  logo_url?: string;
}

export function OrderDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
  });
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('app-currency') || 'USD';
  });
  const [startingOrderNumber, setStartingOrderNumber] = useState(() => {
    return parseInt(localStorage.getItem('starting-order-number') || '1');
  });
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
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

  const fetchInvoiceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setInvoiceSettings(data);
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice settings",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStats();
    fetchInvoiceSettings();
    
    // Initialize order sequence if this is the first time
    const initializeSequence = async () => {
      try {
        const savedStartingNumber = localStorage.getItem('starting-order-number');
        if (savedStartingNumber) {
          const startNum = parseInt(savedStartingNumber);
          // Only reset if the current sequence value is less than our setting
          const { data: seqData } = await supabase
            .from('orders')
            .select('order_number')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!seqData || seqData.length === 0) {
            // No orders exist, set the sequence to our starting number
            await supabase.rpc('reset_order_sequence', { new_start: startNum });
          }
        }
      } catch (error) {
        console.error('Error initializing sequence:', error);
      }
    };
    
    initializeSequence();
  }, []);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('app-currency', newCurrency);
  };

  const handleStartingOrderNumberChange = async (newNumber: number) => {
    try {
      // Reset the sequence in the database
      const { error } = await supabase
        .rpc('reset_order_sequence', { 
          new_start: newNumber 
        });

      if (error) {
        console.error('Error updating order sequence:', error);
        toast({
          title: "Error",
          description: "Failed to update starting order number",
          variant: "destructive",
        });
        return;
      }

      setStartingOrderNumber(newNumber);
      localStorage.setItem('starting-order-number', newNumber.toString());
      
      toast({
        title: "Success",
        description: `Starting order number updated to ${newNumber}. Next new order will use this as the base number.`,
      });
    } catch (error) {
      console.error('Error updating starting order number:', error);
      toast({
        title: "Error",
        description: "Failed to update starting order number",
         variant: "destructive",
       });
     }
   };

  const handleInvoiceSettingsUpdate = async (updatedSettings: Partial<InvoiceSettings>) => {
    if (!invoiceSettings) return;

    try {
      const { error } = await supabase
        .from('invoice_settings')
        .update(updatedSettings)
        .eq('id', invoiceSettings.id);

      if (error) throw error;

      setInvoiceSettings({ ...invoiceSettings, ...updatedSettings });
      
      toast({
        title: "Success",
        description: "Invoice settings updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating invoice settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice settings",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!invoiceSettings) return;

    // Validate file size (400KB limit)
    if (file.size > 400 * 1024) {
      toast({
        title: "Error",
        description: "Logo file size must be less than 400KB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Logo must be a JPEG, PNG, WebP, or SVG file",
        variant: "destructive",
      });
      return;
    }

    setLogoUploading(true);
    
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${invoiceSettings.id}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update invoice settings with logo URL
      await handleInvoiceSettingsUpdate({ logo_url: urlData.publicUrl });

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!invoiceSettings?.logo_url) return;

    try {
      // Extract filename from URL to delete from storage
      const url = new URL(invoiceSettings.logo_url);
      const fileName = url.pathname.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('company-logos')
          .remove([`logos/${fileName}`]);
      }

      // Update invoice settings to remove logo URL
      await handleInvoiceSettingsUpdate({ logo_url: null });

      toast({
        title: "Success",
        description: "Logo removed successfully",
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    }
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
            <span className="hidden sm:inline">Create Order</span>
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
                {t('applicationSettings')}
              </CardTitle>
              <CardDescription>Configure your application preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Selection */}
              <LanguageSelector />
              
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AFN">AFN - Afghan Afghani</SelectItem>
                    <SelectItem value="ALL">ALL - Albanian Lek</SelectItem>
                    <SelectItem value="DZD">DZD - Algerian Dinar</SelectItem>
                    <SelectItem value="AOA">AOA - Angolan Kwanza</SelectItem>
                    <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                    <SelectItem value="AMD">AMD - Armenian Dram</SelectItem>
                    <SelectItem value="AWG">AWG - Aruban Florin</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="AZN">AZN - Azerbaijani Manat</SelectItem>
                    <SelectItem value="BSD">BSD - Bahamian Dollar</SelectItem>
                    <SelectItem value="BHD">BHD - Bahraini Dinar</SelectItem>
                    <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                    <SelectItem value="BBD">BBD - Barbadian Dollar</SelectItem>
                    <SelectItem value="BYN">BYN - Belarusian Ruble</SelectItem>
                    <SelectItem value="BZD">BZD - Belize Dollar</SelectItem>
                    <SelectItem value="XOF">XOF - Benin CFA Franc</SelectItem>
                    <SelectItem value="BMD">BMD - Bermudian Dollar</SelectItem>
                    <SelectItem value="BTN">BTN - Bhutanese Ngultrum</SelectItem>
                    <SelectItem value="BOB">BOB - Bolivian Boliviano</SelectItem>
                    <SelectItem value="BAM">BAM - Bosnia-Herzegovina Convertible Mark</SelectItem>
                    <SelectItem value="BWP">BWP - Botswana Pula</SelectItem>
                    <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="BND">BND - Brunei Dollar</SelectItem>
                    <SelectItem value="BGN">BGN - Bulgarian Lev</SelectItem>
                    <SelectItem value="XOF">XOF - Burkina Faso CFA Franc</SelectItem>
                    <SelectItem value="BIF">BIF - Burundian Franc</SelectItem>
                    <SelectItem value="KHR">KHR - Cambodian Riel</SelectItem>
                    <SelectItem value="XAF">XAF - Cameroonian CFA Franc</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="CVE">CVE - Cape Verdean Escudo</SelectItem>
                    <SelectItem value="KYD">KYD - Cayman Islands Dollar</SelectItem>
                    <SelectItem value="XAF">XAF - Central African CFA Franc</SelectItem>
                    <SelectItem value="XAF">XAF - Chad CFA Franc</SelectItem>
                    <SelectItem value="CLP">CLP - Chilean Peso</SelectItem>
                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    <SelectItem value="COP">COP - Colombian Peso</SelectItem>
                    <SelectItem value="KMF">KMF - Comorian Franc</SelectItem>
                    <SelectItem value="CDF">CDF - Congolese Franc</SelectItem>
                    <SelectItem value="CRC">CRC - Costa Rican Colón</SelectItem>
                    <SelectItem value="HRK">HRK - Croatian Kuna</SelectItem>
                    <SelectItem value="CUP">CUP - Cuban Peso</SelectItem>
                    <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                    <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                    <SelectItem value="DJF">DJF - Djiboutian Franc</SelectItem>
                    <SelectItem value="DOP">DOP - Dominican Peso</SelectItem>
                    <SelectItem value="XCD">XCD - East Caribbean Dollar</SelectItem>
                    <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                    <SelectItem value="SVC">SVC - El Salvador Colón</SelectItem>
                    <SelectItem value="XAF">XAF - Equatorial Guinea CFA Franc</SelectItem>
                    <SelectItem value="ERN">ERN - Eritrean Nakfa</SelectItem>
                    <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="FKP">FKP - Falkland Islands Pound</SelectItem>
                    <SelectItem value="FJD">FJD - Fijian Dollar</SelectItem>
                    <SelectItem value="XAF">XAF - Gabon CFA Franc</SelectItem>
                    <SelectItem value="GMD">GMD - Gambian Dalasi</SelectItem>
                    <SelectItem value="GEL">GEL - Georgian Lari</SelectItem>
                    <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                    <SelectItem value="GIP">GIP - Gibraltar Pound</SelectItem>
                    <SelectItem value="GTQ">GTQ - Guatemalan Quetzal</SelectItem>
                    <SelectItem value="GNF">GNF - Guinean Franc</SelectItem>
                    <SelectItem value="GYD">GYD - Guyanese Dollar</SelectItem>
                    <SelectItem value="HTG">HTG - Haitian Gourde</SelectItem>
                    <SelectItem value="HNL">HNL - Honduran Lempira</SelectItem>
                    <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                    <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                    <SelectItem value="ISK">ISK - Icelandic Krona</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="IRR">IRR - Iranian Rial</SelectItem>
                    <SelectItem value="IQD">IQD - Iraqi Dinar</SelectItem>
                    <SelectItem value="ILS">ILS - Israeli Shekel</SelectItem>
                    <SelectItem value="JMD">JMD - Jamaican Dollar</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="JOD">JOD - Jordanian Dinar</SelectItem>
                    <SelectItem value="KZT">KZT - Kazakhstani Tenge</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                    <SelectItem value="KGS">KGS - Kyrgyzstani Som</SelectItem>
                    <SelectItem value="LAK">LAK - Lao Kip</SelectItem>
                    <SelectItem value="LVL">LVL - Latvian Lats</SelectItem>
                    <SelectItem value="LBP">LBP - Lebanese Pound</SelectItem>
                    <SelectItem value="LSL">LSL - Lesotho Loti</SelectItem>
                    <SelectItem value="LRD">LRD - Liberian Dollar</SelectItem>
                    <SelectItem value="LYD">LYD - Libyan Dinar</SelectItem>
                    <SelectItem value="LTL">LTL - Lithuanian Litas</SelectItem>
                    <SelectItem value="MOP">MOP - Macanese Pataca</SelectItem>
                    <SelectItem value="MGA">MGA - Malagasy Ariary</SelectItem>
                    <SelectItem value="MWK">MWK - Malawian Kwacha</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="MVR">MVR - Maldivian Rufiyaa</SelectItem>
                    <SelectItem value="XOF">XOF - Mali CFA Franc</SelectItem>
                    <SelectItem value="MRU">MRU - Mauritanian Ouguiya</SelectItem>
                    <SelectItem value="MUR">MUR - Mauritian Rupee</SelectItem>
                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                    <SelectItem value="MDL">MDL - Moldovan Leu</SelectItem>
                    <SelectItem value="MNT">MNT - Mongolian Tugrik</SelectItem>
                    <SelectItem value="MAD">MAD - Moroccan Dirham</SelectItem>
                    <SelectItem value="MZN">MZN - Mozambican Metical</SelectItem>
                    <SelectItem value="MMK">MMK - Myanmar Kyat</SelectItem>
                    <SelectItem value="NAD">NAD - Namibian Dollar</SelectItem>
                    <SelectItem value="NPR">NPR - Nepalese Rupee</SelectItem>
                    <SelectItem value="ANG">ANG - Netherlands Antillean Guilder</SelectItem>
                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                    <SelectItem value="NIO">NIO - Nicaraguan Córdoba</SelectItem>
                    <SelectItem value="XOF">XOF - Niger CFA Franc</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                    <SelectItem value="MKD">MKD - North Macedonian Denar</SelectItem>
                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                    <SelectItem value="OMR">OMR - Omani Rial</SelectItem>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="PAB">PAB - Panamanian Balboa</SelectItem>
                    <SelectItem value="PGK">PGK - Papua New Guinea Kina</SelectItem>
                    <SelectItem value="PYG">PYG - Paraguayan Guarani</SelectItem>
                    <SelectItem value="PEN">PEN - Peruvian Sol</SelectItem>
                    <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                    <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                    <SelectItem value="QAR">QAR - Qatari Riyal</SelectItem>
                    <SelectItem value="XAF">XAF - Republic of the Congo CFA Franc</SelectItem>
                    <SelectItem value="RON">RON - Romanian Leu</SelectItem>
                    <SelectItem value="RUB">RUB - Russian Ruble</SelectItem>
                    <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                    <SelectItem value="SHP">SHP - Saint Helena Pound</SelectItem>
                    <SelectItem value="WST">WST - Samoan Tala</SelectItem>
                    <SelectItem value="STN">STN - São Tomé and Príncipe Dobra</SelectItem>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="XOF">XOF - Senegal CFA Franc</SelectItem>
                    <SelectItem value="RSD">RSD - Serbian Dinar</SelectItem>
                    <SelectItem value="SCR">SCR - Seychellois Rupee</SelectItem>
                    <SelectItem value="SLL">SLL - Sierra Leonean Leone</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="SBD">SBD - Solomon Islands Dollar</SelectItem>
                    <SelectItem value="SOS">SOS - Somali Shilling</SelectItem>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                    <SelectItem value="SSP">SSP - South Sudanese Pound</SelectItem>
                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                    <SelectItem value="SDG">SDG - Sudanese Pound</SelectItem>
                    <SelectItem value="SRD">SRD - Surinamese Dollar</SelectItem>
                    <SelectItem value="SZL">SZL - Swazi Lilangeni</SelectItem>
                    <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                    <SelectItem value="SYP">SYP - Syrian Pound</SelectItem>
                    <SelectItem value="TWD">TWD - Taiwan Dollar</SelectItem>
                    <SelectItem value="TJS">TJS - Tajikistani Somoni</SelectItem>
                    <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                    <SelectItem value="THB">THB - Thai Baht</SelectItem>
                    <SelectItem value="XOF">XOF - Togo CFA Franc</SelectItem>
                    <SelectItem value="TOP">TOP - Tongan Paʻanga</SelectItem>
                    <SelectItem value="TTD">TTD - Trinidad and Tobago Dollar</SelectItem>
                    <SelectItem value="TND">TND - Tunisian Dinar</SelectItem>
                    <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                    <SelectItem value="TMT">TMT - Turkmenistani Manat</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                    <SelectItem value="UAH">UAH - Ukrainian Hryvnia</SelectItem>
                    <SelectItem value="UYU">UYU - Uruguayan Peso</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="UZS">UZS - Uzbekistani Som</SelectItem>
                    <SelectItem value="VUV">VUV - Vanuatu Vatu</SelectItem>
                    <SelectItem value="VES">VES - Venezuelan Bolívar</SelectItem>
                    <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                    <SelectItem value="XOF">XOF - West African CFA Franc</SelectItem>
                    <SelectItem value="YER">YER - Yemeni Rial</SelectItem>
                    <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                    <SelectItem value="ZWL">ZWL - Zimbabwean Dollar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This currency will be used as the default for new orders.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="starting-order-number">Starting Order Number</Label>
                <div className="flex gap-2 items-end">
                  <Input
                    id="starting-order-number"
                    type="number"
                    min="1"
                    value={startingOrderNumber}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setStartingOrderNumber(value);
                    }}
                    className="w-48"
                    placeholder="Enter starting number"
                  />
                  <Button 
                    onClick={() => handleStartingOrderNumberChange(startingOrderNumber)}
                    variant="outline"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set the starting number for your order sequence. The next order will start from this number.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('invoiceSettings')}
              </CardTitle>
              <CardDescription>Configure company details that appear on invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {invoiceSettings && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={invoiceSettings.company_name}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, company_name: e.target.value})}
                        placeholder="Your Company Name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">Phone Number</Label>
                      <Input
                        id="phone-number"
                        value={invoiceSettings.phone_number || ''}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, phone_number: e.target.value})}
                        placeholder="974 55110219"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook Account</Label>
                      <Input
                        id="facebook"
                        value={invoiceSettings.facebook_account || ''}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, facebook_account: e.target.value})}
                        placeholder="@your_facebook"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram Account</Label>
                      <Input
                        id="instagram"
                        value={invoiceSettings.instagram_account || ''}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, instagram_account: e.target.value})}
                        placeholder="@your_instagram"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="snapchat">Snapchat Account</Label>
                      <Input
                        id="snapchat"
                        value={invoiceSettings.snapchat_account || ''}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, snapchat_account: e.target.value})}
                        placeholder="@your_snapchat"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Business Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address-line1">Address Line 1</Label>
                        <Input
                          id="address-line1"
                          value={invoiceSettings.address_line1 || ''}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, address_line1: e.target.value})}
                          placeholder="Street address"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address-line2">Address Line 2</Label>
                        <Input
                          id="address-line2"
                          value={invoiceSettings.address_line2 || ''}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, address_line2: e.target.value})}
                          placeholder="Apartment, suite, etc. (optional)"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={invoiceSettings.city || ''}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, city: e.target.value})}
                          placeholder="Doha"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={invoiceSettings.country || ''}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, country: e.target.value})}
                          placeholder="Qatar"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Company Logo</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload your company logo to appear on invoices. Maximum file size: 400KB. Supported formats: JPEG, PNG, WebP, SVG.
                    </p>
                    
                    {invoiceSettings.logo_url ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={invoiceSettings.logo_url} 
                            alt="Company Logo" 
                            className="h-16 w-auto object-contain border rounded-md p-2"
                          />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Current Logo</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleRemoveLogo}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove Logo
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="logo-replace">Replace Logo</Label>
                          <Input
                            id="logo-replace"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleLogoUpload(file);
                                e.target.value = ''; // Reset input
                              }
                            }}
                            disabled={logoUploading}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="logo-upload">Upload Logo</Label>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleLogoUpload(file);
                              e.target.value = ''; // Reset input
                            }
                          }}
                          disabled={logoUploading}
                        />
                        {logoUploading && (
                          <p className="text-sm text-muted-foreground">Uploading logo...</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleInvoiceSettingsUpdate(invoiceSettings)}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('save')} {t('invoiceSettings')}</span>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Status Settings */}
          <OrderStatusSettings onStatusChange={fetchStats} />
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