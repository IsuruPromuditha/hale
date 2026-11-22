import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  Download,
  Edit3,
  FileText,
  Layers,
  Lock,
  LogOut,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  GARMENT_SIZES,
  type CmsContent,
  type DatabaseInfo,
  type Garment,
  type GarmentCategory,
  type InventoryMap,
  type OrderRecord,
  type OrderStatus,
} from '../types/hale';
import { ResilientImage } from './ResilientImage';

type AdminTab = 'overview' | 'products' | 'inventory' | 'cms' | 'orders' | 'database';

const CATEGORIES: GarmentCategory[] = ['Jersey', 'Shirting', 'Outerwear', 'Knitwear'];
const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

export const AdminDashboard: React.FC = () => {
  const { adminToken, setAdminToken, refreshCatalog, setViewMode } = useStore();

  const [authStatus, setAuthStatus] = useState<{
    loaded: boolean;
    envPasscodeSet: boolean;
    needsClaim: boolean;
  }>({ loaded: false, envPasscodeSet: false, needsClaim: false });

  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [products, setProducts] = useState<Garment[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cmsDraft, setCmsDraft] = useState<CmsContent | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & editing states
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'All' | GarmentCategory>('All');
  const [editingProduct, setEditingProduct] = useState<Partial<Garment> | null>(null);
  const [invDrafts, setInvDrafts] = useState<Record<string, InventoryMap>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth-status')
      .then((r) => r.json())
      .then((data: { envPasscodeSet: boolean; needsClaim: boolean }) => {
        setAuthStatus({
          loaded: true,
          envPasscodeSet: Boolean(data.envPasscodeSet),
          needsClaim: Boolean(data.needsClaim),
        });
      })
      .catch(() => {
        setAuthStatus({ loaded: true, envPasscodeSet: false, needsClaim: false });
      });
  }, []);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    }),
    [adminToken]
  );

  const loadAdminWorkspace = useCallback(async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      const [prodRes, cmsRes, ordRes, dbRes] = await Promise.all([
        fetch('/api/admin/products', { headers: authHeaders }),
        fetch('/api/cms'),
        fetch('/api/admin/orders', { headers: authHeaders }),
        fetch('/api/admin/database-info', { headers: authHeaders }),
      ]);

      if (prodRes.status === 401) {
        setAdminToken(null);
        return;
      }

      if (prodRes.ok) {
        const pData = (await prodRes.json()) as { products: Garment[] };
        setProducts(pData.products);
        const drafts: Record<string, InventoryMap> = {};
        for (const p of pData.products) {
          drafts[p.id] = { ...p.inventory };
        }
        setInvDrafts(drafts);
      }
      if (cmsRes.ok) {
        const cData = (await cmsRes.json()) as { cms: CmsContent };
        setCmsDraft(cData.cms);
      }
      if (ordRes.ok) {
        const oData = (await ordRes.json()) as { orders: OrderRecord[] };
        setOrders(oData.orders);
      }
      if (dbRes.ok) {
        const dData = (await dbRes.json()) as { info: DatabaseInfo };
        setDbInfo(dData.info);
      }
    } finally {
      setLoadingData(false);
    }
  }, [adminToken, authHeaders, setAdminToken]);

  useEffect(() => {
    if (adminToken) {
      void loadAdminWorkspace();
    }
  }, [adminToken, loadAdminWorkspace]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authStatus.needsClaim && passcodeInput !== confirmPasscode) {
      setAuthError('Passcodes do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const endpoint = authStatus.needsClaim ? '/api/admin/claim' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setAdminToken(data.token);
      setPasscodeInput('');
      setConfirmPasscode('');
      setAuthStatus((prev) => ({ ...prev, needsClaim: false }));
    } catch {
      setAuthError('Unable to reach server.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingId('product-form');
    try {
      const isExisting = Boolean(
        editingProduct.id && products.some((p) => p.id === editingProduct.id)
      );
      const url = isExisting
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = isExisting ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(editingProduct),
      });
      if (res.ok) {
        setEditingProduct(null);
        await loadAdminWorkspace();
        await refreshCatalog();
        showToast(isExisting ? 'Garment updated on the rail.' : 'New garment added to the rail.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        await loadAdminWorkspace();
        await refreshCatalog();
        showToast(`Removed ${name} from catalog.`);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveInventoryRow = async (productId: string) => {
    const draft = invDrafts[productId];
    if (!draft) return;
    setSavingId(productId);
    try {
      const res = await fetch(`/api/admin/inventory/${productId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ inventory: draft }),
      });
      if (res.ok) {
        await loadAdminWorkspace();
        await refreshCatalog();
        showToast('Inventory quantities updated.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmsDraft) return;
    setSavingId('cms');
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(cmsDraft),
      });
      if (res.ok) {
        await refreshCatalog();
        showToast('Editorial CMS copy published to storefront.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setSavingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadAdminWorkspace();
        showToast(`Order marked as ${status}.`);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadSql = async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/export-sql', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hale_phpmyadmin_export.sql';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded phpMyAdmin SQL export.');
  };

  // KPI Metrics
  const totalUnits = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + GARMENT_SIZES.reduce((s, sz) => s + (p.inventory[sz] ?? 0), 0),
        0
      ),
    [products]
  );

  const lowStockEntries = useMemo(() => {
    const entries: Array<{ product: Garment; size: string; qty: number }> = [];
    for (const p of products) {
      for (const sz of GARMENT_SIZES) {
        const qty = p.inventory[sz] ?? 0;
        if (qty <= 3) {
          entries.push({ product: p, size: sz, qty });
        }
      }
    }
    return entries;
  }, [products]);

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = catFilter === 'All' || p.category === catFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.colorVariant.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, catFilter, searchQuery]);

  // --- AUTHENTICATION GATE ---
  if (!adminToken) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#F7F5F0] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-[#FAF9F6] border border-[#141413]/15 p-8 sm:p-10">
          <div className="flex items-center gap-3 text-xs font-mono text-[#6B6860] mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>HALE Headless CMS &amp; Inventory</span>
          </div>
          <h1 className="font-serif text-3xl text-[#141413]">
            {authStatus.needsClaim ? 'Claim Studio Admin Access' : 'Studio Admin Sign In'}
          </h1>
          <p className="text-sm text-[#5B5850] mt-2 leading-relaxed">
            {authStatus.needsClaim
              ? 'First-run setup: set a studio passcode to manage the garment rail, size inventory, and phpMyAdmin database exports.'
              : 'Enter your studio passcode to unlock product publishing, inventory matrix updates, and order fulfillment.'}
          </p>

          {!authStatus.loaded ? (
            <p className="text-xs font-mono text-[#6B6860] mt-6">Checking studio configuration...</p>
          ) : (
            <form onSubmit={handleClaimOrLogin} className="mt-6 space-y-4">
              {authError && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] px-3 py-2">
                  {authError}
                </p>
              )}
              <div>
                <label className="block text-xs text-[#5B5850] mb-1.5">
                  {authStatus.needsClaim ? 'Choose admin passcode (min. 6 characters)' : 'Admin passcode'}
                </label>
                <input
                  type="password"
                  required
                  minLength={authStatus.needsClaim ? 6 : 1}
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#141413]/20 focus:outline-none focus:border-[#141413]"
                />
              </div>
              {authStatus.needsClaim && (
                <div>
                  <label className="block text-xs text-[#5B5850] mb-1.5">Confirm passcode</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter passcode"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#141413]/20 focus:outline-none focus:border-[#141413]"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {authSubmitting
                  ? 'Verifying...'
                  : authStatus.needsClaim
                  ? 'Set Passcode & Open CMS'
                  : 'Sign In to Studio CMS'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('store')}
                className="w-full py-2.5 text-xs text-[#6B6860] hover:text-[#141413] cursor-pointer"
              >
                Return to storefront
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // --- AUTHENTICATED ADMIN WORKSPACE ---
  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'products', label: 'Products & Rail', icon: <Package className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory Matrix', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'cms', label: 'Headless CMS', icon: <FileText className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'database', label: 'phpMyAdmin / SQL', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#F7F5F0] text-[#141413]">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-[#EFECE5] border-b lg:border-b-0 lg:border-r border-[#141413]/10 p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono text-[#6B6860] px-3 mb-3">Studio CMS</p>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#141413] text-[#F7F5F0] font-medium'
                        : 'text-[#46443E] hover:bg-[#141413]/5 hover:text-[#141413]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden lg:block pt-6 border-t border-[#141413]/10 space-y-2">
            <button
              type="button"
              onClick={() => setViewMode('store')}
              className="w-full px-3 py-2 text-left text-xs text-[#46443E] hover:text-[#141413] cursor-pointer"
            >
              View Live Storefront ↗
            </button>
            <button
              type="button"
              onClick={() => setAdminToken(null)}
              className="w-full px-3 py-2 flex items-center gap-2 text-xs text-[#6B6860] hover:text-[#141413] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <div className="flex-1 p-6 md:p-10 min-w-0">
          {/* Top Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#141413]/10">
            <div>
              <p className="text-xs font-mono text-[#6B6860]">
                HALE Studio / {navItems.find((n) => n.id === activeTab)?.label}
              </p>
              <h1 className="font-serif text-3xl text-[#141413] mt-1">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {notice && (
                <span className="text-xs bg-[#141413] text-[#F7F5F0] px-3 py-1.5">{notice}</span>
              )}
              {activeTab === 'products' && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingProduct({
                      sku: `HL-A26-${String(products.length + 1).padStart(2, '0')}`,
                      sortOrder: products.length + 1,
                      name: '',
                      colorVariant: 'in Slate',
                      category: 'Outerwear',
                      price: 180,
                      description: '',
                      material: '100% Organic Cotton',
                      fit: 'Relaxed tailored fit',
                      frontImage: '/src/assets/images/hale_overshirt_slate_1795355189702.jpg',
                      flatImage: '/src/assets/images/hale_coast_moment_1795355189749.jpg',
                      modelImage: '/src/assets/images/hale_overshirt_slate_1795355189702.jpg',
                      modelOverlayMode: 'composite',
                      swatchHex: '#5A5E63',
                      isPublished: true,
                      inventory: { XS: 2, S: 4, M: 6, L: 4, XL: 2 },
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#141413] text-[#F7F5F0] text-xs font-medium hover:bg-[#2B2A27] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Garment
                </button>
              )}
              {activeTab === 'database' && (
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#141413] text-[#F7F5F0] text-xs font-medium hover:bg-[#2B2A27] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .sql for phpMyAdmin
                </button>
              )}
            </div>
          </div>

          {loadingData && products.length === 0 ? (
            <div className="py-12 text-sm font-mono text-[#6B6860]">Loading studio records...</div>
          ) : (
            <div className="pt-8">
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div className="bg-[#FAF9F6] border border-[#141413]/10 p-5">
                      <p className="text-xs text-[#6B6860]">Published Rail Pieces</p>
                      <p className="font-mono text-3xl tabular-nums text-[#141413] mt-2">
                        {products.filter((p) => p.isPublished).length}
                      </p>
                      <p className="text-xs text-[#6B6860] mt-1">
                        {products.length} total SKUs in catalog
                      </p>
                    </div>
                    <div className="bg-[#FAF9F6] border border-[#141413]/10 p-5">
                      <p className="text-xs text-[#6B6860]">Total Units on Hand</p>
                      <p className="font-mono text-3xl tabular-nums text-[#141413] mt-2">
                        {totalUnits}
                      </p>
                      <p className="text-xs text-[#6B6860] mt-1">Across XS – XL matrix</p>
                    </div>
                    <div className="bg-[#FAF9F6] border border-[#141413]/10 p-5">
                      <p className="text-xs text-[#6B6860]">Low Stock Alerts (&le; 3)</p>
                      <p className="font-mono text-3xl tabular-nums text-[#B45309] mt-2">
                        {lowStockEntries.length}
                      </p>
                      <p className="text-xs text-[#6B6860] mt-1">Size variants needing restock</p>
                    </div>
                    <div className="bg-[#FAF9F6] border border-[#141413]/10 p-5">
                      <p className="text-xs text-[#6B6860]">Studio Orders Revenue</p>
                      <p className="font-mono text-3xl tabular-nums text-[#141413] mt-2">
                        ${totalRevenue}
                      </p>
                      <p className="text-xs text-[#6B6860] mt-1">{orders.length} recorded orders</p>
                    </div>
                  </div>

                  {/* Low Stock Action Table */}
                  <div className="bg-[#FAF9F6] border border-[#141413]/10">
                    <div className="px-5 py-4 border-b border-[#141413]/10 flex items-center justify-between">
                      <h2 className="font-serif text-xl text-[#141413]">
                        Low &amp; Out-of-Stock Size Alerts
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('inventory')}
                        className="text-xs underline underline-offset-4 text-[#141413] cursor-pointer"
                      >
                        Open Inventory Matrix
                      </button>
                    </div>
                    {lowStockEntries.length === 0 ? (
                      <p className="p-6 text-sm text-[#6B6860]">
                        All garment sizes currently hold more than 3 units.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-[#141413]/10 text-xs text-[#6B6860]">
                            <tr>
                              <th className="text-left font-normal px-5 py-3">Garment</th>
                              <th className="text-left font-normal px-5 py-3">SKU</th>
                              <th className="text-left font-normal px-5 py-3">Size</th>
                              <th className="text-right font-normal px-5 py-3">Remaining</th>
                              <th className="text-right font-normal px-5 py-3">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#141413]/10">
                            {lowStockEntries.slice(0, 10).map((entry) => (
                              <tr key={`${entry.product.id}-${entry.size}`} className="hover:bg-[#EFECE5]/60">
                                <td className="px-5 py-3 font-medium">
                                  {entry.product.name}{' '}
                                  <span className="font-serif italic font-normal text-[#5B5850]">
                                    {entry.product.colorVariant}
                                  </span>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-[#6B6860]">
                                  {entry.product.sku}
                                </td>
                                <td className="px-5 py-3 font-mono text-xs">{entry.size}</td>
                                <td className="px-5 py-3 font-mono tabular-nums text-right">
                                  {entry.qty}
                                </td>
                                <td className="px-5 py-3 text-right text-xs font-medium">
                                  {entry.qty === 0 ? (
                                    <span className="text-[#DC2626]">Out of stock</span>
                                  ) : (
                                    <span className="text-[#D97706]">Low stock</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PRODUCTS & RAIL */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-[#6B6860] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by name, color, or SKU..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#141413]/15 focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-[#EFECE5] border border-[#141413]/10 overflow-x-auto">
                      {(['All', ...CATEGORIES] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCatFilter(cat)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            catFilter === cat
                              ? 'bg-[#FAF9F6] text-[#141413]'
                              : 'text-[#5B5850] hover:text-[#141413]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Edit/Create Panel */}
                  {editingProduct && (
                    <form
                      onSubmit={handleSaveProduct}
                      className="bg-[#FAF9F6] border border-[#141413]/20 p-6 space-y-5"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-[#141413]/10">
                        <h2 className="font-serif text-2xl text-[#141413]">
                          {editingProduct.id ? `Edit ${editingProduct.name}` : 'Create New Rail Garment'}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="text-xs text-[#6B6860] hover:text-[#141413] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Garment name</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.name || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, name: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Color variant</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.colorVariant || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, colorVariant: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">SKU</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.sku || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, sku: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Category</label>
                          <select
                            value={editingProduct.category || 'Outerwear'}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                category: e.target.value as GarmentCategory,
                              })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Price (USD)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={editingProduct.price ?? 120}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                price: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Rail sort order</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={editingProduct.sortOrder ?? 1}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                sortOrder: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Material</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.material || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, material: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Fit</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.fit || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, fit: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Swatch Hex</label>
                          <input
                            type="text"
                            value={editingProduct.swatchHex || '#3A3B3D'}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, swatchHex: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Hanger Image URL</label>
                          <input
                            type="text"
                            value={editingProduct.frontImage || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, frontImage: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#5B5850] mb-1">Model Image URL</label>
                          <input
                            type="text"
                            value={editingProduct.modelImage || ''}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, modelImage: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#141413]/20"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProduct.isPublished !== false}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  isPublished: e.target.checked,
                                })
                              }
                            />
                            <span>Published on public rail</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-[#5B5850] mb-1">Editorial description</label>
                        <textarea
                          rows={3}
                          value={editingProduct.description || ''}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, description: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="px-4 py-2 text-xs border border-[#141413]/20 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingId === 'product-form'}
                          className="px-6 py-2 bg-[#141413] text-[#F7F5F0] text-xs font-medium cursor-pointer"
                        >
                          {savingId === 'product-form' ? 'Saving...' : 'Save Garment'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Products Table */}
                  <div className="bg-[#FAF9F6] border border-[#141413]/10 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#141413]/10 text-xs text-[#6B6860]">
                        <tr>
                          <th className="text-left font-normal px-5 py-3.5">Pos</th>
                          <th className="text-left font-normal px-5 py-3.5">Piece</th>
                          <th className="text-left font-normal px-5 py-3.5">Category</th>
                          <th className="text-right font-normal px-5 py-3.5">Price</th>
                          <th className="text-right font-normal px-5 py-3.5">Stock</th>
                          <th className="text-left font-normal px-5 py-3.5">Status</th>
                          <th className="text-right font-normal px-5 py-3.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#141413]/10">
                        {filteredProducts.map((p) => {
                          const total = GARMENT_SIZES.reduce(
                            (sum, s) => sum + (p.inventory[s] ?? 0),
                            0
                          );
                          return (
                            <tr key={p.id} className="hover:bg-[#EFECE5]/50">
                              <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-[#6B6860]">
                                {String(p.sortOrder).padStart(2, '0')}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-12 bg-[#ECE8DF] border border-[#141413]/10 overflow-hidden shrink-0">
                                    <ResilientImage
                                      src={p.frontImage}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-medium text-[#141413]">
                                      {p.name}{' '}
                                      <span className="font-serif italic font-normal text-[#5B5850]">
                                        {p.colorVariant}
                                      </span>
                                    </p>
                                    <p className="font-mono text-xs text-[#6B6860]">{p.sku}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-[#5B5850]">{p.category}</td>
                              <td className="px-5 py-3.5 font-mono tabular-nums text-right">
                                ${p.price}
                              </td>
                              <td className="px-5 py-3.5 font-mono tabular-nums text-right">
                                {total}
                              </td>
                              <td className="px-5 py-3.5 text-xs">
                                {p.isPublished ? (
                                  <span className="text-[#16A34A] font-medium">Published</span>
                                ) : (
                                  <span className="text-[#6B6860]">Hidden</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProduct({ ...p })}
                                    className="px-2.5 py-1.5 text-xs border border-[#141413]/15 hover:border-[#141413] cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === p.id}
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
                                    aria-label={`Delete ${p.name}`}
                                    className="p-1.5 text-[#6B6860] hover:text-[#DC2626] cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: INVENTORY MATRIX */}
              {activeTab === 'inventory' && (
                <div className="bg-[#FAF9F6] border border-[#141413]/10 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#141413]/10 text-xs text-[#6B6860]">
                      <tr>
                        <th className="text-left font-normal px-5 py-3.5">Garment</th>
                        {GARMENT_SIZES.map((sz) => (
                          <th key={sz} className="text-center font-mono font-normal px-3 py-3.5">
                            {sz}
                          </th>
                        ))}
                        <th className="text-right font-normal px-5 py-3.5">Total</th>
                        <th className="text-right font-normal px-5 py-3.5">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141413]/10">
                      {products.map((p) => {
                        const draft = invDrafts[p.id] || p.inventory;
                        const rowTotal = GARMENT_SIZES.reduce((sum, s) => sum + (draft[s] ?? 0), 0);
                        return (
                          <tr key={p.id} className="hover:bg-[#EFECE5]/40">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-[#141413]">
                                {p.name}{' '}
                                <span className="font-serif italic font-normal text-[#5B5850]">
                                  {p.colorVariant}
                                </span>
                              </p>
                              <p className="font-mono text-xs text-[#6B6860]">{p.sku}</p>
                            </td>
                            {GARMENT_SIZES.map((sz) => (
                              <td key={sz} className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft[sz] ?? 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                    setInvDrafts((prev) => ({
                                      ...prev,
                                      [p.id]: { ...draft, [sz]: val },
                                    }));
                                  }}
                                  className={`w-16 px-2 py-1.5 text-center font-mono text-xs tabular-nums border bg-white focus:outline-none focus:border-[#141413] ${
                                    (draft[sz] ?? 0) === 0
                                      ? 'border-[#FCA5A5] text-[#DC2626]'
                                      : (draft[sz] ?? 0) <= 3
                                      ? 'border-[#FCD34D] text-[#B45309]'
                                      : 'border-[#141413]/15 text-[#141413]'
                                  }`}
                                />
                              </td>
                            ))}
                            <td className="px-5 py-3.5 font-mono tabular-nums text-right">
                              {rowTotal}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                disabled={savingId === p.id}
                                onClick={() => handleSaveInventoryRow(p.id)}
                                className="px-3.5 py-1.5 bg-[#141413] text-[#F7F5F0] text-xs font-medium hover:bg-[#2B2A27] disabled:opacity-60 cursor-pointer"
                              >
                                {savingId === p.id ? 'Saving' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: HEADLESS CMS */}
              {activeTab === 'cms' && cmsDraft && (
                <form
                  onSubmit={handleSaveCms}
                  className="bg-[#FAF9F6] border border-[#141413]/10 p-6 sm:p-8 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Season Label</label>
                      <input
                        type="text"
                        value={cmsDraft.seasonLabel}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, seasonLabel: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Rail Title</label>
                      <input
                        type="text"
                        value={cmsDraft.railTitle}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, railTitle: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#5B5850] mb-1">Rail Subtitle</label>
                      <textarea
                        rows={2}
                        value={cmsDraft.railSubtitle}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, railSubtitle: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Try It On Heading</label>
                      <input
                        type="text"
                        value={cmsDraft.tryOnTitle}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, tryOnTitle: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">
                        Free Shipping Threshold ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cmsDraft.freeShippingThreshold}
                        onChange={(e) =>
                          setCmsDraft({
                            ...cmsDraft,
                            freeShippingThreshold: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Lookbook Kicker</label>
                      <input
                        type="text"
                        value={cmsDraft.lookbookKicker}
                        onChange={(e) =>
                          setCmsDraft({ ...cmsDraft, lookbookKicker: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Lookbook Title</label>
                      <input
                        type="text"
                        value={cmsDraft.lookbookTitle}
                        onChange={(e) =>
                          setCmsDraft({ ...cmsDraft, lookbookTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#5B5850] mb-1">Lookbook Body</label>
                      <textarea
                        rows={2}
                        value={cmsDraft.lookbookBody}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, lookbookBody: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Workshop Title</label>
                      <input
                        type="text"
                        value={cmsDraft.studioTitle}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, studioTitle: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5B5850] mb-1">Studio Location &amp; Hours</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cmsDraft.studioAddress}
                          onChange={(e) =>
                            setCmsDraft({ ...cmsDraft, studioAddress: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                        />
                        <input
                          type="text"
                          value={cmsDraft.studioHours}
                          onChange={(e) =>
                            setCmsDraft({ ...cmsDraft, studioHours: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#141413]/20"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#5B5850] mb-1">Workshop Narrative</label>
                      <textarea
                        rows={3}
                        value={cmsDraft.studioBody}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, studioBody: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#141413]/20"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingId === 'cms'}
                      className="px-6 py-2.5 bg-[#141413] text-[#F7F5F0] text-sm font-medium hover:bg-[#2B2A27] cursor-pointer"
                    >
                      {savingId === 'cms' ? 'Publishing...' : 'Publish CMS Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB: ORDERS */}
              {activeTab === 'orders' && (
                <div className="bg-[#FAF9F6] border border-[#141413]/10 overflow-x-auto">
                  {orders.length === 0 ? (
                    <p className="p-8 text-sm text-[#6B6860]">
                      No orders placed yet. Checkout from the storefront bag drawer to test live inventory deduction.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#141413]/10 text-xs text-[#6B6860]">
                        <tr>
                          <th className="text-left font-normal px-5 py-3.5">Order</th>
                          <th className="text-left font-normal px-5 py-3.5">Customer</th>
                          <th className="text-left font-normal px-5 py-3.5">Items</th>
                          <th className="text-right font-normal px-5 py-3.5">Total</th>
                          <th className="text-right font-normal px-5 py-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#141413]/10">
                        {orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#EFECE5]/40">
                            <td className="px-5 py-4 align-top">
                              <p className="font-mono text-xs font-medium text-[#141413]">
                                {ord.orderNumber}
                              </p>
                              <p className="font-mono text-[11px] text-[#6B6860] mt-0.5">
                                {new Date(ord.createdAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <p className="font-medium text-[#141413]">{ord.customerName}</p>
                              <p className="text-xs text-[#6B6860]">{ord.customerEmail}</p>
                              <p className="text-xs text-[#5B5850] mt-1 max-w-xs">
                                {ord.shippingAddress}
                              </p>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <ul className="space-y-1 text-xs">
                                {ord.items.map((it, idx) => (
                                  <li key={`${it.productId}-${it.size}-${idx}`}>
                                    {it.quantity} × {it.name} ({it.size})
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-5 py-4 font-mono tabular-nums text-right align-top">
                              ${ord.total}
                            </td>
                            <td className="px-5 py-4 text-right align-top">
                              <select
                                value={ord.status}
                                disabled={savingId === ord.id}
                                onChange={(e) =>
                                  handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)
                                }
                                className="px-2.5 py-1.5 text-xs bg-white border border-[#141413]/20"
                              >
                                {ORDER_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: PHPMYADMIN / MYSQL DATABASE */}
              {activeTab === 'database' && dbInfo && (
                <div className="space-y-6">
                  <div className="bg-[#FAF9F6] border border-[#141413]/10 p-6 sm:p-8 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#141413]/10">
                      <div>
                        <p className="text-xs font-mono text-[#6B6860]">Database Engine Status</p>
                        <h2 className="font-serif text-2xl text-[#141413] mt-1">
                          {dbInfo.engineLabel}
                        </h2>
                      </div>
                      <span
                        className={`text-xs font-medium px-3 py-1.5 border ${
                          dbInfo.mysqlConnected
                            ? 'border-[#16A34A]/30 text-[#16A34A] bg-[#DCFCE7]/40'
                            : 'border-[#141413]/15 text-[#46443E] bg-[#EFECE5]'
                        }`}
                      >
                        {dbInfo.mysqlConnected ? 'MySQL Pool Connected' : 'Local Store + SQL Sync Ready'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <h3 className="font-medium text-[#141413] mb-2">
                          Connecting phpMyAdmin / MySQL Server
                        </h3>
                        <p className="text-[#5B5850] leading-relaxed mb-3">
                          To connect directly to your phpMyAdmin MySQL/MariaDB database, configure the server environment variables below and restart the server. All tables auto-initialize on boot.
                        </p>
                        <pre className="p-4 bg-[#141413] text-[#F7F5F0] font-mono text-xs overflow-x-auto leading-relaxed">
{`MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=${dbInfo.databaseName}`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-medium text-[#141413] mb-2">
                          Schema Tables ({dbInfo.tables.length})
                        </h3>
                        <ul className="divide-y divide-[#141413]/10 border border-[#141413]/10 bg-white text-xs font-mono">
                          {dbInfo.tables.map((t) => (
                            <li key={t} className="px-4 py-2.5 flex justify-between">
                              <span>{t}</span>
                              <span className="text-[#6B6860]">InnoDB · utf8mb4</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-[#6B6860] mt-3">
                          You can also import <span className="font-mono">database/hale_phpmyadmin.sql</span> or download a live snapshot of your current catalog and orders using the Export button above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
