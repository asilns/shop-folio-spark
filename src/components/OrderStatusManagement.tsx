import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { storeFrom, storeInsert, storeUpdate, storeDelete, validateStoreId } from '@/lib/storeScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings2, Plus, Edit3, Trash2, Tag } from 'lucide-react';

interface OrderStatus {
  id: string;
  store_id: string;
  name: string;
  display_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

const colorOptions = [
  { value: '#F59E0B', label: 'Amber', preview: 'bg-amber-500' },
  { value: '#3B82F6', label: 'Blue', preview: 'bg-blue-500' },
  { value: '#8B5CF6', label: 'Purple', preview: 'bg-purple-500' },
  { value: '#10B981', label: 'Green', preview: 'bg-green-500' },
  { value: '#EF4444', label: 'Red', preview: 'bg-red-500' },
  { value: '#F97316', label: 'Orange', preview: 'bg-orange-500' },
  { value: '#6B7280', label: 'Gray', preview: 'bg-gray-500' },
  { value: '#EC4899', label: 'Pink', preview: 'bg-pink-500' },
  { value: '#14B8A6', label: 'Teal', preview: 'bg-teal-500' },
  { value: '#F59E0B', label: 'Yellow', preview: 'bg-yellow-500' },
];

export function OrderStatusManagement() {
  const { t } = useLanguage();
  const { user } = useStoreAuth();
  const { toast } = useToast();
  
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    color: '#6B7280',
    sort_order: 0,
    is_active: true,
    is_default: false
  });

  useEffect(() => {
    if (user?.store_id) {
      fetchOrderStatuses();
    }
  }, [user?.store_id]);

  const fetchOrderStatuses = async () => {
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      const { data, error } = await storeFrom('order_statuses', storeId)
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setStatuses(data || []);

      // If no statuses exist, seed defaults
      if (!data || data.length === 0) {
        await seedDefaultStatuses();
      }
    } catch (error) {
      console.error('Error fetching order statuses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order statuses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultStatuses = async () => {
    if (!user?.store_id) return;
    
    try {
      const storeId = validateStoreId(user.store_id);
      const defaultStatuses = [
        { name: 'pending', display_name: 'Pending', color: '#F59E0B', sort_order: 10, is_default: true },
        { name: 'processing', display_name: 'Processing', color: '#3B82F6', sort_order: 20, is_default: false },
        { name: 'shipped', display_name: 'Shipped', color: '#8B5CF6', sort_order: 30, is_default: false },
        { name: 'delivered', display_name: 'Delivered', color: '#10B981', sort_order: 40, is_default: false },
        { name: 'cancelled', display_name: 'Cancelled', color: '#EF4444', sort_order: 50, is_default: false },
        { name: 'returned', display_name: 'Returned', color: '#F97316', sort_order: 60, is_default: false },
        { name: 'on_hold', display_name: 'On Hold', color: '#6B7280', sort_order: 70, is_default: false },
      ];

      for (const status of defaultStatuses) {
        await storeInsert('order_statuses', storeId, { ...status, is_active: true });
      }

      fetchOrderStatuses();
    } catch (error) {
      console.error('Error seeding default statuses:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      color: '#6B7280',
      sort_order: statuses.length + 1,
      is_active: true,
      is_default: false
    });
  };

  const generateSlug = (displayName: string) => {
    return displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  };

  const handleCreate = async () => {
    if (!user?.store_id || !formData.display_name.trim()) return;

    try {
      const storeId = validateStoreId(user.store_id);
      const slug = generateSlug(formData.display_name);

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        for (const status of statuses.filter(s => s.is_default)) {
          await storeUpdate('order_statuses', storeId, 'id', status.id, { is_default: false });
        }
      }

      const { error } = await storeInsert('order_statuses', storeId, {
        name: slug,
        display_name: formData.display_name,
        color: formData.color,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        is_default: formData.is_default
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order status created successfully',
      });

      setShowCreateDialog(false);
      resetForm();
      fetchOrderStatuses();
    } catch (error) {
      console.error('Error creating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order status',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    if (!editingStatus || !user?.store_id) return;

    try {
      const storeId = validateStoreId(user.store_id);

      // If setting as default, unset other defaults first
      if (formData.is_default && !editingStatus.is_default) {
        for (const status of statuses.filter(s => s.is_default && s.id !== editingStatus.id)) {
          await storeUpdate('order_statuses', storeId, 'id', status.id, { is_default: false });
        }
      }

      const { error } = await storeUpdate('order_statuses', storeId, 'id', editingStatus.id, {
        display_name: formData.display_name,
        color: formData.color,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        is_default: formData.is_default
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });

      setShowEditDialog(false);
      setEditingStatus(null);
      resetForm();
      fetchOrderStatuses();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (status: OrderStatus) => {
    if (!user?.store_id) return;

    try {
      const storeId = validateStoreId(user.store_id);
      const { error } = await storeDelete('order_statuses', storeId, 'id', status.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order status deleted successfully',
      });

      fetchOrderStatuses();
    } catch (error) {
      console.error('Error deleting order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (status: OrderStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      display_name: status.display_name,
      color: status.color,
      sort_order: status.sort_order,
      is_active: status.is_active,
      is_default: status.is_default
    });
    setShowEditDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({ ...prev, sort_order: (statuses.length + 1) * 10 }));
    setShowCreateDialog(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading order statuses...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Order Status Overview */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Order Status Management
              </CardTitle>
              <CardDescription>
                Manage the order statuses available in your store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <Badge
                key={status.id}
                variant={status.is_active ? "default" : "secondary"}
                className="px-3 py-1"
                style={{
                  backgroundColor: status.is_active ? status.color : undefined,
                  color: status.is_active ? 'white' : undefined
                }}
              >
                {status.display_name}
                {status.is_default && ' (Default)'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configure Order Statuses */}
      <Card className="rounded-2xl shadow-sm mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Configure Order Statuses
              </CardTitle>
              <CardDescription>
                Add, edit, or remove order statuses and set their properties
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {statuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <div className="font-medium">{status.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {status.name} • Order: {status.sort_order}
                      {status.is_default && ' • Default'}
                      {!status.is_active && ' • Inactive'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(status)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Order Status</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{status.display_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(status)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Order Status</DialogTitle>
                <DialogDescription>
                  Add a new order status to your store
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g., In Review"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-8 h-8 rounded border-2 ${
                          formData.color === option.value ? 'border-ring' : 'border-border'
                        }`}
                        style={{ backgroundColor: option.value }}
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        title={option.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                  <Label htmlFor="is_default">Set as default for new orders</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.display_name.trim()}>
                  Create Status
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Order Status</DialogTitle>
                <DialogDescription>
                  Update the order status details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>System Name</Label>
                  <Input value={editingStatus?.name || ''} disabled className="bg-muted" />
                  <p className="text-sm text-muted-foreground">System name cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_display_name">Display Name</Label>
                  <Input
                    id="edit_display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-8 h-8 rounded border-2 ${
                          formData.color === option.value ? 'border-ring' : 'border-border'
                        }`}
                        style={{ backgroundColor: option.value }}
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        title={option.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_sort_order">Sort Order</Label>
                  <Input
                    id="edit_sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                  <Label htmlFor="edit_is_default">Set as default for new orders</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={!formData.display_name.trim()}>
                  Update Status
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}