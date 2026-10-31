import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/logo';

const loginClass =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 bg-neutral-950 text-white hover:bg-neutral-800 active:bg-neutral-900 shadow-sm h-9 px-4';

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPlans = () =>
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md transition-all duration-150 ${
        scrolled
          ? 'border-neutral-200 shadow-[0_4px_12px_rgb(0_0_0/0.06)]'
          : 'border-transparent shadow-none'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <a
          href="#"
          aria-label="Brightloop home"
          className="transition-opacity duration-150 hover:opacity-80"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Logo className="h-6" />
        </a>

        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            onClick={scrollToPlans}
            className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            Plans
          </button>
          <a href="/login" className={loginClass}>
            <span>Login</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
