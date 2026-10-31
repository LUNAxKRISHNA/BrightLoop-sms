import * as React from 'react';
import { ArrowRight, Check } from 'lucide-react';

type Cycle = 'monthly' | 'annual';

type Plan = {
  name: string;
  description: string;
  monthly: number;
  annual: number; // billed once a year
  features: string[];
  popular?: boolean;
};

// Placeholder plans for the showcase site. Annual = 10 months' price (2 months free).
const PLANS: Plan[] = [
  {
    name: 'Starter',
    description: 'For individuals and small teams getting started.',
    monthly: 999,
    annual: 9990,
    features: ['Up to 3 users', 'Core workspace tools', 'Email support', 'Invoices in your portal'],
  },
  {
    name: 'Growth',
    description: 'For growing teams that need more room and add-ons.',
    monthly: 2499,
    annual: 24990,
    features: ['Up to 15 users', 'Everything in Starter', 'Add-on connectors', 'Priority support'],
    popular: true,
  },
  {
    name: 'Scale',
    description: 'For established businesses running at volume.',
    monthly: 5999,
    annual: 59990,
    features: [
      'Unlimited users',
      'Everything in Growth',
      'Volume discounts',
      'Dedicated account manager',
    ],
  },
];

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function CycleToggle({ value, onChange }: { value: Cycle; onChange: (cycle: Cycle) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing cycle"
      className="relative grid w-56 grid-cols-2 rounded-full border border-neutral-200 bg-neutral-100 p-0.5"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-neutral-950 shadow-sm transition-transform duration-200 ease-out ${
          value === 'annual' ? 'translate-x-full' : ''
        }`}
      />
      {(['monthly', 'annual'] as const).map((cycle) => (
        <button
          key={cycle}
          type="button"
          role="radio"
          aria-checked={value === cycle}
          onClick={() => onChange(cycle)}
          className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors duration-200 ${
            value === cycle ? 'text-white' : 'text-neutral-600 hover:text-neutral-950'
          }`}
        >
          {cycle === 'monthly' ? 'Monthly' : 'Annual'}
          {cycle === 'annual' && (
            <span
              className={`rounded-full px-1.5 font-mono text-[10px] ${
                value === 'annual' ? 'bg-white/15 text-white' : 'bg-green-50 text-green-700'
              }`}
            >
              −17%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Plans() {
  const [cycle, setCycle] = React.useState<Cycle>('monthly');

  return (
    <section
      id="plans"
      className="scroll-mt-14 border-t border-neutral-200 bg-neutral-50/60 py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Plans for every stage
          </h2>
          <p className="mt-3 text-sm text-neutral-600 sm:text-base">
            Prices include all core features. Switch to annual billing and get two months free.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <CycleToggle value={cycle} onChange={setCycle} />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === 'monthly' ? plan.monthly : plan.annual;
            return (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-xl border bg-white p-6 transition-shadow duration-150 hover:shadow-[0_12px_32px_rgb(0_0_0/0.08)] ${
                  plan.popular
                    ? 'border-neutral-900 shadow-[0_4px_12px_rgb(0_0_0/0.06)]'
                    : 'border-neutral-200 shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-neutral-950 px-2.5 py-0.5 text-[11px] font-medium text-white">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-medium tracking-tight text-neutral-950">
                    {inr.format(price)}
                  </span>
                  <span className="text-sm text-neutral-500">
                    / {cycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </p>
                <p className="mt-1 h-4 text-xs text-neutral-500">
                  {cycle === 'annual'
                    ? `${inr.format(Math.round(plan.annual / 12))} per month, billed yearly`
                    : 'Billed monthly, cancel anytime'}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-neutral-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-900" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="/signup"
                  className={`group mt-8 inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                    plan.popular
                      ? 'bg-neutral-950 text-white hover:bg-neutral-800'
                      : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  Know more
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
