import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Eye, Trash2, Copy, Shield, User, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  store_name: string;
  store_slug: string;
  store_id_8digit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreUser {
  id: string;
  username: string;
  role: 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER';
  last_login: string | null;
  created_at: string;
}

interface CreateStoreData {
  storeName: string;
  storeSlug: string;
  admin: {
    username: string;
    password: string;
    pin?: string;
  };
  dataEntry?: {
    username?: string;
    password?: string;
    pin?: string;
  };
  viewer?: {
    username?: string;
    password?: string;
    pin?: string;
  };
}

export default function StoreManagementTab() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  // Create Store Form State
  const [createForm, setCreateForm] = useState<CreateStoreData>({
    storeName: '',
    storeSlug: '',
    admin: { username: '', password: '', pin: '' },
    dataEntry: { username: '', password: '', pin: '' },
    viewer: { username: '', password: '', pin: '' }
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load stores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStoreUsers = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('store_users')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStoreUsers((data || []) as StoreUser[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load store users',
        variant: 'destructive',
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Store ID copied to clipboard',
    });
  };

  const handleCreateStore = async () => {
    if (!createForm.storeName || !createForm.admin.username || !createForm.admin.password) {
      toast({
        title: 'Error',
        description: 'Store name, admin username, and password are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-store-with-users', {
        body: {
          storeName: createForm.storeName,
          storeSlug: createForm.storeSlug || generateSlug(createForm.storeName),
          users: {
            admin: createForm.admin,
            dataEntry: createForm.dataEntry?.username ? createForm.dataEntry : undefined,
            viewer: createForm.viewer?.username ? createForm.viewer : undefined,
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Store created successfully',
      });

      setShowCreateDialog(false);
      setCreateForm({
        storeName: '',
        storeSlug: '',
        admin: { username: '', password: '', pin: '' },
        dataEntry: { username: '', password: '', pin: '' },
        viewer: { username: '', password: '', pin: '' }
      });
      loadStores();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create store',
        variant: 'destructive',
      });
    }
  };

  const toggleStoreStatus = async (store: Store) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !store.is_active })
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Store ${!store.is_active ? 'activated' : 'deactivated'} successfully`,
      });

      loadStores();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update store status',
        variant: 'destructive',
      });
    }
  };

  const handleViewStore = (store: Store) => {
    setSelectedStore(store);
    loadStoreUsers(store.id);
    setShowEditDialog(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'STORE_ADMIN':
        return <Shield className="w-4 h-4" />;
      case 'DATA_ENTRY':
        return <UserCheck className="w-4 h-4" />;
      case 'VIEWER':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STORE_ADMIN':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'DATA_ENTRY':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'VIEWER':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Store Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage stores and their users with 8-digit store IDs for strict tenant isolation
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Store</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Store Name *</Label>
                  <Input
                    id="storeName"
                    value={createForm.storeName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCreateForm(prev => ({
                        ...prev,
                        storeName: name,
                        storeSlug: generateSlug(name)
                      }));
                    }}
                    placeholder="My Store"
                  />
                </div>
                <div>
                  <Label htmlFor="storeSlug">Store Slug</Label>
                  <Input
                    id="storeSlug"
                    value={createForm.storeSlug}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, storeSlug: e.target.value }))}
                    placeholder="my-store"
                  />
                </div>
              </div>

              <Separator />

              {/* Store Admin - Required */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <h4 className="font-medium">Store Admin (Required)</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Username *</Label>
                    <Input
                      value={createForm.admin.username}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        admin: { ...prev.admin, username: e.target.value }
                      }))}
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={createForm.admin.password}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        admin: { ...prev.admin, password: e.target.value }
                      }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>PIN (Optional)</Label>
                    <Input
                      value={createForm.admin.pin}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        admin: { ...prev.admin, pin: e.target.value }
                      }))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Entry - Optional */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium">Data Entry (Optional)</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={createForm.dataEntry?.username}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        dataEntry: { ...prev.dataEntry, username: e.target.value }
                      }))}
                      placeholder="dataentry"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={createForm.dataEntry?.password}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        dataEntry: { ...prev.dataEntry, password: e.target.value }
                      }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>PIN (Optional)</Label>
                    <Input
                      value={createForm.dataEntry?.pin}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        dataEntry: { ...prev.dataEntry, pin: e.target.value }
                      }))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Viewer - Optional */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium">Viewer (Optional)</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={createForm.viewer?.username}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        viewer: { ...prev.viewer, username: e.target.value }
                      }))}
                      placeholder="viewer"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={createForm.viewer?.password}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        viewer: { ...prev.viewer, password: e.target.value }
                      }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>PIN (Optional)</Label>
                    <Input
                      value={createForm.viewer?.pin}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        viewer: { ...prev.viewer, pin: e.target.value }
                      }))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStore}>
                  Create Store
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stores List */}
      <div className="grid gap-4">
        {stores.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No stores found</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Store
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          stores.map((store) => (
            <Card key={store.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{store.store_name}</h4>
                      <Badge variant={store.is_active ? "default" : "secondary"}>
                        {store.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Slug: <code className="bg-muted px-1 rounded">{store.store_slug}</code></p>
                      <div className="flex items-center gap-2">
                        <span>Store ID: </span>
                        <code className="bg-muted px-2 py-1 rounded font-mono text-primary">
                          {store.store_id_8digit}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(store.store_id_8digit)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p>Created: {new Date(store.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`status-${store.id}`} className="text-sm">
                        {store.is_active ? 'Active' : 'Inactive'}
                      </Label>
                      <Switch
                        id={`status-${store.id}`}
                        checked={store.is_active}
                        onCheckedChange={() => toggleStoreStatus(store)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStore(store)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Store Details Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Store Details: {selectedStore?.store_name}</DialogTitle>
          </DialogHeader>
          {selectedStore && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Store Name</Label>
                    <Input value={selectedStore.store_name} readOnly />
                  </div>
                  <div>
                    <Label>Store Slug</Label>
                    <Input value={selectedStore.store_slug} readOnly />
                  </div>
                  <div>
                    <Label>8-Digit Store ID</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={selectedStore.store_id_8digit} 
                        readOnly 
                        className="font-mono text-primary"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedStore.store_id_8digit)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={selectedStore.is_active}
                        onCheckedChange={() => toggleStoreStatus(selectedStore)}
                      />
                      <span className="text-sm">
                        {selectedStore.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Store Users</h4>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
                <div className="space-y-2">
                  {storeUsers.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getRoleIcon(user.role)}
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-muted-foreground">
                                Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <p className="text-muted-foreground">Store settings and configuration options will be available here.</p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}