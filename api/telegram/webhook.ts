import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  processTelegramUpdate,
  getBotToken,
  type TelegramUpdate,
} from '../../server/telegramBot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Telegram Webhook requires POST.' });
  }

  const botToken = getBotToken();
  const update = req.body as TelegramUpdate;

  if (!update) {
    return res.status(400).json({ ok: false, error: 'Empty update payload' });
  }

  try {
    const result = await processTelegramUpdate(update, botToken);

    // If Telegram reply was not already dispatched directly via Telegram API,
    // return as an inline webhook reply payload:
    if (result.handled && result.chatId && result.replyText && !result.replySent) {
      const responsePayload: Record<string, any> = {
        method: 'sendMessage',
        chat_id: result.chatId,
        text: result.replyText,
        disable_web_page_preview: true,
      };
      if (result.replyMarkup) {
        responsePayload.reply_markup = result.replyMarkup;
      }
      return res.status(200).json(responsePayload);
    }

    return res.status(200).json({ ok: true, handled: result.handled });
  } catch (err: any) {
    console.error('[Vercel Webhook Error]', err);
    // Return 200 so Telegram will not spam retry requests on server errors
    return res.status(200).json({ ok: false, error: err.message });
  }
}

