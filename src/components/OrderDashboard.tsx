import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { storeFrom, storeInsert, storeUpdate, validateStoreId } from '@/lib/storeScope';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, ShoppingCart, ClipboardList, XCircle, Settings, FileText, LogOut, Shield } from 'lucide-react';
import { CustomerList } from './CustomerList';
import { ProductList } from './ProductList';
import { OrderList } from './OrderList';
import { CreateOrderDialog } from './CreateOrderDialog';
import { ThemeToggle } from './theme-toggle';
import { OrderStatusSettings } from './OrderStatusSettings';
import { LanguageSelector } from './LanguageSelector';
import { WhatsAppMessaging } from './WhatsAppMessaging';
import { InvoiceSettingsTab } from './InvoiceSettingsTab';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

interface WhatsAppSettings {
  whatsapp_enabled: boolean;
  default_country_code: string;
  whatsapp_template: string;
  date_format: string;
}

interface OrderDashboardProps {
  storeSlug?: string;
}

export function OrderDashboard({ storeSlug }: OrderDashboardProps = {}) {
  const { t } = useLanguage();
  const { user, signOut } = useStoreAuth();
  const navigate = useNavigate();
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
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    whatsapp_enabled: false,
    default_country_code: '+974',
    whatsapp_template: '',
    date_format: 'DD/MM/YYYY'
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const { toast } = useToast();

  const handleSignOut = () => {
    signOut();
    navigate('/store-login');
  };

  const fetchStats = async () => {
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      const [ordersResult, pendingOrdersResult, cancelledOrdersResult] = await Promise.all([
        storeFrom('orders', storeId).select('*', { count: 'exact', head: true }),
        storeFrom('orders', storeId).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        storeFrom('orders', storeId).select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
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
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      // Filter by store_id to get store-specific settings
      const { data, error } = await storeFrom('invoice_settings', storeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setInvoiceSettings(data);
      } else {
        // If no settings exist, create default ones
        const defaultSettings = {
          currency: 'USD',
          tax_rate: 0.0000,
          company_name: 'Your Company'
        };
        
        const { data: newSettings, error: createError } = await storeInsert('invoice_settings', storeId, defaultSettings);
          
        if (createError) throw createError;
        if (newSettings) setInvoiceSettings(newSettings);
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

  const fetchWhatsAppSettings = async () => {
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      const { data, error } = await storeFrom('app_settings', storeId)
        .select('key, value')
        .in('key', ['whatsapp_enabled', 'default_country_code', 'whatsapp_template', 'date_format']);

      if (error) throw error;

      const settings: Partial<WhatsAppSettings> = {};
      data?.forEach(setting => {
        switch (setting.key) {
          case 'whatsapp_enabled':
            settings.whatsapp_enabled = setting.value === 'true';
            break;
          case 'default_country_code':
            settings.default_country_code = setting.value;
            break;
          case 'whatsapp_template':
            settings.whatsapp_template = setting.value;
            break;
          case 'date_format':
            settings.date_format = setting.value;
            break;
        }
      });

      setWhatsappSettings(prev => ({ ...prev, ...settings }));
    } catch (error: any) {
      console.error('Error fetching WhatsApp settings:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchInvoiceSettings();
    fetchWhatsAppSettings();
    
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
    if (!invoiceSettings || !user?.store_id) return;

    try {
      const storeId = validateStoreId(user.store_id);
      const { error } = await storeUpdate('invoice_settings', storeId, 'id', invoiceSettings.id, updatedSettings);

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
      <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('dashboard')} — {t('viewAndManageOrders')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {t('welcomeBack')}, {user?.store_name || user?.username}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ThemeToggle />
          <Button onClick={() => setShowCreateOrder(true)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('createOrder')}</span>
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pendingOrders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cancelledOrders')}</CardTitle>
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
          <TabsTrigger value="orders">{t('orders')}</TabsTrigger>
          <TabsTrigger value="customers">{t('customers')}</TabsTrigger>
          <TabsTrigger value="products">{t('products')}</TabsTrigger>
          <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <OrderList onDataChange={fetchStats} whatsappSettings={whatsappSettings} />
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4">
          <CustomerList onDataChange={fetchStats} />
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <ProductList onDataChange={fetchStats} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <InvoiceSettingsTab />
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