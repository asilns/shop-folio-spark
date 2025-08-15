import { format } from 'date-fns';

export interface WhatsAppSettings {
  whatsapp_enabled: boolean;
  default_country_code: string;
  whatsapp_template: string;
  date_format: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  customers: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+31', country: 'Netherlands' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+45', country: 'Denmark' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+32', country: 'Belgium' },
  { code: '+351', country: 'Portugal' },
  { code: '+30', country: 'Greece' },
  { code: '+353', country: 'Ireland' },
  { code: '+358', country: 'Finland' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+36', country: 'Hungary' },
  { code: '+48', country: 'Poland' },
  { code: '+90', country: 'Turkey' },
  { code: '+7', country: 'Russia' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+91', country: 'India' },
  { code: '+92', country: 'Pakistan' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+95', country: 'Myanmar' },
  { code: '+66', country: 'Thailand' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+84', country: 'Vietnam' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+853', country: 'Macau' },
  { code: '+886', country: 'Taiwan' },
  { code: '+61', country: 'Australia' },
  { code: '+64', country: 'New Zealand' },
  { code: '+27', country: 'South Africa' },
  { code: '+20', country: 'Egypt' },
  { code: '+212', country: 'Morocco' },
  { code: '+213', country: 'Algeria' },
  { code: '+216', country: 'Tunisia' },
  { code: '+218', country: 'Libya' },
  { code: '+249', country: 'Sudan' },
  { code: '+254', country: 'Kenya' },
  { code: '+234', country: 'Nigeria' },
  { code: '+233', country: 'Ghana' },
  { code: '+225', country: 'Ivory Coast' },
  { code: '+221', country: 'Senegal' },
  { code: '+220', country: 'Gambia' },
  { code: '+224', country: 'Guinea' },
  { code: '+226', country: 'Burkina Faso' },
  { code: '+227', country: 'Niger' },
  { code: '+228', country: 'Togo' },
  { code: '+229', country: 'Benin' },
  { code: '+230', country: 'Mauritius' },
  { code: '+231', country: 'Liberia' },
  { code: '+232', country: 'Sierra Leone' },
  { code: '+235', country: 'Chad' },
  { code: '+236', country: 'Central African Republic' },
  { code: '+237', country: 'Cameroon' },
  { code: '+238', country: 'Cape Verde' },
  { code: '+239', country: 'São Tomé and Príncipe' },
  { code: '+240', country: 'Equatorial Guinea' },
  { code: '+241', country: 'Gabon' },
  { code: '+242', country: 'Republic of the Congo' },
  { code: '+243', country: 'Democratic Republic of the Congo' },
  { code: '+244', country: 'Angola' },
  { code: '+245', country: 'Guinea-Bissau' },
  { code: '+246', country: 'British Indian Ocean Territory' },
  { code: '+248', country: 'Seychelles' },
  { code: '+250', country: 'Rwanda' },
  { code: '+251', country: 'Ethiopia' },
  { code: '+252', country: 'Somalia' },
  { code: '+253', country: 'Djibouti' },
  { code: '+255', country: 'Tanzania' },
  { code: '+256', country: 'Uganda' },
  { code: '+257', country: 'Burundi' },
  { code: '+258', country: 'Mozambique' },
  { code: '+260', country: 'Zambia' },
  { code: '+261', country: 'Madagascar' },
  { code: '+262', country: 'Réunion' },
  { code: '+263', country: 'Zimbabwe' },
  { code: '+264', country: 'Namibia' },
  { code: '+265', country: 'Malawi' },
  { code: '+266', country: 'Lesotho' },
  { code: '+267', country: 'Botswana' },
  { code: '+268', country: 'Eswatini' },
  { code: '+269', country: 'Comoros' },
  { code: '+290', country: 'Saint Helena' },
  { code: '+291', country: 'Eritrea' },
  { code: '+297', country: 'Aruba' },
  { code: '+298', country: 'Faroe Islands' },
  { code: '+299', country: 'Greenland' },
  { code: '+350', country: 'Gibraltar' },
  { code: '+352', country: 'Luxembourg' },
  { code: '+354', country: 'Iceland' },
  { code: '+355', country: 'Albania' },
  { code: '+356', country: 'Malta' },
  { code: '+357', country: 'Cyprus' },
  { code: '+370', country: 'Lithuania' },
  { code: '+371', country: 'Latvia' },
  { code: '+372', country: 'Estonia' },
  { code: '+373', country: 'Moldova' },
  { code: '+374', country: 'Armenia' },
  { code: '+375', country: 'Belarus' },
  { code: '+376', country: 'Andorra' },
  { code: '+377', country: 'Monaco' },
  { code: '+378', country: 'San Marino' },
  { code: '+380', country: 'Ukraine' },
  { code: '+381', country: 'Serbia' },
  { code: '+382', country: 'Montenegro' },
  { code: '+383', country: 'Kosovo' },
  { code: '+385', country: 'Croatia' },
  { code: '+386', country: 'Slovenia' },
  { code: '+387', country: 'Bosnia and Herzegovina' },
  { code: '+389', country: 'North Macedonia' },
  { code: '+390', country: 'Vatican City' },
  { code: '+500', country: 'Falkland Islands' },
  { code: '+501', country: 'Belize' },
  { code: '+502', country: 'Guatemala' },
  { code: '+503', country: 'El Salvador' },
  { code: '+504', country: 'Honduras' },
  { code: '+505', country: 'Nicaragua' },
  { code: '+506', country: 'Costa Rica' },
  { code: '+507', country: 'Panama' },
  { code: '+508', country: 'Saint Pierre and Miquelon' },
  { code: '+509', country: 'Haiti' },
  { code: '+590', country: 'Guadeloupe' },
  { code: '+591', country: 'Bolivia' },
  { code: '+592', country: 'Guyana' },
  { code: '+593', country: 'Ecuador' },
  { code: '+594', country: 'French Guiana' },
  { code: '+595', country: 'Paraguay' },
  { code: '+596', country: 'Martinique' },
  { code: '+597', country: 'Suriname' },
  { code: '+598', country: 'Uruguay' },
  { code: '+599', country: 'Netherlands Antilles' },
  { code: '+670', country: 'East Timor' },
  { code: '+672', country: 'Norfolk Island' },
  { code: '+673', country: 'Brunei' },
  { code: '+674', country: 'Nauru' },
  { code: '+675', country: 'Papua New Guinea' },
  { code: '+676', country: 'Tonga' },
  { code: '+677', country: 'Solomon Islands' },
  { code: '+678', country: 'Vanuatu' },
  { code: '+679', country: 'Fiji' },
  { code: '+680', country: 'Palau' },
  { code: '+681', country: 'Wallis and Futuna' },
  { code: '+682', country: 'Cook Islands' },
  { code: '+683', country: 'Niue' },
  { code: '+684', country: 'American Samoa' },
  { code: '+685', country: 'Samoa' },
  { code: '+686', country: 'Kiribati' },
  { code: '+687', country: 'New Caledonia' },
  { code: '+688', country: 'Tuvalu' },
  { code: '+689', country: 'French Polynesia' },
  { code: '+690', country: 'Tokelau' },
  { code: '+691', country: 'Micronesia' },
  { code: '+692', country: 'Marshall Islands' },
  { code: '+850', country: 'North Korea' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+853', country: 'Macau' },
  { code: '+855', country: 'Cambodia' },
  { code: '+856', country: 'Laos' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+886', country: 'Taiwan' },
  { code: '+960', country: 'Maldives' },
  { code: '+961', country: 'Lebanon' },
  { code: '+962', country: 'Jordan' },
  { code: '+963', country: 'Syria' },
  { code: '+964', country: 'Iraq' },
  { code: '+965', country: 'Kuwait' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+967', country: 'Yemen' },
  { code: '+968', country: 'Oman' },
  { code: '+970', country: 'Palestine' },
  { code: '+971', country: 'United Arab Emirates' },
  { code: '+972', country: 'Israel' },
  { code: '+973', country: 'Bahrain' },
  { code: '+974', country: 'Qatar' },
  { code: '+975', country: 'Bhutan' },
  { code: '+976', country: 'Mongolia' },
  { code: '+977', country: 'Nepal' },
  { code: '+992', country: 'Tajikistan' },
  { code: '+993', country: 'Turkmenistan' },
  { code: '+994', country: 'Azerbaijan' },
  { code: '+995', country: 'Georgia' },
  { code: '+996', country: 'Kyrgyzstan' },
  { code: '+998', country: 'Uzbekistan' }
];

export { COUNTRY_CODES };

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2023)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2023)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2023-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2023)' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (12-31-2023)' }
];

export function humanizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'paid': 'Paid',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };
  return statusMap[status.toLowerCase()] || status;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}

export function formatDate(dateString: string, dateFormat: string): string {
  const date = new Date(dateString);
  
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return format(date, 'dd/MM/yyyy');
    case 'MM/DD/YYYY':
      return format(date, 'MM/dd/yyyy');
    case 'YYYY-MM-DD':
      return format(date, 'yyyy-MM-dd');
    case 'DD-MM-YYYY':
      return format(date, 'dd-MM-yyyy');
    case 'MM-DD-YYYY':
      return format(date, 'MM-dd-yyyy');
    default:
      return format(date, 'dd/MM/yyyy');
  }
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  
  // Replace all variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  // Remove any remaining unknown variables
  result = result.replace(/{{[^}]+}}/g, '');
  
  // Trim extra spaces and newlines
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

export function normalizePhoneToE164(phone: string | undefined, defaultCountryCode: string): string | null {
  if (!phone) return null;
  
  // Clean phone number: remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If phone is empty after cleaning, return null
  if (!cleaned) return null;
  
  // If phone doesn't start with +, add default country code
  if (!cleaned.startsWith('+')) {
    // If starts with single 0, remove it before adding country code
    if (cleaned.startsWith('0') && cleaned.length > 1) {
      cleaned = cleaned.substring(1);
    }
    cleaned = defaultCountryCode + cleaned;
  }
  
  // Validate E.164 format: starts with + followed by digits only
  const e164Regex = /^\+\d{7,15}$/;
  if (!e164Regex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

export function generateWhatsAppURL(phone: string, message: string): string {
  // Remove + from phone number for WhatsApp URL
  const phoneNumber = phone.replace('+', '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

export function openWhatsApp(url: string): void {
  const newWindow = window.open(url, '_blank');
  
  // If popup is blocked, show a fallback
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject(new Error('Failed to copy text'));
      }
      document.body.removeChild(textArea);
    });
  }
}