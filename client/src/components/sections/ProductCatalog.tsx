import * as React from 'react';
import { ProductCard } from '@/components/sections/ProductCard';
import { ProductDetailModal } from '@/components/sections/ProductDetailModal';
import { MOCK_PRODUCTS, BILLING_INTERVALS } from '@/data/mockProducts';
import type { Product, BillingInterval } from '@/types/subscription';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

export function ProductCatalog() {
  const [selectedInterval, setSelectedInterval] = React.useState<BillingInterval>('monthly');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Modal states for ProductDetailModal
  const [detailProduct, setDetailProduct] = React.useState<Product | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const currentBillingConfig =
    BILLING_INTERVALS.find((b) => b.interval === selectedInterval) || BILLING_INTERVALS[2];

  const categories = [
    'All',
    'Core Platform',
    'Enterprise Connectors',
    'Security & Infrastructure',
    'Developer Tools',
  ];

  // Filtering products
  const filteredProducts = MOCK_PRODUCTS.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenDetail = (product: Product) => {
    setDetailProduct(product);
    setDetailModalOpen(true);
  };

  return (
    <section id="catalog" className="py-16 md:py-20 border-b border-neutral-200 bg-neutral-50/40">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 shadow-xs select-none">
            <Sparkles className="h-3 w-3 text-neutral-900" />
            <span className="font-mono uppercase font-semibold">Software & Add-on Catalog</span>
          </div>

          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900"
            id="pricing"
          >
            Modular software with predictable pricing.
          </h2>

          <p className="text-sm text-neutral-600 leading-relaxed">
            Choose standalone services or bundle enterprise connectors. Toggle your billing cycle
            below to preview discounted annual contracts and dynamic variant modifiers.
          </p>
        </div>

        {/* Global Billing Interval Selector */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <div className="inline-flex items-center rounded-full bg-neutral-200/70 p-1 border border-neutral-300/80 shadow-xs">
            {BILLING_INTERVALS.map((period) => {
              const isSelected = selectedInterval === period.interval;
              return (
                <button
                  key={period.interval}
                  type="button"
                  onClick={() => setSelectedInterval(period.interval)}
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-950 text-white shadow-sm font-semibold'
                      : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
                  }`}
                >
                  <span>{period.label}</span>
                  {period.savingsBadge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-emerald-400 text-neutral-950'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {period.savingsBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Interval Note */}
          <p className="text-xs text-neutral-500 font-mono text-center">
            {currentBillingConfig.discountNotice}
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or connectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 bg-white pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:border-neutral-900 focus-visible:ring-[3px] focus-visible:ring-neutral-400/30"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="mt-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-neutral-300 rounded-lg bg-white p-8">
              <SlidersHorizontal className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-neutral-900">No matching products found</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Try clearing your search query or switching category filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-neutral-900 font-medium underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  billingConfig={currentBillingConfig}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        billingConfig={currentBillingConfig}
      />
    </section>
  );
}
