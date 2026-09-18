import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateUserItem, deleteUserItem } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const itemId = Array.isArray(id) ? id[0] : id;

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (req.method === 'PATCH') {
    try {
      const { telegramUserId, ...updates } = req.body || {};
      const userId = telegramUserId || (req.query.telegramUserId as string);
      const updated = await updateUserItem(
        itemId,
        updates,
        userId ? String(userId) : undefined
      );

      if (!updated) {
        return res.status(404).json({ error: 'Item not found or unauthorized' });
      }

      return res.status(200).json({ item: updated });
    } catch (err: any) {
      console.error('[Vercel API /api/items/[id] PATCH error]', err);
      return res.status(500).json({ error: 'Failed to update item' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const userId = (req.query.telegramUserId as string) || (req.body?.telegramUserId as string);
      const success = await deleteUserItem(itemId, userId ? String(userId) : undefined);

      if (!success) {
        return res.status(404).json({ error: 'Item not found or unauthorized', success: false });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[Vercel API /api/items/[id] DELETE error]', err);
      return res.status(500).json({ error: 'Failed to delete item', success: false });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
