import { Logo } from '@/components/logo';

const CURRENT_YEAR = new Date().getFullYear();

const linkClass = 'transition-colors hover:text-neutral-950';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-8 text-sm text-neutral-500">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-5" />
          <span className="text-xs">&copy; {CURRENT_YEAR} Brightloop. All rights reserved.</span>
        </div>
        <nav className="flex items-center gap-5 text-xs">
          <a href="#plans" className={linkClass}>
            Plans
          </a>
          <a href="/signup" className={linkClass}>
            Create account
          </a>
          <a href="/login" className={linkClass}>
            Login
          </a>
        </nav>
      </div>
    </footer>
  );
}
