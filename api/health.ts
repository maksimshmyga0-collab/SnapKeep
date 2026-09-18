import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSupabaseConfigured } from '../server/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.snapkeep || '';
  const appUrl = process.env.APP_URL || '';

  return res.status(200).json({
    status: 'ok',
    hasTelegramToken: Boolean(token.trim()),
    hasSupabase: isSupabaseConfigured(),
    appUrl: appUrl || null,
  });
}
