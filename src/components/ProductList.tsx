import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { storeFrom, storeInsert, storeUpdate, storeDelete, validateStoreId } from '@/lib/storeScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, DollarSign, Package, Trash2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock_quantity: number;
  category?: string;
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ProductListProps {
  onDataChange?: () => void;
}

export function ProductList({ onDataChange }: ProductListProps) {
  const { t } = useLanguage();
  const { user } = useStoreAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDeleteWarningDialog, setShowDeleteWarningDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);
  const [deleteWarningInfo, setDeleteWarningInfo] = useState<{orderCount: number, orderItemCount: number} | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [bulkEditData, setBulkEditData] = useState({
    price: '',
    stock_quantity: '',
    category: '',
    is_active: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    stock_quantity: '',
    category: '',
    is_active: true,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    stock_quantity: '',
    category: '',
    is_active: true,
  });
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      const storeId = validateStoreId(user?.store_id);
      const { data, error } = await storeFrom('products', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity),
        category: formData.category === 'none' ? null : formData.category || null,
        is_active: formData.is_active,
      };

      const storeId = validateStoreId(user?.store_id);
      const { error } = await storeInsert('products', storeId, productData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product created successfully",
      });

      setFormData({
        name: '',
        description: '',
        price: '',
        sku: '',
        stock_quantity: '',
        category: '',
        is_active: true,
      });
      setShowDialog(false);
      fetchProducts();
      fetchCategories();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          name: newCategory.name,
          description: newCategory.description || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully",
      });

      setNewCategory({ name: '', description: '' });
      setShowCategoryDialog(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allProductIds = new Set(products.map(product => product.id));
      setSelectedProducts(allProductIds);
      setShowBulkActions(true);
    } else {
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    }
  };

  const checkOrderItemsForProduct = async (productId: string): Promise<{orderCount: number, orderItemCount: number}> => {
    try {
      // Check if there are any order items that reference this product
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('order_id, quantity')
        .eq('product_id', productId);

      if (error) throw error;

      if (orderItems && orderItems.length > 0) {
        // Get unique order IDs
        const uniqueOrderIds = new Set(orderItems.map(item => item.order_id));
        return {
          orderCount: uniqueOrderIds.size,
          orderItemCount: orderItems.length
        };
      }

      return { orderCount: 0, orderItemCount: 0 };
    } catch (error) {
      console.error('Error checking order items:', error);
      return { orderCount: 0, orderItemCount: 0 };
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    // Check for existing order items first
    const orderInfo = await checkOrderItemsForProduct(productId);
    
    if (orderInfo.orderItemCount > 0) {
      // Show warning dialog
      setProductToDelete({ id: productId, name: productName });
      setDeleteWarningInfo(orderInfo);
      setShowDeleteWarningDialog(true);
    } else {
      // No order items, proceed with direct deletion
      await deleteProduct(productId, productName);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    await deactivateProduct(productToDelete.id, productToDelete.name);
    setShowDeleteWarningDialog(false);
    setProductToDelete(null);
    setDeleteWarningInfo(null);
  };

  const deactivateProduct = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product "${productName}" has been deactivated`,
      });

      fetchProducts();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error deactivating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate product",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product "${productName}" deleted successfully`,
      });

      fetchProducts();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const bulkDeleteProducts = async () => {
    try {
      const productIds = Array.from(selectedProducts);
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', productIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${productIds.length} products deleted successfully`,
      });

      fetchProducts();
      onDataChange?.();
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error: any) {
      console.error('Error deleting products:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete products",
        variant: "destructive",
      });
    }
  };

  const handleBulkEdit = async () => {
    try {
      const productIds = Array.from(selectedProducts);
      const updateData: any = {};

      // Only include fields that have values
      if (bulkEditData.price) updateData.price = parseFloat(bulkEditData.price);
      if (bulkEditData.stock_quantity) updateData.stock_quantity = parseInt(bulkEditData.stock_quantity);
      if (bulkEditData.category && bulkEditData.category !== 'unchanged') {
        updateData.category = bulkEditData.category === 'null' ? null : bulkEditData.category;
      }
      if (bulkEditData.is_active !== '' && bulkEditData.is_active !== 'unchanged') updateData.is_active = bulkEditData.is_active === 'true';

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one field to update",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .in('id', productIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${productIds.length} products updated successfully`,
      });

      setBulkEditData({
        price: '',
        stock_quantity: '',
        category: '',
        is_active: ''
      });
      setShowBulkEditDialog(false);
      fetchProducts();
      onDataChange?.();
      setSelectedProducts(new Set());
      setShowBulkActions(false);
    } catch (error: any) {
      console.error('Error updating products:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update products",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      sku: product.sku || '',
      stock_quantity: product.stock_quantity.toString(),
      category: product.category || 'none',
      is_active: product.is_active,
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const updateData = {
        name: editFormData.name,
        description: editFormData.description || null,
        price: parseFloat(editFormData.price),
        sku: editFormData.sku || null,
        stock_quantity: parseInt(editFormData.stock_quantity),
        category: editFormData.category === 'none' ? null : editFormData.category || null,
        is_active: editFormData.is_active,
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product "${editFormData.name}" updated successfully`,
      });

      setShowEditDialog(false);
      setEditingProduct(null);
      fetchProducts();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('products')}</CardTitle>
            <CardDescription>{t('manageProducts')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                      Create a new product category.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="category-name">Category Name</Label>
                      <Input
                        id="category-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category-description">Description</Label>
                      <Textarea
                        id="category-description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Category</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product in your catalog.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_quantity">Stock</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label htmlFor="is_active">Active Product</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Product</Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the product details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-stock_quantity">Stock</Label>
                  <Input
                    id="edit-stock_quantity"
                    type="number"
                    value={editFormData.stock_quantity}
                    onChange={(e) => setEditFormData({...editFormData, stock_quantity: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input
                    id="edit-sku"
                    value={editFormData.sku}
                    onChange={(e) => setEditFormData({...editFormData, sku: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editFormData.category} onValueChange={(value) => setEditFormData({...editFormData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) => setEditFormData({...editFormData, is_active: checked})}
                />
                <Label htmlFor="edit-is_active">Active Product</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CardContent>
        {showBulkActions && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedProducts.size} products selected
              </span>
              <div className="flex gap-2">
                <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit3 className="w-4 h-4" />
                      Bulk Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Bulk Edit Products</DialogTitle>
                      <DialogDescription>
                        Update multiple products at once. Leave fields empty to keep current values.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bulk-price">Price</Label>
                          <Input
                            id="bulk-price"
                            type="number"
                            step="0.01"
                            value={bulkEditData.price}
                            onChange={(e) => setBulkEditData({...bulkEditData, price: e.target.value})}
                            placeholder="Leave empty to keep current"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bulk-stock">Stock Quantity</Label>
                          <Input
                            id="bulk-stock"
                            type="number"
                            value={bulkEditData.stock_quantity}
                            onChange={(e) => setBulkEditData({...bulkEditData, stock_quantity: e.target.value})}
                            placeholder="Leave empty to keep current"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bulk-category">Category</Label>
                        <Select value={bulkEditData.category} onValueChange={(value) => setBulkEditData({...bulkEditData, category: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Leave unchanged" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unchanged">Leave unchanged</SelectItem>
                            <SelectItem value="null">No category</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bulk-status">Status</Label>
                        <Select value={bulkEditData.is_active} onValueChange={(value) => setBulkEditData({...bulkEditData, is_active: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Leave unchanged" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unchanged">Leave unchanged</SelectItem>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkEdit}>
                        Update Products
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Products</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedProducts.size} selected products? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={bulkDeleteProducts}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Products
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.size === products.length && products.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.sku && (
                      <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                    )}
                    {product.description && (
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {product.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span className={product.stock_quantity < 10 ? 'text-orange-600' : ''}>
                      {product.stock_quantity}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="outline">{product.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditProduct(product)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{product.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Product
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Delete Warning Dialog */}
        <AlertDialog open={showDeleteWarningDialog} onOpenChange={setShowDeleteWarningDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Warning: Product Has Existing Orders</AlertDialogTitle>
              <AlertDialogDescription>
                The product "{productToDelete?.name}" cannot be deleted because it is referenced in existing orders.
                <br /><br />
                <strong>Details:</strong>
                <br />
                • {deleteWarningInfo?.orderItemCount} order items across {deleteWarningInfo?.orderCount} orders reference this product
                <br /><br />
                To preserve order history and data integrity, the product will be <strong>deactivated</strong> instead of deleted.
                <br /><br />
                Deactivated products will no longer appear in new orders but existing order history will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteWarningDialog(false);
                setProductToDelete(null);
                setDeleteWarningInfo(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteProduct}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Deactivate Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}