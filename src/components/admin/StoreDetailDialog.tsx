import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Store {
  id: string;
  store_name: string;
  store_slug: string;
  created_at: string;
  updated_at: string;
}

interface StoreUser {
  id: string;
  store_name: string;
  username: string;
  password_hash: string;
  pin: string;
  role: 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER';
  last_login: string | null;
  subscription_date: string;
  subscription_expiry: string;
  created_at: string;
  store_id: string;
}

interface StoreDetailDialogProps {
  store: Store | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreUpdated: () => void;
}

interface UserFormData {
  username: string;
  password: string;
  role: 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER';
  pin: string;
  subscription_date: string;
  subscription_expiry: string;
}

export function StoreDetailDialog({ store, open, onOpenChange, onStoreUpdated }: StoreDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<StoreUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState<{ [key: string]: boolean }>({});
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'DATA_ENTRY',
    pin: '',
    subscription_date: new Date().toISOString().split('T')[0],
    subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { toast } = useToast();

  useEffect(() => {
    if (store && open && activeTab === 'users') {
      fetchStoreUsers();
    }
  }, [store, open, activeTab]);

  const fetchStoreUsers = async () => {
    if (!store) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('managed_users')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as StoreUser[]);
    } catch (error) {
      console.error('Error fetching store users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch store users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!store) return;

    try {
      const { data, error } = await supabase.rpc('create_managed_user', {
        p_store_name: store.store_name,
        p_username: userFormData.username,
        p_password_hash: userFormData.password,
        p_pin: userFormData.pin,
        p_subscription_date: userFormData.subscription_date,
        p_subscription_expiry: userFormData.subscription_expiry,
        p_role: userFormData.role,
        p_store_id: store.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully",
      });

      resetUserForm();
      setUserDialogOpen(false);
      fetchStoreUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase.rpc('update_managed_user', {
        p_user_id: editingUser.id,
        p_store_name: store?.store_name,
        p_username: userFormData.username,
        p_password_hash: userFormData.password || undefined,
        p_pin: userFormData.pin,
        p_subscription_date: userFormData.subscription_date,
        p_subscription_expiry: userFormData.subscription_expiry,
        p_role: userFormData.role
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      resetUserForm();
      setUserDialogOpen(false);
      setEditingUser(null);
      fetchStoreUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || deleteConfirmText !== 'DELETE') return;

    try {
      const { error } = await supabase.rpc('delete_managed_user', {
        p_user_id: userToDelete.id,
        p_admin_username: 'admin' // This should come from admin context
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmText('');
      fetchStoreUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      password: '',
      role: 'DATA_ENTRY',
      pin: '',
      subscription_date: new Date().toISOString().split('T')[0],
      subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const startEditUser = (user: StoreUser) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      password: '',
      role: user.role,
      pin: user.pin,
      subscription_date: user.subscription_date,
      subscription_expiry: user.subscription_expiry
    });
    setUserDialogOpen(true);
  };

  const togglePasswordVisibility = (userId: string) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'STORE_ADMIN':
        return 'destructive';
      case 'DATA_ENTRY':
        return 'default';
      case 'VIEWER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!store) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {store.store_name}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Store Name</Label>
                      <div className="text-sm text-muted-foreground">{store.store_name}</div>
                    </div>
                    <div>
                      <Label>Store Slug</Label>
                      <div className="text-sm text-muted-foreground">{store.store_slug}</div>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(store.created_at), 'PPP')}
                      </div>
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(store.updated_at), 'PPP')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Store Users</h3>
                  <Badge variant="outline">{users.length} users</Badge>
                </div>
                <Button onClick={() => {
                  resetUserForm();
                  setEditingUser(null);
                  setUserDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {passwordVisibility[user.id] ? user.password_hash : '••••••••'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(user.id)}
                              >
                                {passwordVisibility[user.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{user.pin}</TableCell>
                          <TableCell>
                            {user.last_login ? format(new Date(user.last_login), 'PP') : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{format(new Date(user.subscription_date), 'PP')}</div>
                              <div className="text-muted-foreground">
                                to {format(new Date(user.subscription_expiry), 'PP')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* User Create/Edit Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={userFormData.username}
                onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password {editingUser && '(leave empty to keep current)'}</Label>
              <Input
                id="password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={userFormData.role} onValueChange={(value: any) => setUserFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORE_ADMIN">Store Admin</SelectItem>
                  <SelectItem value="DATA_ENTRY">Data Entry</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                value={userFormData.pin}
                onChange={(e) => setUserFormData(prev => ({ ...prev, pin: e.target.value }))}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription_date">Subscription Date</Label>
                <Input
                  id="subscription_date"
                  type="date"
                  value={userFormData.subscription_date}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, subscription_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="subscription_expiry">Subscription Expiry</Label>
                <Input
                  id="subscription_expiry"
                  type="date"
                  value={userFormData.subscription_expiry}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, subscription_expiry: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
                {editingUser ? 'Update' : 'Create'} User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user "{userToDelete?.username}"? This action cannot be undone.
              <br /><br />
              Type "DELETE" to confirm:
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmText('');
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteConfirmText !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}