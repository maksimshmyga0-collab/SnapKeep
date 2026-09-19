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
} from './server/db.js';
import { fetchUrlPreview } from './server/urlPreview.js';
import {
  processTelegramUpdate,
  registerWebhookWithTelegram,
  getWebhookStatus,
  getBotToken,
  normalizeAppUrl,
  getWebhookUrl,
  type TelegramUpdate,
} from './server/telegramBot.js';
import { extractUrlsFromTelegramMessage } from './server/urlExtractor.js';

const PORT = Number(process.env.PORT) || 8080;

const TELEGRAM_BOT_TOKEN = getBotToken();
const APP_URL = normalizeAppUrl(process.env.APP_URL);

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
  app.get('/api/items', async (req, res) => {
    try {
      const telegramUserId = String(req.query.telegramUserId || '').trim();
      if (!telegramUserId) {
        return res.status(400).json({ error: 'telegramUserId query param is required' });
      }
      const items = await getUserItems(telegramUserId);
      res.json({ items });
    } catch (err: any) {
      console.error('[API /api/items GET error]', err);
      res.status(500).json({ error: 'Failed to retrieve items' });
    }
  });

  // POST /api/items - Save a new item (or return existing if duplicate)
  app.post('/api/items', async (req, res) => {
    try {
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

      const result = await saveUserItem({
        telegramUserId: String(telegramUserId),
        url,
        title: title || (url ? 'Ссылка' : 'Заметка'),
        sourceKind,
        sourceLabel,
        category: category || 'Разное',
        textContent,
        createdAt,
      });

      if (!result.isDuplicate && result.item.url) {
        try {
          const preview = await fetchUrlPreview(result.item.url);
          const updated = await updateUserItem(
            result.item.id,
            {
              previewTitle: preview.title,
              previewDescription: preview.description,
              previewImageUrl: preview.imageUrl,
              previewDomain: preview.domain,
              previewStatus: preview.status,
            },
            String(telegramUserId)
          );
          if (updated) {
            result.item = updated;
          }
        } catch (err) {
          console.warn('[Express API] Preview fetch non-blocking warning:', err);
        }
      }

      res.json(result);
    } catch (err: any) {
      console.error('[API /api/items POST error]', err);
      res.status(500).json({ error: 'Failed to save item' });
    }
  });

  // PATCH /api/items/:id - Update item (e.g. change category)
  app.patch('/api/items/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { telegramUserId, ...updates } = req.body || {};
      const userId = telegramUserId || (req.query.telegramUserId as string);
      const updated = await updateUserItem(id, updates, userId ? String(userId) : undefined);
      if (!updated) {
        return res.status(404).json({ error: 'Item not found or unauthorized' });
      }
      res.json({ item: updated });
    } catch (err: any) {
      console.error('[API /api/items PATCH error]', err);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // DELETE /api/items/:id - Delete an item
  app.delete('/api/items/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.query.telegramUserId as string) || (req.body?.telegramUserId as string);
      const success = await deleteUserItem(id, userId ? String(userId) : undefined);
      if (!success) {
        return res.status(404).json({ error: 'Item not found or unauthorized', success: false });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[API /api/items DELETE error]', err);
      res.status(500).json({ error: 'Failed to delete item', success: false });
    }
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
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable is not set.',
      });
    }
    const rawAppUrl = (req.query.appUrl as string) || (req.body?.appUrl as string) || APP_URL;
    const targetAppUrl = normalizeAppUrl(rawAppUrl);
    const expectedWebhookUrl = getWebhookUrl(targetAppUrl);

    const regResult = await registerWebhookWithTelegram(TELEGRAM_BOT_TOKEN, targetAppUrl);
    res.json({
      ...regResult,
      targetAppUrl,
      expectedWebhookUrl,
    });
  });

  // GET /api/telegram/status - Get current webhook information
  app.get('/api/telegram/status', async (req, res) => {
    const expectedWebhookUrl = getWebhookUrl(APP_URL);
    if (!TELEGRAM_BOT_TOKEN) {
      return res.json({
        configured: false,
        message: 'TELEGRAM_BOT_TOKEN is not configured',
        appUrl: APP_URL,
        expectedWebhookUrl,
      });
    }

    const status = await getWebhookStatus(TELEGRAM_BOT_TOKEN);
    res.json({
      configured: true,
      appUrl: APP_URL,
      expectedWebhookUrl,
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

  // Note: Webhook is NOT registered automatically on startup.
  // Use /api/telegram/set-webhook for controlled registration.

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SnapKeep Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
