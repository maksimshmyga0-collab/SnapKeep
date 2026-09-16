import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getUserItems,
  saveUserItem,
  updateUserItem,
  deleteUserItem,
  findUserDuplicate,
} from './server/db';
import {
  processTelegramUpdate,
  registerWebhookWithTelegram,
  getWebhookStatus,
  TelegramUpdate,
} from './server/telegramBot';
import { extractUrlsFromTelegramMessage } from './server/urlExtractor';

const PORT = 3000;

function resolveBotToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  if (process.env.snapkeep && process.env.snapkeep.trim()) {
    return process.env.snapkeep.trim();
  }
  try {
    const devEnvPath = '/app/.dev.env.json';
    if (fs.existsSync(devEnvPath)) {
      const data = JSON.parse(fs.readFileSync(devEnvPath, 'utf-8'));
      const token = data.TELEGRAM_BOT_TOKEN || data.snapkeep || '';
      if (token && typeof token === 'string' && token.trim()) {
        return token.trim();
      }
    }
  } catch {}
  return '';
}

const TELEGRAM_BOT_TOKEN = resolveBotToken();
const APP_URL = process.env.APP_URL || '';

async function startServer() {
  const app = express();

  // Parse JSON and urlencoded payloads
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --------------------------------------------------------------------------
  // API Routes
  // --------------------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasTelegramToken: Boolean(TELEGRAM_BOT_TOKEN),
      appUrl: APP_URL || null,
    });
  });

  // GET /api/items - Retrieve all items for a given telegramUserId
  app.get('/api/items', (req, res) => {
    const telegramUserId = String(req.query.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId query param is required' });
    }
    const items = getUserItems(telegramUserId);
    res.json({ items });
  });

  // POST /api/items - Save a new item (or return existing if duplicate)
  app.post('/api/items', (req, res) => {
    const {
      telegramUserId,
      url,
      title,
      sourceKind,
      sourceLabel,
      category,
      textContent,
      createdAt,
    } = req.body;

    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId is required' });
    }

    const result = saveUserItem({
      telegramUserId: String(telegramUserId),
      url,
      title: title || (url ? 'Ссылка' : 'Заметка'),
      sourceKind,
      sourceLabel,
      category: category || 'Разное',
      textContent,
      createdAt,
    });

    res.json(result);
  });

  // PATCH /api/items/:id - Update item (e.g. change category)
  app.patch('/api/items/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updated = updateUserItem(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ item: updated });
  });

  // DELETE /api/items/:id - Delete an item
  app.delete('/api/items/:id', (req, res) => {
    const { id } = req.params;
    const success = deleteUserItem(id);
    res.json({ success });
  });

  // --------------------------------------------------------------------------
  // Telegram Bot Webhook & Integration Endpoints
  // --------------------------------------------------------------------------

  // POST /api/telegram/webhook - The official Telegram webhook receiver
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update = req.body as TelegramUpdate;

      const result = await processTelegramUpdate(update, TELEGRAM_BOT_TOKEN);

      // Telegram accepts direct webhook reply in response body if not already sent via API:
      if (result.handled && result.chatId && result.replyText && !result.replySent) {
        return res.status(200).json({
          method: 'sendMessage',
          chat_id: result.chatId,
          text: result.replyText,
          disable_web_page_preview: true,
        });
      }

      return res.status(200).json({ ok: true, handled: result.handled });
    } catch (err: any) {
      console.error('[Webhook Error]', err);
      // Always return 200 to Telegram to prevent retry storms
      return res.status(200).json({ ok: false, error: err.message });
    }
  });

  // POST /api/telegram/simulate-share - Endpoint to simulate "Share to Telegram"
  // Allows testing link extraction and deduplication directly
  app.post('/api/telegram/simulate-share', async (req, res) => {
    const { telegramUserId, text, caption } = req.body;
    if (!telegramUserId || (!text && !caption)) {
      return res.status(400).json({
        error: 'telegramUserId and text or caption are required',
      });
    }

    const simulatedUpdate: TelegramUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      message: {
        message_id: Math.floor(Math.random() * 10000),
        from: {
          id: Number(telegramUserId) || 12345678,
          is_bot: false,
          first_name: 'TestUser',
        },
        chat: {
          id: Number(telegramUserId) || 12345678,
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text,
        caption,
      },
    };

    // Pass undefined botToken so it doesn't try to call Telegram API for simulated requests
    const result = await processTelegramUpdate(simulatedUpdate);
    res.json(result);
  });

  // GET/POST /api/telegram/set-webhook - Registers webhook with Telegram Bot API
  app.all('/api/telegram/set-webhook', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({
        error: 'TELEGRAM_BOT_TOKEN environment variable is not set.',
      });
    }
    const appUrl = (req.query.appUrl as string) || (req.body.appUrl as string) || APP_URL;
    if (!appUrl) {
      return res.status(400).json({
        error: 'APP_URL is not set and was not provided in request.',
      });
    }

    const regResult = await registerWebhookWithTelegram(TELEGRAM_BOT_TOKEN, appUrl);
    res.json(regResult);
  });

  // GET /api/telegram/status - Get current webhook information
  app.get('/api/telegram/status', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) {
      return res.json({
        configured: false,
        message: 'TELEGRAM_BOT_TOKEN is not configured',
        appUrl: APP_URL || null,
        expectedWebhookUrl: APP_URL ? `${APP_URL}/api/telegram/webhook` : null,
      });
    }

    const status = await getWebhookStatus(TELEGRAM_BOT_TOKEN);
    res.json({
      configured: true,
      appUrl: APP_URL || null,
      expectedWebhookUrl: APP_URL ? `${APP_URL}/api/telegram/webhook` : null,
      telegramStatus: status,
    });
  });

  // --------------------------------------------------------------------------
  // Vite Middleware / Static serving
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Attempt automatic webhook registration if both token and URL are present
  if (TELEGRAM_BOT_TOKEN && APP_URL) {
    registerWebhookWithTelegram(TELEGRAM_BOT_TOKEN, APP_URL)
      .then((r) => {
        if (r.success) {
          console.log(`[Telegram] Webhook successfully registered at: ${APP_URL}/api/telegram/webhook`);
        } else {
          console.warn(`[Telegram] Webhook auto-registration note:`, r.error || r.data);
        }
      })
      .catch((e) => console.warn('[Telegram] Auto-registration failed:', e));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SnapKeep Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
