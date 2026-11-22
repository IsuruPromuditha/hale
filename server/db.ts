import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { DEFAULT_CATALOG, DEFAULT_CMS } from '../src/data/catalog.ts';
import {
  GARMENT_SIZES,
  type CmsContent,
  type DatabaseInfo,
  type Garment,
  type GarmentSize,
  type InventoryMap,
  type OrderItemRecord,
  type OrderRecord,
  type OrderStatus,
} from '../src/types/hale.ts';

interface LocalStoreData {
  products: Garment[];
  cms: CmsContent;
  orders: OrderRecord[];
  adminHash: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STORE_PATH = path.join(DATA_DIR, 'hale-store.json');

let pool: mysql.Pool | null = null;
let mysqlConnected = false;
let mysqlConfigured = false;
let dbName = process.env.MYSQL_DATABASE || 'hale_store';

const RUNTIME_SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

export function sanitizeImagePath(url: unknown, fallback = '/img/hoodie-oat-hanger.svg'): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function normalizeInventory(inv?: Partial<InventoryMap>): InventoryMap {
  return {
    XS: Math.max(0, Math.floor(Number(inv?.XS ?? 0) || 0)),
    S: Math.max(0, Math.floor(Number(inv?.S ?? 0) || 0)),
    M: Math.max(0, Math.floor(Number(inv?.M ?? 0) || 0)),
    L: Math.max(0, Math.floor(Number(inv?.L ?? 0) || 0)),
    XL: Math.max(0, Math.floor(Number(inv?.XL ?? 0) || 0)),
  };
}

function readLocalStore(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORE_PATH)) {
    const initial: LocalStoreData = {
      products: DEFAULT_CATALOG.map((p) => ({ ...p, inventory: { ...p.inventory } })),
      cms: { ...DEFAULT_CMS },
      orders: [
        {
          id: 'ord-seed-1041',
          orderNumber: 'HALE-1041',
          customerName: 'Henrique Almeida',
          customerEmail: 'henrique@atelier-porto.pt',
          shippingAddress: 'Rua de Cedofeita 412, 4050-175 Porto, Portugal',
          status: 'Shipped',
          subtotal: 240,
          shippingFee: 0,
          total: 240,
          items: [
            {
              productId: 'hale-04',
              sku: 'HL-A26-04',
              name: 'Chore Jacket',
              colorVariant: 'in Olive',
              size: 'M',
              quantity: 1,
              unitPrice: 240,
            },
          ],
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      adminHash: null,
    };
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
    const products = Array.isArray(parsed.products) ? parsed.products : [...DEFAULT_CATALOG];

    // Sync seeded HALE garments if they still hold pre-dummy model visuals
    let migrated = false;
    const defaultById = new Map(DEFAULT_CATALOG.map((d) => [d.id, d]));
    const updatedProducts = products.map((p) => {
      const def = defaultById.get(p.id);
      if (def && !p.modelImage.includes('hale_dummy_')) {
        migrated = true;
        return {
          ...p,
          modelImage: def.modelImage,
          modelOverlayMode: def.modelOverlayMode,
        };
      }
      return p;
    });

    const cms = parsed.cms ? { ...DEFAULT_CMS, ...parsed.cms } : { ...DEFAULT_CMS };
    if (cms.tryOnSubtitle.startsWith('Same charcoal pleated wool trousers')) {
      cms.tryOnTitle = DEFAULT_CMS.tryOnTitle;
      cms.tryOnSubtitle = DEFAULT_CMS.tryOnSubtitle;
      migrated = true;
    }

    const result: LocalStoreData = {
      products: updatedProducts,
      cms,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      adminHash: typeof parsed.adminHash === 'string' ? parsed.adminHash : null,
    };
    if (migrated) {
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(result, null, 2), 'utf-8');
    }
    return result;
  } catch {
    return {
      products: [...DEFAULT_CATALOG],
      cms: { ...DEFAULT_CMS },
      orders: [],
      adminHash: null,
    };
  }
}

function writeLocalStore(data: LocalStoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function initDatabase(): Promise<void> {
  const mysqlUrl = process.env.MYSQL_URL?.trim();
  const mysqlHost = process.env.MYSQL_HOST?.trim();

  if (!mysqlUrl && !mysqlHost) {
    readLocalStore();
    return;
  }

  mysqlConfigured = true;
  try {
    if (mysqlUrl) {
      pool = mysql.createPool({
        uri: mysqlUrl,
        waitForConnections: true,
        connectionLimit: 10,
      });
    } else {
      dbName = process.env.MYSQL_DATABASE?.trim() || 'hale_store';
      pool = mysql.createPool({
        host: mysqlHost,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
      });
    }

    await pool.query('SELECT 1');
    await ensureMySqlSchema(pool);
    mysqlConnected = true;
  } catch (err) {
    console.warn('[HALE DB] MySQL connection unavailable, using local persistent store fallback:', (err as Error).message);
    pool = null;
    mysqlConnected = false;
    readLocalStore();
  }
}

async function ensureMySqlSchema(db: mysql.Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      sku VARCHAR(64) NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 1,
      name VARCHAR(160) NOT NULL,
      color_variant VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'Outerwear',
      price DECIMAL(10, 2) NOT NULL,
      description TEXT NOT NULL,
      material VARCHAR(255) NOT NULL,
      fit VARCHAR(255) NOT NULL,
      front_image VARCHAR(512) NOT NULL,
      flat_image VARCHAR(512) NOT NULL,
      model_image VARCHAR(512) NOT NULL,
      model_overlay_mode VARCHAR(24) NOT NULL DEFAULT 'composite',
      swatch_hex VARCHAR(16) NOT NULL DEFAULT '#3A3B3D',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS product_inventory (
      product_id VARCHAR(64) NOT NULL,
      size VARCHAR(8) NOT NULL,
      stock_qty INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, size),
      CONSTRAINT fk_inv_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cms_sections (
      section_key VARCHAR(64) NOT NULL PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      order_number VARCHAR(32) NOT NULL UNIQUE,
      customer_name VARCHAR(160) NOT NULL,
      customer_email VARCHAR(190) NOT NULL,
      shipping_address TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      subtotal DECIMAL(10, 2) NOT NULL,
      shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      sku VARCHAR(64) NOT NULL,
      name VARCHAR(160) NOT NULL,
      color_variant VARCHAR(120) NOT NULL,
      size VARCHAR(8) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      CONSTRAINT fk_ord_items FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_config (
      config_key VARCHAR(64) NOT NULL PRIMARY KEY,
      config_value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await db.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM products');
  const count = Number(rows[0]?.cnt || 0);
  if (count === 0) {
    for (const p of DEFAULT_CATALOG) {
      await db.query(
        `INSERT INTO products (id, sku, sort_order, name, color_variant, category, price, description, material, fit, front_image, flat_image, model_image, model_overlay_mode, swatch_hex, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.sku,
          p.sortOrder,
          p.name,
          p.colorVariant,
          p.category,
          p.price,
          p.description,
          p.material,
          p.fit,
          p.frontImage,
          p.flatImage,
          p.modelImage,
          p.modelOverlayMode,
          p.swatchHex,
          p.isPublished ? 1 : 0,
        ]
      );
      for (const size of GARMENT_SIZES) {
        await db.query(
          'INSERT INTO product_inventory (product_id, size, stock_qty) VALUES (?, ?, ?)',
          [p.id, size, p.inventory[size] ?? 0]
        );
      }
    }
    await db.query(
      'INSERT INTO cms_sections (section_key, payload_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)',
      ['editorial', JSON.stringify(DEFAULT_CMS)]
    );
  }
}

export async function getProducts(includeUnpublished = false): Promise<Garment[]> {
  if (pool && mysqlConnected) {
    const query = includeUnpublished
      ? 'SELECT * FROM products ORDER BY sort_order ASC, name ASC'
      : 'SELECT * FROM products WHERE is_published = 1 ORDER BY sort_order ASC, name ASC';
    const [prodRows] = await pool.query<mysql.RowDataPacket[]>(query);
    const [invRows] = await pool.query<mysql.RowDataPacket[]>('SELECT product_id, size, stock_qty FROM product_inventory');

    const invByProduct = new Map<string, InventoryMap>();
    for (const row of invRows) {
      const pid = String(row.product_id);
      if (!invByProduct.has(pid)) {
        invByProduct.set(pid, { XS: 0, S: 0, M: 0, L: 0, XL: 0 });
      }
      const map = invByProduct.get(pid)!;
      const size = String(row.size) as GarmentSize;
      if (GARMENT_SIZES.includes(size)) {
        map[size] = Number(row.stock_qty || 0);
      }
    }

    return prodRows.map((r) => ({
      id: String(r.id),
      sku: String(r.sku),
      sortOrder: Number(r.sort_order),
      name: String(r.name),
      colorVariant: String(r.color_variant),
      category: String(r.category) as Garment['category'],
      price: Number(r.price),
      description: String(r.description),
      material: String(r.material),
      fit: String(r.fit),
      sizes: [...GARMENT_SIZES],
      frontImage: String(r.front_image),
      flatImage: String(r.flat_image),
      modelImage: String(r.model_image),
      modelOverlayMode: r.model_overlay_mode === 'native' ? 'native' : 'composite',
      swatchHex: String(r.swatch_hex),
      isPublished: Boolean(r.is_published),
      inventory: invByProduct.get(String(r.id)) ?? { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
  }

  const store = readLocalStore();
  return store.products
    .filter((p) => includeUnpublished || p.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertProduct(input: Partial<Garment> & { id?: string }): Promise<Garment> {
  const id = (input.id && input.id.trim()) || `hale-${Date.now().toString(36)}`;
  const sku = (input.sku && input.sku.trim()) || `HL-${Date.now().toString().slice(-4)}`;
  const existingAll = await getProducts(true);
  const existing = existingAll.find((p) => p.id === id);

  const garment: Garment = {
    id,
    sku,
    sortOrder: Math.max(1, Math.floor(Number(input.sortOrder ?? existing?.sortOrder ?? existingAll.length + 1))),
    name: String(input.name ?? existing?.name ?? 'Untitled Piece').trim().slice(0, 120),
    colorVariant: String(input.colorVariant ?? existing?.colorVariant ?? 'in Charcoal').trim().slice(0, 120),
    category: (input.category ?? existing?.category ?? 'Outerwear') as Garment['category'],
    price: Math.max(1, Math.round(Number(input.price ?? existing?.price ?? 150) * 100) / 100),
    description: String(input.description ?? existing?.description ?? '').trim().slice(0, 2000),
    material: String(input.material ?? existing?.material ?? '100% Organic Cotton').trim().slice(0, 200),
    fit: String(input.fit ?? existing?.fit ?? 'Relaxed tailored fit').trim().slice(0, 200),
    sizes: [...GARMENT_SIZES],
    frontImage: sanitizeImagePath(input.frontImage ?? existing?.frontImage),
    flatImage: sanitizeImagePath(input.flatImage ?? existing?.flatImage ?? input.frontImage),
    modelImage: sanitizeImagePath(input.modelImage ?? existing?.modelImage ?? input.frontImage),
    modelOverlayMode:
      input.modelOverlayMode === 'native' || existing?.modelOverlayMode === 'native' ? 'native' : 'composite',
    swatchHex: /^#[0-9A-Fa-f]{6}$/.test(String(input.swatchHex ?? ''))
      ? String(input.swatchHex)
      : existing?.swatchHex ?? '#3A3B3D',
    isPublished: input.isPublished !== undefined ? Boolean(input.isPublished) : existing?.isPublished ?? true,
    inventory: normalizeInventory(input.inventory ?? existing?.inventory ?? { XS: 2, S: 4, M: 6, L: 4, XL: 2 }),
    updatedAt: new Date().toISOString(),
  };

  if (pool && mysqlConnected) {
    await pool.query(
      `INSERT INTO products (id, sku, sort_order, name, color_variant, category, price, description, material, fit, front_image, flat_image, model_image, model_overlay_mode, swatch_hex, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         sku = VALUES(sku),
         sort_order = VALUES(sort_order),
         name = VALUES(name),
         color_variant = VALUES(color_variant),
         category = VALUES(category),
         price = VALUES(price),
         description = VALUES(description),
         material = VALUES(material),
         fit = VALUES(fit),
         front_image = VALUES(front_image),
         flat_image = VALUES(flat_image),
         model_image = VALUES(model_image),
         model_overlay_mode = VALUES(model_overlay_mode),
         swatch_hex = VALUES(swatch_hex),
         is_published = VALUES(is_published)`,
      [
        garment.id,
        garment.sku,
        garment.sortOrder,
        garment.name,
        garment.colorVariant,
        garment.category,
        garment.price,
        garment.description,
        garment.material,
        garment.fit,
        garment.frontImage,
        garment.flatImage,
        garment.modelImage,
        garment.modelOverlayMode,
        garment.swatchHex,
        garment.isPublished ? 1 : 0,
      ]
    );

    for (const size of GARMENT_SIZES) {
      await pool.query(
        `INSERT INTO product_inventory (product_id, size, stock_qty)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty)`,
        [garment.id, size, garment.inventory[size]]
      );
    }
    return garment;
  }

  const store = readLocalStore();
  const idx = store.products.findIndex((p) => p.id === garment.id);
  if (idx >= 0) {
    store.products[idx] = garment;
  } else {
    store.products.push(garment);
  }
  writeLocalStore(store);
  return garment;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (pool && mysqlConnected) {
    const [result] = await pool.query<mysql.ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  const store = readLocalStore();
  const prevLen = store.products.length;
  store.products = store.products.filter((p) => p.id !== id);
  if (store.products.length !== prevLen) {
    writeLocalStore(store);
    return true;
  }
  return false;
}

export async function updateInventory(id: string, inventory: Partial<InventoryMap>): Promise<Garment | null> {
  const normalized = normalizeInventory(inventory);
  if (pool && mysqlConnected) {
    for (const size of GARMENT_SIZES) {
      await pool.query(
        `INSERT INTO product_inventory (product_id, size, stock_qty)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty)`,
        [id, size, normalized[size]]
      );
    }
    const all = await getProducts(true);
    return all.find((p) => p.id === id) ?? null;
  }

  const store = readLocalStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  store.products[idx] = {
    ...store.products[idx],
    inventory: normalized,
    updatedAt: new Date().toISOString(),
  };
  writeLocalStore(store);
  return store.products[idx];
}

export async function getCmsContent(): Promise<CmsContent> {
  if (pool && mysqlConnected) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT payload_json FROM cms_sections WHERE section_key = ?',
      ['editorial']
    );
    if (rows.length > 0 && rows[0].payload_json) {
      try {
        const parsed = typeof rows[0].payload_json === 'string'
          ? JSON.parse(rows[0].payload_json)
          : rows[0].payload_json;
        return { ...DEFAULT_CMS, ...parsed };
      } catch {
        return { ...DEFAULT_CMS };
      }
    }
    return { ...DEFAULT_CMS };
  }
  return readLocalStore().cms;
}

export async function updateCmsContent(patch: Partial<CmsContent>): Promise<CmsContent> {
  const current = await getCmsContent();
  const next: CmsContent = {
    ...current,
    ...patch,
    freeShippingThreshold: Math.max(
      0,
      Math.round(Number(patch.freeShippingThreshold ?? current.freeShippingThreshold))
    ),
  };

  if (pool && mysqlConnected) {
    await pool.query(
      `INSERT INTO cms_sections (section_key, payload_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
      ['editorial', JSON.stringify(next)]
    );
    return next;
  }

  const store = readLocalStore();
  store.cms = next;
  writeLocalStore(store);
  return next;
}

export async function getOrders(): Promise<OrderRecord[]> {
  if (pool && mysqlConnected) {
    const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    const [itemRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM order_items ORDER BY id ASC'
    );
    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const r of itemRows) {
      const oid = String(r.order_id);
      if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
      itemsByOrder.get(oid)!.push({
        productId: String(r.product_id),
        sku: String(r.sku),
        name: String(r.name),
        colorVariant: String(r.color_variant),
        size: String(r.size) as GarmentSize,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unit_price),
      });
    }
    return orderRows.map((r) => ({
      id: String(r.id),
      orderNumber: String(r.order_number),
      customerName: String(r.customer_name),
      customerEmail: String(r.customer_email),
      shippingAddress: String(r.shipping_address),
      status: String(r.status) as OrderStatus,
      subtotal: Number(r.subtotal),
      shippingFee: Number(r.shipping_fee),
      total: Number(r.total),
      items: itemsByOrder.get(String(r.id)) ?? [],
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  return [...readLocalStore().orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createOrder(payload: {
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  items: Array<{ productId: string; size: GarmentSize; quantity: number }>;
}): Promise<{ ok: true; order: OrderRecord } | { ok: false; error: string }> {
  const cms = await getCmsContent();
  const products = await getProducts(true);

  if (!payload.items || payload.items.length === 0) {
    return { ok: false, error: 'Your bag is empty.' };
  }

  const resolvedItems: OrderItemRecord[] = [];
  let subtotal = 0;

  for (const reqItem of payload.items) {
    const product = products.find((p) => p.id === reqItem.productId);
    if (!product || !product.isPublished) {
      return { ok: false, error: 'One of the selected garments is no longer available.' };
    }
    if (!GARMENT_SIZES.includes(reqItem.size)) {
      return { ok: false, error: `Invalid size selected for ${product.name}.` };
    }
    const qty = Math.max(1, Math.floor(Number(reqItem.quantity || 1)));
    const available = product.inventory[reqItem.size] ?? 0;
    if (available < qty) {
      return {
        ok: false,
        error: `Only ${available} unit(s) remaining for ${product.name} (${reqItem.size}).`,
      };
    }

    subtotal += product.price * qty;
    resolvedItems.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      colorVariant: product.colorVariant,
      size: reqItem.size,
      quantity: qty,
      unitPrice: product.price,
    });
  }

  const shippingFee = subtotal >= cms.freeShippingThreshold ? 0 : 18;
  const total = subtotal + shippingFee;
  const orderId = `ord-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const orderNumber = `HALE-${Math.floor(1042 + (Date.now() % 8900))}`;
  const order: OrderRecord = {
    id: orderId,
    orderNumber,
    customerName: payload.customerName.trim().slice(0, 140),
    customerEmail: payload.customerEmail.trim().slice(0, 180),
    shippingAddress: payload.shippingAddress.trim().slice(0, 400),
    status: 'Pending',
    subtotal,
    shippingFee,
    total,
    items: resolvedItems,
    createdAt: new Date().toISOString(),
  };

  if (pool && mysqlConnected) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO orders (id, order_number, customer_name, customer_email, shipping_address, status, subtotal, shipping_fee, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.orderNumber,
          order.customerName,
          order.customerEmail,
          order.shippingAddress,
          order.status,
          order.subtotal,
          order.shippingFee,
          order.total,
        ]
      );
      for (const item of resolvedItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, color_variant, size, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            item.productId,
            item.sku,
            item.name,
            item.colorVariant,
            item.size,
            item.quantity,
            item.unitPrice,
          ]
        );
        await conn.query(
          `UPDATE product_inventory SET stock_qty = GREATEST(0, stock_qty - ?) WHERE product_id = ? AND size = ?`,
          [item.quantity, item.productId, item.size]
        );
      }
      await conn.commit();
      return { ok: true, order };
    } catch (err) {
      await conn.rollback();
      return { ok: false, error: (err as Error).message };
    } finally {
      conn.release();
    }
  }

  const store = readLocalStore();
  for (const item of resolvedItems) {
    const p = store.products.find((prod) => prod.id === item.productId);
    if (p) {
      p.inventory[item.size] = Math.max(0, (p.inventory[item.size] ?? 0) - item.quantity);
      p.updatedAt = new Date().toISOString();
    }
  }
  store.orders.unshift(order);
  writeLocalStore(store);
  return { ok: true, order };
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord | null> {
  const allowed: OrderStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) return null;

  if (pool && mysqlConnected) {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    const orders = await getOrders();
    return orders.find((o) => o.id === id) ?? null;
  }

  const store = readLocalStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  store.orders[idx] = { ...store.orders[idx], status };
  writeLocalStore(store);
  return store.orders[idx];
}

// --- Secure Admin Passcode & Token Auth ---

function hashPassword(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(passcode, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

async function getStoredAdminHash(): Promise<string | null> {
  if (pool && mysqlConnected) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT config_value FROM admin_config WHERE config_key = ?',
      ['admin_passcode_hash']
    );
    return rows.length > 0 ? String(rows[0].config_value) : null;
  }
  return readLocalStore().adminHash;
}

async function saveStoredAdminHash(hash: string): Promise<void> {
  if (pool && mysqlConnected) {
    await pool.query(
      `INSERT INTO admin_config (config_key, config_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      ['admin_passcode_hash', hash]
    );
    return;
  }
  const store = readLocalStore();
  store.adminHash = hash;
  writeLocalStore(store);
}

export async function getAdminAuthStatus(): Promise<{
  envPasscodeSet: boolean;
  needsClaim: boolean;
}> {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass && envPass.length > 0) {
    return { envPasscodeSet: true, needsClaim: false };
  }
  const stored = await getStoredAdminHash();
  return { envPasscodeSet: false, needsClaim: !stored };
}

export async function claimAdminPasscode(passcode: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const clean = passcode.trim();
  if (clean.length < 6) {
    return { ok: false, error: 'Passcode must be at least 6 characters.' };
  }
  const status = await getAdminAuthStatus();
  if (!status.needsClaim) {
    return { ok: false, error: 'Admin passcode is already configured. Please sign in.' };
  }
  const hash = hashPassword(clean);
  await saveStoredAdminHash(hash);
  return { ok: true, token: createSessionToken() };
}

export async function verifyAdminLogin(passcode: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const clean = passcode.trim();
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass && envPass.length > 0) {
    const expectedDigest = crypto.createHash('sha256').update(envPass).digest();
    const providedDigest = crypto.createHash('sha256').update(clean).digest();
    if (crypto.timingSafeEqual(expectedDigest, providedDigest)) {
      return { ok: true, token: createSessionToken() };
    }
    return { ok: false, error: 'Invalid admin passcode.' };
  }

  const stored = await getStoredAdminHash();
  if (!stored) {
    return { ok: false, error: 'Admin access has not been claimed yet.' };
  }
  if (verifyPasswordHash(clean, stored)) {
    return { ok: true, token: createSessionToken() };
  }
  return { ok: false, error: 'Invalid admin passcode.' };
}

export function createSessionToken(): string {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', RUNTIME_SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const products = await getProducts(true);
  const orders = await getOrders();
  const totalUnitsInStock = products.reduce(
    (sum, p) => sum + GARMENT_SIZES.reduce((s, size) => s + (p.inventory[size] ?? 0), 0),
    0
  );

  return {
    engine: pool && mysqlConnected ? 'mysql' : 'local-store',
    engineLabel:
      pool && mysqlConnected
        ? `MySQL / phpMyAdmin Live (${dbName})`
        : 'Local Persistent Store (phpMyAdmin SQL Export Ready)',
    mysqlConfigured,
    mysqlConnected,
    databaseName: dbName,
    tables: ['products', 'product_inventory', 'cms_sections', 'orders', 'order_items', 'admin_config'],
    productCount: products.length,
    orderCount: orders.length,
    totalUnitsInStock,
  };
}

function escapeSql(val: string): string {
  return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

export async function exportPhpMyAdminSql(): Promise<string> {
  const schemaPath = path.resolve(process.cwd(), 'database', 'hale_phpmyadmin.sql');
  const baseSchema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
  const products = await getProducts(true);
  const cms = await getCmsContent();
  const orders = await getOrders();

  const lines: string[] = [
    baseSchema.split('-- Seed 8 Autumn 26 Garments')[0].trim(),
    '',
    '-- Live Snapshot Export from HALE Headless CMS',
    `-- Generated at ${new Date().toISOString()}`,
    '',
    'DELETE FROM `order_items`;',
    'DELETE FROM `orders`;',
    'DELETE FROM `product_inventory`;',
    'DELETE FROM `products`;',
    '',
  ];

  for (const p of products) {
    lines.push(
      `INSERT INTO \`products\` (\`id\`, \`sku\`, \`sort_order\`, \`name\`, \`color_variant\`, \`category\`, \`price\`, \`description\`, \`material\`, \`fit\`, \`front_image\`, \`flat_image\`, \`model_image\`, \`model_overlay_mode\`, \`swatch_hex\`, \`is_published\`) VALUES (${escapeSql(p.id)}, ${escapeSql(p.sku)}, ${p.sortOrder}, ${escapeSql(p.name)}, ${escapeSql(p.colorVariant)}, ${escapeSql(p.category)}, ${p.price.toFixed(2)}, ${escapeSql(p.description)}, ${escapeSql(p.material)}, ${escapeSql(p.fit)}, ${escapeSql(p.frontImage)}, ${escapeSql(p.flatImage)}, ${escapeSql(p.modelImage)}, ${escapeSql(p.modelOverlayMode)}, ${escapeSql(p.swatchHex)}, ${p.isPublished ? 1 : 0});`
    );
    for (const size of GARMENT_SIZES) {
      lines.push(
        `INSERT INTO \`product_inventory\` (\`product_id\`, \`size\`, \`stock_qty\`) VALUES (${escapeSql(p.id)}, ${escapeSql(size)}, ${p.inventory[size] ?? 0});`
      );
    }
  }

  lines.push('');
  lines.push(
    `INSERT INTO \`cms_sections\` (\`section_key\`, \`payload_json\`) VALUES ('editorial', ${escapeSql(JSON.stringify(cms))}) ON DUPLICATE KEY UPDATE \`payload_json\` = VALUES(\`payload_json\`);`
  );

  if (orders.length > 0) {
    lines.push('');
    for (const o of orders) {
      lines.push(
        `INSERT INTO \`orders\` (\`id\`, \`order_number\`, \`customer_name\`, \`customer_email\`, \`shipping_address\`, \`status\`, \`subtotal\`, \`shipping_fee\`, \`total\`) VALUES (${escapeSql(o.id)}, ${escapeSql(o.orderNumber)}, ${escapeSql(o.customerName)}, ${escapeSql(o.customerEmail)}, ${escapeSql(o.shippingAddress)}, ${escapeSql(o.status)}, ${o.subtotal.toFixed(2)}, ${o.shippingFee.toFixed(2)}, ${o.total.toFixed(2)});`
      );
      for (const item of o.items) {
        lines.push(
          `INSERT INTO \`order_items\` (\`order_id\`, \`product_id\`, \`sku\`, \`name\`, \`color_variant\`, \`size\`, \`quantity\`, \`unit_price\`) VALUES (${escapeSql(o.id)}, ${escapeSql(item.productId)}, ${escapeSql(item.sku)}, ${escapeSql(item.name)}, ${escapeSql(item.colorVariant)}, ${escapeSql(item.size)}, ${item.quantity}, ${item.unitPrice.toFixed(2)});`
        );
      }
    }
  }

  return lines.join('\n');
}
