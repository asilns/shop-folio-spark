import React, { useState } from 'react';
import { Button } from './components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/Tabs';
import { UserIcon, ShoppingCartIcon, PackageIcon, SettingsIcon, PlusIcon } from './components/Icons';
import { DashboardStats, Order, Customer, Product } from './types';
import { formatCurrency, formatDate } from './utils';

// Mock data - replace with your own data source
const mockData = {
  stats: {
    totalOrders: 150,
    pendingOrders: 23,
    cancelledOrders: 5
  },
  orders: [
    { id: '1', customerName: 'John Doe', product: 'Product A', quantity: 2, price: 50, status: 'pending', createdAt: '2024-01-15' },
    { id: '2', customerName: 'Jane Smith', product: 'Product B', quantity: 1, price: 75, status: 'completed', createdAt: '2024-01-14' }
  ],
  customers: [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '+1234567890', createdAt: '2024-01-10' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+0987654321', createdAt: '2024-01-08' }
  ],
  products: [
    { id: '1', name: 'Product A', price: 25, stock: 100, description: 'Description for Product A' },
    { id: '2', name: 'Product B', price: 75, stock: 50, description: 'Description for Product B' }
  ]
};

export default function StandaloneStoreDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [stats] = useState<DashboardStats>(mockData.stats);
  const [orders] = useState<Order[]>(mockData.orders);
  const [customers] = useState<Customer[]>(mockData.customers);
  const [products] = useState<Product[]>(mockData.products);

  const handleSignOut = () => {
    alert('Sign out functionality - implement your own logic here');
  };

  const handleCreateOrder = () => {
    alert('Create order functionality - implement your own logic here');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back to your store dashboard</p>
          </div>
          <Button onClick={handleCreateOrder}>
            <PlusIcon size={16} className="mr-2" />
            Create Order
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCartIcon size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <PackageIcon size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
              <UserIcon size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelledOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Manage your orders here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.product} (Qty: {order.quantity})</p>
                        <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.price)}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Manage your customer base</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Joined {formatDate(customer.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Manage your product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.price)}</p>
                        <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Configure your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">General Settings</h3>
                    <p className="text-sm text-muted-foreground">Customize your dashboard preferences</p>
                  </div>
                  <Button variant="outline">
                    <SettingsIcon size={16} className="mr-2" />
                    Configure Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}