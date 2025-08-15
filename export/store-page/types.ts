export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export interface InvoiceSettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
}

export interface Order {
  id: string;
  customerName: string;
  product: string;
  quantity: number;
  price: number;
  status: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
}