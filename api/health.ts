import type { VercelRequest, VercelResponse } from '@vercel/node';

function checkTelegramToken(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.snapkeep || '';
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
    const appUrl = process.env.APP_URL ? process.env.APP_URL.trim().replace(/\/+$/, '') : null;

    return res.status(200).json({
      status: 'ok',
      hasTelegramToken,
      hasSupabase,
      appUrl: appUrl || null,
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'ok',
      hasTelegramToken: false,
      hasSupabase: false,
      appUrl: null,
      error: err?.message || 'Unknown health check error',
    });
  }
}
