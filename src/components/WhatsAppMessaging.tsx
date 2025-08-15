import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Copy, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  COUNTRY_CODES, 
  DATE_FORMATS, 
  renderTemplate, 
  formatCurrency, 
  formatDate, 
  humanizeStatus,
  copyToClipboard,
  type WhatsAppSettings
} from '@/utils/whatsapp';

interface WhatsAppMessagingProps {
  settings: WhatsAppSettings;
  onSettingsUpdate: (settings: WhatsAppSettings) => void;
}

const DEFAULT_TEMPLATE = `مرحبا {{name}}،
طلبك رقم {{order_number}} حالته: {{order_status}}.
المجموع: {{total}}
تاريخ الطلب: {{date}}
شكراً لتسوقك معنا 🌟`;

export function WhatsAppMessaging({ settings, onSettingsUpdate }: WhatsAppMessagingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<WhatsAppSettings>(settings);

  // Example order data for preview
  const exampleOrder = {
    customer: { first_name: 'أحمد', last_name: 'محمد' },
    order_number: 'ORD-12345',
    status: 'paid',
    total_amount: 250.50,
    currency: 'QAR',
    created_at: new Date().toISOString()
  };

  const renderPreview = () => {
    if (!localSettings.whatsapp_template.trim()) {
      return 'Please enter a template to see preview...';
    }

    const variables = {
      name: `${exampleOrder.customer.first_name} ${exampleOrder.customer.last_name}`,
      order_number: exampleOrder.order_number,
      order_status: humanizeStatus(exampleOrder.status),
      total: formatCurrency(exampleOrder.total_amount, exampleOrder.currency),
      date: formatDate(exampleOrder.created_at, localSettings.date_format)
    };

    return renderTemplate(localSettings.whatsapp_template, variables);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update each setting individually
      const updates = [
        { key: 'whatsapp_enabled', value: localSettings.whatsapp_enabled.toString() },
        { key: 'default_country_code', value: localSettings.default_country_code },
        { key: 'whatsapp_template', value: localSettings.whatsapp_template },
        { key: 'date_format', value: localSettings.date_format }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      onSettingsUpdate(localSettings);
      toast({
        title: 'Settings saved',
        description: 'WhatsApp messaging settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save WhatsApp settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLocalSettings({
      whatsapp_enabled: false,
      default_country_code: '+974',
      whatsapp_template: DEFAULT_TEMPLATE,
      date_format: 'DD/MM/YYYY'
    });
  };

  const handleCopyPreview = async () => {
    try {
      await copyToClipboard(renderPreview());
      toast({
        title: 'Copied!',
        description: 'Preview message copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy preview to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const validateCountryCode = (code: string): boolean => {
    return /^\+\d{1,4}$/.test(code);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          WhatsApp Messaging
        </CardTitle>
        <CardDescription>
          Configure WhatsApp messaging for order notifications. Templates support variables like {'{'}{'{'} name {'}'}{'}'}, {'{'}{'{'} order_number {'}'}{'}'}, {'{'}{'{'} total {'}'}{'}'}, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="whatsapp-enabled" className="text-base font-medium">
              Enable WhatsApp Messaging
            </Label>
            <p className="text-sm text-muted-foreground">
              Show WhatsApp buttons in the Orders tab
            </p>
          </div>
          <Switch
            id="whatsapp-enabled"
            checked={localSettings.whatsapp_enabled}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, whatsapp_enabled: checked }))
            }
          />
        </div>

        {/* Default Country Code */}
        <div className="space-y-2">
          <Label htmlFor="country-code">Default Country Code</Label>
          <Select
            value={localSettings.default_country_code}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, default_country_code: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country code" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {COUNTRY_CODES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.code} - {country.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!validateCountryCode(localSettings.default_country_code) && (
            <p className="text-sm text-destructive">
              Country code must be in format +XXX (e.g., +974)
            </p>
          )}
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <Label htmlFor="date-format">Date Format</Label>
          <Select
            value={localSettings.date_format}
            onValueChange={(value) => 
              setLocalSettings(prev => ({ ...prev, date_format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Template */}
        <div className="space-y-2">
          <Label htmlFor="template">WhatsApp Message Template</Label>
          <Textarea
            id="template"
            placeholder="Enter your WhatsApp message template..."
            value={localSettings.whatsapp_template}
            onChange={(e) => 
              setLocalSettings(prev => ({ ...prev, whatsapp_template: e.target.value }))
            }
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-sm text-muted-foreground">Available variables:</span>
            {['name', 'order_number', 'order_status', 'total', 'date'].map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {'{'}{'{'}{variable}{'}'}{'}'} 
              </Badge>
            ))}
          </div>
          {localSettings.whatsapp_template.length > 5000 && (
            <p className="text-sm text-destructive">
              Template is too long (maximum 5000 characters)
            </p>
          )}
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Live Preview</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPreview}
              className="h-8"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-md border">
            <div className="whitespace-pre-wrap text-sm font-mono">
              {renderPreview()}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview uses example data: {exampleOrder.customer.first_name} {exampleOrder.customer.last_name}, 
            Order #{exampleOrder.order_number}, Status: {humanizeStatus(exampleOrder.status)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={loading || localSettings.whatsapp_template.length > 5000}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}