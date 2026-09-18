import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWebhookStatus } from '../../server/telegramBot.js';

function resolveBotToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
    return process.env.TELEGRAM_BOT_TOKEN.trim();
  }
  if (process.env.snapkeep && process.env.snapkeep.trim()) {
    return process.env.snapkeep.trim();
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const botToken = resolveBotToken();
    const appUrl = process.env.APP_URL || '';

    if (!botToken) {
      return res.status(200).json({
        configured: false,
        message: 'TELEGRAM_BOT_TOKEN is not configured',
        appUrl: appUrl || null,
        expectedWebhookUrl: appUrl ? `${appUrl.replace(/\/+$/, '')}/api/telegram/webhook` : null,
      });
    }

    const status = await getWebhookStatus(botToken);
    return res.status(200).json({
      configured: true,
      appUrl: appUrl || null,
      expectedWebhookUrl: appUrl ? `${appUrl.replace(/\/+$/, '')}/api/telegram/webhook` : null,
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
