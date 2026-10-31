import * as React from 'react';
import { StatusBadge } from '@/components/ui/badge';
import {
  Layers,
  Calendar,
  Sliders,
  Receipt,
  CheckCircle,
  ShieldCheck,
  Download,
} from 'lucide-react';

export function WorkflowArchitecture() {
  const [activePillar, setActivePillar] = React.useState<number>(0);

  const pillars = [
    {
      id: 'choose-software',
      title: '1. Choose Software & Variants',
      subtitle: 'Modular products with live, upfront variant pricing',
      icon: Layers,
      highlight: 'Transparent pricing with no hidden licensing fees',
      description:
        'Select the core subscription software you need and customize it with targeted variants. Whether selecting your specific ERP connector (like Odoo or SAP) or single-tenant cloud deployment, you see the exact calculated price before subscribing.',
      features: [
        'Modular standalone products or complete software bundles',
        'Dynamic variant modifiers with clear price tags (e.g. +₹560.00 for Odoo)',
        'Zero hidden fees — transparent base sales prices and tax schedules',
        'Instant configuration preview tailored to your operational scale',
      ],
      diagram: (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase pb-1 border-b border-neutral-200">
            <span>Selected Software</span>
            <span>Monthly Rate</span>
          </div>
          <div className="flex items-center justify-between text-neutral-800">
            <span>Brightloop Core Engine</span>
            <span>₹4,999.00 / mo</span>
          </div>
          <div className="flex items-center justify-between text-blue-700">
            <span>+ Odoo Enterprise Connector</span>
            <span>+₹560.00 / mo</span>
          </div>
          <div className="flex items-center justify-between font-semibold pt-1 border-t border-neutral-200 text-neutral-900">
            <span>Calculated Subscription Total</span>
            <span>₹5,559.00 / mo</span>
          </div>
        </div>
      ),
    },
    {
      id: 'flexible-billing',
      title: '2. Flexible Billing Cycles',
      subtitle: 'Monthly and annual commitments with automatic volume discounts',
      icon: Calendar,
      highlight: 'Save up to 20% on Annual Contracts',
      description:
        'Choose the payment cadence that matches your company budget. Scale up seat quantities or software instances and automatically unlock built-in volume discount tiers without haggling with sales reps.',
      features: [
        'Flexible intervals: Monthly, Yearly, Weekly, or Daily test licenses',
        'Annual contract savings highlighted upfront (2 months free upfront)',
        'Automatic volume discounts when scaling seat or unit counts',
        'Predictable renewal schedules anchored to your signup date',
      ],
      diagram: (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 font-mono text-xs space-y-3">
          <div className="text-[11px] text-neutral-500 uppercase">Available Cadences</div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 bg-neutral-950 text-white rounded-lg">
              <span className="block font-semibold">Yearly Plan</span>
              <span className="text-[10px] text-emerald-400">Save 20% (Best Value)</span>
            </div>
            <div className="p-2.5 bg-white border border-neutral-200 text-neutral-800 rounded-lg">
              <span className="block font-semibold">Monthly Plan</span>
              <span className="text-[10px] text-neutral-500">Cancel Anytime</span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 text-center font-sans">
            Automatic tier discounts apply instantly when minimum seat requirements are met.
          </div>
        </div>
      ),
    },
    {
      id: 'self-service-control',
      title: '3. Self-Service Control',
      subtitle: 'Pause, renew, or toggle add-ons without emailing support',
      icon: Sliders,
      highlight: 'Complete Autonomy Over Your Active Subscriptions',
      description:
        'Your dedicated customer portal gives you 24/7 control over your software assets. Temporarily pause seasonal services, enable auto-renewal for critical workflows, or add new team seats whenever your business expands.',
      features: [
        'Pausable plans allow you to suspend billing during off-season cycles',
        'One-click auto-renew toggle guarantees zero service interruption',
        'Add or remove enterprise connectors directly from your dashboard',
        'Early cancellation permitted on all eligible service contracts',
      ],
      diagram: (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 text-xs space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-white border border-neutral-200">
            <span className="font-medium text-neutral-800">Auto-Renewal</span>
            <StatusBadge status="Active" label="Enabled" />
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-white border border-neutral-200">
            <span className="font-medium text-neutral-800">Off-Peak Status</span>
            <StatusBadge status="Paused" label="Pausable" />
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-white border border-neutral-200">
            <span className="font-medium text-neutral-800">Contract Lifecycle</span>
            <StatusBadge status="Confirmed" label="Early Cancellation Allowed" />
          </div>
        </div>
      ),
    },
    {
      id: 'transparent-invoicing',
      title: '4. Transparent Invoicing',
      subtitle: 'Compliant GST breakdown, receipt downloads, and clear payment terms',
      icon: Receipt,
      highlight: 'Zero Surprises & 1-Click Invoice Downloads',
      description:
        'Every charge is backed by an itemized fiscal invoice. View exact tax percentages (such as 18% GST), payment terms, and historical receipts directly in your portal with print-ready PDF styling.',
      features: [
        'Itemized line items with exact 2-decimal currency precision',
        'Clear payment terms (15, 30, or 60 days) displayed on every invoice',
        'Print-ready browser and PDF invoice downloads for company accounting',
        'Instant confirmation receipts dispatched to your billing email',
      ],
      diagram: (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 text-xs space-y-2 font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
            <span className="font-semibold text-neutral-900">#INV-00108</span>
            <StatusBadge status="Paid" />
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Net Software Subtotal</span>
            <span>₹4,999.00</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>GST (18%)</span>
            <span>+₹899.82</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-neutral-200 text-neutral-900">
            <span>Total Paid Amount</span>
            <span>₹5,898.82</span>
          </div>
          <div className="pt-2 flex items-center justify-center gap-1.5 text-neutral-500 font-sans text-[11px]">
            <Download className="h-3.5 w-3.5" />
            <span>Official Tax Invoice PDF Available</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="workflow" className="py-16 md:py-24 border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600 shadow-xs select-none">
            <ShieldCheck className="h-3 w-3 text-neutral-900" />
            <span className="font-mono uppercase font-semibold">Subscriber Experience</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            How Brightloop works for your business.
          </h2>

          <p className="text-sm text-neutral-600 leading-relaxed">
            Everything you need to select, configure, and maintain your software subscriptions with
            zero administrative friction.
          </p>
        </div>

        {/* Pillar Navigation Tabs */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-neutral-200 pb-2">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            const isActive = activePillar === idx;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActivePillar(idx)}
                className={`flex items-center gap-2 p-3 rounded-lg text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-neutral-500'}`}
                />
                <div className="truncate">
                  <span className="block text-xs font-semibold truncate">
                    {pillar.title.split('. ')[1]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Pillar Bento Display */}
        <div className="mt-8">
          {pillars.map((pillar, idx) => {
            if (activePillar !== idx) return null;
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start rounded-xl border border-neutral-200 p-6 sm:p-8 bg-neutral-50/50"
              >
                {/* Left Description Column */}
                <div className="lg:col-span-7 space-y-4 text-left">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-8 w-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-mono font-semibold text-neutral-500 uppercase tracking-wider">
                      Subscriber Feature 0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
                    {pillar.title}
                  </h3>

                  <p className="text-xs font-mono text-neutral-500">{pillar.subtitle}</p>

                  <p className="text-sm text-neutral-700 leading-relaxed">{pillar.description}</p>

                  {/* Feature Checklist */}
                  <div className="pt-2 space-y-2 text-xs text-neutral-800">
                    {pillar.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-neutral-900 mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Visual / Interactive Diagram Column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-mono font-semibold text-neutral-500 mb-2 uppercase">
                      Feature Preview
                    </div>
                    {pillar.diagram}
                  </div>

                  <div className="p-3.5 rounded-lg border border-neutral-200 bg-white text-xs space-y-1">
                    <span className="font-semibold text-neutral-900 block">Customer Guarantee</span>
                    <span className="text-neutral-500 leading-normal block">
                      {pillar.highlight}. Manage everything from your unified customer dashboard.
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
