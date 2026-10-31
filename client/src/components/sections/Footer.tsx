import { StatusBadge } from '@/components/ui/badge';

const CURRENT_YEAR = 2026;

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50/60 py-12 text-sm text-neutral-600">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-10 border-b border-neutral-200/80">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-950 text-white text-xs font-mono">
                BL
              </div>
              <span className="text-base font-semibold text-neutral-900 tracking-tight">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
              Modular subscription software, enterprise connector add-ons, and self-service customer
              management. Built for modern businesses that value speed, transparency, and uptime.
            </p>

            {/* Public Service Status Indicator */}
            <div className="pt-2 flex items-center gap-2">
              <StatusBadge
                status="Active"
                label="All Services Operational"
                className="text-[11px] h-5"
              />
              <span className="text-[11px] text-neutral-400 font-mono">99.9% Uptime SLA</span>
            </div>
          </div>

          {/* Column 1: Explore */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-900 tracking-wider">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <a href="#catalog" className="hover:text-neutral-950 transition-colors">
                  Product Catalog
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-neutral-950 transition-colors">
                  Plans & Pricing
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-neutral-950 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-neutral-950 transition-colors">
                  Subscriber Login
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Software Suite */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-900 tracking-wider">
              Software Suite
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <a href="#catalog" className="hover:text-neutral-950 transition-colors">
                  Core Subscription Engine
                </a>
              </li>
              <li>
                <a href="#catalog" className="hover:text-neutral-950 transition-colors">
                  Odoo & ERP Connectors
                </a>
              </li>
              <li>
                <a href="#catalog" className="hover:text-neutral-950 transition-colors">
                  Automated Tax Suite
                </a>
              </li>
              <li>
                <a href="#catalog" className="hover:text-neutral-950 transition-colors">
                  Developer API Pack
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Portal */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-900 tracking-wider">
              Customer Portal
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <a href="/login" className="hover:text-neutral-950 transition-colors">
                  Sign In to Portal
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-neutral-950 transition-colors">
                  Invoice Downloads
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-neutral-950 transition-colors">
                  Subscription Controls
                </a>
              </li>
              <li>
                <span className="hover:text-neutral-950 cursor-pointer">Customer Support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            &copy; {CURRENT_YEAR} Brightloop Software Inc. All rights reserved. Strictly light mode.
          </div>
          <div className="flex items-center gap-4 text-neutral-500">
            <span className="hover:text-neutral-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-neutral-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-neutral-900 cursor-pointer">Security Standards</span>
            <span className="font-mono text-neutral-400">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
