import { ArrowDown, ArrowRight, ShieldCheck, Zap, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onExploreCatalog: () => void;
  onOpenKnowMore: () => void;
}

export function Hero({ onExploreCatalog, onOpenKnowMore }: HeroProps) {
  return (
    <section className="relative py-20 md:py-28 border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 text-center">
        {/* Subtle Pill Eyebrow Badge per DESIGN.md */}
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1 text-xs text-neutral-600 mb-6 shadow-xs select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 flex-shrink-0" />
          <span className="font-medium">Brightloop Software Platform</span>
        </div>

        {/* Display Hero Title: 36/40 weight 600 per DESIGN.md */}
        <h1 className="text-[32px] sm:text-[36px] md:text-[44px] leading-[1.15] font-semibold tracking-tight text-neutral-900 max-w-3xl mx-auto">
          Business software subscriptions, flexible billing, and modular add-ons in one place.
        </h1>

        {/* Customer-Centric Subheadline */}
        <p className="mt-5 text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Subscribe to modular business applications with upfront, predictable pricing. Choose
          monthly or yearly plans, attach enterprise connectors whenever your workflow needs them,
          and scale seats with complete autonomy.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onExploreCatalog}
            className="w-full sm:w-auto gap-2"
          >
            <span>Explore Products & Plans</span>
            <ArrowDown className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={onOpenKnowMore}
            className="w-full sm:w-auto gap-2"
          >
            <span>How It Works</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Core Value Highlights */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-lg border border-neutral-200/80 bg-neutral-50/50">
            <Sliders className="h-4 w-4 text-neutral-900 mb-2" />
            <div className="text-xs font-semibold text-neutral-900">Modular Add-ons</div>
            <div className="text-xs text-neutral-500 mt-1 leading-normal">
              Attach connectors and specialized tools to your subscription anytime with zero
              friction.
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200/80 bg-neutral-50/50">
            <Zap className="h-4 w-4 text-neutral-900 mb-2" />
            <div className="text-xs font-semibold text-neutral-900">Flexible Cadences</div>
            <div className="text-xs text-neutral-500 mt-1 leading-normal">
              Switch freely between monthly flexibility and discounted yearly commitments.
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200/80 bg-neutral-50/50">
            <ShieldCheck className="h-4 w-4 text-neutral-900 mb-2" />
            <div className="text-xs font-semibold text-neutral-900">Transparent Terms</div>
            <div className="text-xs text-neutral-500 mt-1 leading-normal">
              Upfront tax schedules, volume discount tiers, and clear renewal and cancellation
              rules.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
