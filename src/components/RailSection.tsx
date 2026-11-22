import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { GARMENT_SIZES, type GarmentSize } from '../types/hale';
import { ResilientImage } from './ResilientImage';
import { EDITORIAL_ASSETS } from '../data/catalog';

gsap.registerPlugin(ScrollTrigger);

type ViewSurface = 'front' | 'model' | 'flat';

export const RailSection: React.FC = () => {
  const { products, cms, activeRailIndex, setActiveRailIndex, addToBag } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const railStageRef = useRef<HTMLDivElement>(null);

  const [selectedSize, setSelectedSize] = useState<GarmentSize>('M');
  const [lifted, setLifted] = useState<boolean>(false);
  const [surface, setSurface] = useState<ViewSurface>('front');
  const [manualLockUntil, setManualLockUntil] = useState<number>(0);

  const total = products.length;
  const safeIndex = Math.min(Math.max(activeRailIndex, 0), Math.max(total - 1, 0));
  const activeProduct = products[safeIndex];

  // Auto-select first in-stock size if current size is out of stock on garment change
  useEffect(() => {
    if (!activeProduct) return;
    if ((activeProduct.inventory[selectedSize] ?? 0) <= 0) {
      const firstAvailable = GARMENT_SIZES.find((sz) => (activeProduct.inventory[sz] ?? 0) > 0);
      if (firstAvailable) {
        setSelectedSize(firstAvailable);
      }
    }
  }, [activeProduct, selectedSize]);

  // GSAP ScrollTrigger scrubs garments along the 3D hanger rail on scroll
  useEffect(() => {
    if (!sectionRef.current || total <= 1) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=55%',
        scrub: 0.4,
        onUpdate: (self) => {
          if (Date.now() < manualLockUntil) return;
          const idx = Math.min(total - 1, Math.floor(self.progress * total));
          setActiveRailIndex(idx);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [total, manualLockUntil, setActiveRailIndex]);

  const selectIndex = (idx: number) => {
    const clamped = (idx + total) % total;
    setManualLockUntil(Date.now() + 1800);
    setActiveRailIndex(clamped);
  };

  // Brush past hangers with horizontal pointer tracking across the rack
  const handleRailMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!railStageRef.current || total <= 1 || lifted) return;
    const rect = railStageRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    if (relX < 0.08 || relX > 0.92) return;
    const normalized = (relX - 0.08) / 0.84;
    const nextIdx = Math.min(total - 1, Math.max(0, Math.round(normalized * (total - 1))));
    if (nextIdx !== safeIndex) {
      setManualLockUntil(Date.now() + 1600);
      setActiveRailIndex(nextIdx);
    }
  };

  // Keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectIndex(safeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectIndex(safeIndex - 1);
    }
  };

  if (!activeProduct) {
    return null;
  }

  const currentStock = activeProduct.inventory[selectedSize] ?? 0;
  const totalPieceStock = GARMENT_SIZES.reduce(
    (sum, sz) => sum + (activeProduct.inventory[sz] ?? 0),
    0
  );

  const formattedIndex = String(safeIndex + 1).padStart(2, '0');
  const formattedTotal = String(total).padStart(2, '0');

  return (
    <section
      id="rail"
      ref={sectionRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="The Autumn Rail 3D Garment Showcase"
      className="relative w-full bg-[#F7F5F0] border-b border-[#141413]/10 outline-none"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-8 pb-16 md:pt-12 md:pb-24">
        {/* Editorial Intro Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#141413]/10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-xs tracking-wide text-[#6B6860] mb-3">
              <span>{cms.seasonLabel}</span>
              <span aria-hidden="true">/</span>
              <span className="font-mono tabular-nums">
                {formattedTotal} numbered pieces
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.75rem] font-normal leading-[1.06] tracking-[-0.02em] text-[#141413] [text-wrap:balance]">
              {cms.railTitle}
            </h1>
          </div>
          <p className="text-sm md:text-[15px] leading-relaxed text-[#5B5850] max-w-md">
            {cms.railSubtitle}
          </p>
        </div>

        {/* Main 2-Column 3D Rack + Inspection Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-8 lg:pt-12 items-stretch">
          {/* LEFT: CSS 3D Perspective Hanger Bar & Hanging Garments */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#6B6860] mb-4">
              <span className="font-mono tabular-nums text-[#141413] font-medium">
                {formattedIndex} / {formattedTotal}
              </span>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-[#6B6860]">
                  Scroll, brush rail, or use arrow keys
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectIndex(safeIndex - 1)}
                    aria-label="Previous garment on rail"
                    className="w-10 h-10 flex items-center justify-center border border-[#141413]/15 hover:border-[#141413] text-[#141413] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectIndex(safeIndex + 1)}
                    aria-label="Next garment on rail"
                    className="w-10 h-10 flex items-center justify-center border border-[#141413]/15 hover:border-[#141413] text-[#141413] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Perspective Rack Stage */}
            <div
              ref={railStageRef}
              onMouseMove={handleRailMouseMove}
              className="hale-rail-stage relative h-[460px] sm:h-[540px] lg:h-[600px] w-full bg-[#EFECE5] border border-[#141413]/10 overflow-hidden select-none"
            >
              {/* Architectural Studio Wall Gradient & Floor Shadow */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.65) 0%, rgba(239,236,229,0.2) 55%, rgba(218,213,203,0.45) 100%)',
                }}
              />

              {/* Continuous Brushed Steel Hanger Bar & End Brackets */}
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 top-[68px] z-20 pointer-events-none"
              >
                {/* Left stanchion */}
                <div className="absolute left-5 sm:left-8 -top-12 w-[3px] h-[480px] bg-gradient-to-b from-[#3A3834] via-[#5E5B53] to-transparent opacity-40" />
                {/* Right stanchion */}
                <div className="absolute right-5 sm:right-8 -top-12 w-[3px] h-[480px] bg-gradient-to-b from-[#3A3834] via-[#5E5B53] to-transparent opacity-40" />
                {/* Horizontal hanger rail rod */}
                <div className="mx-5 sm:mx-8 h-[7px] rounded-full bg-gradient-to-b from-[#8A867C] via-[#4A4741] to-[#23221F] shadow-[0_6px_14px_rgba(20,20,19,0.2)]" />
              </div>

              {/* 3D Hanging Garments Along the Rail */}
              <div className="hale-rail-preserve relative w-full h-full flex items-start justify-center pt-[64px]">
                {products.map((item, idx) => {
                  const offset = idx - safeIndex;
                  const absOffset = Math.abs(offset);
                  const isActive = offset === 0;

                  // Position garments along the rail running into depth
                  const translateX = offset * 124;
                  const translateZ = isActive ? (lifted ? 115 : 70) : -absOffset * 72;
                  const translateY = isActive ? (lifted ? -18 : 4) : absOffset * 3;
                  const rotateY = isActive
                    ? lifted && surface === 'flat'
                      ? 180
                      : 0
                    : offset < 0
                    ? 46
                    : -46;
                  const opacity = absOffset > 3 ? 0 : Math.max(0.32, 1 - absOffset * 0.22);
                  const zIndex = 30 - absOffset;

                  const activeVisualSrc =
                    isActive && lifted && surface === 'model'
                      ? item.modelImage
                      : isActive && lifted && surface === 'flat'
                      ? item.flatImage
                      : item.frontImage;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setLifted((prev) => !prev);
                        } else {
                          setLifted(false);
                          setSurface('front');
                          selectIndex(idx);
                        }
                      }}
                      aria-label={`${String(idx + 1).padStart(2, '0')} ${item.name} ${item.colorVariant}`}
                      style={{
                        transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg)`,
                        opacity,
                        zIndex,
                        transition:
                          'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease',
                      }}
                      className="absolute top-[56px] w-[230px] sm:w-[270px] lg:w-[295px] origin-top cursor-pointer focus-visible:outline-none group"
                    >
                      {/* Steel Hanger Hook Connecting Garment to the Rail Rod */}
                      <div className="relative flex flex-col items-center">
                        <div
                          aria-hidden="true"
                          className={`w-5 h-5 rounded-t-full border-t-[3px] border-l-[3px] border-r-[3px] border-[#3E3C37] transition-transform duration-300 ${
                            isActive && lifted ? '-translate-y-2 opacity-40' : 'translate-y-0'
                          }`}
                        />
                        {/* Garment Frame Hanging Below the Hook */}
                        <div
                          className={`w-full aspect-[3/4] overflow-hidden border transition-shadow duration-300 bg-[#ECE8DF] ${
                            isActive
                              ? 'border-[#141413]/25 shadow-[0_24px_48px_-14px_rgba(20,20,19,0.28)]'
                              : 'border-[#141413]/10 shadow-[0_12px_24px_-10px_rgba(20,20,19,0.14)] group-hover:border-[#141413]/30'
                          }`}
                        >
                          {/* Note: counter-rotate inner image if 180deg flipped so flat cloth reads cleanly */}
                          <div
                            className="w-full h-full relative"
                            style={{
                              transform:
                                isActive && lifted && surface === 'flat'
                                  ? 'rotateY(180deg)'
                                  : 'none',
                            }}
                          >
                            {isActive &&
                            lifted &&
                            surface === 'model' &&
                            item.modelOverlayMode === 'composite' ? (
                              <div className="relative w-full h-full bg-[#E8E3D9] overflow-hidden">
                                <ResilientImage
                                  src={EDITORIAL_ASSETS.dummyBase}
                                  alt="Tailor dummy statue base trousers and shoes"
                                  className="w-full h-full object-cover object-top"
                                />
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 top-[11%] w-[46%] h-[36%] overflow-hidden pointer-events-none"
                                  style={{
                                    borderRadius: '38% 38% 14% 14% / 22% 22% 10% 10%',
                                    maskImage:
                                      'radial-gradient(ellipse 92% 94% at 50% 48%, black 74%, transparent 100%)',
                                    WebkitMaskImage:
                                      'radial-gradient(ellipse 92% 94% at 50% 48%, black 74%, transparent 100%)',
                                  }}
                                >
                                  <ResilientImage
                                    src={item.frontImage}
                                    alt={`${item.name} ${item.colorVariant} fitted onto dummy`}
                                    className="w-full h-full object-cover object-[50%_30%] scale-[1.28]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <ResilientImage
                                src={activeVisualSrc}
                                alt={`${item.name} ${item.colorVariant}`}
                                fallbackLabel={`${item.name} ${item.colorVariant}`}
                                swatchHex={item.swatchHex}
                                className={`w-full h-full object-cover ${
                                  isActive && lifted && surface === 'model'
                                    ? 'object-top'
                                    : 'object-center'
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Subtle hanging label under active garment */}
                        <div
                          className={`mt-3 text-center transition-opacity duration-300 ${
                            isActive ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <span className="text-xs font-mono tabular-nums text-[#5B5850]">
                            {lifted ? 'Lifted off rail · Click to hang back' : 'Tap piece to lift off rail'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Piece Selector Strip Inside Rack */}
              <div className="absolute bottom-4 inset-x-4 sm:inset-x-6 z-40 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                {products.map((item, idx) => {
                  const isCurrent = idx === safeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLifted(false);
                        setSurface('front');
                        selectIndex(idx);
                      }}
                      className={`px-2.5 py-1.5 text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#141413] text-[#F7F5F0]'
                          : 'bg-[#F7F5F0]/85 text-[#5B5850] hover:bg-[#141413]/10 hover:text-[#141413]'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Garment Details, View Toggle (Hanger / On Model / Flat), Size & Inventory, Add to Bag */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#FAF9F6] border border-[#141413]/10 p-6 sm:p-8 lg:p-10">
            <div>
              {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
              <div className="flex items-center justify-between text-xs text-[#6B6860] pb-5 border-b border-[#141413]/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-[#141413]">{activeProduct.sku}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProduct.category}</span>
                </div>
                <span className="font-mono tabular-nums">
                  {totalPieceStock > 0 ? `${totalPieceStock} in studio` : 'Sold out'}
                </span>
              </div>

              {/* Garment Title & Price */}
              <div className="pt-6 pb-5 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#141413] leading-tight">
                    {activeProduct.name}
                  </h2>
                  <p className="font-serif italic text-xl text-[#5B5850] mt-0.5">
                    {activeProduct.colorVariant}
                  </p>
                </div>
                <span className="font-mono text-xl sm:text-2xl text-[#141413] tabular-nums shrink-0">
                  ${activeProduct.price}
                </span>
              </div>

              {/* View Mode Switcher (Front on Hanger / Worn on Model / Cloth Detail) */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1 p-1 bg-[#ECE8DF] border border-[#141413]/10">
                  <button
                    type="button"
                    onClick={() => {
                      setLifted(true);
                      setSurface('front');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      surface === 'front'
                        ? 'bg-[#FAF9F6] text-[#141413] shadow-xs'
                        : 'text-[#5B5850] hover:text-[#141413]'
                    }`}
                  >
                    On Hanger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLifted(true);
                      setSurface('model');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      surface === 'model'
                        ? 'bg-[#FAF9F6] text-[#141413] shadow-xs'
                        : 'text-[#5B5850] hover:text-[#141413]'
                    }`}
                  >
                    On Dummy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLifted(true);
                      setSurface('flat');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                      surface === 'flat'
                        ? 'bg-[#FAF9F6] text-[#141413] shadow-xs'
                        : 'text-[#5B5850] hover:text-[#141413]'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    Turn Piece
                  </button>
                </div>
              </div>

              {/* Editorial Description */}
              <p className="text-sm sm:text-[15px] leading-relaxed text-[#46443E] pb-6 border-b border-[#141413]/10">
                {activeProduct.description}
              </p>

              {/* Structured Spec List */}
              <dl className="divide-y divide-[#141413]/10 text-sm mb-6">
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6860] shrink-0">Material</dt>
                  <dd className="text-[#141413] text-right">{activeProduct.material}</dd>
                </div>
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6860] shrink-0">Fit</dt>
                  <dd className="text-[#141413] text-right">{activeProduct.fit}</dd>
                </div>
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-[#6B6860] shrink-0">Sizes</dt>
                  <dd className="font-mono text-xs text-[#141413] text-right">
                    {activeProduct.sizes.join(' / ')}
                  </dd>
                </div>
              </dl>

              {/* Size Picker with Real-Time CMS Inventory */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs mb-2.5">
                  <span className="text-[#5B5850]">Select size</span>
                  <span className="font-mono tabular-nums text-[#6B6860]">
                    {currentStock > 0 ? `${currentStock} remaining in ${selectedSize}` : `Out of stock in ${selectedSize}`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {GARMENT_SIZES.map((sz) => {
                    const qty = activeProduct.inventory[sz] ?? 0;
                    const isSelected = selectedSize === sz;
                    const outOfStock = qty <= 0;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => setSelectedSize(sz)}
                        className={`h-11 text-xs font-mono tabular-nums border transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-[#141413] text-[#F7F5F0] border-[#141413]'
                            : outOfStock
                            ? 'bg-transparent text-[#A8A49B] border-[#141413]/10 line-through'
                            : 'bg-transparent text-[#141413] border-[#141413]/20 hover:border-[#141413]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="pt-2">
              <button
                type="button"
                disabled={currentStock <= 0}
                onClick={() => addToBag(activeProduct, selectedSize, true)}
                className="w-full py-3.5 px-6 bg-[#141413] text-[#F7F5F0] text-sm font-medium tracking-wide hover:bg-[#2B2A27] disabled:bg-[#B8B4AA] disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {currentStock > 0
                  ? `Add to bag — $${activeProduct.price}`
                  : 'Currently out of stock'}
              </button>
              <p className="text-xs text-[#6B6860] text-center mt-3">
                Complimentary shipping over ${cms.freeShippingThreshold} · 30-day studio returns
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
