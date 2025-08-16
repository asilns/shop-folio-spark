import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { storeFrom, storeInsert, storeUpdate, validateStoreId } from '@/lib/storeScope';
import { currencies, getCurrencyOptions } from '@/lib/currencies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { LanguageSelector } from '@/components/LanguageSelector';
import { OrderStatusManagement } from '@/components/OrderStatusManagement';
import { useToast } from '@/hooks/use-toast';
import { Settings, FileImage, Upload, X } from 'lucide-react';

interface StoreSettings {
  store_id: string;
  language: string;
  default_currency: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceSettings {
  id: string;
  store_id: string;
  company_name: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  currency: string;
  tax_rate: number;
  facebook_account?: string;
  instagram_account?: string;
  snapchat_account?: string;
}

export function InvoiceSettingsTab() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useStoreAuth();
  const { toast } = useToast();
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currencyOptions = getCurrencyOptions();

  useEffect(() => {
    if (user?.store_id) {
      fetchSettings();
    }
  }, [user?.store_id]);

  const fetchSettings = async () => {
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      
      // Fetch store settings
      const { data: storeData, error: storeError } = await storeFrom('store_settings', storeId)
        .maybeSingle();
      
      if (storeError && storeError.code !== 'PGRST116') {
        console.error('Error fetching store settings:', storeError);
      } else if (storeData) {
        setStoreSettings(storeData);
      } else {
        // Create default store settings
        const defaultStoreSettings = {
          language: 'en',
          default_currency: 'USD'
        };
        
        const { data: newStoreSettings, error: createError } = await storeInsert('store_settings', storeId, defaultStoreSettings);
        if (createError) throw createError;
        if (newStoreSettings) setStoreSettings(newStoreSettings);
      }

      // Fetch invoice settings
      const { data: invoiceData, error: invoiceError } = await storeFrom('invoice_settings', storeId)
        .maybeSingle();
      
      if (invoiceError && invoiceError.code !== 'PGRST116') {
        console.error('Error fetching invoice settings:', invoiceError);
      } else if (invoiceData) {
        setInvoiceSettings(invoiceData);
      } else {
        // Create default invoice settings
        const defaultInvoiceSettings = {
          company_name: 'Your Company',
          currency: 'USD',
          tax_rate: 0.0000
        };
        
        const { data: newInvoiceSettings, error: createError } = await storeInsert('invoice_settings', storeId, defaultInvoiceSettings);
        if (createError) throw createError;
        if (newInvoiceSettings) setInvoiceSettings(newInvoiceSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSettingsUpdate = async (updates: Partial<StoreSettings>) => {
    if (!storeSettings || !user?.store_id) return;

    try {
      setSaving(true);
      const storeId = validateStoreId(user.store_id);
      
      const { data, error } = await storeUpdate('store_settings', storeId, 'store_id', storeId, updates);
      if (error) throw error;

      if (data) {
        setStoreSettings({ ...storeSettings, ...data });
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
      }
    } catch (error) {
      console.error('Error updating store settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInvoiceSettingsUpdate = async (updates: Partial<InvoiceSettings>) => {
    if (!invoiceSettings || !user?.store_id) return;

    try {
      setSaving(true);
      const storeId = validateStoreId(user.store_id);
      
      const { data, error } = await storeUpdate('invoice_settings', storeId, 'id', invoiceSettings.id, updates);
      if (error) throw error;

      if (data) {
        setInvoiceSettings({ ...invoiceSettings, ...data });
        toast({
          title: 'Success',
          description: 'Invoice settings updated successfully',
        });
      }
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as any);
    handleStoreSettingsUpdate({ language: newLanguage });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    handleStoreSettingsUpdate({ default_currency: newCurrency });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.store_id) return;

    try {
      setUploading(true);
      // For now, we'll simulate logo upload
      // In a real implementation, you'd upload to Supabase Storage
      const mockUrl = URL.createObjectURL(file);
      await handleStoreSettingsUpdate({ logo_url: mockUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    await handleStoreSettingsUpdate({ logo_url: null });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Invoice Settings</h1>
      </div>

      {/* Language & Currency Section */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure your store language and default currency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="language-select" className="flex items-center gap-2">
                {t('language')}
              </Label>
              <Select value={storeSettings?.language || language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language-select">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency-select">Default Currency</Label>
              <Combobox
                options={currencyOptions}
                value={storeSettings?.default_currency || 'USD'}
                onSelect={handleCurrencyChange}
                placeholder="Select currency..."
                searchPlaceholder="Search currencies..."
                emptyText="No currency found."
                className="w-full"
              />
              {storeSettings?.default_currency && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {storeSettings.default_currency}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {currencies.find(c => c.code === storeSettings.default_currency)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {storeSettings?.logo_url ? (
                <div className="relative">
                  <img 
                    src={storeSettings.logo_url} 
                    alt="Company logo" 
                    className="w-20 h-20 object-contain border rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                    onClick={handleLogoRemove}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Status Management */}
      <OrderStatusManagement />

      {/* Invoice Details Section */}
      {invoiceSettings && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Configure your company information for invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={invoiceSettings.company_name}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, company_name: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ company_name: invoiceSettings.company_name })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  value={invoiceSettings.phone_number || ''}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, phone_number: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ phone_number: invoiceSettings.phone_number })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-line1">Address Line 1</Label>
                <Input
                  id="address-line1"
                  value={invoiceSettings.address_line1 || ''}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, address_line1: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ address_line1: invoiceSettings.address_line1 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-line2">Address Line 2</Label>
                <Input
                  id="address-line2"
                  value={invoiceSettings.address_line2 || ''}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, address_line2: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ address_line2: invoiceSettings.address_line2 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={invoiceSettings.city || ''}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, city: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ city: invoiceSettings.city })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={invoiceSettings.country || ''}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, country: e.target.value})}
                  onBlur={() => handleInvoiceSettingsUpdate({ country: invoiceSettings.country })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={invoiceSettings.tax_rate}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, tax_rate: parseFloat(e.target.value) || 0})}
                  onBlur={() => handleInvoiceSettingsUpdate({ tax_rate: invoiceSettings.tax_rate })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Social Media Accounts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="@username"
                    value={invoiceSettings.facebook_account || ''}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, facebook_account: e.target.value})}
                    onBlur={() => handleInvoiceSettingsUpdate({ facebook_account: invoiceSettings.facebook_account })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="@username"
                    value={invoiceSettings.instagram_account || ''}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, instagram_account: e.target.value})}
                    onBlur={() => handleInvoiceSettingsUpdate({ instagram_account: invoiceSettings.instagram_account })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="snapchat">Snapchat</Label>
                  <Input
                    id="snapchat"
                    placeholder="@username"
                    value={invoiceSettings.snapchat_account || ''}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, snapchat_account: e.target.value})}
                    onBlur={() => handleInvoiceSettingsUpdate({ snapchat_account: invoiceSettings.snapchat_account })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => toast({ title: 'Settings saved', description: 'All changes have been automatically saved.' })}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Settings Auto-Saved'}
        </Button>
      </div>
    </div>
  );
}