import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { OrderRecord } from '../types/hale';
import { ResilientImage } from './ResilientImage';

export const BagDrawer: React.FC = () => {
  const {
    bagItems,
    isBagOpen,
    closeBag,
    updateBagQuantity,
    removeFromBag,
    clearBag,
    refreshCatalog,
    subtotal,
    cms,
    amountToFreeShipping,
    freeShippingUnlocked,
    shippingProgress,
  } = useStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBagOpen) {
        closeBag();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBagOpen, closeBag]);

  if (!isBagOpen) return null;

  const threshold = cms.freeShippingThreshold || 250;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          shippingAddress,
          items: bagItems.map((b) => ({
            productId: b.productId,
            size: b.size,
            quantity: b.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { order?: OrderRecord; error?: string };
      if (!res.ok || !data.order) {
        setErrorMsg(data.error || 'Unable to place order. Please review your bag.');
        return;
      }
      setConfirmedOrder(data.order);
      clearBag();
      setCheckoutOpen(false);
      await refreshCatalog();
    } catch {
      setErrorMsg('Network error placing order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hale-bag-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#141413]/45 backdrop-blur-[2px] transition-opacity"
        onClick={closeBag}
      />

      {/* Slide-Over Panel */}
      <div className="relative z-10 w-full max-w-md h-full bg-[#FAF9F6] text-[#141413] border-l border-[#141413]/15 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#141413]/10 flex items-center justify-between">
          <h2 id="hale-bag-title" className="font-serif text-2xl font-normal text-[#141413]">
            Your bag
          </h2>
          <button
            type="button"
            onClick={closeBag}
            aria-label="Close bag"
            className="w-10 h-10 flex items-center justify-center text-[#5B5850] hover:text-[#141413] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Threshold Progress Bar */}
        <div className="px-6 py-3.5 bg-[#EFECE5] border-b border-[#141413]/10">
          <div className="flex items-center justify-between text-xs text-[#46443E] mb-2">
            <span>
              {freeShippingUnlocked
                ? 'Complimentary studio shipping unlocked'
                : bagItems.length === 0
                ? `Complimentary shipping from $${threshold}`
                : `$${amountToFreeShipping} away from complimentary shipping ($${threshold})`}
            </span>
            <span className="font-mono tabular-nums text-[#6B6860]">{shippingProgress}%</span>
          </div>
          <div className="w-full h-1 bg-[#141413]/10 overflow-hidden">
            <div
              className="h-full bg-[#141413] transition-all duration-300"
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {confirmedOrder ? (
            <div className="py-6 space-y-5">
              <div className="flex items-center gap-3 text-[#141413]">
                <div className="w-9 h-9 bg-[#141413] text-[#F7F5F0] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-mono text-[#6B6860]">Order Confirmed</p>
                  <h3 className="font-serif text-2xl text-[#141413]">
                    {confirmedOrder.orderNumber} — Preparing Shipment
                  </h3>
                </div>
              </div>
              <p className="text-sm text-[#5B5850] leading-relaxed">
                Thank you, {confirmedOrder.customerName}. Your studio order has been recorded and inventory updated.
              </p>
              <div className="border-t border-b border-[#141413]/10 py-4 space-y-2.5 text-sm">
                {confirmedOrder.items.map((item, i) => (
                  <div key={`${item.productId}-${item.size}-${i}`} className="flex justify-between gap-4">
                    <span className="text-[#141413]">
                      {item.quantity} × {item.name} {item.colorVariant} ({item.size})
                    </span>
                    <span className="font-mono tabular-nums">
                      ${(item.unitPrice * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#141413]/10 flex justify-between font-medium">
                  <span>Total paid</span>
                  <span className="font-mono tabular-nums">${confirmedOrder.total.toFixed(0)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  closeBag();
                }}
                className="w-full py-3 bg-[#141413] text-[#F7F5F0] text-sm font-medium cursor-pointer"
              >
                Return to rail
              </button>
            </div>
          ) : bagItems.length === 0 ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-4">
              <p className="font-serif text-2xl text-[#141413]">
                Nothing here yet.
              </p>
              <p className="text-sm text-[#6B6860] mt-2">
                Take something off the rail.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <ul className="divide-y divide-[#141413]/10">
                {bagItems.map((item) => (
                  <li key={`${item.productId}-${item.size}`} className="py-5 first:pt-0 flex gap-4">
                    <div className="w-20 aspect-[3/4] bg-[#ECE8DF] border border-[#141413]/10 overflow-hidden shrink-0">
                      <ResilientImage
                        src={item.image}
                        alt={`${item.name} ${item.colorVariant}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-lg text-[#141413] leading-tight">
                            {item.name} <span className="italic">{item.colorVariant}</span>
                          </h3>
                          <span className="font-mono text-sm tabular-nums text-[#141413] shrink-0">
                            ${item.price * item.quantity}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#6B6860] mt-1">
                          Size {item.size} · {item.sku}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="inline-flex items-center border border-[#141413]/20">
                          <button
                            type="button"
                            onClick={() => updateBagQuantity(item.productId, item.size, -1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#EFECE5] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-mono tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateBagQuantity(item.productId, item.size, 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#EFECE5] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromBag(item.productId, item.size)}
                          aria-label={`Remove ${item.name}`}
                          className="text-xs text-[#6B6860] hover:text-[#141413] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {checkoutOpen && (
                <form
                  onSubmit={handleCheckoutSubmit}
                  className="pt-5 border-t border-[#141413]/15 space-y-3.5"
                >
                  <p className="text-xs font-mono text-[#6B6860]">Studio Order Details</p>
                  {errorMsg && (
                    <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 border border-[#FCA5A5]">
                      {errorMsg}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs text-[#5B5850] mb-1">Full name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Mateus Ferreira"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#141413]/20 focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5B5850] mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="mateus@example.com"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#141413]/20 focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5B5850] mb-1">Shipping address</label>
                    <textarea
                      required
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Rua de Cedofeita 218, Porto, Portugal"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-[#141413]/20 focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(false)}
                      className="px-4 py-2.5 text-xs border border-[#141413]/20 text-[#5B5850] hover:text-[#141413] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 px-4 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Confirming...' : `Confirm order — $${subtotal + (freeShippingUnlocked ? 0 : 18)}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {bagItems.length > 0 && !confirmedOrder && (
          <div className="px-6 py-5 bg-[#FAF9F6] border-t border-[#141413]/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[#5B5850]">Subtotal</span>
              <span className="font-mono text-xl tabular-nums text-[#141413]">${subtotal}</span>
            </div>
            <p className="text-xs text-[#6B6860]">
              Taxes and shipping worked out at checkout
            </p>
            {!checkoutOpen && (
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  setCheckoutOpen(true);
                }}
                className="w-full py-3.5 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] transition-colors cursor-pointer"
              >
                Proceed to checkout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
