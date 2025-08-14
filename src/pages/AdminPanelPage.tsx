import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Settings, FileText, Trash2, Shield } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import UserManagementTab from '@/components/admin/UserManagementTab';
import DeletedUsersTab from '@/components/admin/DeletedUsersTab';
import AuditLogsTab from '@/components/admin/AuditLogsTab';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab';

export default function AdminPanelPage() {
  const { admin, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin-login');
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

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Admin Panel</h1>
              </div>
              <Badge variant={getRoleBadgeVariant(admin.role)}>
                {admin.role.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {admin.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center space-x-2">
              <Trash2 className="h-4 w-4" />
              <span>Recently Deleted</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Audit Logs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center space-x-2"
              disabled={!admin || admin.role !== 'SUPER_ADMIN'}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagementTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recently Deleted Users</CardTitle>
              </CardHeader>
              <CardContent>
                <DeletedUsersTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminSettingsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}