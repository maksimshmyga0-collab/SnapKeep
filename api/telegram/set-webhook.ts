import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerWebhookWithTelegram } from '../../server/telegramBot.js';

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
    if (!botToken) {
      return res.status(400).json({
        error: 'TELEGRAM_BOT_TOKEN environment variable is not set.',
      });
    }

    const appUrl =
      (req.query.appUrl as string) ||
      (req.body?.appUrl as string) ||
      process.env.APP_URL ||
      '';

    if (!appUrl) {
      return res.status(400).json({
        error: 'APP_URL is not set and was not provided in request.',
      });
    }

    const regResult = await registerWebhookWithTelegram(botToken, appUrl);
    return res.status(200).json(regResult);
  } catch (err: any) {
    console.error('[Vercel API /api/telegram/set-webhook error]', err);
    return res.status(500).json({
      error: 'Failed to set Telegram webhook',
      details: err?.message || 'Unknown error',
    });
  }
}
