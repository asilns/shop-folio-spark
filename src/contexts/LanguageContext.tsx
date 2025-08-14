import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'dashboard': 'Dashboard',
    'orders': 'Orders',
    'products': 'Products',
    'customers': 'Customers',
    'settings': 'Settings',
    
    // Dashboard
    'totalOrders': 'Total Orders',
    'totalRevenue': 'Total Revenue',
    'pendingOrders': 'Pending Orders',
    'completedOrders': 'Completed Orders',
    'createOrder': 'Create Order',
    'filters': 'Filters',
    'searchOrders': 'Search orders...',
    'bulkActions': 'Bulk Actions',
    'deleteSelected': 'Delete Selected',
    'viewAndManageOrders': 'View and manage customer orders',
    'manageProducts': 'Manage your product catalog',
    'trackCustomers': 'Track customer information',
    
    // Order Status
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    
    // Settings
    'applicationSettings': 'Application Settings',
    'configurePreferences': 'Configure your application preferences',
    'language': 'Language',
    'selectLanguage': 'Select Language',
    'languageSettings': 'Language Settings',
    'choosePreferredLanguage': 'Choose your preferred language for the application interface',
    'defaultCurrency': 'Default Currency',
    'invoiceSettings': 'Invoice Settings',
    'orderStatusSettings': 'Order Status Settings',
    'updateOrderStatusSettings': 'Update the order status settings',
    'companyName': 'Company Name',
    'phoneNumber': 'Phone Number',
    'facebookAccount': 'Facebook Account',
    'instagramAccount': 'Instagram Account',
    'snapchatAccount': 'Snapchat Account',
    'address': 'Address',
    'addressLine1': 'Address Line 1',
    'addressLine2': 'Address Line 2',
    'city': 'City',
    'country': 'Country',
    'companyLogo': 'Company Logo',
    'uploadLogo': 'Upload Logo',
    'removeLogo': 'Remove Logo',
    'save': 'Save',
    'saveInvoiceSettings': 'Save Invoice Settings',
    
    // Form Labels
    'customerName': 'Customer Name',
    'selectCustomer': 'Select Customer',
    'items': 'Items',
    'addItem': 'Add Item',
    'product': 'Product',
    'selectProduct': 'Select Product',
    'quantity': 'Quantity',
    'price': 'Price',
    'removeItem': 'Remove Item',
    'status': 'Status',
    'total': 'Total',
    'subtotal': 'Subtotal',
    'actions': 'Actions',
    'edit': 'Edit',
    'editOrder': 'Edit Order',
    'delete': 'Delete',
    'cancel': 'Cancel',
    'close': 'Close',
    'add': 'Add',
    'update': 'Update',
    'create': 'Create',
    'createNewOrder': 'Create New Order',
    'orderNumber': 'Order #',
    'date': 'Date',
    'generateInvoice': 'Generate Invoice',
    'name': 'Name',
    'email': 'Email',
    'phone': 'Phone',
    'productName': 'Product Name',
    'description': 'Description',
    'statusName': 'Status Name',
    'statusColor': 'Status Color',
    'addNewStatus': 'Add New Status',
    'editStatus': 'Edit Status',
    'deleteStatus': 'Delete Status',
    'confirmDeleteStatus': 'Confirm Delete Status',
    
    // Messages
    'selectAtLeastOneOrder': 'Please select at least one order to delete',
    'confirmDelete': 'Are you sure you want to delete the selected orders?',
    'confirmDeleteSingleOrder': 'Are you sure you want to delete this order?',
    'ordersDeletedSuccess': 'Selected orders deleted successfully',
    'orderDeletedSuccess': 'Order deleted successfully',
    'orderCreatedSuccess': 'Order created successfully',
    'orderUpdatedSuccess': 'Order updated successfully',
    'settingsUpdated': 'Settings updated successfully',
    'customerCreatedSuccess': 'Customer created successfully',
    'customerUpdatedSuccess': 'Customer updated successfully',
    'customerDeletedSuccess': 'Customer deleted successfully',
    'productCreatedSuccess': 'Product created successfully',
    'productUpdatedSuccess': 'Product updated successfully',
    'productDeletedSuccess': 'Product deleted successfully',
    'statusCreatedSuccess': 'Status created successfully',
    'statusUpdatedSuccess': 'Status updated successfully',
    'statusDeletedSuccess': 'Status deleted successfully',
    'logoUploadedSuccess': 'Logo uploaded successfully',
    'logoRemovedSuccess': 'Logo removed successfully',
    'fillRequiredFields': 'Please fill in all required fields',
    'noOrdersFound': 'No orders found',
    'noProductsFound': 'No products found',
    'noCustomersFound': 'No customers found',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'areYouSureDeleteStatus': 'Are you sure you want to delete this status? Orders using this status will need to be updated.',
  },
  ar: {
    // Navigation
    'dashboard': 'لوحة التحكم',
    'orders': 'الطلبات',
    'products': 'المنتجات',
    'customers': 'العملاء',
    'settings': 'الإعدادات',
    
    // Dashboard
    'totalOrders': 'إجمالي الطلبات',
    'totalRevenue': 'إجمالي الإيرادات',
    'pendingOrders': 'الطلبات المعلقة',
    'completedOrders': 'الطلبات المكتملة',
    'createOrder': 'إنشاء طلب',
    'filters': 'المرشحات',
    'searchOrders': 'البحث في الطلبات...',
    'bulkActions': 'الإجراءات المجمعة',
    'deleteSelected': 'حذف المحدد',
    'viewAndManageOrders': 'عرض وإدارة طلبات العملاء',
    'manageProducts': 'إدارة كتالوج المنتجات',
    'trackCustomers': 'تتبع معلومات العملاء',
    
    // Order Status
    'pending': 'معلق',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    
    // Settings
    'applicationSettings': 'إعدادات التطبيق',
    'configurePreferences': 'تكوين تفضيلات التطبيق الخاص بك',
    'language': 'اللغة',
    'selectLanguage': 'اختر اللغة',
    'languageSettings': 'إعدادات اللغة',
    'choosePreferredLanguage': 'اختر لغتك المفضلة لواجهة التطبيق',
    'defaultCurrency': 'العملة الافتراضية',
    'invoiceSettings': 'إعدادات الفاتورة',
    'orderStatusSettings': 'إعدادات حالة الطلب',
    'updateOrderStatusSettings': 'تحديث إعدادات حالة الطلب',
    'companyName': 'اسم الشركة',
    'phoneNumber': 'رقم الهاتف',
    'facebookAccount': 'حساب فيسبوك',
    'instagramAccount': 'حساب إنستغرام',
    'snapchatAccount': 'حساب سناب شات',
    'address': 'العنوان',
    'addressLine1': 'العنوان الأول',
    'addressLine2': 'العنوان الثاني',
    'city': 'المدينة',
    'country': 'البلد',
    'companyLogo': 'شعار الشركة',
    'uploadLogo': 'رفع الشعار',
    'removeLogo': 'إزالة الشعار',
    'save': 'حفظ',
    'saveInvoiceSettings': 'حفظ إعدادات الفاتورة',
    
    // Form Labels
    'customerName': 'اسم العميل',
    'selectCustomer': 'اختر العميل',
    'items': 'العناصر',
    'addItem': 'إضافة عنصر',
    'product': 'المنتج',
    'selectProduct': 'اختر المنتج',
    'quantity': 'الكمية',
    'price': 'السعر',
    'removeItem': 'إزالة العنصر',
    'status': 'الحالة',
    'total': 'المجموع',
    'subtotal': 'المجموع الفرعي',
    'actions': 'الإجراءات',
    'edit': 'تعديل',
    'editOrder': 'تعديل الطلب',
    'delete': 'حذف',
    'cancel': 'إلغاء',
    'close': 'إغلاق',
    'add': 'إضافة',
    'update': 'تحديث',
    'create': 'إنشاء',
    'createNewOrder': 'إنشاء طلب جديد',
    'orderNumber': 'رقم الطلب',
    'date': 'التاريخ',
    'generateInvoice': 'إنتاج فاتورة',
    'name': 'الاسم',
    'email': 'البريد الإلكتروني',
    'phone': 'الهاتف',
    'productName': 'اسم المنتج',
    'description': 'الوصف',
    'statusName': 'اسم الحالة',
    'statusColor': 'لون الحالة',
    'addNewStatus': 'إضافة حالة جديدة',
    'editStatus': 'تعديل الحالة',
    'deleteStatus': 'حذف الحالة',
    'confirmDeleteStatus': 'تأكيد حذف الحالة',
    
    // Messages
    'selectAtLeastOneOrder': 'يرجى تحديد طلب واحد على الأقل للحذف',
    'confirmDelete': 'هل أنت متأكد من أنك تريد حذف الطلبات المحددة؟',
    'confirmDeleteSingleOrder': 'هل أنت متأكد من أنك تريد حذف هذا الطلب؟',
    'ordersDeletedSuccess': 'تم حذف الطلبات المحددة بنجاح',
    'orderDeletedSuccess': 'تم حذف الطلب بنجاح',
    'orderCreatedSuccess': 'تم إنشاء الطلب بنجاح',
    'orderUpdatedSuccess': 'تم تحديث الطلب بنجاح',
    'settingsUpdated': 'تم تحديث الإعدادات بنجاح',
    'customerCreatedSuccess': 'تم إنشاء العميل بنجاح',
    'customerUpdatedSuccess': 'تم تحديث العميل بنجاح',
    'customerDeletedSuccess': 'تم حذف العميل بنجاح',
    'productCreatedSuccess': 'تم إنشاء المنتج بنجاح',
    'productUpdatedSuccess': 'تم تحديث المنتج بنجاح',
    'productDeletedSuccess': 'تم حذف المنتج بنجاح',
    'statusCreatedSuccess': 'تم إنشاء الحالة بنجاح',
    'statusUpdatedSuccess': 'تم تحديث الحالة بنجاح',
    'statusDeletedSuccess': 'تم حذف الحالة بنجاح',
    'logoUploadedSuccess': 'تم رفع الشعار بنجاح',
    'logoRemovedSuccess': 'تم إزالة الشعار بنجاح',
    'fillRequiredFields': 'يرجى ملء جميع الحقول المطلوبة',
    'noOrdersFound': 'لم يتم العثور على طلبات',
    'noProductsFound': 'لم يتم العثور على منتجات',
    'noCustomersFound': 'لم يتم العثور على عملاء',
    'loading': 'جارٍ التحميل...',
    'error': 'خطأ',
    'success': 'نجح',
    'areYouSureDeleteStatus': 'هل أنت متأكد من أنك تريد حذف هذه الحالة؟ الطلبات التي تستخدم هذه الحالة ستحتاج إلى تحديث.',
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