import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Eye, DollarSign, FileText, Trash2, Filter, CalendarIcon, X, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount: number;
  currency: string;
  created_at: string;
  customers: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    sku?: string;
  };
}

interface OrderListProps {
  onDataChange?: () => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editFormData, setEditFormData] = useState({
    discount: '',
    notes: ''
  });
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email
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

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowOrderDetails(true);
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

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditFormData({
      discount: order.discount?.toString() || '',
      notes: ''
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!editingOrder) return;

    try {
      const updateData: any = {};
      
      if (editFormData.discount !== editingOrder.discount?.toString()) {
        updateData.discount = editFormData.discount ? parseFloat(editFormData.discount) : 0;
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to the order",
        });
        setShowEditDialog(false);
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', editingOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order ${editingOrder.order_number} updated successfully`,
      });

      setShowEditDialog(false);
      setEditingOrder(null);
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
    fetchOrders();
  }, [statusFilter, dateFromFilter, dateToFilter]);

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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
                      <SelectItem value="pending">Mark as Pending</SelectItem>
                      <SelectItem value="confirmed">Mark as Confirmed</SelectItem>
                      <SelectItem value="processing">Mark as Processing</SelectItem>
                      <SelectItem value="shipped">Mark as Shipped</SelectItem>
                      <SelectItem value="delivered">Mark as Delivered</SelectItem>
                      <SelectItem value="cancelled">Mark as Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Selected
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
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
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
                        {order.customers.email}
                      </div>
                    </div>
                  </TableCell>
                   <TableCell>
                     <div>
                       {order.discount && order.discount > 0 ? (
                         <div className="space-y-1">
                           <div className="flex items-center gap-1 text-sm text-muted-foreground">
                             <span>Subtotal: ${(order.total_amount + order.discount).toFixed(2)}</span>
                           </div>
                           <div className="flex items-center gap-1 text-sm text-muted-foreground">
                             <span>Discount: -${order.discount.toFixed(2)}</span>
                           </div>
                           <div className="flex items-center gap-1 font-medium">
                             <DollarSign className="w-3 h-3" />
                             {order.total_amount.toFixed(2)} {order.currency}
                           </div>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1">
                           <DollarSign className="w-3 h-3" />
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
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
                         onClick={() => handleEditOrder(order)}
                         title="Edit Order"
                       >
                         <Edit3 className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => viewOrderDetails(order)}
                         title="View Order Details"
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => createInvoice(order)}
                         title="Create Invoice"
                       >
                         <FileText className="w-4 h-4" />
                       </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Complete order information and items
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>{selectedOrder.customers.first_name} {selectedOrder.customers.last_name}</div>
                    <div className="text-muted-foreground">{selectedOrder.customers.email}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Order Information</h4>
                   <div className="space-y-1 text-sm">
                     <div>Status: <Badge className={statusColors[selectedOrder.status as keyof typeof statusColors]}>{selectedOrder.status}</Badge></div>
                     {selectedOrder.discount && selectedOrder.discount > 0 && (
                       <>
                         <div>Subtotal: ${(selectedOrder.total_amount + selectedOrder.discount).toFixed(2)} {selectedOrder.currency}</div>
                         <div>Discount: -${selectedOrder.discount.toFixed(2)} {selectedOrder.currency}</div>
                       </>
                     )}
                     <div>Total: ${selectedOrder.total_amount.toFixed(2)} {selectedOrder.currency}</div>
                     <div>Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</div>
                   </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.products.name}</div>
                            {item.products.sku && (
                              <div className="text-sm text-muted-foreground">SKU: {item.products.sku}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>${item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Order - {editingOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Update order details. Only modifiable fields are shown.
            </DialogDescription>
          </DialogHeader>
          
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-discount">Discount Amount</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editFormData.discount}
                  onChange={(e) => setEditFormData({...editFormData, discount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{editingOrder.total_amount.toFixed(2)} {editingOrder.currency}</span>
                  </div>
                  {editFormData.discount && parseFloat(editFormData.discount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount:</span>
                      <span>-{parseFloat(editFormData.discount).toFixed(2)} {editingOrder.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>New Total:</span>
                    <span>
                      {(editingOrder.total_amount - (parseFloat(editFormData.discount) || 0)).toFixed(2)} {editingOrder.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>
              Update Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}