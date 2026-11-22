import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { EDITORIAL_ASSETS } from '../data/catalog';
import { GARMENT_SIZES, type GarmentSize } from '../types/hale';
import { ResilientImage } from './ResilientImage';

gsap.registerPlugin(ScrollTrigger);

export const TryItOnSection: React.FC = () => {
  const { products, cms, addToBag } = useStore();
  const containerRef = useRef<HTMLElement>(null);
  const dummyFrameRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('M');
  const [viewMode, setViewMode] = useState<'dummy' | 'garment'>('dummy');
  const [manualLockUntil, setManualLockUntil] = useState<number>(0);

  const total = products.length;
  const safeIdx = Math.min(Math.max(activeIdx, 0), Math.max(total - 1, 0));
  const activePiece = products[safeIdx];

  useEffect(() => {
    if (!containerRef.current || total <= 1) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top 65%',
        end: 'bottom 35%',
        scrub: 0.35,
        onUpdate: (self) => {
          if (Date.now() < manualLockUntil) return;
          const next = Math.min(total - 1, Math.floor(self.progress * total));
          setActiveIdx(next);
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [total, manualLockUntil]);

  // Smoothly animate each garment settling onto the dummy statue on click/step
  useEffect(() => {
    if (!dummyFrameRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        dummyFrameRef.current,
        { opacity: 0.78, scale: 1.015 },
        { opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out', clearProps: 'transform' }
      );
    }, dummyFrameRef);

    return () => ctx.revert();
  }, [safeIdx, viewMode]);

  useEffect(() => {
    if (!activePiece) return;
    if ((activePiece.inventory[selectedSize] ?? 0) <= 0) {
      const avail = GARMENT_SIZES.find((sz) => (activePiece.inventory[sz] ?? 0) > 0);
      if (avail) setSelectedSize(avail);
    }
  }, [activePiece, selectedSize]);

  const selectPiece = (idx: number) => {
    const clamped = (idx + total) % total;
    setManualLockUntil(Date.now() + 2200);
    setActiveIdx(clamped);
    setViewMode('dummy');
  };

  if (!activePiece) return null;

  const stockInSize = activePiece.inventory[selectedSize] ?? 0;

  return (
    <section
      id="try-it-on"
      ref={containerRef}
      className="w-full bg-[#EFECE5] border-b border-[#141413]/10"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#141413]/10">
          <div>
            <p className="text-xs text-[#6B6860] mb-2">Studio Fitting Room</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#141413] [text-wrap:balance]">
              {cms.tryOnTitle}
            </h2>
          </div>
          <p className="text-sm md:text-[15px] leading-relaxed text-[#5B5850] max-w-md">
            {cms.tryOnSubtitle}
          </p>
        </div>

        {/* Interactive Tailor Dummy Fitting Stage + Synchronized 01-08 List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-10 items-stretch">
          {/* LEFT: Full-Height Sculptural Tailor Dummy Statue */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-[#141413] font-medium">
                  {String(safeIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </span>
                <span className="text-xs text-[#5B5850]">
                  Tailor Dummy · Size {selectedSize} Fit
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 bg-[#E4DFD4] border border-[#141413]/10">
                  <button
                    type="button"
                    onClick={() => setViewMode('dummy')}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      viewMode === 'dummy'
                        ? 'bg-[#FAF9F6] text-[#141413]'
                        : 'text-[#5B5850] hover:text-[#141413]'
                    }`}
                  >
                    On Dummy
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('garment')}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      viewMode === 'garment'
                        ? 'bg-[#FAF9F6] text-[#141413]'
                        : 'text-[#5B5850] hover:text-[#141413]'
                    }`}
                  >
                    On Hanger
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => selectPiece(safeIdx - 1)}
                  aria-label="Previous piece on dummy"
                  className="w-8 h-8 flex items-center justify-center border border-[#141413]/15 hover:border-[#141413] text-[#141413] bg-[#FAF9F6] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => selectPiece(safeIdx + 1)}
                  aria-label="Next piece on dummy"
                  className="w-8 h-8 flex items-center justify-center border border-[#141413]/15 hover:border-[#141413] text-[#141413] bg-[#FAF9F6] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-[540px] sm:min-h-[640px] bg-[#E8E3D9] border border-[#141413]/10 overflow-hidden">
              <div ref={dummyFrameRef} className="w-full h-full">
                {viewMode === 'garment' ? (
                  <ResilientImage
                    key={`garment-${activePiece.id}`}
                    src={activePiece.frontImage}
                    alt={`${activePiece.name} ${activePiece.colorVariant} on oak hanger`}
                    swatchHex={activePiece.swatchHex}
                    className="w-full h-full object-cover object-center"
                  />
                ) : activePiece.modelOverlayMode === 'native' ? (
                  <ResilientImage
                    key={`dummy-${activePiece.id}`}
                    src={activePiece.modelImage}
                    alt={`Tailor dummy statue wearing ${activePiece.name} ${activePiece.colorVariant} with charcoal pleated trousers`}
                    swatchHex={activePiece.swatchHex}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  /* Automatic Dummy Torso Fitting Fallback for newly created CMS garments */
                  <div className="relative w-full h-full overflow-hidden bg-[#E8E3D9]">
                    <ResilientImage
                      src={EDITORIAL_ASSETS.dummyBase}
                      alt="Base tailor dummy statue wearing charcoal pleated wool trousers"
                      className="w-full h-full object-cover object-top"
                    />
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-[11%] w-[46%] h-[36%] overflow-hidden pointer-events-none"
                      style={{
                        borderRadius: '38% 38% 14% 14% / 22% 22% 10% 10%',
                        boxShadow: '0 14px 28px rgba(20,20,19,0.22)',
                        maskImage:
                          'radial-gradient(ellipse 92% 94% at 50% 48%, black 74%, transparent 100%)',
                        WebkitMaskImage:
                          'radial-gradient(ellipse 92% 94% at 50% 48%, black 74%, transparent 100%)',
                      }}
                    >
                      <ResilientImage
                        key={`comp-${activePiece.id}`}
                        src={activePiece.frontImage}
                        alt={`${activePiece.name} ${activePiece.colorVariant} fitted onto dummy torso`}
                        swatchHex={activePiece.swatchHex}
                        className="w-full h-full object-cover object-[50%_30%] scale-[1.28]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Editorial Caption Scrim */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141413]/85 via-[#141413]/35 to-transparent p-6 text-[#F7F5F0] pointer-events-none">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono tabular-nums text-[#F7F5F0]/80">
                      Fitted on dummy · Piece {String(safeIdx + 1).padStart(2, '0')} · {activePiece.category}
                    </p>
                    <p className="font-serif text-2xl text-[#F7F5F0] mt-0.5">
                      {activePiece.name} <span className="italic">{activePiece.colorVariant}</span>
                    </p>
                  </div>
                  <span className="font-mono text-lg tabular-nums text-[#F7F5F0]">
                    ${activePiece.price}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Synchronized 01-08 Piece Selector & Quick Add Card */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs text-[#6B6860] mb-3">
                Click any piece below to automatically fit it onto the dummy statue
              </p>
              <div className="bg-[#FAF9F6] border border-[#141413]/10 divide-y divide-[#141413]/10">
                {products.map((piece, idx) => {
                  const isSelected = idx === safeIdx;
                  const pieceStock = GARMENT_SIZES.reduce(
                    (sum, sz) => sum + (piece.inventory[sz] ?? 0),
                    0
                  );
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => selectPiece(idx)}
                      className={`w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#141413] text-[#F7F5F0]'
                          : 'hover:bg-[#E4DFD4]/60 text-[#141413]'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className={`font-mono text-xs tabular-nums shrink-0 ${
                            isSelected ? 'text-[#F7F5F0]/70' : 'text-[#6B6860]'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: piece.swatchHex }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-sm truncate">
                          {piece.name}{' '}
                          <span
                            className={`font-serif italic font-normal ${
                              isSelected ? 'text-[#F7F5F0]/80' : 'text-[#5B5850]'
                            }`}
                          >
                            {piece.colorVariant}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-5 shrink-0">
                        <span
                          className={`hidden sm:inline font-mono text-xs tabular-nums ${
                            isSelected ? 'text-[#F7F5F0]/70' : 'text-[#6B6860]'
                          }`}
                        >
                          {pieceStock > 0 ? `${pieceStock} left` : 'Out'}
                        </span>
                        <span className="font-mono text-sm tabular-nums">${piece.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Piece Action Card */}
            <div className="bg-[#FAF9F6] border border-[#141413]/10 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#141413]/10">
                <div>
                  <span className="font-mono text-xs tabular-nums text-[#6B6860]">
                    {String(safeIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {activePiece.material}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-[#141413] mt-1">
                    {activePiece.name} <span className="italic">{activePiece.colorVariant}</span>
                  </h3>
                </div>
                <span className="font-mono text-xl tabular-nums text-[#141413]">
                  ${activePiece.price}
                </span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  {GARMENT_SIZES.map((sz) => {
                    const qty = activePiece.inventory[sz] ?? 0;
                    const active = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => setSelectedSize(sz)}
                        className={`w-10 h-10 text-xs font-mono tabular-nums border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                          active
                            ? 'bg-[#141413] text-[#F7F5F0] border-[#141413]'
                            : qty <= 0
                            ? 'text-[#B3AFA7] border-[#141413]/10 line-through'
                            : 'text-[#141413] border-[#141413]/20 hover:border-[#141413]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={stockInSize <= 0}
                  onClick={() => addToBag(activePiece, selectedSize, true)}
                  className="px-6 py-3 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] disabled:bg-[#B8B4AA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {stockInSize > 0 ? `Add ${selectedSize} to bag` : 'Out of stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
