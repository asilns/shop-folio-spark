import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation & Dashboard
    'orderManagementDashboard': 'Order Management Dashboard',
    'manageCustomersProductsOrders': 'Manage your customers, products, and orders',
    'dashboard': 'Dashboard',
    'orders': 'Orders',
    'products': 'Products',
    'customers': 'Customers',
    'settings': 'Settings',
    
    // Stats Cards
    'totalOrders': 'Total Orders',
    'totalRevenue': 'Total Revenue',
    'pendingOrders': 'Pending Orders',
    'completedOrders': 'Completed Orders',
    'cancelledOrders': 'Cancelled Orders',
    
    // Actions & Buttons
    'createOrder': 'Create Order',
    'createNewOrder': 'Create New Order',
    'editOrder': 'Edit Order',
    'addNewCustomer': 'Add New Customer',
    'addNewProduct': 'Add New Product',
    'addNewStatus': 'Add New Status',
    'editCustomer': 'Edit Customer',
    'editProduct': 'Edit Product',
    'editStatus': 'Edit Status',
    'deleteSelected': 'Delete Selected',
    'filters': 'Filters',
    'bulkActions': 'Bulk Actions',
    'addItem': 'Add Item',
    'removeItem': 'Remove Item',
    'generateInvoice': 'Generate Invoice',
    'uploadLogo': 'Upload Logo',
    'removeLogo': 'Remove Logo',
    'save': 'Save',
    'saveInvoiceSettings': 'Save Invoice Settings',
    'cancel': 'Cancel',
    'close': 'Close',
    'edit': 'Edit',
    'delete': 'Delete',
    'add': 'Add',
    'update': 'Update',
    'create': 'Create',
    'confirm': 'Confirm',
    'yes': 'Yes',
    'no': 'No',
    'ok': 'OK',
    'apply': 'Apply',
    'reset': 'Reset',
    'clear': 'Clear',
    'refresh': 'Refresh',
    'view': 'View',
    'details': 'Details',
    'preview': 'Preview',
    'print': 'Print',
    'download': 'Download',
    'export': 'Export',
    'import': 'Import',
    'upload': 'Upload',
    'browse': 'Browse',
    'choose': 'Choose',
    
    // Form Labels
    'name': 'Name',
    'customerName': 'Customer Name',
    'customer': 'Customer',
    'productName': 'Product Name',
    'product': 'Product',
    'description': 'Description',
    'email': 'Email',
    'phone': 'Phone',
    'phoneNumber': 'Phone Number',
    'companyName': 'Company Name',
    'address': 'Address',
    'addressLine1': 'Address Line 1',
    'addressLine2': 'Address Line 2',
    'city': 'City',
    'country': 'Country',
    'quantity': 'Quantity',
    'price': 'Price',
    'total': 'Total',
    'subtotal': 'Subtotal',
    'status': 'Status',
    'statusName': 'Status Name',
    'statusColor': 'Status Color',
    'date': 'Date',
    'orderNumber': 'Order #',
    'actions': 'Actions',
    'items': 'Items',
    
    // Placeholders & Selections
    'selectCustomer': 'Select Customer',
    'selectProduct': 'Select Product',
    'selectLanguage': 'Select Language',
    'searchOrders': 'Search orders...',
    'searchProducts': 'Search products...',
    'searchCustomers': 'Search customers...',
    
    // Order Status
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    
    // Settings & Configuration
    'applicationSettings': 'Application Settings',
    'configurePreferences': 'Configure your application preferences',
    'languageSettings': 'Language Settings',
    'choosePreferredLanguage': 'Choose your preferred language for the application interface',
    'language': 'Language',
    'defaultCurrency': 'Default Currency',
    'invoiceSettings': 'Invoice Settings',
    'orderStatusSettings': 'Order Status Settings',
    'updateOrderStatusSettings': 'Update the order status settings',
    'facebookAccount': 'Facebook Account',
    'instagramAccount': 'Instagram Account',
    'snapchatAccount': 'Snapchat Account',
    'companyLogo': 'Company Logo',
    
    // Tab Descriptions
    'viewAndManageOrders': 'View and manage customer orders',
    'manageProducts': 'Manage your product catalog',
    'trackCustomers': 'Track customer information',
    
    // Messages & Notifications
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Info',
    'noOrdersFound': 'No orders found',
    'noProductsFound': 'No products found',
    'noCustomersFound': 'No customers found',
    'fillRequiredFields': 'Please fill in all required fields',
    'selectAtLeastOneOrder': 'Please select at least one order to delete',
    
    // Confirmation Messages
    'confirmDelete': 'Are you sure you want to delete the selected orders?',
    'confirmDeleteSingleOrder': 'Are you sure you want to delete this order?',
    'confirmDeleteStatus': 'Confirm Delete Status',
    'areYouSureDeleteStatus': 'Are you sure you want to delete this status? Orders using this status will need to be updated.',
    
    // Success Messages
    'orderCreatedSuccess': 'Order created successfully',
    'orderUpdatedSuccess': 'Order updated successfully',
    'orderDeletedSuccess': 'Order deleted successfully',
    'ordersDeletedSuccess': 'Selected orders deleted successfully',
    'customerCreatedSuccess': 'Customer created successfully',
    'customerUpdatedSuccess': 'Customer updated successfully',
    'customerDeletedSuccess': 'Customer deleted successfully',
    'productCreatedSuccess': 'Product created successfully',
    'productUpdatedSuccess': 'Product updated successfully',
    'productDeletedSuccess': 'Product deleted successfully',
    'statusCreatedSuccess': 'Status created successfully',
    'statusUpdatedSuccess': 'Status updated successfully',
    'statusDeletedSuccess': 'Status deleted successfully',
    'settingsUpdated': 'Settings updated successfully',
    'logoUploadedSuccess': 'Logo uploaded successfully',
    'logoRemovedSuccess': 'Logo removed successfully',
    
    // Additional Interface Elements
    'invoice': 'Invoice',
    'summary': 'Summary',
    'all': 'All',
    'none': 'None',
    'active': 'Active',
    'inactive': 'Inactive',
    'available': 'Available',
    'unavailable': 'Unavailable',
    'new': 'New',
    'recent': 'Recent',
    'createNewCustomer': 'Create New Customer',
    'createNewProduct': 'Create New Product',
    'deleteStatus': 'Delete Status',
  },
  ar: {
    // Navigation & Dashboard
    'orderManagementDashboard': 'لوحة تحكم إدارة الطلبات',
    'manageCustomersProductsOrders': 'إدارة العملاء والمنتجات والطلبات',
    'dashboard': 'لوحة التحكم',
    'orders': 'الطلبات',
    'products': 'المنتجات',
    'customers': 'العملاء',
    'settings': 'الإعدادات',
    
    // Stats Cards
    'totalOrders': 'إجمالي الطلبات',
    'totalRevenue': 'إجمالي الإيرادات',
    'pendingOrders': 'الطلبات المعلقة',
    'completedOrders': 'الطلبات المكتملة',
    'cancelledOrders': 'الطلبات الملغية',
    
    // Actions & Buttons
    'createOrder': 'إنشاء طلب',
    'createNewOrder': 'إنشاء طلب جديد',
    'editOrder': 'تعديل الطلب',
    'addNewCustomer': 'إضافة عميل جديد',
    'addNewProduct': 'إضافة منتج جديد',
    'addNewStatus': 'إضافة حالة جديدة',
    'editCustomer': 'تعديل العميل',
    'editProduct': 'تعديل المنتج',
    'editStatus': 'تعديل الحالة',
    'deleteSelected': 'حذف المحدد',
    'filters': 'المرشحات',
    'bulkActions': 'الإجراءات المجمعة',
    'addItem': 'إضافة عنصر',
    'removeItem': 'إزالة العنصر',
    'generateInvoice': 'إنتاج فاتورة',
    'uploadLogo': 'رفع الشعار',
    'removeLogo': 'إزالة الشعار',
    'save': 'حفظ',
    'saveInvoiceSettings': 'حفظ إعدادات الفاتورة',
    'cancel': 'إلغاء',
    'close': 'إغلاق',
    'edit': 'تعديل',
    'delete': 'حذف',
    'add': 'إضافة',
    'update': 'تحديث',
    'create': 'إنشاء',
    'confirm': 'تأكيد',
    'yes': 'نعم',
    'no': 'لا',
    'ok': 'موافق',
    'apply': 'تطبيق',
    'reset': 'إعادة تعيين',
    'clear': 'مسح',
    'refresh': 'تحديث',
    'view': 'عرض',
    'details': 'التفاصيل',
    'preview': 'معاينة',
    'print': 'طباعة',
    'download': 'تحميل',
    'export': 'تصدير',
    'import': 'استيراد',
    'upload': 'رفع',
    'browse': 'تصفح',
    'choose': 'اختيار',
    
    // Form Labels
    'name': 'الاسم',
    'customerName': 'اسم العميل',
    'customer': 'العميل',
    'productName': 'اسم المنتج',
    'product': 'المنتج',
    'description': 'الوصف',
    'email': 'البريد الإلكتروني',
    'phone': 'الهاتف',
    'phoneNumber': 'رقم الهاتف',
    'companyName': 'اسم الشركة',
    'address': 'العنوان',
    'addressLine1': 'العنوان الأول',
    'addressLine2': 'العنوان الثاني',
    'city': 'المدينة',
    'country': 'البلد',
    'quantity': 'الكمية',
    'price': 'السعر',
    'total': 'المجموع',
    'subtotal': 'المجموع الفرعي',
    'status': 'الحالة',
    'statusName': 'اسم الحالة',
    'statusColor': 'لون الحالة',
    'date': 'التاريخ',
    'orderNumber': 'رقم الطلب',
    'actions': 'الإجراءات',
    'items': 'العناصر',
    
    // Placeholders & Selections
    'selectCustomer': 'اختر العميل',
    'selectProduct': 'اختر المنتج',
    'selectLanguage': 'اختر اللغة',
    'searchOrders': 'البحث في الطلبات...',
    'searchProducts': 'البحث في المنتجات...',
    'searchCustomers': 'البحث في العملاء...',
    
    // Order Status
    'pending': 'معلق',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    
    // Settings & Configuration
    'applicationSettings': 'إعدادات التطبيق',
    'configurePreferences': 'تكوين تفضيلات التطبيق الخاص بك',
    'languageSettings': 'إعدادات اللغة',
    'choosePreferredLanguage': 'اختر لغتك المفضلة لواجهة التطبيق',
    'language': 'اللغة',
    'defaultCurrency': 'العملة الافتراضية',
    'invoiceSettings': 'إعدادات الفاتورة',
    'orderStatusSettings': 'إعدادات حالة الطلب',
    'updateOrderStatusSettings': 'تحديث إعدادات حالة الطلب',
    'facebookAccount': 'حساب فيسبوك',
    'instagramAccount': 'حساب إنستغرام',
    'snapchatAccount': 'حساب سناب شات',
    'companyLogo': 'شعار الشركة',
    
    // Tab Descriptions
    'viewAndManageOrders': 'عرض وإدارة طلبات العملاء',
    'manageProducts': 'إدارة كتالوج المنتجات',
    'trackCustomers': 'تتبع معلومات العملاء',
    
    // Messages & Notifications
    'loading': 'جارٍ التحميل...',
    'error': 'خطأ',
    'success': 'نجح',
    'warning': 'تحذير',
    'info': 'معلومات',
    'noOrdersFound': 'لم يتم العثور على طلبات',
    'noProductsFound': 'لم يتم العثور على منتجات',
    'noCustomersFound': 'لم يتم العثور على عملاء',
    'fillRequiredFields': 'يرجى ملء جميع الحقول المطلوبة',
    'selectAtLeastOneOrder': 'يرجى تحديد طلب واحد على الأقل للحذف',
    
    // Confirmation Messages
    'confirmDelete': 'هل أنت متأكد من أنك تريد حذف الطلبات المحددة؟',
    'confirmDeleteSingleOrder': 'هل أنت متأكد من أنك تريد حذف هذا الطلب؟',
    'confirmDeleteStatus': 'تأكيد حذف الحالة',
    'areYouSureDeleteStatus': 'هل أنت متأكد من أنك تريد حذف هذه الحالة؟ الطلبات التي تستخدم هذه الحالة ستحتاج إلى تحديث.',
    
    // Success Messages
    'orderCreatedSuccess': 'تم إنشاء الطلب بنجاح',
    'orderUpdatedSuccess': 'تم تحديث الطلب بنجاح',
    'orderDeletedSuccess': 'تم حذف الطلب بنجاح',
    'ordersDeletedSuccess': 'تم حذف الطلبات المحددة بنجاح',
    'customerCreatedSuccess': 'تم إنشاء العميل بنجاح',
    'customerUpdatedSuccess': 'تم تحديث العميل بنجاح',
    'customerDeletedSuccess': 'تم حذف العميل بنجاح',
    'productCreatedSuccess': 'تم إنشاء المنتج بنجاح',
    'productUpdatedSuccess': 'تم تحديث المنتج بنجاح',
    'productDeletedSuccess': 'تم حذف المنتج بنجاح',
    'statusCreatedSuccess': 'تم إنشاء الحالة بنجاح',
    'statusUpdatedSuccess': 'تم تحديث الحالة بنجاح',
    'statusDeletedSuccess': 'تم حذف الحالة بنجاح',
    'settingsUpdated': 'تم تحديث الإعدادات بنجاح',
    'logoUploadedSuccess': 'تم رفع الشعار بنجاح',
    'logoRemovedSuccess': 'تم إزالة الشعار بنجاح',
    
    // Additional Interface Elements
    'invoice': 'فاتورة',
    'summary': 'الملخص',
    'all': 'الكل',
    'none': 'لا شيء',
    'active': 'نشط',
    'inactive': 'غير نشط',
    'available': 'متاح',
    'unavailable': 'غير متاح',
    'new': 'جديد',
    'recent': 'حديث',
    'createNewCustomer': 'إنشاء عميل جديد',
    'createNewProduct': 'إنشاء منتج جديد',
    'deleteStatus': 'حذف الحالة',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}