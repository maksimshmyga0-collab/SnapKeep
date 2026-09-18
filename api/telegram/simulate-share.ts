import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processTelegramUpdate, TelegramUpdate } from '../../server/telegramBot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { telegramUserId, text, caption } = req.body || {};
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

  const result = await processTelegramUpdate(simulatedUpdate);
  return res.status(200).json(result);
}
