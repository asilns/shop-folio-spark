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
    
    // Order Status
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    
    // Settings
    'applicationSettings': 'Application Settings',
    'language': 'Language',
    'selectLanguage': 'Select Language',
    'invoiceSettings': 'Invoice Settings',
    'orderStatusSettings': 'Order Status Settings',
    'companyName': 'Company Name',
    'phoneNumber': 'Phone Number',
    'address': 'Address',
    'save': 'Save',
    
    // Form Labels
    'customerName': 'Customer Name',
    'items': 'Items',
    'status': 'Status',
    'total': 'Total',
    'actions': 'Actions',
    'edit': 'Edit',
    'delete': 'Delete',
    'cancel': 'Cancel',
    'close': 'Close',
    'add': 'Add',
    'update': 'Update',
    
    // Messages
    'selectAtLeastOneOrder': 'Please select at least one order to delete',
    'confirmDelete': 'Are you sure you want to delete the selected orders?',
    'ordersDeletedSuccess': 'Selected orders deleted successfully',
    'orderCreatedSuccess': 'Order created successfully',
    'orderUpdatedSuccess': 'Order updated successfully',
    'settingsUpdated': 'Settings updated successfully',
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
    
    // Order Status
    'pending': 'معلق',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    
    // Settings
    'applicationSettings': 'إعدادات التطبيق',
    'language': 'اللغة',
    'selectLanguage': 'اختر اللغة',
    'invoiceSettings': 'إعدادات الفاتورة',
    'orderStatusSettings': 'إعدادات حالة الطلب',
    'companyName': 'اسم الشركة',
    'phoneNumber': 'رقم الهاتف',
    'address': 'العنوان',
    'save': 'حفظ',
    
    // Form Labels
    'customerName': 'اسم العميل',
    'items': 'العناصر',
    'status': 'الحالة',
    'total': 'المجموع',
    'actions': 'الإجراءات',
    'edit': 'تعديل',
    'delete': 'حذف',
    'cancel': 'إلغاء',
    'close': 'إغلاق',
    'add': 'إضافة',
    'update': 'تحديث',
    
    // Messages
    'selectAtLeastOneOrder': 'يرجى تحديد طلب واحد على الأقل للحذف',
    'confirmDelete': 'هل أنت متأكد من أنك تريد حذف الطلبات المحددة؟',
    'ordersDeletedSuccess': 'تم حذف الطلبات المحددة بنجاح',
    'orderCreatedSuccess': 'تم إنشاء الطلب بنجاح',
    'orderUpdatedSuccess': 'تم تحديث الطلب بنجاح',
    'settingsUpdated': 'تم تحديث الإعدادات بنجاح',
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