import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserItems, saveUserItem } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const telegramUserId = String(req.query.telegramUserId || '').trim();
      if (!telegramUserId) {
        return res.status(400).json({ error: 'telegramUserId query param is required' });
      }
      const items = await getUserItems(telegramUserId);
      return res.status(200).json({ items });
    } catch (err: any) {
      console.error('[Vercel API /api/items GET error]', err);
      return res.status(500).json({ error: 'Failed to retrieve items' });
    }
  }

  if (req.method === 'POST') {
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
    } catch (err: any) {
      console.error('[Vercel API /api/items POST error]', err);
      return res.status(500).json({ error: 'Failed to save item' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
