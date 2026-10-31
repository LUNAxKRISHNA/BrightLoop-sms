import { Navbar } from '@/components/navigation/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Plans } from '@/components/sections/Plans';
import { Footer } from '@/components/sections/Footer';

export function LandingPage() {
  const scrollToPlans = () =>
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Hero onExplorePlans={scrollToPlans} />
        <Plans />
      </main>
      <Footer />
    </div>
  );
}
