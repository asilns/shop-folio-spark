import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DollarSign, FileText, Trash2, Filter, CalendarIcon, X, Edit3, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount: number;
  currency: string;
  created_at: string;
  notes?: string;
  customers: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    id: string;
    name: string;
    sku?: string;
  };
}

interface OrderListProps {
  onDataChange?: () => void;
}

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export function OrderList({ onDataChange }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>(undefined);
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editOrderData, setEditOrderData] = useState<any>({});
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchOrderStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('order_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      setOrderStatuses(data || []);
      
      // Create status colors map
      const colorsMap: Record<string, string> = {};
      data?.forEach(status => {
        colorsMap[status.name] = status.color;
      });
      setStatusColors(colorsMap);
    } catch (error) {
      console.error('Error fetching order statuses:', error);
      // Fallback to default statuses if fetch fails
      setStatusColors({
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        processing: 'bg-purple-100 text-purple-800',
        shipped: 'bg-green-100 text-green-800',
        delivered: 'bg-emerald-100 text-emerald-800',
        cancelled: 'bg-red-100 text-red-800',
      });
    }
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `);

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date range filter
      if (dateFromFilter) {
        const startOfDay = new Date(dateFromFilter);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfDay.toISOString());
      }
      
      if (dateToFilter) {
        const endOfDay = new Date(dateToFilter);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          products (
            id,
            name,
            sku
          )
        `)
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast({
        title: "Error",
        description: "Failed to load order items",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

      fetchOrders();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
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
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsEditMode(false);
    
    const [itemsData] = await Promise.all([
      fetchOrderItems(order.id),
      fetchCustomers(),
      fetchProducts()
    ]);
    
    // Initialize edit data
    setEditOrderData({
      customer_id: order.customers.id || '',
      discount: order.discount || 0,
      notes: order.notes || ''
    });
    
    setShowOrderDetails(true);
  };

  const handleSaveOrderChanges = async () => {
    if (!selectedOrder) return;

    try {
      // Update order details
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_id: editOrderData.customer_id,
          discount: editOrderData.discount || 0,
          notes: editOrderData.notes || null
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // Update order items
      for (const item of editOrderItems) {
        if (item.isNew && !item.isDeleted) {
          // Add new item
          const { error } = await supabase
            .from('order_items')
            .insert({
              order_id: selectedOrder.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price
            });
          if (error) throw error;
        } else if (!item.isNew && !item.isDeleted) {
          // Update existing item
          const { error } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              total_price: item.quantity * item.unit_price
            })
            .eq('id', item.id);
          if (error) throw error;
        } else if (item.isDeleted) {
          // Delete item
          const { error } = await supabase
            .from('order_items')
            .delete()
            .eq('id', item.id);
          if (error) throw error;
        }
      }

      // Recalculate order total
      const itemTotal = editOrderItems
        .filter(item => !item.isDeleted)
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const finalTotal = itemTotal - (editOrderData.discount || 0);

      await supabase
        .from('orders')
        .update({ total_amount: finalTotal })
        .eq('id', selectedOrder.id);

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      setShowOrderDetails(false);
      setIsEditMode(false);
      fetchOrders();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const handleItemQuantityChange = (index: number, newQuantity: number) => {
    const updatedItems = [...editOrderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    setEditOrderItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...editOrderItems];
    if (updatedItems[index].isNew) {
      updatedItems.splice(index, 1);
    } else {
      updatedItems[index].isDeleted = true;
    }
    setEditOrderItems(updatedItems);
  };

  const handleAddItem = () => {
    const newItem = {
      id: `new_${Date.now()}`,
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      isNew: true,
      isDeleted: false,
      products: { id: '', name: '', sku: '' }
    };
    setEditOrderItems([...editOrderItems, newItem]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedItems = [...editOrderItems];
      updatedItems[index].product_id = productId;
      updatedItems[index].unit_price = product.price;
      updatedItems[index].total_price = updatedItems[index].quantity * product.price;
      updatedItems[index].products = {
        id: product.id,
        name: product.name,
        sku: product.sku || ''
      };
      setEditOrderItems(updatedItems);
    }
  };

  const createInvoice = async (order: Order) => {
    try {
      toast({
        title: "Generating Invoice",
        description: "Please wait while we generate your invoice...",
      });

      const response = await supabase.functions.invoke('generate-invoice', {
        body: { orderId: order.id }
      });

      if (response.error) throw response.error;

      // Open the HTML invoice in a new window for printing/saving as PDF
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(response.data);
        newWindow.document.close();
        
        // Focus the new window and trigger print dialog
        newWindow.focus();
        setTimeout(() => {
          newWindow.print();
        }, 500);
      }

      toast({
        title: "Invoice Generated",
        description: `Invoice for order ${order.order_number} opened in new window`,
      });
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: `Order ${orderNumber} deleted successfully`,
      });

      fetchOrders();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allOrderIds = new Set(orders.map(order => order.id));
      setSelectedOrders(allOrderIds);
      setShowBulkActions(true);
    } else {
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    try {
      const orderIds = Array.from(selectedOrders);
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', orderIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${orderIds.length} orders to ${newStatus}`,
      });

      fetchOrders();
      onDataChange?.();
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    } catch (error: any) {
      console.error('Error updating orders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update orders",
        variant: "destructive",
      });
    }
  };


  const bulkDeleteOrders = async () => {
    try {
      const orderIds = Array.from(selectedOrders);
      
      // First delete order items for all selected orders
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Then delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      toast({
        title: "Success",
        description: `Deleted ${orderIds.length} orders successfully`,
      });

      fetchOrders();
      onDataChange?.();
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrderStatuses().then(() => fetchOrders());
  }, [statusFilter, dateFromFilter, dateToFilter]);

  // Initialize edit order items when orderItems change or edit mode is enabled
  useEffect(() => {
    if (isEditMode && orderItems.length > 0) {
      setEditOrderItems(orderItems.map(item => ({
        ...item,
        product_id: item.products.id,
        isNew: false,
        isDeleted: false
      })));
    }
  }, [isEditMode, orderItems]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
    setFromDateOpen(false);
    setToDateOpen(false);
  };

  const handleFromDateSelect = (date: Date | undefined) => {
    setDateFromFilter(date);
    if (date) {
      setFromDateOpen(false);
      setToDateOpen(true);
    }
  };

  const handleToDateSelect = (date: Date | undefined) => {
    setDateToFilter(date);
    if (date) {
      setToDateOpen(false);
    }
  };

  const hasActiveFilters = (statusFilter && statusFilter !== 'all') || dateFromFilter || dateToFilter;

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>View and manage customer orders</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
               {hasActiveFilters && (
                 <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                   {(statusFilter && statusFilter !== 'all' ? 1 : 0) + (dateFromFilter ? 1 : 0) + (dateToFilter ? 1 : 0)}
                 </span>
               )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Filter Orders</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All statuses</SelectItem>
                       {orderStatuses.map((status) => (
                         <SelectItem key={status.id} value={status.name}>
                           {status.display_name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                   <label className="text-sm font-medium">Date Range</label>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-xs text-muted-foreground mb-1 block">From</label>
                       <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className="w-full justify-start text-left font-normal"
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {dateFromFilter ? format(dateFromFilter, "MMM d") : "From date"}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <Calendar
                             mode="single"
                             selected={dateFromFilter}
                             onSelect={handleFromDateSelect}
                             initialFocus
                             className="p-3 pointer-events-auto"
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                     <div>
                       <label className="text-xs text-muted-foreground mb-1 block">To</label>
                       <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className="w-full justify-start text-left font-normal"
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {dateToFilter ? format(dateToFilter, "MMM d") : "To date"}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <Calendar
                             mode="single"
                             selected={dateToFilter}
                             onSelect={handleToDateSelect}
                             initialFocus
                             className="p-3 pointer-events-auto"
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          )}
          
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              {statusFilter && statusFilter !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                  Status: {statusFilter}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => setStatusFilter('all')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
               {dateFromFilter && (
                 <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                   From: {format(dateFromFilter, "MMM d, yyyy")}
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-auto p-0 ml-1 hover:bg-transparent"
                     onClick={() => setDateFromFilter(undefined)}
                   >
                     <X className="w-3 h-3" />
                   </Button>
                 </div>
               )}
               {dateToFilter && (
                 <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                   To: {format(dateToFilter, "MMM d, yyyy")}
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-auto p-0 ml-1 hover:bg-transparent"
                     onClick={() => setDateToFilter(undefined)}
                   >
                     <X className="w-3 h-3" />
                   </Button>
                 </div>
               )}
            </div>
          )}

          {showBulkActions && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedOrders.size} orders selected
                </span>
                <div className="flex gap-2">
                  <Select onValueChange={bulkUpdateStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                     <SelectContent>
                       {orderStatuses.map((status) => (
                         <SelectItem key={status.id} value={status.name}>
                           Mark as {status.display_name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button variant="destructive" size="sm">
                         <Trash2 className="w-4 h-4 md:mr-2" />
                         <span className="hidden md:inline">Delete Selected</span>
                       </Button>
                     </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Orders</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedOrders.size} selected orders? 
                          This action cannot be undone and will remove all order items as well.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={bulkDeleteOrders}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Orders
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.size === orders.length && orders.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all orders"
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => viewOrderDetails(order)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select order ${order.order_number}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {order.customers.first_name} {order.customers.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customers.phone || 'No phone number'}
                      </div>
                    </div>
                  </TableCell>
                   <TableCell>
                     <div>
                       {order.discount && order.discount > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>Subtotal: {(order.total_amount + order.discount).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>Discount: -{order.discount.toFixed(2)}</span>
                            </div>
                             <div className="flex items-center gap-1 font-medium">
                               {order.total_amount.toFixed(2)} {order.currency}
                             </div>
                          </div>
                       ) : (
                          <div className="flex items-center gap-1">
                            {order.total_amount.toFixed(2)} {order.currency}
                          </div>
                       )}
                     </div>
                   </TableCell>
                   <TableCell>
                     <Select
                       value={order.status}
                       onValueChange={(value) => updateOrderStatus(order.id, value)}
                     >
                       <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
                         <SelectValue>
                           <Badge className={statusColors[order.status]}>
                             {orderStatuses.find(s => s.name === order.status)?.display_name || order.status}
                           </Badge>
                         </SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         {orderStatuses.map((status) => (
                           <SelectItem key={status.id} value={status.name}>
                             {status.display_name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                   <TableCell>
                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           createInvoice(order);
                         }}
                         title="Create Invoice"
                       >
                         <FileText className="w-4 h-4" />
                       </Button>
                      <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={(e) => e.stopPropagation()}
                             className="text-red-600 hover:text-red-700 hover:bg-red-50"
                             title="Delete Order"
                           >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete order {order.order_number}? This action cannot be undone and will remove all order items as well.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteOrder(order.id, order.order_number)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Order
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders found. Create your first order to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Order' : 'Order Details'} - {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Modify order information and items' : 'Complete order information and items'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Customer Information</h4>
                   {!isEditMode && (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => setIsEditMode(true)}
                       className="gap-2"
                     >
                       <Edit3 className="w-4 h-4" />
                       <span className="hidden sm:inline">Edit Order</span>
                     </Button>
                   )}
                </div>
                
                {isEditMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select 
                      value={editOrderData.customer_id} 
                      onValueChange={(value) => setEditOrderData({...editOrderData, customer_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                         {customers.map((customer) => (
                           <SelectItem key={customer.id} value={customer.id}>
                             {customer.first_name} {customer.last_name} - {customer.phone || customer.email}
                           </SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                   <div className="space-y-1 text-sm">
                     <div>{selectedOrder.customers.first_name} {selectedOrder.customers.last_name}</div>
                     <div className="text-muted-foreground">{selectedOrder.customers.phone || 'No phone number'}</div>
                   </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Order Items</h4>
                   {isEditMode && (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={handleAddItem}
                       className="gap-2"
                     >
                       <Plus className="w-4 h-4" />
                       <span className="hidden sm:inline">Add Item</span>
                     </Button>
                   )}
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      {isEditMode && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditMode ? editOrderItems.filter(item => !item.isDeleted) : orderItems).map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {isEditMode ? (
                            <Select 
                              value={item.product_id} 
                              onValueChange={(value) => handleProductChange(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} - {product.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div>
                              <div className="font-medium">{item.products.name}</div>
                              {item.products.sku && (
                                <div className="text-sm text-muted-foreground">SKU: {item.products.sku}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                         <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                         <TableCell>{item.total_price.toFixed(2)}</TableCell>
                        {isEditMode && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Notes Section */}
              <div>
                <h4 className="font-semibold mb-2">Order Notes</h4>
                {isEditMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={editOrderData.notes}
                      onChange={(e) => setEditOrderData({...editOrderData, notes: e.target.value})}
                      placeholder="Add order notes, special instructions, or comments..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                ) : (
                  <div className="text-sm">
                    {selectedOrder.notes ? (
                      <div className="p-3 bg-muted rounded-md">
                        {selectedOrder.notes}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">No notes added</div>
                    )}
                  </div>
                )}
              </div>

              {/* Discount and Totals */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Discount</h4>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <Label htmlFor="discount">Discount Amount</Label>
                      <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editOrderData.discount}
                        onChange={(e) => setEditOrderData({...editOrderData, discount: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <div className="text-sm">
                       {selectedOrder.discount && selectedOrder.discount > 0 ? (
                         `${selectedOrder.discount.toFixed(2)}`
                       ) : (
                        'No discount applied'
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  <div className="space-y-1 text-sm">
                    {isEditMode ? (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                           <span>
                             {editOrderItems
                               .filter(item => !item.isDeleted)
                               .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
                               .toFixed(2)}
                           </span>
                        </div>
                        {editOrderData.discount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span>-{editOrderData.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total:</span>
                           <span>
                             {(editOrderItems
                               .filter(item => !item.isDeleted)
                               .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) - editOrderData.discount
                             ).toFixed(2)} {selectedOrder.currency}
                           </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedOrder.discount && selectedOrder.discount > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{(selectedOrder.total_amount + selectedOrder.discount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Discount:</span>
                              <span>-{selectedOrder.discount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{selectedOrder.total_amount.toFixed(2)} {selectedOrder.currency}</span>
                        </div>
                        <div className="text-muted-foreground mt-2">
                           Status: <Badge className={statusColors[selectedOrder.status]}>
                             {orderStatuses.find(s => s.name === selectedOrder.status)?.display_name || selectedOrder.status}
                           </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          Date: {new Date(selectedOrder.created_at).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            {isEditMode ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditMode(false);
                    // Reset edit data
                    setEditOrderData({
                      customer_id: selectedOrder?.customers.id || '',
                      discount: selectedOrder?.discount || 0,
                      notes: selectedOrder?.notes || ''
                    });
                    setEditOrderItems(orderItems.map(item => ({
                      ...item,
                      product_id: item.products.id || '',
                      isNew: false
                    })));
                  }}
                >
                  Cancel
                </Button>
                 <Button onClick={handleSaveOrderChanges}>
                   <span className="hidden sm:inline">Save Changes</span>
                   <span className="sm:hidden">Save</span>
                 </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowOrderDetails(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}