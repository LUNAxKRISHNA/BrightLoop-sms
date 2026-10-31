import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import type { Product, BillingPeriodConfig } from '@/types/subscription';
import { Check, Shield, Calendar, Tag, Percent, Info, ArrowRight } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingConfig: BillingPeriodConfig;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  billingConfig,
}: ProductDetailModalProps) {
  if (!product) return null;

  const basePriceForInterval = product.salesPrice * billingConfig.multiplier;
  const taxAmount = (basePriceForInterval * product.taxRate) / 100;
  const totalWithTax = basePriceForInterval + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidth="max-w-2xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs uppercase font-mono">
              {product.type}
            </Badge>
            <Badge variant="default" className="text-xs">
              {product.category}
            </Badge>
            {product.isPopular && (
              <Badge variant="primary" className="text-xs">
                Most Popular
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl">{product.name}</DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            {product.tagline}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm text-neutral-800">
          {/* Detailed Product Notes */}
          <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200/80">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Software Capabilities & Architecture
            </h4>
            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">{product.notes}</p>
          </div>

          {/* Pricing & Tax Breakdown Calculator */}
          <div className="border border-neutral-200 rounded-lg p-4">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-500 mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Transparent Pricing & Tax Breakdown ({billingConfig.label})
            </h4>

            <div className="space-y-2 text-xs sm:text-sm divide-y divide-neutral-100">
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-600">Catalog Rate ({billingConfig.label})</span>
                <span className="font-mono font-medium text-neutral-900">
                  {formatCurrency(basePriceForInterval)}
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-neutral-600">Applicable Tax Rate ({product.taxName})</span>
                <span className="font-mono text-neutral-800">+{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between py-2 text-base font-semibold pt-3 border-t border-neutral-200">
                <span className="text-neutral-900">Total Effective Rate</span>
                <span className="font-mono text-neutral-950">
                  {formatCurrency(totalWithTax)}{' '}
                  <span className="text-xs font-normal text-neutral-500 font-sans">
                    {billingConfig.cadence}
                  </span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 font-mono">
              * Exact 2-decimal calculation. Taxes apply automatically on net discounted
              subscription totals.
            </p>
          </div>

          {/* Volume Discount Eligibility */}
          {product.volumeDiscount && (
            <div className="rounded-lg border border-neutral-200 p-4 bg-emerald-50/40">
              <h4 className="text-xs font-mono font-semibold uppercase text-emerald-800 mb-1 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-emerald-700" />
                Volume Discount Eligible
              </h4>
              <p className="text-xs text-neutral-700">
                {product.volumeDiscount.description} (Requires minimum{' '}
                <strong className="font-mono">{product.volumeDiscount.minQuantity} units</strong>).
                Discounts calculate automatically when ordering in your customer portal.
              </p>
            </div>
          )}

          {/* Lifecycle & Availability Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-200 p-3.5">
              <h5 className="text-xs font-mono uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Customer Lifecycle Policies
              </h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span>Auto-Renew:</span>
                  <StatusBadge
                    status={product.lifecycle.autoRenew ? 'Active' : 'Closed'}
                    label={product.lifecycle.autoRenew ? 'Supported' : 'Manual'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Pausable:</span>
                  <StatusBadge
                    status={product.lifecycle.pausable ? 'Paused' : 'Closed'}
                    label={product.lifecycle.pausable ? 'Allowed' : 'Locked'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Early Cancellation:</span>
                  <StatusBadge
                    status={product.lifecycle.closable ? 'Confirmed' : 'Draft'}
                    label={product.lifecycle.closable ? 'Allowed' : 'Fixed Term'}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3.5">
              <h5 className="text-xs font-mono uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Plan Terms & Availability
              </h5>
              <div className="space-y-2 text-xs font-mono text-neutral-700">
                <div>
                  <span className="text-neutral-500">Available From: </span>
                  <strong>{product.availableFrom}</strong>
                </div>
                {product.availableUntil ? (
                  <div>
                    <span className="text-neutral-500">Available Until: </span>
                    <strong className="text-amber-800">{product.availableUntil}</strong>
                  </div>
                ) : (
                  <div>
                    <span className="text-neutral-500">Availability: </span>
                    <strong className="text-emerald-700">Perpetual Contract</strong>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Minimum Order: </span>
                  <strong>
                    {product.minQuantity} {product.minQuantity > 1 ? 'units/seats' : 'unit'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Included Features Checklist */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-500 mb-2">
              What is included
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
              {product.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 ease-out bg-neutral-950 text-white hover:bg-neutral-800 active:bg-neutral-900 shadow-sm h-9 px-4 py-2"
          >
            <span>Subscribe / Get Started</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
