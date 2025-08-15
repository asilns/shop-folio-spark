import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, ExternalLink, Users, Trash2, UserPlus } from 'lucide-react';
import { generateSlug, validateSlug } from '@/utils/slugs';

interface Store {
  id: string;
  store_name: string;
  store_slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreUser {
  id: string;
  username: string;
  role: 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER';
  last_login: string | null;
  store_id: string;
}

interface UserFormData {
  username: string;
  password: string;
  pin: string;
}

export function StoreManagementTab() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  
  const [formData, setFormData] = useState({
    store_name: '',
    store_slug: '',
    is_active: true
  });

  const [createUsers, setCreateUsers] = useState({
    admin: { username: '', password: '', pin: '' } as UserFormData,
    dataEntry: { username: '', password: '', pin: '' } as UserFormData,
    viewer: { username: '', password: '', pin: '' } as UserFormData
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    pin: '',
    role: 'DATA_ENTRY' as 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER'
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreUsers = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('store_users')
        .select('*')
        .eq('store_id', storeId)
        .order('role', { ascending: true });

      if (error) throw error;
      setStoreUsers((data || []).map(user => ({
        ...user,
        role: user.role as 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER'
      })));
    } catch (error) {
      console.error('Error fetching store users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch store users',
        variant: 'destructive'
      });
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

    if (!createUsers.admin.username || !createUsers.admin.password) {
      toast({
        title: 'Error',
        description: 'Store Admin username and password are required',
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
      // Create store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          store_name: formData.store_name,
          store_slug: formData.store_slug,
          is_active: formData.is_active
        })
        .select()
        .single();

      if (storeError) throw storeError;

      // Create users
      const usersToCreate = [];
      
      // Admin (required)
      usersToCreate.push({
        store_id: store.id,
        username: createUsers.admin.username,
        password_hash: createUsers.admin.password, // In production, hash this
        role: 'STORE_ADMIN',
        pin: createUsers.admin.pin || null
      });

      // Data Entry (optional)
      if (createUsers.dataEntry.username && createUsers.dataEntry.password) {
        usersToCreate.push({
          store_id: store.id,
          username: createUsers.dataEntry.username,
          password_hash: createUsers.dataEntry.password,
          role: 'DATA_ENTRY',
          pin: createUsers.dataEntry.pin || null
        });
      }

      // Viewer (optional)
      if (createUsers.viewer.username && createUsers.viewer.password) {
        usersToCreate.push({
          store_id: store.id,
          username: createUsers.viewer.username,
          password_hash: createUsers.viewer.password,
          role: 'VIEWER',
          pin: createUsers.viewer.pin || null
        });
      }

      const { error: usersError } = await supabase
        .from('store_users')
        .insert(usersToCreate);

      if (usersError) throw usersError;

      toast({
        title: 'Success',
        description: 'Store and users created successfully'
      });

      setCreateDialogOpen(false);
      resetForms();
      fetchStores();
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
          is_active: formData.is_active
        })
        .eq('id', selectedStore.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Store updated successfully'
      });

      setEditDialogOpen(false);
      setSelectedStore(null);
      resetForms();
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

  const handleAddUser = async () => {
    if (!selectedStore || !newUser.username || !newUser.password) {
      toast({
        title: 'Error',
        description: 'Username and password are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('store_users')
        .insert({
          store_id: selectedStore.id,
          username: newUser.username,
          password_hash: newUser.password,
          role: newUser.role,
          pin: newUser.pin || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User added successfully'
      });

      setUserDialogOpen(false);
      setNewUser({ username: '', password: '', pin: '', role: 'DATA_ENTRY' });
      fetchStoreUsers(selectedStore.id);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!selectedStore) return;

    // Check if this is the last STORE_ADMIN
    const adminCount = storeUsers.filter(u => u.role === 'STORE_ADMIN').length;
    const userToDelete = storeUsers.find(u => u.id === userId);
    
    if (userToDelete?.role === 'STORE_ADMIN' && adminCount === 1) {
      toast({
        title: 'Error',
        description: 'Cannot delete the last Store Admin',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('store_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deleted successfully'
      });

      fetchStoreUsers(selectedStore.id);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (store: Store) => {
    setSelectedStore(store);
    setFormData({
      store_name: store.store_name,
      store_slug: store.store_slug,
      is_active: store.is_active
    });
    fetchStoreUsers(store.id);
    setEditDialogOpen(true);
  };

  const resetForms = () => {
    setFormData({ store_name: '', store_slug: '', is_active: true });
    setCreateUsers({
      admin: { username: '', password: '', pin: '' },
      dataEntry: { username: '', password: '', pin: '' },
      viewer: { username: '', password: '', pin: '' }
    });
  };

  const getUsersCount = (storeId: string) => {
    // This would need to be fetched separately or included in store query
    return 0; // Placeholder
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
            Manage stores and their users in one place
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Store</DialogTitle>
              <DialogDescription>
                Create a new store with initial users. Store Admin is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Store Users</h4>
                
                {/* Store Admin (Required) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-destructive">Store Admin (Required)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="admin_username">Username</Label>
                        <Input
                          id="admin_username"
                          value={createUsers.admin.username}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            admin: { ...prev.admin, username: e.target.value }
                          }))}
                          placeholder="admin_user"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_password">Password</Label>
                        <Input
                          id="admin_password"
                          type="password"
                          value={createUsers.admin.password}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            admin: { ...prev.admin, password: e.target.value }
                          }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_pin">PIN (Optional)</Label>
                        <Input
                          id="admin_pin"
                          value={createUsers.admin.pin}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            admin: { ...prev.admin, pin: e.target.value }
                          }))}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Entry (Optional) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Data Entry (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="dataentry_username">Username</Label>
                        <Input
                          id="dataentry_username"
                          value={createUsers.dataEntry.username}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            dataEntry: { ...prev.dataEntry, username: e.target.value }
                          }))}
                          placeholder="data_entry_user"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dataentry_password">Password</Label>
                        <Input
                          id="dataentry_password"
                          type="password"
                          value={createUsers.dataEntry.password}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            dataEntry: { ...prev.dataEntry, password: e.target.value }
                          }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dataentry_pin">PIN (Optional)</Label>
                        <Input
                          id="dataentry_pin"
                          value={createUsers.dataEntry.pin}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            dataEntry: { ...prev.dataEntry, pin: e.target.value }
                          }))}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Viewer (Optional) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Viewer (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="viewer_username">Username</Label>
                        <Input
                          id="viewer_username"
                          value={createUsers.viewer.username}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            viewer: { ...prev.viewer, username: e.target.value }
                          }))}
                          placeholder="viewer_user"
                        />
                      </div>
                      <div>
                        <Label htmlFor="viewer_password">Password</Label>
                        <Input
                          id="viewer_password"
                          type="password"
                          value={createUsers.viewer.password}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            viewer: { ...prev.viewer, password: e.target.value }
                          }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="viewer_pin">PIN (Optional)</Label>
                        <Input
                          id="viewer_pin"
                          value={createUsers.viewer.pin}
                          onChange={(e) => setCreateUsers(prev => ({
                            ...prev,
                            viewer: { ...prev.viewer, pin: e.target.value }
                          }))}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            Manage stores, users, and activation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.store_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {store.store_slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.is_active ? "default" : "secondary"}>
                      {store.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {getUsersCount(store.id)}
                    </div>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Store Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              Manage store settings and users
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Store Settings</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="store-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="store-active">Store Active</Label>
                <p className="text-sm text-muted-foreground">
                  When disabled, all logins to this store will be blocked
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Store Users</h4>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to this store
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new_username">Username</Label>
                        <Input
                          id="new_username"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_password">Password</Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_role">Role</Label>
                        <select
                          id="new_role"
                          value={newUser.role}
                          onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-input rounded-md"
                        >
                          <option value="STORE_ADMIN">Store Admin</option>
                          <option value="DATA_ENTRY">Data Entry</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="new_pin">PIN (Optional)</Label>
                        <Input
                          id="new_pin"
                          value={newUser.pin}
                          onChange={(e) => setNewUser(prev => ({ ...prev, pin: e.target.value }))}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddUser}>Add User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'STORE_ADMIN' ? 'destructive' : 'secondary'}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.role === 'STORE_ADMIN' && storeUsers.filter(u => u.role === 'STORE_ADMIN').length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStore}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}