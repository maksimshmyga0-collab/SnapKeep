import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processTelegramUpdate, type TelegramUpdate } from '../../server/telegramBot';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Telegram Webhook requires POST.' });
  }

  const botToken = resolveBotToken();
  const update = req.body as TelegramUpdate;

  if (!update) {
    return res.status(400).json({ ok: false, error: 'Empty update payload' });
  }

  try {
    const result = await processTelegramUpdate(update, botToken);

    // If Telegram reply was not already dispatched directly via Telegram API,
    // we can return it as an inline webhook reply payload:
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
    console.error('[Vercel Webhook Error]', err);
    // Return 200 so Telegram will not spam retry requests
    return res.status(200).json({ ok: false, error: err.message });
  }
}
