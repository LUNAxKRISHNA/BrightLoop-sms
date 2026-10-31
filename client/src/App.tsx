import { Navbar } from '@/components/navigation/Navbar';
import { Hero } from '@/components/sections/Hero';
import { ProductCatalog } from '@/components/sections/ProductCatalog';
import { WorkflowArchitecture } from '@/components/sections/WorkflowArchitecture';
import { Footer } from '@/components/sections/Footer';

export function App() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Sticky Navigation Header */}
      <Navbar onOpenKnowMore={() => scrollToSection('workflow')} />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Customer-Centric Hero Section with Self-Service License Preview */}
        <Hero
          onExploreCatalog={() => scrollToSection('catalog')}
          onOpenKnowMore={() => scrollToSection('workflow')}
        />

        {/* Interactive Product & Plan Cards Section */}
        <ProductCatalog />

        {/* "How It Works" — Customer Workflow & Capabilities Section */}
        <WorkflowArchitecture />
      </main>

      {/* Public Storefront Footer */}
      <Footer />
    </div>
  );
}

export default App;
