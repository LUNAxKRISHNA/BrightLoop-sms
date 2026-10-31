export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ProductType = 'service' | 'goods';

export type SubscriptionStatus =
  'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed' | 'Cancelled';

export type InvoiceStatus =
  'Draft' | 'Confirmed' | 'Paid' | 'Outstanding' | 'Overdue' | 'Cancelled';

export type StatusTone = 'green' | 'yellow' | 'blue' | 'grey' | 'red';

export interface AttributeOption {
  id: string;
  value: string;
  extraPrice: number;
  description?: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  options: AttributeOption[];
}

export interface ProductLifecycleFlags {
  autoRenew: boolean;
  pausable: boolean;
  closable: boolean; // Early cancellation allowed
  autoClose: boolean;
}

export interface VolumeDiscountRule {
  minQuantity: number;
  discountPercentage: number;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  type: ProductType;
  salesPrice: number; // Monthly base sales price in INR
  costPrice?: number;
  notes: string;
  isActive: boolean;
  category:
    'Core Platform' | 'Enterprise Connectors' | 'Security & Infrastructure' | 'Developer Tools';
  isPopular?: boolean;
  minQuantity: number;
  features: string[];
  attributes?: ProductAttribute[];
  lifecycle: ProductLifecycleFlags;
  taxName: string;
  taxRate: number; // e.g. 18 for 18% GST
  volumeDiscount?: VolumeDiscountRule;
  availableFrom: string;
  availableUntil?: string;
}

export interface BillingPeriodConfig {
  interval: BillingInterval;
  label: string;
  cadence: string;
  multiplier: number; // Multiplier relative to monthly price
  discountNotice?: string;
  savingsBadge?: string;
}
