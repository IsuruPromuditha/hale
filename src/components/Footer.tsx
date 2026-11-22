import React from 'react';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { products, cms, jumpToCategoryOrProduct, setViewMode } = useStore();
  const countStr = String(products.length).padStart(2, '0');

  const scrollToSection = (id: string) => {
    setViewMode('store');
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  };

  return (
    <footer className="w-full bg-[#F7F5F0] text-[#141413]">
      {/* Bottom Rail Banner */}
      <div className="border-b border-[#141413]/10 bg-[#FAF9F6]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-serif text-2xl sm:text-3xl text-[#141413]">
              That&apos;s the whole rail — {countStr} pieces
            </p>
            <p className="text-sm text-[#5B5850] mt-1">
              Brush past them · tap one to open it
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('rail')}
            className="px-5 py-2.5 border border-[#141413]/25 text-sm text-[#141413] hover:bg-[#141413] hover:text-[#F7F5F0] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Back to the rail
          </button>
        </div>
      </div>

      {/* 4-Column Navigation & Studio Info Grid */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-16 border-b border-[#141413]/10">
          {/* Column 1: Shop */}
          <div>
            <h3 className="text-xs font-mono text-[#6B6860] mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {(['Outerwear', 'Shirting', 'Knitwear', 'Jersey'] as const).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => jumpToCategoryOrProduct({ category: cat })}
                    className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Studio */}
          <div>
            <h3 className="text-xs font-mono text-[#6B6860] mb-4">Studio</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('studio')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('studio')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Workshops
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('lookbook')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Journal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('studio')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Stockists
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Help */}
          <div>
            <h3 className="text-xs font-mono text-[#6B6860] mb-4">Help</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('rail')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Shipping
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('studio')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Returns
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('studio')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  Repairs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setViewMode('admin')}
                  className="text-[#141413] hover:text-[#6B6860] transition-colors cursor-pointer"
                >
                  CMS Admin
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Visit */}
          <div>
            <h3 className="text-xs font-mono text-[#6B6860] mb-4">Visit</h3>
            <div className="space-y-1.5 text-sm text-[#141413]">
              <p>{cms.studioAddress}</p>
              <p className="text-[#5B5850]">{cms.studioDays}</p>
              <p className="font-mono text-xs text-[#5B5850]">{cms.studioHours}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#141413]">
              <a
                href="#lookbook"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('lookbook');
                }}
                className="hover:text-[#6B6860] transition-colors"
              >
                Instagram ↗
              </a>
              <a
                href="#lookbook"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('lookbook');
                }}
                className="hover:text-[#6B6860] transition-colors"
              >
                Pinterest ↗
              </a>
              <a
                href="#studio"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('studio');
                }}
                className="hover:text-[#6B6860] transition-colors"
              >
                Journal ↗
              </a>
            </div>
          </div>
        </div>

        {/* Monumental Wordmark & Copyright */}
        <div className="pt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="font-serif text-6xl sm:text-8xl tracking-[0.14em] leading-none font-normal text-[#141413] select-none">
            HALE
          </div>
          <p className="text-xs text-[#6B6860] max-w-md sm:text-right">
            © 2026 HALE Studio — Demo storefront with Headless CMS &amp; phpMyAdmin/MySQL inventory catalog.
          </p>
        </div>
      </div>
    </footer>
  );
};
