import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import type { Product, BillingPeriodConfig } from '@/types/subscription';
import { Plus, Minus, Info, Check, Sparkles, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  billingConfig: BillingPeriodConfig;
  onOpenDetail: (product: Product) => void;
}

export function ProductCard({ product, billingConfig, onOpenDetail }: ProductCardProps) {
  // State for selected attribute options
  const [selectedAttributes, setSelectedAttributes] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.attributes) {
      product.attributes.forEach((attr) => {
        if (attr.options.length > 0) {
          initial[attr.id] = attr.options[0].id;
        }
      });
    }
    return initial;
  });

  // Quantity state, default to product.minQuantity
  const [quantity, setQuantity] = React.useState<number>(product.minQuantity);

  // Calculate extra variant prices
  let variantExtras = 0;
  if (product.attributes) {
    product.attributes.forEach((attr) => {
      const selectedOptionId = selectedAttributes[attr.id];
      const opt = attr.options.find((o) => o.id === selectedOptionId);
      if (opt) {
        variantExtras += opt.extraPrice;
      }
    });
  }

  // Unit price for current interval = (base monthly price + variant extras) * billingConfig.multiplier
  const unitPrice = (product.salesPrice + variantExtras) * billingConfig.multiplier;
  const totalPrice = unitPrice * quantity;

  // Check volume discount
  const isVolumeEligible = product.volumeDiscount && quantity >= product.volumeDiscount.minQuantity;

  const handleAttributeChange = (attributeId: string, optionId: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeId]: optionId,
    }));
  };

  const incrementQty = () => setQuantity((q) => q + 1);
  const decrementQty = () => {
    if (quantity > product.minQuantity) {
      setQuantity((q) => q - 1);
    }
  };

  return (
    <Card
      hoverEffect
      className={`relative flex flex-col justify-between transition-all duration-150 ${
        product.isPopular
          ? 'border-neutral-900/60 ring-1 ring-neutral-900/10'
          : 'border-neutral-200'
      }`}
    >
      {/* Popular Callout Tag */}
      {product.isPopular && (
        <div className="absolute -top-3 right-4 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm font-mono">
            <Sparkles className="h-3 w-3 text-neutral-200" />
            POPULAR CHOICE
          </span>
        </div>
      )}

      <div>
        <CardHeader className="p-0 pb-3">
          {/* Top badges: Type & Category */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Badge variant="outline" className="text-[11px] font-mono uppercase text-neutral-600">
              {product.type}
            </Badge>
            <Badge variant="surface" className="text-[11px] text-neutral-600">
              {product.category}
            </Badge>
            {billingConfig.savingsBadge && (
              <Badge variant="savings" className="text-[11px]">
                {billingConfig.savingsBadge}
              </Badge>
            )}
          </div>

          <CardTitle className="text-lg font-semibold tracking-tight text-neutral-900 line-clamp-1">
            {product.name}
          </CardTitle>

          <CardDescription className="text-xs text-neutral-500 line-clamp-2 mt-1">
            {product.tagline}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 space-y-4">
          {/* Price display adhering to Geist Mono rules */}
          <div className="rounded-lg bg-neutral-50/90 border border-neutral-200/70 p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[24px] sm:text-[26px] font-semibold font-mono text-neutral-900 tracking-tight">
                  {formatCurrency(totalPrice)}
                </span>
                <span className="text-xs text-neutral-500 font-sans ml-1">
                  {billingConfig.cadence}
                </span>
              </div>
              {quantity > 1 && (
                <span className="text-[11px] font-mono text-neutral-500">
                  {formatCurrency(unitPrice)}/ea
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Tax schedule: {product.taxName}</span>
              <span className="font-mono">
                Min. order: <strong className="text-neutral-800">{product.minQuantity}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Variant Selector (e.g. Odoo connector +560) */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-neutral-100">
              {product.attributes.map((attr) => (
                <div key={attr.id} className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 block">{attr.name}</label>
                  <div className="grid grid-cols-1 gap-1">
                    {attr.options.map((opt) => {
                      const isSelected = selectedAttributes[attr.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAttributeChange(attr.id, opt.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-950 text-white font-medium'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{opt.value}</span>
                          {opt.extraPrice > 0 ? (
                            <span
                              className={`font-mono text-[11px] ml-2 flex-shrink-0 ${
                                isSelected ? 'text-neutral-200' : 'text-neutral-600 font-semibold'
                              }`}
                            >
                              +{formatCurrency(opt.extraPrice * billingConfig.multiplier)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-mono">Base</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-neutral-700">Licenses / Seats:</span>
            <div className="flex items-center gap-1 border border-neutral-300 rounded-full bg-white p-0.5">
              <button
                type="button"
                onClick={decrementQty}
                disabled={quantity <= product.minQuantity}
                className="h-6 w-6 rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-xs font-mono font-medium text-neutral-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={incrementQty}
                className="h-6 w-6 rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Volume discount notice */}
          {isVolumeEligible && (
            <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
              <span>
                Volume discount tier unlocked: -{product.volumeDiscount?.discountPercentage}%
              </span>
            </div>
          )}

          {/* Plan Lifecycle Badges per DESIGN.md */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
              Plan Terms
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.lifecycle.autoRenew && (
                <StatusBadge status="Active" label="Auto-Renew" className="text-[11px] h-5" />
              )}
              {product.lifecycle.pausable ? (
                <StatusBadge status="Paused" label="Pausable" className="text-[11px] h-5" />
              ) : (
                <StatusBadge status="Closed" label="Continuous" className="text-[11px] h-5" />
              )}
              {product.lifecycle.closable ? (
                <StatusBadge
                  status="Confirmed"
                  label="Early Cancellation"
                  className="text-[11px] h-5"
                />
              ) : (
                <StatusBadge status="Draft" label="Fixed Term" className="text-[11px] h-5" />
              )}
            </div>
          </div>

          {/* Key Features Bullet List */}
          <div className="space-y-1.5 pt-1 text-xs text-neutral-600">
            {product.features.slice(0, 3).map((feat, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <Check className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{feat}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </div>

      {/* Card Actions Footer */}
      <CardFooter className="p-0 pt-4 flex items-center gap-2 mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenDetail(product)}
          className="flex-1 text-xs gap-1.5"
        >
          <Info className="h-3.5 w-3.5" />
          <span>Know More</span>
        </Button>

        <a
          href="/login"
          className="flex-1 inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full text-xs font-medium transition-colors duration-150 ease-out bg-neutral-950 text-white hover:bg-neutral-800 active:bg-neutral-900 shadow-sm h-8 px-3"
        >
          <span>Subscribe</span>
          <ArrowRight className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  );
}
