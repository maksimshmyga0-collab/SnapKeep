import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getBotToken, normalizeAppUrl } from '../server/telegramBot.js';

function checkTelegramToken(): boolean {
  const token = getBotToken();
  return Boolean(token && token.trim());
}

function checkSupabase(): boolean {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  return Boolean(url.trim() && key.trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const hasTelegramToken = checkTelegramToken();
    const hasSupabase = checkSupabase();
    const appUrl = normalizeAppUrl(process.env.APP_URL);

    return res.status(200).json({
      status: 'ok',
      hasTelegramToken,
      hasSupabase,
      appUrl,
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'ok',
      hasTelegramToken: false,
      hasSupabase: false,
      appUrl: 'https://snap-keep-omega.vercel.app',
      error: err?.message || 'Unknown health check error',
    });
  }
}

