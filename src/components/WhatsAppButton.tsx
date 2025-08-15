import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageCircle, Copy, Phone, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  renderTemplate, 
  formatCurrency, 
  formatDate, 
  humanizeStatus,
  normalizePhoneToE164,
  generateWhatsAppURL,
  openWhatsApp,
  copyToClipboard,
  type WhatsAppSettings
} from '@/utils/whatsapp';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  customers: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

interface WhatsAppButtonProps {
  order: Order;
  settings: WhatsAppSettings;
  variant?: 'default' | 'dropdown';
}

export function WhatsAppButton({ order, settings, variant = 'default' }: WhatsAppButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const generateMessage = () => {
    const variables = {
      name: `${order.customers.first_name} ${order.customers.last_name}`.trim(),
      order_number: order.order_number,
      order_status: humanizeStatus(order.status),
      total: formatCurrency(order.total_amount, order.currency),
      date: formatDate(order.created_at, settings.date_format)
    };

    return renderTemplate(settings.whatsapp_template, variables);
  };

  const handleSendWhatsApp = async () => {
    setLoading(true);
    try {
      const phone = normalizePhoneToE164(order.customers.phone, settings.default_country_code);
      
      if (!phone) {
        toast({
          title: 'Invalid phone number',
          description: 'Customer phone number is missing or invalid. Use "Copy Message" instead.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const message = generateMessage();
      const whatsappURL = generateWhatsAppURL(phone, message);
      
      openWhatsApp(whatsappURL);
      
      toast({
        title: 'Opening WhatsApp',
        description: 'WhatsApp should open with the pre-filled message.',
      });
    } catch (error: any) {
      console.error('Error opening WhatsApp:', error);
      toast({
        title: 'Error',
        description: 'Failed to open WhatsApp. Try copying the message instead.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      const message = generateMessage();
      await copyToClipboard(message);
      
      toast({
        title: 'Message copied',
        description: 'WhatsApp message copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyNumber = async () => {
    try {
      const phone = normalizePhoneToE164(order.customers.phone, settings.default_country_code);
      
      if (!phone) {
        toast({
          title: 'No phone number',
          description: 'Customer phone number is missing or invalid.',
          variant: 'destructive',
        });
        return;
      }

      await copyToClipboard(phone);
      
      toast({
        title: 'Phone number copied',
        description: 'Customer phone number copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy phone number to clipboard.',
        variant: 'destructive',
      });
    }
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSendWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Send via WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyMessage}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyNumber}>
            <Phone className="w-4 h-4 mr-2" />
            Copy Number
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendWhatsApp}
      disabled={loading}
      className="whitespace-nowrap"
    >
      <MessageCircle className="w-4 h-4 mr-1" />
      WhatsApp
    </Button>
  );
}