import type { Product, BillingPeriodConfig } from '@/types/subscription';

export const BILLING_INTERVALS: BillingPeriodConfig[] = [
  {
    interval: 'daily',
    label: 'Daily',
    cadence: '/ day',
    multiplier: 1 / 30,
    discountNotice: 'Billed every 24 hours. Ideal for temporary sandbox or burst environments.',
  },
  {
    interval: 'weekly',
    label: 'Weekly',
    cadence: '/ week',
    multiplier: 1 / 4,
    discountNotice: 'Billed every 7 days. Flexible short-term commitments.',
  },
  {
    interval: 'monthly',
    label: 'Monthly',
    cadence: '/ month',
    multiplier: 1,
    discountNotice: 'Standard monthly calendar billing anchored to your signup date.',
  },
  {
    interval: 'yearly',
    label: 'Yearly',
    cadence: '/ year',
    multiplier: 10, // 10 months price for 12 months = 2 months free (16.7% - 20% discount)
    savingsBadge: 'Save 20%',
    discountNotice: 'Annual contract with 2 months free upfront. Guaranteed price lock.',
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-core-engine',
    name: 'Brightloop Core Subscription Engine',
    tagline:
      'End-to-end recurring billing, automated lifecycle scheduling, and customer ledger management.',
    type: 'service',
    salesPrice: 4999.0,
    notes:
      'Includes full database-sequenced numbering (SUB-00042, INV-00108), automatic state machine transitions (Draft -> Quotation -> Confirmed -> Active -> Closed), and atomic period locking to prevent duplicate invoicing.',
    isActive: true,
    category: 'Core Platform',
    isPopular: true,
    minQuantity: 1,
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '01 Jan 2026',
    availableUntil: '31 Dec 2028',
    volumeDiscount: {
      minQuantity: 5,
      discountPercentage: 10,
      description: '10% volume discount for 5+ subscription instances',
    },
    lifecycle: {
      autoRenew: true,
      pausable: true,
      closable: true,
      autoClose: false,
    },
    attributes: [
      {
        id: 'attr-deployment',
        name: 'Deployment Architecture',
        options: [
          {
            id: 'opt-cloud-multi',
            value: 'Cloud Multi-Tenant (Standard)',
            extraPrice: 0,
            description: 'Shared high-availability cluster with isolated schemas',
          },
          {
            id: 'opt-cloud-dedicated',
            value: 'Dedicated Isolated VPC',
            extraPrice: 3500.0,
            description: 'Single-tenant instance with private endpoints & custom domain',
          },
        ],
      },
      {
        id: 'attr-support',
        name: 'SLA Support Tier',
        options: [
          {
            id: 'opt-sup-standard',
            value: 'Standard (24h SLA)',
            extraPrice: 0,
          },
          {
            id: 'opt-sup-priority',
            value: 'Priority 24/7 (1h Critical SLA)',
            extraPrice: 1500.0,
          },
        ],
      },
    ],
    features: [
      'Automated daily billing job with zero-touch draft invoices',
      'Anchor billing dates (31 Jan -> 28 Feb -> 31 Mar)',
      'Sub-2 second response under 100k records',
      'Unified admin, staff, and customer role isolation',
    ],
  },
  {
    id: 'prod-odoo-connector',
    name: 'Odoo ERP Real-Time Connector & Sync Hub',
    tagline:
      'Bidirectional sync for ledger journals, customer tax profiles, and instant bank reconciliation.',
    type: 'service',
    salesPrice: 2400.0,
    notes:
      'Seamlessly pipes confirmed subscriptions and line-item tax details into Odoo accounting ledgers. Automatically reconciles partial and full payments without manual spreadsheet import/export.',
    isActive: true,
    category: 'Enterprise Connectors',
    isPopular: false,
    minQuantity: 1,
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '15 Jan 2026',
    lifecycle: {
      autoRenew: true,
      pausable: true,
      closable: true,
      autoClose: false,
    },
    attributes: [
      {
        id: 'attr-brand',
        name: 'Target ERP Platform',
        options: [
          {
            id: 'opt-brand-odoo',
            value: 'Odoo Enterprise Connector',
            extraPrice: 560.0,
            description: 'Direct XML-RPC / JSON-RPC integration with +₹560 enterprise license hook',
          },
          {
            id: 'opt-brand-community',
            value: 'Odoo Community Bridge',
            extraPrice: 0,
            description: 'Open API webhook bridge for custom community editions',
          },
          {
            id: 'opt-brand-sap',
            value: 'SAP Business One Bridge',
            extraPrice: 1800.0,
            description: 'Enterprise connector for SAP B1 Service Layer',
          },
        ],
      },
    ],
    features: [
      'Zero manual invoice re-typing',
      'Instant sync for quotation-to-invoice status updates',
      'Automatic tax code mapping (CGST, SGST, IGST)',
      'Bank statement match validator',
    ],
  },
  {
    id: 'prod-tax-engine',
    name: 'Automated Tax Engine & E-Invoicing Suite',
    tagline:
      'Configurable tax rules, automated calculation order, and compliant fiscal receipt generation.',
    type: 'service',
    salesPrice: 1800.0,
    notes:
      'Calculates `quantity × unit price -> apply discount -> compute tax on discounted amount -> round to 2 decimals`. Never leaves rounding discrepancies.',
    isActive: true,
    category: 'Core Platform',
    isPopular: false,
    minQuantity: 1,
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '01 Feb 2026',
    lifecycle: {
      autoRenew: true,
      pausable: false, // Core tax compliance cannot be paused while active
      closable: true,
      autoClose: false,
    },
    features: [
      'Jurisdiction-aware tax rule inheritance',
      'Non-stackable discount validation',
      'Pre-computed line subtotals with exact 2-decimal rounding',
      'Print-ready browser stylesheet for audit compliance',
    ],
  },
  {
    id: 'prod-security-appliance',
    name: 'Brightloop Edge Security Hardware Gateway',
    tagline:
      'Hardware appliance for on-premises cryptographic key storage, PCI DSS tokenization, and audit isolation.',
    type: 'goods',
    salesPrice: 8500.0,
    notes:
      'Physical 1U appliance shipped directly to your datacenter. Includes 4-hour hardware swap guarantee. Note: Closable only after minimum 3-month contract term.',
    isActive: true,
    category: 'Security & Infrastructure',
    isPopular: false,
    minQuantity: 1,
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '01 Jan 2026',
    availableUntil: '31 Dec 2027',
    volumeDiscount: {
      minQuantity: 3,
      discountPercentage: 15,
      description: '15% hardware cluster discount for 3+ units',
    },
    lifecycle: {
      autoRenew: true,
      pausable: false,
      closable: false, // Physical goods contract cannot be cancelled mid-period
      autoClose: true,
    },
    attributes: [
      {
        id: 'attr-hardware-spec',
        name: 'Hardware Configuration',
        options: [
          {
            id: 'opt-hw-1u',
            value: 'Standard 1U Dual-PSU Gateway',
            extraPrice: 0,
            description: 'Redundant power, 4x 10GbE SFP+ interfaces',
          },
          {
            id: 'opt-hw-fips',
            value: 'FIPS 140-3 Level 3 HSM Enclosure',
            extraPrice: 4200.0,
            description: 'Tamper-reactive hardware security module for high-compliance banking',
          },
        ],
      },
    ],
    features: [
      'Zero cloud credential exposure',
      'Tamper-proof audit logs streamed to cold storage',
      'Onboard HSM cryptographic acceleration',
      'Next business day hardware replacement dispatch',
    ],
  },
  {
    id: 'prod-developer-pack',
    name: 'Developer High-Throughput Webhook & API Pack',
    tagline:
      'Sub-millisecond subscription event streaming, webhook retry queues, and sandbox test harnesses.',
    type: 'service',
    salesPrice: 1200.0,
    notes:
      'Provides programmable access for internal engineering teams. Includes webhook signatures (HMAC-SHA256) and exponential backoff retry queues.',
    isActive: true,
    category: 'Developer Tools',
    isPopular: false,
    minQuantity: 5, // Minimum 5 seats / developer licenses per PRD requirement demo
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '01 Feb 2026',
    volumeDiscount: {
      minQuantity: 10,
      discountPercentage: 15,
      description: '15% developer team discount for 10+ seats',
    },
    lifecycle: {
      autoRenew: true,
      pausable: true,
      closable: true,
      autoClose: false,
    },
    attributes: [
      {
        id: 'attr-api-limits',
        name: 'Throughput Quota',
        options: [
          {
            id: 'opt-quota-10k',
            value: '10,000 webhook events / min',
            extraPrice: 0,
          },
          {
            id: 'opt-quota-50k',
            value: '50,000 webhook events / min',
            extraPrice: 1500.0,
          },
        ],
      },
    ],
    features: [
      'HMAC webhook signature validation',
      'Self-service secret rotation & payload replay',
      'GraphQL & REST endpoints with strict OpenAPI 3.1 specs',
      'Configurable idempotency keys to eliminate duplicate triggers',
    ],
  },
  {
    id: 'prod-customer-portal',
    name: 'Branded Customer Self-Service Portal',
    tagline:
      'White-labeled customer portal for invoice downloads, subscription monitoring, and payment tracking.',
    type: 'service',
    salesPrice: 3200.0,
    notes:
      'Empowers your subscribers to view active subscriptions, check payment terms, print compliant invoices, and view receipts without calling support.',
    isActive: true,
    category: 'Core Platform',
    isPopular: true,
    minQuantity: 1,
    taxName: 'GST (18%)',
    taxRate: 18,
    availableFrom: '01 Jan 2026',
    lifecycle: {
      autoRenew: true,
      pausable: true,
      closable: true,
      autoClose: false,
    },
    features: [
      'Subscribers see only their own subscriptions & invoices',
      'One-click PDF & browser print stylesheets',
      'Payment terms display (15 / 30 / 60 days)',
      'Custom subdomain with automatic SSL certificate',
    ],
  },
];
