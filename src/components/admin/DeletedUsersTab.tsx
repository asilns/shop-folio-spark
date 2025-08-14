import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DeletedUser {
  id: string;
  original_user_id: string;
  store_name: string;
  username: string;
  password_hash: string;
  pin: string;
  last_login: string | null;
  subscription_date: string;
  subscription_expiry: string;
  deleted_at: string;
  deleted_by: string;
}

export default function DeletedUsersTab() {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringUser, setRestoringUser] = useState<DeletedUser | null>(null);

  const { admin, canDelete } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted users:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch deleted users',
          variant: 'destructive',
        });
        return;
      }

      setDeletedUsers(data || []);
    } catch (error) {
      console.error('Error fetching deleted users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreUser = async () => {
    if (!canDelete || !restoringUser || !admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to restore users',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('restore_deleted_user', {
        deleted_user_id: restoringUser.id,
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
        title: 'User Restored',
        description: `User ${restoringUser.username} has been restored successfully`,
      });

      setRestoringUser(null);
      fetchDeletedUsers();
    } catch (error) {
      console.error('Error restoring user:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore user',
        variant: 'destructive',
      });
    }
  };

  const getDaysUntilPurge = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const purgeDate = new Date(deleteDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const daysLeft = Math.ceil((purgeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  if (loading) {
    return <div>Loading deleted users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Recently Deleted Users</h3>
          <p className="text-sm text-muted-foreground">
            Users are permanently deleted after 30 days
          </p>
        </div>
      </div>

      {deletedUsers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No deleted users found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Subscription Date</TableHead>
                <TableHead>Subscription Expiry</TableHead>
                <TableHead>Deleted On</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Days Until Purge</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedUsers.map((user) => {
                const daysLeft = getDaysUntilPurge(user.deleted_at);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.store_name}</TableCell>
                    <TableCell>{user.username}</TableCell>
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
                    <TableCell>{format(new Date(user.deleted_at), 'PPp')}</TableCell>
                    <TableCell>{user.deleted_by}</TableCell>
                    <TableCell>
                      <Badge variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'secondary' : 'default'}>
                        {daysLeft} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canDelete && daysLeft > 0 && (
                        <AlertDialog open={restoringUser?.id === user.id} onOpenChange={(open) => !open && setRestoringUser(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setRestoringUser(user)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore user "{user.username}" from "{user.store_name}"? 
                                This will move the user back to the active users list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setRestoringUser(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleRestoreUser}>
                                Restore User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {daysLeft === 0 && (
                        <Badge variant="destructive">Purged</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}