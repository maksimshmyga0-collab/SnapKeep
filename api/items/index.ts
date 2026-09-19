import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserItems, saveUserItem, updateUserItem } from '../../server/db.js';
import { fetchUrlPreview } from '../../server/urlPreview.js';

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

      // 1. First, reliably save the item in database (guaranteed save)
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

      // 2. If this is a new URL, attempt to fetch preview metadata
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
          console.warn('[Vercel API] Preview fetch non-blocking warning:', err);
        }
      }

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
