/**
 * SALE PAINT — CLOUDFLARE WORKER / SUPABASE API GATEWAY ROUTER
 * 
 * Implements Phase 4 target API routes:
 * - Sales (Atomic Checkout, Reads, Updates, Deletions)
 * - Products & Catalog
 * - Stock (Atomic Transactions, Balances)
 * - System Config
 * - Realtime Server-Sent Events stream for multi-device live sync
 */

import { Router, Request, Response } from 'express';
import { dualWriteSyncService } from './dualWriteSyncService';
import { requireFirebaseAuth } from './gatewayAuth';

export const gatewayRouter = Router();

// In-memory SSE client connections for real-time broadcasts
const sseClients = new Set<Response>();

export function broadcastRealtimeEvent(table: string, eventType: string, data: any) {
  const payload = JSON.stringify({ table, eventType, data, timestamp: new Date().toISOString() });
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
}

// 1. Health & Status
gatewayRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    gateway: 'Cloudflare Worker / Supabase API Gateway (Phase 4 Cutover)',
    version: '4.0.0',
    backend: 'Supabase PostgreSQL',
    isLiveConnected: dualWriteSyncService.isLiveConnected(),
    timestamp: new Date().toISOString(),
  });
});

// Every production data route requires a cryptographically verified Firebase ID token.
gatewayRouter.use(requireFirebaseAuth);

gatewayRouter.use((req: Request, res: Response, next) => {
  if (!dualWriteSyncService.isLiveConnected()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SUPABASE_NOT_CONNECTED',
        message: 'Live Supabase is unavailable. Production API fails closed; mock storage is not used.',
      },
    });
  }
  return next();
});

function getLiveClientOrFail(res: Response) {
  const client = dualWriteSyncService.getLiveClient();
  if (!client) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SUPABASE_NOT_CONNECTED',
        message: 'Live Supabase is unavailable. Production API fails closed; mock storage is not used.',
      },
    });
    return null;
  }
  return client;
}

// Realtime SSE Stream for multi-device clients
gatewayRouter.get('/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 2. Sales Endpoints
gatewayRouter.get('/sales', async (req: Request, res: Response) => {
  try {
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data, error } = await liveClient
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
      .limit(2000);
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.post('/sales/checkout', async (req: Request, res: Response) => {
  try {
    const { bill, items, allowOversell = true } = req.body;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || `bill-${bill?.id || Date.now()}`;

    if (!bill || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: { message: 'Missing bill or items' } });
    }

    // Call dual-write service executor which implements atomic checkout
    const result = await dualWriteSyncService.executeDualWrite('BILL_AND_SALES', idempotencyKey, {
      bill,
      items,
      allowOversell,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: { message: result.error } });
    }

    // Broadcast realtime event to all connected devices/tabs
    broadcastRealtimeEvent('sales', 'INSERT', items);
    broadcastRealtimeEvent('bills', 'INSERT', bill);

    return res.json({
      success: true,
      bill_id: bill.id,
      item_count: items.length,
      total_amount: items.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.put('/sales/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const partialSale = req.body;
    const idempotencyKey = `upd-${id}-${Date.now()}`;

    const result = await dualWriteSyncService.executeDualWrite('UPDATE_SALE', idempotencyKey, {
      sale: { id, ...partialSale },
    });

    broadcastRealtimeEvent('sales', 'UPDATE', { id, ...partialSale });
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.delete('/sales/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idempotencyKey = `del-${id}-${Date.now()}`;

    const result = await dualWriteSyncService.executeDualWrite('DELETE_SALE', idempotencyKey, {
      saleId: id,
    });

    broadcastRealtimeEvent('sales', 'DELETE', { id });
    return res.json({ success: result.success, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 3. Products Endpoints
gatewayRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data, error } = await liveClient.from('products').select('*').order('name');
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.post('/products/upsert', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    const idempotencyKey = `prod-upsert-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('UPSERT_PRODUCTS', idempotencyKey, {
      products,
    });

    broadcastRealtimeEvent('products', 'UPDATE', products);
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idempotencyKey = `prod-del-${id}-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('DELETE_PRODUCTS', idempotencyKey, {
      ids: [id],
    });

    broadcastRealtimeEvent('products', 'DELETE', { id });
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 4. Catalog Endpoints
gatewayRouter.get('/catalog', async (req: Request, res: Response) => {
  try {
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data, error } = await liveClient.from('catalog_items').select('*').order('name');
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.post('/catalog/upsert', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const idempotencyKey = `cat-upsert-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('UPSERT_CATALOG_ITEMS', idempotencyKey, {
      catalogItems: items,
    });

    broadcastRealtimeEvent('catalog_items', 'UPDATE', items);
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.delete('/catalog/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idempotencyKey = `cat-del-${id}-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('DELETE_CATALOG_ITEMS', idempotencyKey, {
      ids: [id],
    });

    broadcastRealtimeEvent('catalog_items', 'DELETE', { id });
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 5. Stock Endpoints
gatewayRouter.get('/stock/stock-ins', async (req: Request, res: Response) => {
  try {
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data, error } = await liveClient.from('stock_ins').select('*').order('date', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.post('/stock/stock-in', async (req: Request, res: Response) => {
  try {
    const { record } = req.body;
    const idempotencyKey = `stock-in-${record?.id || Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('UPSERT_STOCK_INS', idempotencyKey, {
      stockIns: [record],
    });

    broadcastRealtimeEvent('stock_ins', 'INSERT', record);
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.post('/stock/bulk-stock-in', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    const idempotencyKey = `stock-bulk-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('UPSERT_STOCK_INS', idempotencyKey, {
      stockIns: records,
    });

    broadcastRealtimeEvent('stock_ins', 'INSERT', records);
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.get('/stock/variant-balance', async (req: Request, res: Response) => {
  try {
    const { productId, size, base } = req.query as { productId: string; size: string; base?: string };
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data: products, error: productError } = await liveClient.from('products').select('id,initial_stock').eq('id', productId).limit(1);
    if (productError) throw productError;
    const product = products?.[0];
    const key = `${size}_${base || 'A'}`;
    const initialStock = Number(product?.initial_stock?.[key] ?? product?.initial_stock?.[size] ?? 0);

    const { data: stockIns, error: stockError } = await liveClient
      .from('stock_ins').select('quantity,product_id,size,base').eq('product_id', productId).eq('size', size);
    if (stockError) throw stockError;
    const totalStockIn = (stockIns || [])
      .filter((s: any) => s.base === base || (!s.base && !base))
      .reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);

    const { data: sales, error: salesError } = await liveClient
      .from('sales').select('quantity,product_id,size,base').eq('product_id', productId).eq('size', size);
    if (salesError) throw salesError;
    const totalSold = (sales || [])
      .filter((s: any) => s.base === base || (!s.base && !base))
      .reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);

    const balance = initialStock + totalStockIn - totalSold;
    return res.json({ success: true, data: { balance, initialStock, totalStockIn, totalSold } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 6. System Config Endpoints
gatewayRouter.get('/config/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const liveClient = getLiveClientOrFail(res);
    if (!liveClient) return;
    const { data, error } = await liveClient.from('system_configs').select('*').eq('key', key).limit(1);
    if (error) throw error;
    return res.json({ success: true, config: data?.[0] || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

gatewayRouter.put('/config/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const { value } = req.body;
    const idempotencyKey = `cfg-${key}-${Date.now()}`;
    const result = await dualWriteSyncService.executeDualWrite('SET_SYSTEM_CONFIG', idempotencyKey, {
      key,
      value,
    });

    broadcastRealtimeEvent('system_configs', 'UPDATE', { key, value });
    return res.json({ success: result.success });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});
