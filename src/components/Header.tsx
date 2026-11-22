import React from 'react';
import { useStore } from '../context/StoreContext';

export const Header: React.FC = () => {
  const { itemCount, openBag, viewMode, setViewMode } = useStore();

  const handleNavClick = (sectionId: string) => {
    if (viewMode !== 'store') {
      setViewMode('store');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#141413]/10">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#rail"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('rail');
          }}
          className="font-serif text-2xl font-medium tracking-[0.16em] text-[#141413] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
        >
          HALE
        </a>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="flex items-center gap-6 md:gap-8 text-sm text-[#5B5850]">
          <a
            href="#rail"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('rail');
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#141413] border-b ${
              viewMode === 'store'
                ? 'border-transparent hover:border-[#141413]/40'
                : 'border-transparent hover:border-[#141413]/40'
            }`}
          >
            Rail
          </a>
          <a
            href="#lookbook"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('lookbook');
            }}
            className="hidden sm:inline-block whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#141413] border-b border-transparent hover:border-[#141413]/40"
          >
            Lookbook
          </a>
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('studio');
            }}
            className="hidden sm:inline-block whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#141413] border-b border-transparent hover:border-[#141413]/40"
          >
            Studio
          </a>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'admin' ? 'store' : 'admin')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b cursor-pointer ${
              viewMode === 'admin'
                ? 'text-[#141413] font-medium border-[#141413]'
                : 'text-[#5B5850] border-transparent hover:text-[#141413] hover:border-[#141413]/40'
            }`}
          >
            {viewMode === 'admin' ? 'Storefront' : 'Admin'}
          </button>
        </nav>

        {/* Zone 3: Single Primary Action (Bag Trigger) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={openBag}
            aria-label={`Open shopping bag, ${itemCount} items`}
            className="px-4 py-2 text-sm font-medium text-[#141413] border border-[#141413]/20 hover:border-[#141413] hover:bg-[#141413] hover:text-[#F7F5F0] transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
          >
            Bag ({itemCount})
          </button>
        </div>
      </div>
    </header>
  );
};
