import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../context/StoreContext';
import { EDITORIAL_ASSETS, EDITORIAL_MOMENTS, STUDIO_PROMISES } from '../data/catalog';
import { GARMENT_SIZES, type GarmentSize } from '../types/hale';
import { ResilientImage } from './ResilientImage';

gsap.registerPlugin(ScrollTrigger);

export const EditorialSections: React.FC = () => {
  const { products, cms, addToBag, jumpToCategoryOrProduct } = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const bannerImgRef = useRef<HTMLDivElement>(null);
  const halePortalRef = useRef<HTMLDivElement>(null);
  const stripTrackRef = useRef<HTMLDivElement>(null);

  const featuredLookProduct =
    products.find((p) => p.id === cms.lookbookFeaturedProductId) ??
    products.find((p) => p.id === 'hale-04') ??
    products[0];

  const [lookSize, setLookSize] = useState<GarmentSize>('M');

  useEffect(() => {
    if (!rootRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (bannerImgRef.current) {
        gsap.fromTo(
          bannerImgRef.current,
          { scale: 1.08, yPercent: -4 },
          {
            scale: 1,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: bannerImgRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }

      if (halePortalRef.current) {
        gsap.fromTo(
          halePortalRef.current,
          { scale: 0.94, opacity: 0.85 },
          {
            scale: 1.04,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: halePortalRef.current,
              start: 'top 85%',
              end: 'bottom 30%',
              scrub: true,
            },
          }
        );
      }

      if (stripTrackRef.current) {
        gsap.fromTo(
          stripTrackRef.current,
          { xPercent: 0 },
          {
            xPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: stripTrackRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const lookStock = featuredLookProduct ? featuredLookProduct.inventory[lookSize] ?? 0 : 0;

  return (
    <div ref={rootRef}>
      {/* 3. OUT THE DOOR — Full-bleed street banner */}
      <section className="relative w-full h-[64vh] min-h-[460px] max-h-[720px] overflow-hidden bg-[#1D1C1A] border-b border-[#141413]/10">
        <div ref={bannerImgRef} className="absolute inset-0 w-full h-full will-change-transform">
          <ResilientImage
            src={EDITORIAL_ASSETS.bannerMorning}
            alt="Man walking down a quiet stone European street at eight in the morning wearing an espresso wool overcoat"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#141413]/80 via-[#141413]/35 to-[#141413]/20"
        />
        <div className="relative z-10 max-w-[1440px] mx-auto h-full px-6 md:px-10 py-12 md:py-16 flex flex-col justify-end">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-[#F7F5F0]/80 mb-3">08:00 · Porto</p>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-[3.75rem] font-normal leading-[1.05] text-[#F7F5F0] [text-wrap:balance]">
              {cms.outDoorHeadline}
            </h2>
            <p className="text-sm sm:text-base text-[#F7F5F0]/85 mt-4 max-w-lg leading-relaxed">
              {cms.outDoorSubline}
            </p>
          </div>
        </div>
      </section>

      {/* 4. LOOKBOOK (#lookbook) */}
      <section id="lookbook" className="w-full bg-[#F7F5F0] border-b border-[#141413]/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            {/* Editorial Portrait */}
            <div className="lg:col-span-6">
              <div className="h-full min-h-[480px] max-h-[720px] bg-[#E8E3D9] border border-[#141413]/10 overflow-hidden">
                <ResilientImage
                  src={EDITORIAL_ASSETS.lookbookCourtyard}
                  alt="Lookbook 01 — Chore Jacket in Olive worn over heavyweight ecru tee and pleated charcoal wool trousers"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Lookbook Copy & Shop the Look */}
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <p className="text-xs font-mono text-[#6B6860] mb-4">{cms.lookbookKicker}</p>
                <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#141413] leading-[1.08] [text-wrap:balance]">
                  {cms.lookbookTitle}
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-[#46443E] mt-6 max-w-xl">
                  {cms.lookbookBody}
                </p>

                {/* Outfit Breakdown */}
                <div className="mt-10 border-t border-[#141413]/10 divide-y divide-[#141413]/10 text-sm">
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-[#6B6860]">Outer layer</span>
                    <button
                      type="button"
                      onClick={() =>
                        featuredLookProduct &&
                        jumpToCategoryOrProduct({ productId: featuredLookProduct.id })
                      }
                      className="text-[#141413] underline underline-offset-4 decoration-[#141413]/30 hover:decoration-[#141413] cursor-pointer"
                    >
                      {featuredLookProduct
                        ? `${featuredLookProduct.name} ${featuredLookProduct.colorVariant}`
                        : 'Chore Jacket in Olive'}
                    </button>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-[#6B6860]">Base layer</span>
                    <span className="text-[#141413]">Heavyweight 280gsm Studio Tee in Ecru</span>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-[#6B6860]">Trousers</span>
                    <span className="text-[#141413]">Single-Pleat Barathea Wool in Charcoal</span>
                  </div>
                </div>
              </div>

              {/* Shop the Look Action */}
              {featuredLookProduct && (
                <div className="mt-10 pt-6 border-t border-[#141413]/10">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-serif text-xl text-[#141413]">
                        {featuredLookProduct.name}{' '}
                        <span className="italic">{featuredLookProduct.colorVariant}</span>
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#6B6860] mt-0.5">
                        ${featuredLookProduct.price} · {lookStock > 0 ? `${lookStock} in stock (${lookSize})` : `Out of stock (${lookSize})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {GARMENT_SIZES.map((sz) => {
                        const qty = featuredLookProduct.inventory[sz] ?? 0;
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => setLookSize(sz)}
                            className={`w-9 h-9 text-xs font-mono tabular-nums border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              lookSize === sz
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
                  </div>
                  <button
                    type="button"
                    disabled={lookStock <= 0}
                    onClick={() => addToBag(featuredLookProduct, lookSize, true)}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] disabled:bg-[#B8B4AA] transition-colors cursor-pointer"
                  >
                    {lookStock > 0
                      ? `Shop the look — $${featuredLookProduct.price}`
                      : 'Selected size out of stock'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. THE WORKSHOP (#studio) */}
      <section id="studio" className="w-full bg-[#141413] text-[#F7F5F0] border-b border-[#F7F5F0]/10 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Fall-through typographic portal into the Porto Workshop */}
          <div
            ref={halePortalRef}
            className="pb-12 md:pb-16 border-b border-[#F7F5F0]/15 flex flex-col md:flex-row md:items-end justify-between gap-6 will-change-transform"
          >
            <div>
              <p className="text-xs font-mono text-[#F7F5F0]/65 mb-3">
                Cedofeita, Porto · The Workshop
              </p>
              <div className="font-serif text-6xl sm:text-8xl lg:text-[7.5rem] leading-[0.88] tracking-[0.12em] font-normal text-[#F7F5F0]">
                HALE
              </div>
            </div>
            <p className="text-sm text-[#F7F5F0]/75 max-w-sm leading-relaxed">
              Pattern drafting, dry-wax proofing, and lifetime garment mending under one roof.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#F7F5F0] leading-[1.08] [text-wrap:balance]">
                  {cms.studioTitle}
                </h2>
                <p className="text-sm sm:text-base text-[#F7F5F0]/80 leading-relaxed mt-6">
                  {cms.studioBody}
                </p>
              </div>

              <dl className="mt-10 divide-y divide-[#F7F5F0]/15 border-t border-[#F7F5F0]/15 text-sm">
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="text-[#F7F5F0]/60">Pattern room</dt>
                  <dd className="text-[#F7F5F0]">{cms.studioAddress}</dd>
                </div>
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="text-[#F7F5F0]/60">Batch size</dt>
                  <dd className="font-mono tabular-nums text-[#F7F5F0]">40 – 60 pieces per cloth</dd>
                </div>
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="text-[#F7F5F0]/60">Visiting hours</dt>
                  <dd className="text-[#F7F5F0]">
                    {cms.studioDays}, {cms.studioHours}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-7">
              <div className="h-full min-h-[340px] sm:min-h-[440px] border border-[#F7F5F0]/15 overflow-hidden bg-[#1E1D1B]">
                <ResilientImage
                  src={EDITORIAL_ASSETS.workshopTable}
                  alt="Porto workshop cutting table with brass tailor shears, virgin wool bolts, and kraft garment patterns"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OUT IN IT — 5-Frame Editorial Strip */}
      <section className="w-full bg-[#F7F5F0] border-b border-[#141413]/10 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 border-b border-[#141413]/10">
            <div>
              <p className="text-xs text-[#6B6860] mb-2">Out in it</p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#141413] [text-wrap:balance]">
                {cms.outInItTitle}
              </h2>
            </div>
            <p className="text-xs font-mono text-[#6B6860]">01 — 05 Field Notes</p>
          </div>

          <div
            ref={stripTrackRef}
            className="pt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 will-change-transform"
          >
            {EDITORIAL_MOMENTS.map((moment) => (
              <article key={moment.id} className="flex flex-col">
                <div className="aspect-[3/4] bg-[#ECE8DF] border border-[#141413]/10 overflow-hidden mb-4">
                  <ResilientImage
                    src={moment.image}
                    alt={moment.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-[1.03]"
                  />
                </div>
                <h3 className="font-serif text-xl text-[#141413]">{moment.title}</h3>
                <p className="text-xs sm:text-sm text-[#5B5850] mt-1.5 leading-relaxed">
                  {moment.caption}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. OUR PROMISES — 3-Column Architectural Grid */}
      <section className="w-full bg-[#EFECE5] border-b border-[#141413]/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <p className="text-xs text-[#6B6860] mb-8">Our promises</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {STUDIO_PROMISES.map((promise) => (
              <div
                key={promise.number}
                className="pt-6 border-t border-[#141413]/20 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs tabular-nums text-[#6B6860]">
                    {promise.number}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-[#141413] mt-2">
                    {promise.number} {promise.title}
                  </h3>
                  <p className="text-sm text-[#46443E] leading-relaxed mt-3">{promise.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
