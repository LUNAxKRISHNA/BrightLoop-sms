import { ArrowDown } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ParticleField } from '@/components/sections/ParticleField';

interface HeroProps {
  onExplorePlans: () => void;
}

export function Hero({ onExplorePlans }: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-3.5rem)] items-center justify-center overflow-hidden bg-white">
      <ParticleField className="absolute inset-0 -z-10 h-full w-full" />
      {/* Soft fade so particles thin out behind the logo and at the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.6)_35%,transparent_70%)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <div className="hero-logo relative">
          <div
            aria-hidden
            className="hero-glow absolute -inset-x-16 -inset-y-10 -z-10 rounded-full bg-neutral-200/60 blur-3xl"
          />
          <Logo className="h-16 sm:h-24 md:h-28" />
        </div>

        <p className="hero-rise mt-8 max-w-xl text-base leading-relaxed text-neutral-600 [--delay:250ms] sm:text-lg">
          Software your team can start using today. Pick a plan, create your account, and manage
          everything from one place.
        </p>

        <button
          type="button"
          onClick={onExplorePlans}
          className="hero-rise group mt-10 inline-flex cursor-pointer items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white shadow-[0_4px_12px_rgb(0_0_0/0.12)] transition-all duration-150 [--delay:450ms] hover:bg-neutral-800 hover:shadow-[0_12px_32px_rgb(0_0_0/0.16)] focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Explore plans
          <ArrowDown className="h-4 w-4 transition-transform duration-150 group-hover:translate-y-0.5" />
        </button>
      </div>
    </section>
  );
}
