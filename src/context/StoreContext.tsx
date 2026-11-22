import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CATALOG, DEFAULT_CMS } from '../data/catalog';
import type { BagItem, CmsContent, Garment, GarmentSize } from '../types/hale';

interface StoreContextValue {
  products: Garment[];
  cms: CmsContent;
  loading: boolean;
  bagItems: BagItem[];
  isBagOpen: boolean;
  activeRailIndex: number;
  viewMode: 'store' | 'admin';
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  setViewMode: (mode: 'store' | 'admin') => void;
  setActiveRailIndex: (index: number) => void;
  jumpToCategoryOrProduct: (target: { category?: string; productId?: string }) => void;
  openBag: () => void;
  closeBag: () => void;
  addToBag: (product: Garment, size: GarmentSize, openDrawer?: boolean) => void;
  updateBagQuantity: (productId: string, size: GarmentSize, delta: number) => void;
  removeFromBag: (productId: string, size: GarmentSize) => void;
  clearBag: () => void;
  refreshCatalog: () => Promise<void>;
  subtotal: number;
  itemCount: number;
  amountToFreeShipping: number;
  freeShippingUnlocked: boolean;
  shippingProgress: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Garment[]>(DEFAULT_CATALOG);
  const [cms, setCms] = useState<CmsContent>(DEFAULT_CMS);
  const [loading, setLoading] = useState<boolean>(true);
  const [bagItems, setBagItems] = useState<BagItem[]>([]);
  const [isBagOpen, setIsBagOpen] = useState<boolean>(false);
  const [activeRailIndex, setActiveRailIndex] = useState<number>(0);
  const [viewMode, setViewModeState] = useState<'store' | 'admin'>(() =>
    typeof window !== 'undefined' && window.location.hash === '#admin' ? 'admin' : 'store'
  );
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const setViewMode = useCallback((mode: 'store' | 'admin') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      if (mode === 'admin') {
        window.history.replaceState(null, '', '#admin');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        window.history.replaceState(null, '', '#rail');
      }
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (!res.ok) return;
      const data = (await res.json()) as { products?: Garment[]; cms?: CmsContent };
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
        setActiveRailIndex((prev) => Math.min(prev, data.products!.length - 1));
      }
      if (data.cms) {
        setCms({ ...DEFAULT_CMS, ...data.cms });
      }
    } catch {
      // Retain current catalog on transient fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const jumpToCategoryOrProduct = useCallback(
    (target: { category?: string; productId?: string }) => {
      setViewMode('store');
      let idx = -1;
      if (target.productId) {
        idx = products.findIndex((p) => p.id === target.productId);
      } else if (target.category) {
        idx = products.findIndex(
          (p) => p.category.toLowerCase() === target.category!.toLowerCase()
        );
      }
      if (idx >= 0) {
        setActiveRailIndex(idx);
      }
      setTimeout(() => {
        const railEl = document.getElementById('rail');
        railEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    },
    [products, setViewMode]
  );

  const addToBag = useCallback(
    (product: Garment, size: GarmentSize, openDrawer = true) => {
      const availableStock = product.inventory[size] ?? 0;
      if (availableStock <= 0) return;

      setBagItems((prev) => {
        const existingIdx = prev.findIndex(
          (item) => item.productId === product.id && item.size === size
        );
        if (existingIdx >= 0) {
          const currentQty = prev[existingIdx].quantity;
          if (currentQty >= availableStock) return prev;
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], quantity: currentQty + 1 };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            colorVariant: product.colorVariant,
            price: product.price,
            size,
            quantity: 1,
            image: product.frontImage,
          },
        ];
      });
      if (openDrawer) {
        setIsBagOpen(true);
      }
    },
    []
  );

  const updateBagQuantity = useCallback(
    (productId: string, size: GarmentSize, delta: number) => {
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? product.inventory[size] ?? 99 : 99;

      setBagItems((prev) =>
        prev
          .map((item) => {
            if (item.productId !== productId || item.size !== size) return item;
            const nextQty = Math.min(maxStock, item.quantity + delta);
            return { ...item, quantity: nextQty };
          })
          .filter((item) => item.quantity > 0)
      );
    },
    [products]
  );

  const removeFromBag = useCallback((productId: string, size: GarmentSize) => {
    setBagItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.size === size))
    );
  }, []);

  const clearBag = useCallback(() => {
    setBagItems([]);
  }, []);

  const subtotal = useMemo(
    () => bagItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [bagItems]
  );

  const itemCount = useMemo(
    () => bagItems.reduce((sum, item) => sum + item.quantity, 0),
    [bagItems]
  );

  const threshold = cms.freeShippingThreshold || 250;
  const amountToFreeShipping = Math.max(0, threshold - subtotal);
  const freeShippingUnlocked = subtotal >= threshold && subtotal > 0;
  const shippingProgress = Math.min(100, Math.round((subtotal / threshold) * 100));

  const value: StoreContextValue = {
    products,
    cms,
    loading,
    bagItems,
    isBagOpen,
    activeRailIndex,
    viewMode,
    adminToken,
    setAdminToken,
    setViewMode,
    setActiveRailIndex,
    jumpToCategoryOrProduct,
    openBag: () => setIsBagOpen(true),
    closeBag: () => setIsBagOpen(false),
    addToBag,
    updateBagQuantity,
    removeFromBag,
    clearBag,
    refreshCatalog,
    subtotal,
    itemCount,
    amountToFreeShipping,
    freeShippingUnlocked,
    shippingProgress,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
