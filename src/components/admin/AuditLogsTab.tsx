import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  admin_username: string;
  action_type: string;
  affected_user: string | null;
  notes: string | null;
  created_at: string;
}

export default function AuditLogsTab() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, [startDate, endDate, actionFilter, adminFilter]);

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }
      
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      
      if (adminFilter) {
        query = query.ilike('admin_username', `%${adminFilter}%`);
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch audit logs',
          variant: 'destructive',
        });
        return;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'default';
      case 'MODIFY':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      case 'RESTORE':
        return 'default';
      case 'LOGIN':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getActionDisplayName = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'User Created';
      case 'MODIFY':
        return 'User Modified';
      case 'DELETE':
        return 'User Deleted';
      case 'RESTORE':
        return 'User Restored';
      case 'LOGIN':
        return 'Admin Login';
      default:
        return actionType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by date range, action type, or admin username</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="action_filter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">User Created</SelectItem>
                  <SelectItem value="MODIFY">User Modified</SelectItem>
                  <SelectItem value="DELETE">User Deleted</SelectItem>
                  <SelectItem value="RESTORE">User Restored</SelectItem>
                  <SelectItem value="LOGIN">Admin Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="admin_filter">Admin Username</Label>
              <Input
                id="admin_filter"
                placeholder="Filter by admin..."
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Audit Log Entries</h3>
          <Badge variant="outline">{auditLogs.length} entries</Badge>
        </div>

        {loading ? (
          <div>Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin Username</TableHead>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Affected User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), 'PPp')}
                    </TableCell>
                    <TableCell className="font-medium">{log.admin_username}</TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {getActionDisplayName(log.action_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.affected_user || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}