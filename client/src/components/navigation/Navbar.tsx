import * as React from 'react';
import { Menu, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface NavbarProps {
  onOpenKnowMore: () => void;
}

export function Navbar({ onOpenKnowMore }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md transition-all duration-150 border-b ${
        scrolled
          ? 'border-neutral-200 shadow-[0_4px_12px_rgb(0_0_0/0.06)]'
          : 'border-neutral-200/80 shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Wordmark */}
        <a
          href="#"
          className="flex items-center gap-2.5 text-neutral-900 group select-none"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {/* Geometric logo mark */}
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-950 text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-neutral-900 flex items-center gap-1.5">
              Brightloop
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider font-mono">
                Software
              </span>
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
          <button
            type="button"
            onClick={() => scrollToSection('catalog')}
            className="hover:text-neutral-950 transition-colors cursor-pointer"
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="hover:text-neutral-950 transition-colors cursor-pointer"
          >
            Plans & Pricing
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
            className="hover:text-neutral-950 transition-colors cursor-pointer"
          >
            How It Works
          </button>
        </nav>

        {/* Desktop Action Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenKnowMore}
            className="text-neutral-700 hover:text-neutral-950 font-normal"
          >
            Know More
          </Button>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 bg-neutral-950 text-white hover:bg-neutral-800 active:bg-neutral-900 shadow-sm h-9 px-4 py-2"
          >
            <span>Login</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mobile Hamburger Drawer */}
        <div className="md:hidden flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open Navigation Menu">
                <Menu className="h-5 w-5 text-neutral-800" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] flex flex-col justify-between">
              <div className="flex flex-col space-y-6 pt-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-950 text-white text-xs font-mono">
                      BL
                    </div>
                    <span>Brightloop Software</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col space-y-3 pt-2 text-left">
                  <button
                    type="button"
                    onClick={() => scrollToSection('catalog')}
                    className="py-2 text-sm font-medium text-neutral-700 hover:text-neutral-950 text-left border-b border-neutral-100"
                  >
                    Products
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('pricing')}
                    className="py-2 text-sm font-medium text-neutral-700 hover:text-neutral-950 text-left border-b border-neutral-100"
                  >
                    Plans & Pricing
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('workflow')}
                    className="py-2 text-sm font-medium text-neutral-700 hover:text-neutral-950 text-left border-b border-neutral-100"
                  >
                    How It Works
                  </button>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 flex flex-col gap-2">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 ease-out bg-neutral-950 text-white hover:bg-neutral-800 h-9 px-4 py-2 w-full text-center"
                >
                  <span>Login</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
