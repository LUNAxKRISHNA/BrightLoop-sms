export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type ProductType = 'SOFTWARE' | 'ADD_ON' | 'SERVICE';
export type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type DiscountType = 'FIXED' | 'PERCENTAGE';
export type DiscountTarget = 'SUBSCRIPTION' | 'SPECIFIC_PRODUCTS';
export type SubscriptionStatus =
  'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'UPI' | 'CASH' | 'OTHER';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_by: string | null;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
}

export interface CustomerAccount {
  id: string;
  user_id: string;
  company_name: string;
  billing_address: string | null;
  created_at: string;
  email?: string;
}

export interface Tax {
  id: string;
  name: string;
  rate_percentage: number | string;
  is_active: boolean;
  created_by: string;
}

export interface Product {
  id: string;
  name: string;
  product_type: ProductType;
  sales_price: number | string;
  cost_price: number | string;
  default_tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  tax_name?: string | null;
  tax_rate?: number | string | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  price_surcharge: number | string;
}

export interface Plan {
  id: string;
  name: string;
  base_price: number | string;
  billing_interval: BillingInterval;
  min_quantity: number;
  available_from: string;
  available_to: string | null;
  auto_close_at_end: boolean;
  can_close_early: boolean;
  can_pause: boolean;
  can_renew: boolean;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  plan_id: string;
  validity_days: number;
  lines?: QuotationTemplateLine[];
}

export interface QuotationTemplateLine {
  id: string;
  template_id: string;
  product_id: string;
  variant_id: string | null;
  default_quantity: number;
  product_name?: string;
  attribute_value?: string;
}

export interface Discount {
  id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number | string;
  applies_to: DiscountTarget;
  min_purchase_amount: number | string;
  min_quantity: number;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  created_by: string;
  product_ids?: string[];
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  template_id: string | null;
  discount_id: string | null;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string | null;
  next_billing_date: string;
  payment_terms_days: number;
  created_at: string;
  company_name?: string;
  plan_name?: string;
  billing_interval?: BillingInterval;
  discount_name?: string;
  lines?: SubscriptionLine[];
}

export interface SubscriptionLine {
  id: string;
  subscription_id: string;
  product_id: string;
  variant_id: string | null;
  discount_id: string | null;
  quantity: number;
  unit_price: number | string;
  tax_id: string | null;
  tax_amount: number | string;
  line_amount: number | string;
  product_name?: string;
  attribute_name?: string;
  attribute_value?: string;
  tax_rate?: number | string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string;
  customer_id: string;
  status: InvoiceStatus;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  subtotal: number | string;
  discount_total: number | string;
  tax_total: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  is_sent: boolean;
  company_name?: string;
  subscription_number?: string;
  lines?: InvoiceLine[];
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  subscription_line_id: string | null;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  line_total: number | string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: number | string;
  payment_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  invoice_number?: string;
  company_name?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  customer_account_id?: string | null;
}
