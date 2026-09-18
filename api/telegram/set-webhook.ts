import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  registerWebhookWithTelegram,
  getBotToken,
  normalizeAppUrl,
  getWebhookUrl,
} from '../../server/telegramBot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const botToken = getBotToken();
    if (!botToken) {
      return res.status(400).json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable is not set.',
      });
    }

    const rawAppUrl =
      (req.query.appUrl as string) ||
      (req.body?.appUrl as string) ||
      process.env.APP_URL ||
      '';

    const targetAppUrl = normalizeAppUrl(rawAppUrl);
    const expectedWebhookUrl = getWebhookUrl(targetAppUrl);

    const regResult = await registerWebhookWithTelegram(botToken, targetAppUrl);
    return res.status(200).json({
      ...regResult,
      targetAppUrl,
      expectedWebhookUrl,
    });
  } catch (err: any) {
    console.error('[Vercel API /api/telegram/set-webhook error]', err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to set Telegram webhook',
      details: err?.message || 'Unknown error',
    });
  }
}

