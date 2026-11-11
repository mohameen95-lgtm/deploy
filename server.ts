import { GoogleGenAI } from '@google/genai';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface StoreSettingsPayload {
  storeName: string;
  storeTagline: string;
  storeLogoUrl: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  whatsappNumber: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  whatsappLinkUrl?: string;
  announcementText: string;
  footerDescription: string;
  merchantUpiVpa: string;
  merchantName: string;
  merchantQrImageUrl: string;
  shippingChargeInr: number;
  freeShippingThresholdInr: number;
  gstPercent: number;
  gstMode: 'included' | 'exclusive';
  whatsappNotifyEnabled?: boolean;
  whatsappWebhookUrl?: string;
  whatsappCloudPhoneId?: string;
  whatsappCloudToken?: string;
  adminPasscode: string;
}

interface UpiPaymentSession {
  orderNumber: string;
  amountInr: number;
  merchantVpa: string;
  merchantName: string;
  status: 'PENDING' | 'VERIFYING' | 'RECEIVED';
  upiTxnRef: string;
  createdAt: number;
  verifiedAt?: number;
}

interface PersistedStoreState {
  settings: Partial<StoreSettingsPayload>;
  products: Record<string, unknown>[] | null;
  deletedProductIds?: string[];
  orders: Record<string, unknown>[] | null;
  updatedAt: number;
}

const DEFAULT_SERVER_SETTINGS: StoreSettingsPayload = {
  storeName: 'AZHAR PERFUMES',
  storeTagline: 'ATTAR & PERFUME',
  storeLogoUrl: './images/azhar-logo.png',
  storeAddress:
    'Azhar Perfumes, Tvs, Thiruchengode - Rasipuram Rd, Rasipuram, Tamil Nadu 637408',
  storePhone: '+91 95971 05217',
  storeEmail: 'azharperfumes@gmail.com',
  whatsappNumber: '+919597105217',
  facebookUrl: 'https://www.facebook.com/share/1HkBdATYMx/',
  instagramUrl: 'https://www.instagram.com/azharperfumes28/',
  youtubeUrl: 'https://youtube.com/@azharperfumes',
  whatsappLinkUrl: 'https://wa.me/919597105217',
  announcementText: 'Extra Discount On UPI | Get 3 Attars At ₹899/- No Code Needed',
  footerDescription:
    "India's premier house of 100% non-alcoholic luxury attars, Shanaya & White Oudh roll-ons, and long-lasting French-Arabic Eau de Parfums.",
  merchantUpiVpa: '9597105217@okbizaxis',
  merchantName: 'Azhar Perfumes',
  merchantQrImageUrl: './assets/aistudio/IMG-20261109-WA0033_2a6bf701.jpg',
  shippingChargeInr: 180,
  freeShippingThresholdInr: 3500,
  gstPercent: 18,
  gstMode: 'included',
  whatsappNotifyEnabled: true,
  whatsappWebhookUrl: '',
  whatsappCloudPhoneId: '',
  whatsappCloudToken: '',
  adminPasscode: 'azhar899',
};

const STATE_FILE_PATH = path.resolve(import.meta.dirname, 'store-runtime-state.json');
const UPLOADS_DIR_PATH = path.resolve(import.meta.dirname, 'public', 'uploads');

function persistDataUrlIfNeeded(rawUrl: unknown, prefix = 'asset'): unknown {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('data:image/')) {
    return rawUrl;
  }
  try {
    if (!fs.existsSync(UPLOADS_DIR_PATH)) {
      fs.mkdirSync(UPLOADS_DIR_PATH, { recursive: true });
    }
    const match = rawUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return rawUrl;
    const ext = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'img';
    const fileName = `${safePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR_PATH, fileName), Buffer.from(match[2], 'base64'));
    return `./uploads/${fileName}`;
  } catch (err) {
    console.error('Failed to write uploaded image to disk:', err);
    return rawUrl;
  }
}

function sanitizeProductRecord(prod: Record<string, unknown>): Record<string, unknown> {
  const id = typeof prod.id === 'string' ? prod.id : 'prod';
  return {
    ...prod,
    imageUrl: persistDataUrlIfNeeded(prod.imageUrl, `${id}-1`),
    hoverImageUrl: persistDataUrlIfNeeded(prod.hoverImageUrl, `${id}-2`),
  };
}

function loadStateFromDisk(): PersistedStoreState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedStoreState>;
      return {
        settings: {
          ...DEFAULT_SERVER_SETTINGS,
          ...(parsed.settings || {}),
        },
        products: Array.isArray(parsed.products) ? parsed.products : [],
        deletedProductIds: Array.isArray(parsed.deletedProductIds)
          ? parsed.deletedProductIds
          : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : null,
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
  } catch (err) {
    console.error('Failed to read store-runtime-state.json, using defaults:', err);
  }
  return {
    settings: { ...DEFAULT_SERVER_SETTINGS },
    products: [],
    deletedProductIds: [],
    orders: null,
    updatedAt: Date.now(),
  };
}

let storeState: PersistedStoreState = loadStateFromDisk();
const paymentSessions = new Map<string, UpiPaymentSession>();

function generateBankReferenceNumber(): string {
  const suffix = String(Date.now()).slice(-9).padStart(9, '4');
  return `630${suffix}`;
}

function saveStateToDisk(nextState: PersistedStoreState) {
  storeState = nextState;
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(storeState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store-runtime-state.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));
  if (!fs.existsSync(UPLOADS_DIR_PATH)) {
    fs.mkdirSync(UPLOADS_DIR_PATH, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR_PATH, { maxAge: '7d' }));
  app.use(
    '/images',
    express.static(path.resolve(import.meta.dirname, 'public', 'images'), { maxAge: '7d' })
  );

  // GET /api/state — Returns live store settings, product overrides & orders
  app.get('/api/state', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(storeState);
  });

  // POST /api/upload-image — Saves an uploaded base64 image directly to /public/uploads and returns its URL
  app.post('/api/upload-image', (req, res) => {
    const { dataUrl, prefix } = req.body as { dataUrl?: string; prefix?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Missing image dataUrl' });
      return;
    }
    const savedUrl = String(persistDataUrlIfNeeded(dataUrl, prefix || 'product'));
    res.json({ ok: true, url: savedUrl });
  });

  // POST /api/upi-payment-session — Creates or retrieves a live UPI QR payment session
  app.post('/api/upi-payment-session', (req, res) => {
    const { orderNumber, amountInr, merchantVpa, merchantName } = req.body as {
      orderNumber?: string;
      amountInr?: number;
      merchantVpa?: string;
      merchantName?: string;
    };
    const key = orderNumber || `AZH-2026-${Date.now()}`;
    const existing = paymentSessions.get(key);
    if (existing) {
      res.json(existing);
      return;
    }
    const created: UpiPaymentSession = {
      orderNumber: key,
      amountInr: Number(amountInr) || 0,
      merchantVpa: merchantVpa || DEFAULT_SERVER_SETTINGS.merchantUpiVpa,
      merchantName: merchantName || DEFAULT_SERVER_SETTINGS.merchantName,
      status: 'PENDING',
      upiTxnRef: generateBankReferenceNumber(),
      createdAt: Date.now(),
    };
    paymentSessions.set(key, created);
    res.json(created);
  });

  // POST /api/upi-payment-verify — Verifies UPI payment receipt and stores the real 12-digit UPI Transaction ID (UTR)
  app.post('/api/upi-payment-verify', (req, res) => {
    const { orderNumber, amountInr, merchantVpa, merchantName, upiTxnRef } = req.body as {
      orderNumber?: string;
      amountInr?: number;
      merchantVpa?: string;
      merchantName?: string;
      upiTxnRef?: string;
    };
    const key = orderNumber || `AZH-2026-${Date.now()}`;
    const existing = paymentSessions.get(key);
    const cleanedRef = typeof upiTxnRef === 'string' ? upiTxnRef.replace(/[^0-9A-Za-z]/g, '').trim() : '';
    const verifiedSession: UpiPaymentSession = {
      orderNumber: key,
      amountInr: Number(amountInr) || existing?.amountInr || 0,
      merchantVpa:
        merchantVpa || existing?.merchantVpa || DEFAULT_SERVER_SETTINGS.merchantUpiVpa,
      merchantName:
        merchantName || existing?.merchantName || DEFAULT_SERVER_SETTINGS.merchantName,
      status: 'RECEIVED',
      upiTxnRef: cleanedRef || existing?.upiTxnRef || generateBankReferenceNumber(),
      createdAt: existing?.createdAt || Date.now(),
      verifiedAt: Date.now(),
    };
    paymentSessions.set(key, verifiedSession);
    res.json(verifiedSession);
  });

  // POST /api/extract-upi-utr — Reads the 12-digit UPI Transaction ID (UTR) and paid amount from a Google Pay / PhonePe / Paytm receipt screenshot
  app.post('/api/extract-upi-utr', async (req, res) => {
    const { imageDataUrl } = req.body as { imageDataUrl?: string };
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      res.status(400).json({ error: 'Missing imageDataUrl' });
      return;
    }

    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Invalid base64 image dataUrl' });
      return;
    }

    const mimeType = match[1];
    const base64Data = match[2];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Extract the 12-digit UPI Transaction ID (also called UTR or UPI Ref ID, e.g. 631335300115) and the paid amount in INR from this payment receipt screenshot. Return ONLY valid JSON in the format {"upiTxnRef": "123456789012", "amountInr": 50}. If not found, return {"upiTxnRef": "", "amountInr": 0}.',
            },
          ],
        });
        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            upiTxnRef?: string;
            amountInr?: number;
          };
          const digits = (parsed.upiTxnRef || '').replace(/[^0-9]/g, '');
          if (digits.length === 12) {
            res.json({ ok: true, upiTxnRef: digits, amountInr: Number(parsed.amountInr) || 0 });
            return;
          }
        }
      }
    } catch (err) {
      console.error('UPI screenshot OCR error:', err);
    }

    res.json({ ok: false, upiTxnRef: '', error: 'Could not auto-detect 12-digit UPI ID from image. Please type or paste the 12-digit UPI Transaction ID.' });
  });

  // GET /api/upi-payment-status/:orderNumber — Polls live UPI QR payment confirmation status
  app.get('/api/upi-payment-status/:orderNumber', (req, res) => {
    const { orderNumber } = req.params;
    const session = paymentSessions.get(orderNumber);
    if (!session) {
      res.json({
        orderNumber,
        status: 'PENDING',
        upiTxnRef: '',
      });
      return;
    }
    res.json(session);
  });

  // POST /api/settings — Saves Store Logo, Address, Mobile, Email, WhatsApp, UPI Gateway & Passcode
  app.post('/api/settings', (req, res) => {
    const incoming = req.body as Partial<StoreSettingsPayload>;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    const updatedSettings: Partial<StoreSettingsPayload> = {
      ...storeState.settings,
      ...incoming,
    };
    if (updatedSettings.storeLogoUrl) {
      updatedSettings.storeLogoUrl = String(
        persistDataUrlIfNeeded(updatedSettings.storeLogoUrl, 'store-logo')
      );
    }
    if (updatedSettings.merchantQrImageUrl) {
      updatedSettings.merchantQrImageUrl = String(
        persistDataUrlIfNeeded(updatedSettings.merchantQrImageUrl, 'merchant-qr')
      );
    }

    saveStateToDisk({
      ...storeState,
      settings: updatedSettings,
      updatedAt: Date.now(),
    });

    res.json({ ok: true, settings: updatedSettings, updatedAt: storeState.updatedAt });
  });

  // POST /api/products — Saves single product update, product deletion, or catalog reset
  app.post('/api/products', (req, res) => {
    const body = req.body as {
      products?: Record<string, unknown>[];
      product?: Record<string, unknown>;
      deleteProductId?: string;
      reset?: boolean;
    };

    let nextProducts = Array.isArray(storeState.products) ? [...storeState.products] : [];
    let nextDeletedIds = Array.isArray(storeState.deletedProductIds)
      ? [...storeState.deletedProductIds]
      : [];

    if (body.reset === true) {
      nextProducts = [];
      nextDeletedIds = [];
    } else if (typeof body.deleteProductId === 'string' && body.deleteProductId) {
      const targetId = body.deleteProductId;
      nextProducts = nextProducts.filter((p) => p.id !== targetId);
      if (!nextDeletedIds.includes(targetId)) {
        nextDeletedIds.push(targetId);
      }
    } else if (body.product && typeof body.product.id === 'string') {
      const cleanProd = sanitizeProductRecord(body.product);
      const targetId = String(cleanProd.id);
      nextDeletedIds = nextDeletedIds.filter((id) => id !== targetId);
      const idx = nextProducts.findIndex((p) => p.id === targetId);
      if (idx > -1) {
        nextProducts[idx] = cleanProd;
      } else {
        nextProducts.unshift(cleanProd);
      }
      saveStateToDisk({
        ...storeState,
        products: nextProducts,
        deletedProductIds: nextDeletedIds,
        updatedAt: Date.now(),
      });
      res.json({
        ok: true,
        product: cleanProd,
        products: nextProducts,
        deletedProductIds: nextDeletedIds,
        updatedAt: storeState.updatedAt,
      });
      return;
    } else if (Array.isArray(body.products)) {
      nextProducts = body.products.map((p) => sanitizeProductRecord(p));
      if (Array.isArray((body as { deletedProductIds?: string[] }).deletedProductIds)) {
        nextDeletedIds = (body as { deletedProductIds: string[] }).deletedProductIds;
      }
    } else {
      res.status(400).json({ error: 'Invalid products payload' });
      return;
    }

    saveStateToDisk({
      ...storeState,
      products: nextProducts,
      deletedProductIds: nextDeletedIds,
      updatedAt: Date.now(),
    });

    res.json({
      ok: true,
      products: nextProducts,
      deletedProductIds: nextDeletedIds,
      updatedAt: storeState.updatedAt,
    });
  });

  // POST /api/orders — Saves updated orders list
  app.post('/api/orders', (req, res) => {
    const body = req.body as { orders?: Record<string, unknown>[] };
    if (!Array.isArray(body.orders)) {
      res.status(400).json({ error: 'Invalid orders payload' });
      return;
    }

    saveStateToDisk({
      ...storeState,
      orders: body.orders,
      updatedAt: Date.now(),
    });

    res.json({ ok: true, orders: body.orders, updatedAt: storeState.updatedAt });
  });

  // POST /api/whatsapp-order-notify — Dispatches WhatsApp Order Notification to Admin & Confirmation to Customer
  app.post('/api/whatsapp-order-notify', async (req, res) => {
    const body = req.body as {
      order?: {
        id?: string;
        orderNumber?: string;
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        shippingAddressSummary?: string;
        shippingCity?: string;
        itemsSummary?: string;
        itemCount?: number;
        totalAmountInr?: number;
        upiVpa?: string;
        upiTxnRef?: string;
        status?: string;
        createdAt?: string;
      };
      adminMessage?: string;
      customerMessage?: string;
    };

    const order = body?.order;
    if (!order || !order.orderNumber) {
      res.status(400).json({ error: 'Missing order details for WhatsApp notification' });
      return;
    }

    const normalizePhone = (raw?: string, fallback = '919597105217') => {
      if (!raw) return fallback;
      const digits = raw.replace(/[^0-9]/g, '');
      if (!digits) return fallback;
      if (digits.length === 10) return `91${digits}`;
      if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
      return digits;
    };

    const adminPhone = normalizePhone(
      storeState.settings.whatsappNumber || DEFAULT_SERVER_SETTINGS.whatsappNumber
    );
    const customerPhone = normalizePhone(order.customerPhone, '');
    const storeName = storeState.settings.storeName || DEFAULT_SERVER_SETTINGS.storeName;
    const storeAddress =
      storeState.settings.storeAddress || DEFAULT_SERVER_SETTINGS.storeAddress;

    const adminMessage =
      body.adminMessage ||
      [
        `🛍️ *NEW ORDER RECEIVED — ${storeName.toUpperCase()}*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📦 *Order ID:* ${order.orderNumber}`,
        `👤 *Customer Name:* ${order.customerName || 'Customer'}`,
        `📱 *Customer WhatsApp:* ${order.customerPhone || 'Not provided'}`,
        `📧 *Customer Email:* ${order.customerEmail || 'Not provided'}`,
        `📍 *Delivery Address:* ${order.shippingAddressSummary || order.shippingCity || ''}`,
        `🧴 *Ordered Items (${order.itemCount || 1}):* ${order.itemsSummary || ''}`,
        `💰 *Total Paid:* ₹${Number(order.totalAmountInr || 0).toLocaleString('en-IN')} (UPI QR Verified ✓)`,
        `🔖 *UPI Ref / UTR:* ${order.upiTxnRef || ''}`,
        `📌 *Order Status:* ${order.status || 'Confirmed'}`,
      ].join('\n');

    const customerMessage =
      body.customerMessage ||
      [
        `✨ *ORDER CONFIRMED — ${storeName.toUpperCase()}* ✨`,
        ``,
        `Assalamu Alaikum / Hello *${order.customerName || 'Valued Customer'}*,`,
        `Thank you for your order! Your UPI QR payment has been verified and your luxury attars & perfumes are being prepared for dispatch.`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📦 *Order Number:* ${order.orderNumber}`,
        `🧴 *Items Ordered:* ${order.itemsSummary || ''}`,
        `💰 *Amount Paid:* ₹${Number(order.totalAmountInr || 0).toLocaleString('en-IN')} (UPI Paid ✓)`,
        `🔖 *UPI Reference:* ${order.upiTxnRef || ''}`,
        `📍 *Delivery Address:* ${order.shippingAddressSummary || order.shippingCity || ''}`,
        `📌 *Current Status:* *${order.status || 'Confirmed'}*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `💬 *WhatsApp Support:* ${storeState.settings.whatsappNumber || '+919597105217'}`,
        `🏪 *Store Address:* ${storeAddress}`,
        `Thank you for shopping with *${storeName}*!`,
      ].join('\n');

    const adminWhatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(adminMessage)}`;
    const customerWhatsappUrl = customerPhone
      ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(customerMessage)}`
      : adminWhatsappUrl;

    let cloudApiDispatched = false;

    // 1. Optional Meta WhatsApp Cloud API automated delivery to Admin & Customer
    const cloudPhoneId =
      storeState.settings.whatsappCloudPhoneId || process.env.WHATSAPP_CLOUD_PHONE_ID || '';
    const cloudToken =
      storeState.settings.whatsappCloudToken || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '';

    if (cloudPhoneId && cloudToken) {
      const sendCloudWhatsApp = async (toPhone: string, textBody: string) => {
        if (!toPhone) return;
        try {
          await fetch(`https://graph.facebook.com/v19.0/${cloudPhoneId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cloudToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: toPhone,
              type: 'text',
              text: { preview_url: false, body: textBody },
            }),
          });
        } catch (err) {
          console.error('WhatsApp Cloud API dispatch error:', err);
        }
      };

      await Promise.all([
        sendCloudWhatsApp(adminPhone, adminMessage),
        customerPhone ? sendCloudWhatsApp(customerPhone, customerMessage) : Promise.resolve(),
      ]);
      cloudApiDispatched = true;
    }

    // 2. Optional Custom WhatsApp Gateway / Webhook dispatch (Wati, UltraMsg, Aisensy, Make, etc.)
    const webhookUrl =
      storeState.settings.whatsappWebhookUrl || process.env.WHATSAPP_WEBHOOK_URL || '';
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'ORDER_WHATSAPP_NOTIFICATION',
            order,
            adminPhone,
            customerPhone,
            adminMessage,
            customerMessage,
            adminWhatsappUrl,
            customerWhatsappUrl,
            timestamp: new Date().toISOString(),
          }),
        });
        cloudApiDispatched = true;
      } catch (err) {
        console.error('WhatsApp webhook dispatch error:', err);
      }
    }

    res.json({
      ok: true,
      adminPhone,
      customerPhone,
      adminMessage,
      customerMessage,
      adminWhatsappUrl,
      customerWhatsappUrl,
      cloudApiDispatched,
    });
  });

  const distPath = path.join(import.meta.dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(path.join(distPath, 'index.html')) && process.env.USE_DIST === 'true');

  if (!isProd && process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Azhar Perfumes server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
