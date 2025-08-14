import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderData {
  id: string;
  order_number: string;
  total_amount: number;
  discount: number;
  currency: string;
  created_at: string;
  customers: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

interface OrderItem {
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    sku?: string;
  };
}

interface InvoiceSettings {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { orderId } = await req.json()
    console.log('Generating invoice for order:', orderId)

    // Fetch invoice settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Error fetching invoice settings:', settingsError)
      throw settingsError
    }

    // Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          first_name,
          last_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      throw orderError
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          name,
          sku
        )
      `)
      .eq('order_id', orderId)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
      throw itemsError
    }

    const order = orderData as OrderData
    const items = orderItems as OrderItem[]
    const settings = settingsData as InvoiceSettings

    // Generate HTML for the invoice
    const invoiceHtml = generateInvoiceHtml(order, items, settings)
    
    // For now, return the HTML which can be converted to PDF on the client side
    return new Response(invoiceHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('Error generating invoice:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function generateInvoiceHtml(order: OrderData, items: OrderItem[], settings: InvoiceSettings): string {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const discount = order.discount || 0
  const total = subtotal - discount

  // Build company contact info
  const contactInfo = [];
  if (settings.phone_number) {
    contactInfo.push(`📞 ${settings.phone_number}`);
  }
  if (settings.facebook_account) {
    contactInfo.push(`📘 ${settings.facebook_account}`);
  }
  if (settings.instagram_account) {
    contactInfo.push(`📷 ${settings.instagram_account}`);
  }
  if (settings.snapchat_account) {
    contactInfo.push(`👻 ${settings.snapchat_account}`);
  }

  // Build company address
  const addressParts = [];
  if (settings.address_line1) addressParts.push(settings.address_line1);
  if (settings.address_line2) addressParts.push(settings.address_line2);
  if (settings.city) addressParts.push(settings.city);
  if (settings.country) addressParts.push(settings.country);

  const companyAddress = addressParts.length > 0 ? addressParts.join('<br>') : settings.city + ' - ' + settings.country;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${order.order_number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          background: #fff;
          padding: 40px 60px;
          margin: 0;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          padding: 0 20px;
        }

        .header {
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .company-logo {
          max-width: 120px;
          max-height: 80px;
          object-fit: contain;
        }

        .company-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #666;
        }

        .invoice-title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .invoice-title {
          font-size: 48px;
          color: #d4a574;
          font-weight: 300;
          margin: 0;
        }

        .invoice-details {
          text-align: right;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          min-width: 200px;
          margin-bottom: 8px;
        }

        .detail-row .label {
          color: #d4a574;
          font-weight: 600;
        }

        .detail-row .value {
          font-weight: 600;
          margin-left: 20px;
        }

        .customer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }

        .customer-section h3,
        .customer-section h4 {
          color: #d4a574;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .customer-section h3 {
          font-size: 16px;
        }

        .customer-section h4 {
          font-size: 14px;
          margin-top: 20px;
        }

        .customer-name {
          font-weight: 600;
          margin-bottom: 20px;
          color: #333;
        }

        .address {
          color: #666;
          line-height: 1.5;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }

        .items-table th {
          background: #f8f8f8;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #d4a574;
          border-bottom: 1px solid #e0e0e0;
        }

        .items-table th:last-child,
        .items-table td:last-child {
          text-align: right;
        }

        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .footer-section {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 40px;
          align-items: start;
        }

        .notes h4 {
          color: #d4a574;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .gift-note {
          font-weight: 600;
          color: #333;
        }

        .totals {
          background: #f8f8f8;
          padding: 24px;
          border-radius: 8px;
          min-width: 280px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 6px 0;
          font-size: 15px;
        }

        .total-row.final {
          border-top: 2px solid #d4a574;
          margin-top: 16px;
          padding-top: 16px;
          font-weight: 700;
          font-size: 18px;
        }

        .total-row .label {
          color: #666;
        }

        .total-row .value {
          font-weight: 600;
          color: #333;
        }

        .total-row.final .label,
        .total-row.final .value {
          color: #d4a574;
        }

        @media print {
          body { padding: 20px 40px; }
          .invoice-container { box-shadow: none; padding: 0 10px; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Company Logo" class="company-logo">` : ''}
          <div class="company-info">
            ${contactInfo.map(info => `<div class="contact-item"><span>${info}</span></div>`).join('')}
            ${companyAddress ? `<div class="contact-item"><span>📍 ${companyAddress}</span></div>` : ''}
          </div>
        </div>

        <!-- Invoice Title -->
        <div class="invoice-title-section">
          <h1 class="invoice-title">Invoice</h1>
          <div class="invoice-details">
            <div class="detail-row">
              <span class="label">Invoice #</span>
              <span class="value">${order.order_number}</span>
            </div>
            <div class="detail-row">
              <span class="label">Submitted on</span>
              <span class="value">${new Date(order.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="customer-section">
          <div class="customer-info">
            <h3>Invoice for</h3>
            <p class="customer-name">${order.customers.first_name} ${order.customers.last_name}</p>
            
            <h4>Address</h4>
             <p class="address">
               ${order.customers.address_line1 || 'Ask for location'}<br>
               ${order.customers.address_line2 ? order.customers.address_line2 + '<br>' : ''}
               ${order.customers.city || ''}<br>
               ${order.customers.country || ''}
             </p>
          </div>
          
          <div class="contact-info">
            <h4>Phone</h4>
            <p>${order.customers.phone || 'N/A'}</p>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.products.name}</td>
                <td>${item.quantity}</td>
                <td>${order.currency}${item.unit_price.toFixed(2)}</td>
                <td>${order.currency}${item.total_price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Notes and Totals -->
        <div class="footer-section">
          <div class="notes">
            <h4>Notes:</h4>
            <p class="gift-note">ITS A GIFT FREE DELIVERY</p>
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span class="label">Subtotal</span>
              <span class="value">${order.currency}${subtotal.toFixed(2)}</span>
            </div>
            ${discount > 0 ? `
            <div class="total-row">
              <span class="label">Discount</span>
              <span class="value">-${order.currency}${discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span class="label">Total</span>
              <span class="value">${order.currency}${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}