import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  sku?: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface NewCustomer {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: () => void;
  defaultCurrency?: string;
}

export function CreateOrderDialog({ open, onOpenChange, onOrderCreated, defaultCurrency = 'USD' }: CreateOrderDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, sku')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrderStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('order_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setOrderStatuses(data || []);
    } catch (error) {
      console.error('Error fetching order statuses:', error);
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...orderItems];
    if (field === 'product_id' && typeof value === 'string') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index] = {
          ...updated[index],
          product_id: value,
          unit_price: product.price
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setOrderItems(updated);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - discount); // Ensure total never goes below 0
  };

  const handleSubmit = async () => {
    if ((!selectedCustomer && !showNewCustomerForm) || orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Validate new customer form if creating new customer
    if (showNewCustomerForm && (!newCustomer.full_name || !newCustomer.phone || !newCustomer.address || !newCustomer.city)) {
      toast({
        title: "Error",
        description: "Please fill in all required customer fields (name, phone, address, city)",
        variant: "destructive",
      });
      return;
    }

    // Validate all items have products selected
    if (orderItems.some(item => !item.product_id)) {
      toast({
        title: "Error",
        description: "Please select a product for all order items",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const subtotalAmount = calculateSubtotal();
      const totalAmount = calculateTotal();
      let customerId = selectedCustomer;

      // Create customer if new customer form is being used
      if (showNewCustomerForm) {
        // Parse full name into first and last name
        const nameParts = newCustomer.full_name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Use provided email or null if not provided
        const customerEmail = newCustomer.email.trim() || null;
        
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: customerEmail,
            phone: newCustomer.phone,
            address_line1: newCustomer.address,
            city: newCustomer.city
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customerData.id;
      }

      // Create the order (order_number will be auto-generated by trigger)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          total_amount: totalAmount,
          discount: discount,
          currency: defaultCurrency,
          status: orderStatuses[0]?.name || 'pending',
          notes: notes || null,
          order_number: ''
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Order ${orderData.order_number} created successfully`,
      });

      // Reset form
      setSelectedCustomer('');
      setOrderItems([]);
      setDiscount(0);
      setNotes('');
      setShowNewCustomerForm(false);
      setNewCustomer({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        city: ''
      });
      onOpenChange(false);
      onOrderCreated?.();

    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
      fetchOrderStatuses();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Select a customer and add products to create a new order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="customer">Customer</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {showNewCustomerForm ? 'Select Existing' : 'Create New'}
              </Button>
            </div>
            
            {showNewCustomerForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">New Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={newCustomer.full_name}
                      onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="Enter email address (optional)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      placeholder="Enter street address"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      placeholder="Enter city"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} ({customer.phone || 'No phone'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Order Items</CardTitle>
                <Button onClick={addOrderItem} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.product_id);
                return (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Product</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => updateOrderItem(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.price.toFixed(2)}
                              {product.sku && ` (${product.sku})`}
                              <Badge variant="outline" className="ml-2">
                                Stock: {product.stock_quantity}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-24">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedProduct?.stock_quantity || 999}
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="w-28">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="w-28">
                      <Label>Total</Label>
                      <div className="h-10 flex items-center font-medium">
                        {(item.unit_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              
              {orderItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items added. Click "Add Item" to start building the order.
                </div>
              )}
              
              {orderItems.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="font-medium">{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-4">
                    <Label htmlFor="discount">Discount:</Label>
                    <div className="flex items-center gap-2">
                      <span></span>
                       <Input
                         id="discount"
                         type="number"
                         step="1"
                         min="0"
                         max={calculateSubtotal()}
                         value={discount}
                         onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                         className="w-24"
                         placeholder="0"
                       />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions, notes, or comments for this order..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  These notes will be visible in order details and can be included in communications.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}