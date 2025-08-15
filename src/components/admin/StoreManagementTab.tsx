import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, ExternalLink, AlertTriangle } from 'lucide-react';
import { generateSlug, validateSlug } from '@/utils/slugs';

interface Store {
  id: string;
  store_name: string;
  store_slug: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ManagedUser {
  id: string;
  username: string;
  store_name: string;
  store_id: string | null;
}

export function StoreManagementTab() {
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    store_slug: '',
    owner_user_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
    fetchUsers();
  }, []);

  useEffect(() => {
    // Auto-generate slug when store name changes
    if (formData.store_name && !editDialogOpen) {
      setFormData(prev => ({
        ...prev,
        store_slug: generateSlug(prev.store_name)
      }));
    }
  }, [formData.store_name, editDialogOpen]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch stores',
        variant: 'destructive'
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('managed_users')
        .select('id, username, store_name, store_id');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!formData.store_name) {
      toast({
        title: 'Error',
        description: 'Store name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!validateSlug(formData.store_slug)) {
      toast({
        title: 'Error',
        description: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .insert({
          store_name: formData.store_name,
          store_slug: formData.store_slug,
          owner_user_id: formData.owner_user_id || null
        })
        .select()
        .single();

      if (error) throw error;

      // If owner is assigned, update the user's store_id
      if (formData.owner_user_id) {
        await supabase
          .from('managed_users')
          .update({ store_id: data.id })
          .eq('id', formData.owner_user_id);
      }

      toast({
        title: 'Success',
        description: 'Store created successfully'
      });

      setCreateDialogOpen(false);
      setFormData({ store_name: '', store_slug: '', owner_user_id: '' });
      fetchStores();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create store',
        variant: 'destructive'
      });
    }
  };

  const handleEditStore = async () => {
    if (!selectedStore || !formData.store_name) return;

    if (!validateSlug(formData.store_slug)) {
      toast({
        title: 'Error',
        description: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          store_name: formData.store_name,
          store_slug: formData.store_slug,
          owner_user_id: formData.owner_user_id || null
        })
        .eq('id', selectedStore.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Store updated successfully. Old URLs will redirect automatically.'
      });

      setEditDialogOpen(false);
      setSelectedStore(null);
      setFormData({ store_name: '', store_slug: '', owner_user_id: '' });
      fetchStores();
    } catch (error: any) {
      console.error('Error updating store:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update store',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (store: Store) => {
    setSelectedStore(store);
    setFormData({
      store_name: store.store_name,
      store_slug: store.store_slug,
      owner_user_id: store.owner_user_id || ''
    });
    setEditDialogOpen(true);
  };

  const getStoreOwner = (store: Store) => {
    return users.find(user => user.id === store.owner_user_id);
  };

  if (loading) {
    return <div className="text-center py-8">Loading stores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Store Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage stores, slugs, and URL redirects
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Store</DialogTitle>
              <DialogDescription>
                Create a new store with a unique name and slug.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="store_name">Store Name</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                  placeholder="My Awesome Store"
                />
              </div>
              <div>
                <Label htmlFor="store_slug">Store Slug (URL)</Label>
                <Input
                  id="store_slug"
                  value={formData.store_slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, store_slug: e.target.value }))}
                  placeholder="my-awesome-store"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL will be: /store/{formData.store_slug}/dashboard
                </p>
              </div>
              <div>
                <Label htmlFor="owner_user_id">Owner (Optional)</Label>
                <select
                  id="owner_user_id"
                  value={formData.owner_user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="">Select an owner</option>
                  {users.filter(user => !user.store_id).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} - {user.store_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateStore}>Create Store</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stores</CardTitle>
          <CardDescription>
            Manage store names, slugs, and ownership. When slugs change, old URLs automatically redirect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => {
                const owner = getStoreOwner(store);
                return (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.store_name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {store.store_slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      {owner ? (
                        <div>
                          <div className="font-medium">{owner.username}</div>
                          <div className="text-sm text-muted-foreground">{owner.store_name}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">No owner</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(store.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(store)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/store/${store.store_slug}/dashboard`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Store Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Warning: Changing the slug will change URLs. Old URLs will redirect automatically.
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_store_name">Store Name</Label>
              <Input
                id="edit_store_name"
                value={formData.store_name}
                onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_store_slug">Store Slug (URL)</Label>
              <Input
                id="edit_store_slug"
                value={formData.store_slug}
                onChange={(e) => setFormData(prev => ({ ...prev, store_slug: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL will be: /store/{formData.store_slug}/dashboard
              </p>
            </div>
            <div>
              <Label htmlFor="edit_owner_user_id">Owner</Label>
              <select
                id="edit_owner_user_id"
                value={formData.owner_user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_user_id: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="">No owner</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} - {user.store_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>Save Changes</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Store Changes</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update the store information. If you changed the slug, old URLs will automatically redirect to the new slug. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEditStore}>
                    Yes, Update Store
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}