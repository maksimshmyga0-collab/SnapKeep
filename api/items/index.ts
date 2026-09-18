import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserItems, saveUserItem } from '../../server/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const telegramUserId = String(req.query.telegramUserId || '').trim();
      
      // If telegramUserId is not provided (e.g. direct browser visit or health check),
      // return 200 with an empty list instead of crashing or throwing 400
      if (!telegramUserId) {
        return res.status(200).json({
          items: [],
          message: 'telegramUserId query parameter is required to filter user items',
        });
      }

      const items = await getUserItems(telegramUserId);
      return res.status(200).json({ items });
    }

    if (req.method === 'POST') {
      const {
        telegramUserId,
        url,
        title,
        sourceKind,
        sourceLabel,
        category,
        textContent,
        createdAt,
      } = req.body || {};

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

      return res.status(200).json(result);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    console.error('[Vercel API /api/items error]', err);
    return res.status(500).json({
      error: 'Failed to process request in /api/items',
      details: err?.message || 'Unknown server error',
    });
  }
}
