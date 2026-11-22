import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  claimAdminPasscode,
  createOrder,
  deleteProduct,
  exportPhpMyAdminSql,
  getAdminAuthStatus,
  getCmsContent,
  getDatabaseInfo,
  getOrders,
  getProducts,
  initDatabase,
  updateCmsContent,
  updateInventory,
  updateOrderStatus,
  upsertProduct,
  verifyAdminLogin,
  verifySessionToken,
} from './server/db.ts';
import type { GarmentSize, OrderStatus } from './src/types/hale.ts';

const PORT = 3000;

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    const info = await getDatabaseInfo();
    res.json({ ok: true, engine: info.engine, mysqlConnected: info.mysqlConnected });
  });

  // Public storefront API
  app.get('/api/catalog', async (_req, res) => {
    try {
      const [products, cms] = await Promise.all([getProducts(false), getCmsContent()]);
      res.json({ products, cms });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/cms', async (_req, res) => {
    try {
      const cms = await getCmsContent();
      res.json({ cms });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const body = req.body as {
        customerName?: string;
        customerEmail?: string;
        shippingAddress?: string;
        items?: Array<{ productId: string; size: GarmentSize; quantity: number }>;
      };

      if (!body.customerName?.trim() || !body.customerEmail?.trim() || !body.shippingAddress?.trim()) {
        res.status(400).json({ error: 'Please complete your name, email, and shipping address.' });
        return;
      }

      const result = await createOrder({
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        shippingAddress: body.shippingAddress,
        items: Array.isArray(body.items) ? body.items : [],
      });

      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(201).json({ order: result.order });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Admin auth routes
  app.get('/api/admin/auth-status', async (_req, res) => {
    try {
      const status = await getAdminAuthStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/claim', async (req, res) => {
    try {
      const { passcode } = req.body as { passcode?: string };
      const result = await claimAdminPasscode(String(passcode || ''));
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ token: result.token });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      const { passcode } = req.body as { passcode?: string };
      const result = await verifyAdminLogin(String(passcode || ''));
      if (!result.ok) {
        res.status(401).json({ error: result.error });
        return;
      }
      res.json({ token: result.token });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Protected Admin CMS & Inventory routes
  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    try {
      const products = await getProducts(true);
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const product = await upsertProduct(req.body);
      res.status(201).json({ product });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const product = await upsertProduct({ ...req.body, id: req.params.id });
      res.json({ product });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const removed = await deleteProduct(req.params.id);
      if (!removed) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/admin/inventory/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await updateInventory(req.params.id, req.body?.inventory || req.body);
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ product: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/cms', requireAdmin, async (req, res) => {
    try {
      const cms = await updateCmsContent(req.body || {});
      res.json({ cms });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
    try {
      const orders = await getOrders();
      res.json({ orders });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
      const status = req.body?.status as OrderStatus;
      const order = await updateOrderStatus(req.params.id, status);
      if (!order) {
        res.status(404).json({ error: 'Order or status invalid.' });
        return;
      }
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/database-info', requireAdmin, async (_req, res) => {
    try {
      const info = await getDatabaseInfo();
      res.json({ info });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/export-sql', requireAdmin, async (_req, res) => {
    try {
      const sql = await exportPhpMyAdminSql();
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="hale_phpmyadmin_export.sql"');
      res.send(sql);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const srcAssets = path.resolve(distPath, 'src/assets');
    if (fs.existsSync(srcAssets)) {
      app.use('/src/assets', express.static(srcAssets));
    }
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HALE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start HALE server:', err);
  process.exit(1);
});
