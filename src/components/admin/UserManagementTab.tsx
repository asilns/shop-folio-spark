import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ManagedUser {
  id: string;
  store_name: string;
  username: string;
  password_hash: string;
  pin: string;
  last_login: string | null;
  subscription_date: string;
  subscription_expiry: string;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  store_name: string;
  username: string;
  password: string;
  pin: string;
  subscription_date: string;
  subscription_expiry: string;
}

export default function UserManagementTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    store_name: '',
    username: '',
    password: '',
    pin: '',
    subscription_date: new Date().toISOString().split('T')[0],
    subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { admin, canCreate, canModify, canDelete } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('managed_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (actionType: string, affectedUser: string, notes?: string) => {
    if (!admin) return;
    
    try {
      await supabase.from('audit_logs').insert({
        admin_username: admin.username,
        action_type: actionType,
        affected_user: affectedUser,
        notes: notes
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!canCreate) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to create users',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Hash password and PIN
      const hashedPassword = `crypt('${formData.password}', gen_salt('bf'))`;
      
      const { error } = await supabase
        .from('managed_users')
        .insert({
          store_name: formData.store_name,
          username: formData.username,
          password_hash: hashedPassword,
          pin: formData.pin,
          subscription_date: formData.subscription_date,
          subscription_expiry: formData.subscription_expiry
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await logAuditAction('CREATE', formData.username, `Created user: ${formData.store_name}`);
      
      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      setShowCreateDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!canModify || !editingUser) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to modify users',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData: any = {
        store_name: formData.store_name,
        username: formData.username,
        pin: formData.pin,
        subscription_date: formData.subscription_date,
        subscription_expiry: formData.subscription_expiry
      };

      // Only update password if provided
      if (formData.password) {
        updateData.password_hash = `crypt('${formData.password}', gen_salt('bf'))`;
      }

      const { error } = await supabase
        .from('managed_users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await logAuditAction('MODIFY', formData.username, `Updated user: ${formData.store_name}`);
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!canDelete || !deletingUser || !admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete users',
        variant: 'destructive',
      });
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Confirmation Required',
        description: 'Please type "DELETE" to confirm',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('soft_delete_user', {
        user_id: deletingUser.id,
        admin_username: admin.username
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'User Deleted',
        description: `User ${deletingUser.username} has been deleted and moved to recently deleted`,
      });

      setDeletingUser(null);
      setDeleteConfirmText('');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      store_name: '',
      username: '',
      password: '',
      pin: '',
      subscription_date: new Date().toISOString().split('T')[0],
      subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const startEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setFormData({
      store_name: user.store_name,
      username: user.username,
      password: '',
      pin: user.pin,
      subscription_date: user.subscription_date,
      subscription_expiry: user.subscription_expiry
    });
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Manage Users</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new managed user account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="store_name">Store Name</Label>
                  <Input
                    id="store_name"
                    value={formData.store_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input
                    id="pin"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <div>
                  <Label htmlFor="subscription_date">Subscription Date</Label>
                  <Input
                    id="subscription_date"
                    type="date"
                    value={formData.subscription_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, subscription_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="subscription_expiry">Subscription Expiry</Label>
                  <Input
                    id="subscription_expiry"
                    type="date"
                    value={formData.subscription_expiry}
                    onChange={(e) => setFormData(prev => ({ ...prev, subscription_expiry: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Subscription Date</TableHead>
              <TableHead>Subscription Expiry</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.store_name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm">
                      {showPasswordMap[user.id] ? '••••••••' : '••••••••'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePasswordVisibility(user.id)}
                    >
                      {showPasswordMap[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{user.pin}</TableCell>
                <TableCell>
                  {user.last_login ? (
                    <span>{format(new Date(user.last_login), 'PPp')}</span>
                  ) : (
                    <Badge variant="secondary">Never</Badge>
                  )}
                </TableCell>
                <TableCell>{format(new Date(user.subscription_date), 'PP')}</TableCell>
                <TableCell>{format(new Date(user.subscription_expiry), 'PP')}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {canModify && (
                      <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                              Update user information
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
                              <Label htmlFor="edit_username">Username</Label>
                              <Input
                                id="edit_username"
                                value={formData.username}
                                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_password">New Password (leave blank to keep current)</Label>
                              <Input
                                id="edit_password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_pin">4-Digit PIN</Label>
                              <Input
                                id="edit_pin"
                                maxLength={4}
                                value={formData.pin}
                                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_subscription_date">Subscription Date</Label>
                              <Input
                                id="edit_subscription_date"
                                type="date"
                                value={formData.subscription_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, subscription_date: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_subscription_expiry">Subscription Expiry</Label>
                              <Input
                                id="edit_subscription_expiry"
                                type="date"
                                value={formData.subscription_expiry}
                                onChange={(e) => setFormData(prev => ({ ...prev, subscription_expiry: e.target.value }))}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingUser(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateUser}>Update User</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {canDelete && (
                      <AlertDialog open={deletingUser?.id === user.id} onOpenChange={(open) => !open && setDeletingUser(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setDeletingUser(user)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete user "{user.username}" from "{user.store_name}"? 
                              This action will move the user to Recently Deleted where it can be restored within 30 days.
                              <br /><br />
                              Type <strong>DELETE</strong> to confirm:
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Input
                              placeholder="Type DELETE to confirm"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setDeletingUser(null); setDeleteConfirmText(''); }}>
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
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}