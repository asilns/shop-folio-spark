import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Admin {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
  email?: string;
  created_at: string;
  updated_at: string;
}

interface AdminFormData {
  username: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
  email: string;
}

export default function AdminSettingsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  
  const [formData, setFormData] = useState<AdminFormData>({
    username: '',
    password: '',
    role: 'ADMIN',
    email: ''
  });

  const { admin, canManageAdmins, refreshAdmin } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (canManageAdmins) {
      fetchAdmins();
    }
  }, [canManageAdmins]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch admins',
          variant: 'destructive',
        });
        return;
      }

      setAdmins((data || []) as Admin[]);
    } catch (error) {
      console.error('Error fetching admins:', error);
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

  const handleCreateAdmin = async () => {
    if (!canManageAdmins) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to create admins',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .insert({
          username: formData.username,
          password_hash: `crypt('${formData.password}', gen_salt('bf'))`,
          role: formData.role,
          email: formData.email || null
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await logAuditAction('CREATE', formData.username, `Created admin with role: ${formData.role}`);
      
      toast({
        title: 'Success',
        description: 'Admin created successfully',
      });

      setShowCreateDialog(false);
      resetForm();
      fetchAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to create admin',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAdmin = async () => {
    if (!canManageAdmins || !editingAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to modify admins',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData: any = {
        username: formData.username,
        role: formData.role,
        email: formData.email || null
      };

      // Only update password if provided
      if (formData.password) {
        updateData.password_hash = `crypt('${formData.password}', gen_salt('bf'))`;
      }

      const { error } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', editingAdmin.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await logAuditAction('MODIFY', formData.username, `Updated admin credentials/role: ${formData.role}`);
      
      toast({
        title: 'Success',
        description: 'Admin updated successfully',
      });

      // Refresh current admin data if editing self
      if (editingAdmin.id === admin?.id) {
        await refreshAdmin();
      }

      setEditingAdmin(null);
      resetForm();
      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to update admin',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAdmin = async (adminToDelete: Admin) => {
    if (!canManageAdmins) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete admins',
        variant: 'destructive',
      });
      return;
    }

    if (adminToDelete.id === admin?.id) {
      toast({
        title: 'Error',
        description: 'You cannot delete your own account',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminToDelete.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await logAuditAction('DELETE', adminToDelete.username, `Deleted admin account`);
      
      toast({
        title: 'Admin Deleted',
        description: `Admin ${adminToDelete.username} has been deleted`,
      });

      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete admin',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'ADMIN',
      email: ''
    });
  };

  const startEdit = (adminToEdit: Admin) => {
    setEditingAdmin(adminToEdit);
    setFormData({
      username: adminToEdit.username,
      password: '',
      role: adminToEdit.role,
      email: adminToEdit.email || ''
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'VIEWER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!canManageAdmins) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You do not have permission to access admin settings</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading admin settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Admin Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Admin Accounts</CardTitle>
              <CardDescription>
                Manage administrator accounts and their permissions
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Add a new administrator account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="admin_username">Username</Label>
                    <Input
                      id="admin_username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_password">Password</Label>
                    <Input
                      id="admin_password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_email">Email (optional)</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAdmin}>Create Admin</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((adminRecord) => (
                  <TableRow key={adminRecord.id}>
                    <TableCell className="font-medium">
                      {adminRecord.username}
                      {adminRecord.id === admin?.id && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(adminRecord.role)}>
                        {adminRecord.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{adminRecord.email || '-'}</TableCell>
                    <TableCell>{format(new Date(adminRecord.created_at), 'PP')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog open={editingAdmin?.id === adminRecord.id} onOpenChange={(open) => !open && setEditingAdmin(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => startEdit(adminRecord)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Admin</DialogTitle>
                              <DialogDescription>
                                Update admin information
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit_admin_username">Username</Label>
                                <Input
                                  id="edit_admin_username"
                                  value={formData.username}
                                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_admin_password">New Password (leave blank to keep current)</Label>
                                <Input
                                  id="edit_admin_password"
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_admin_email">Email</Label>
                                <Input
                                  id="edit_admin_email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit_admin_role">Role</Label>
                                <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingAdmin(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateAdmin}>Update Admin</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {adminRecord.id !== admin?.id && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteAdmin(adminRecord)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}