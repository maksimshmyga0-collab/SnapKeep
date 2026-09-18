import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getWebhookStatus,
  getBotToken,
  normalizeAppUrl,
  getWebhookUrl,
} from '../../server/telegramBot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const botToken = getBotToken();
    const appUrl = normalizeAppUrl(process.env.APP_URL);
    const expectedWebhookUrl = getWebhookUrl(appUrl);

    if (!botToken) {
      return res.status(200).json({
        configured: false,
        message: 'TELEGRAM_BOT_TOKEN is not configured',
        appUrl,
        expectedWebhookUrl,
      });
    }

    const status = await getWebhookStatus(botToken);
    return res.status(200).json({
      configured: true,
      appUrl,
      expectedWebhookUrl,
      telegramStatus: status,
    });
  } catch (err: any) {
    console.error('[Vercel API /api/telegram/status error]', err);
    return res.status(500).json({
      configured: false,
      error: 'Failed to retrieve Telegram status',
      details: err?.message || 'Unknown error',
    });
  }
}

