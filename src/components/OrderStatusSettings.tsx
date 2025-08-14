import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Edit3, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface OrderStatusSettingsProps {
  onStatusChange?: () => void;
}

const colorOptions = [
  { value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
  { value: 'bg-blue-100 text-blue-800', label: 'Blue' },
  { value: 'bg-purple-100 text-purple-800', label: 'Purple' },
  { value: 'bg-green-100 text-green-800', label: 'Green' },
  { value: 'bg-emerald-100 text-emerald-800', label: 'Emerald' },
  { value: 'bg-red-100 text-red-800', label: 'Red' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange' },
  { value: 'bg-pink-100 text-pink-800', label: 'Pink' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
  { value: 'bg-gray-100 text-gray-800', label: 'Gray' },
];

export function OrderStatusSettings({ onStatusChange }: OrderStatusSettingsProps) {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    color: 'bg-gray-100 text-gray-800',
    sort_order: 0,
    is_active: true
  });
  const { toast } = useToast();

  const fetchOrderStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('order_statuses')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error: any) {
      console.error('Error fetching order statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load order statuses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStatuses();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      color: 'bg-gray-100 text-gray-800',
      sort_order: statuses.length + 1,
      is_active: true
    });
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('order_statuses')
        .insert([{
          name: formData.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.display_name,
          color: formData.color,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status created successfully",
      });

      setShowCreateDialog(false);
      resetForm();
      fetchOrderStatuses();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error creating order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order status",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingStatus) return;

    try {
      const { error } = await supabase
        .from('order_statuses')
        .update({
          display_name: formData.display_name,
          color: formData.color,
          sort_order: formData.sort_order,
          is_active: formData.is_active
        })
        .eq('id', editingStatus.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

      setShowEditDialog(false);
      setEditingStatus(null);
      resetForm();
      fetchOrderStatuses();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('order_statuses')
        .delete()
        .eq('id', status.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status deleted successfully",
      });

      fetchOrderStatuses();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error deleting order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete order status",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('order_statuses')
        .update({ is_active: !status.is_active })
        .eq('id', status.id);

      if (error) throw error;

      fetchOrderStatuses();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
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
      is_active: status.is_active
    });
    setShowEditDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({ ...prev, sort_order: statuses.length + 1 }));
    setShowCreateDialog(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Order Status Management
            </CardTitle>
            <CardDescription>
              Configure the available order statuses and their appearance
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Add Status
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>System Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell className="font-medium">{status.display_name}</TableCell>
                <TableCell className="font-mono text-sm">{status.name}</TableCell>
                <TableCell>
                  <Badge className={status.color}>{status.display_name}</Badge>
                </TableCell>
                <TableCell>{status.sort_order}</TableCell>
                <TableCell>
                  <Switch
                    checked={status.is_active}
                    onCheckedChange={() => handleToggleActive(status)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
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
                            Are you sure you want to delete the "{status.display_name}" status? 
                            This action cannot be undone.
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Order Status</DialogTitle>
              <DialogDescription>
                Add a new order status to your system
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
                <Label htmlFor="color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={option.value}>Sample</Badge>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                Update the order status settings
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
                <Label htmlFor="edit_color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={option.value}>Sample</Badge>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  );
}