import {
  extractUrlsFromTelegramMessage,
  type ExtractedUrlInfo,
  type TelegramMessagePayload,
} from './urlExtractor.js';
import { saveUserItem, type SaveItemResult } from './db.js';
import type { SavedItem } from './types.js';

export const DEFAULT_APP_URL = 'https://snap-keep-omega.vercel.app';

/**
 * Normalizes any app URL to ensure valid protocol and removes trailing slashes.
 * Defaults to the production URL: https://snap-keep-omega.vercel.app
 */
export function normalizeAppUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return DEFAULT_APP_URL;
  let clean = rawUrl.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  if (!clean) return DEFAULT_APP_URL;
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

/**
 * Returns the resolved public application URL.
 */
export function getAppUrl(): string {
  return normalizeAppUrl(process.env.APP_URL);
}

/**
 * Returns the exact Telegram Webhook URL.
 */
export function getWebhookUrl(appUrl?: string): string {
  const base = normalizeAppUrl(appUrl || process.env.APP_URL);
  return `${base}/api/telegram/webhook`;
}

/**
 * Safely resolves the Telegram bot token from environment variables.
 */
export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return token ? token.trim().replace(/^['"]|['"]$/g, '') : '';
}

/**
 * Generates an inline keyboard button to open the SnapKeep Mini App inside Telegram.
 */
export function getMiniAppKeyboard(appUrl?: string) {
  const url = normalizeAppUrl(appUrl);
  return {
    inline_keyboard: [
      [
        {
          text: 'Открыть SnapKeep',
          web_app: { url },
        },
      ],
    ],
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat?: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    caption?: string;
    entities?: any[];
    caption_entities?: any[];
  };
  edited_message?: TelegramUpdate['message'];
  channel_post?: TelegramUpdate['message'];
}

export interface ProcessResult {
  handled: boolean;
  replyText?: string;
  replyMarkup?: any;
  chatId?: number;
  telegramUserId?: string;
  savedItems?: SavedItem[];
  duplicatesCount?: number;
  newItemsCount?: number;
  message?: string;
  replySent?: boolean;
  deletedOriginalMessage?: boolean;
}

/**
 * Sends a message via Telegram Bot API with optional inline markup
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram API] Error sending message:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram API] Failed to reach Telegram sendMessage:', err);
    return false;
  }
}

/**
 * Deletes a message via Telegram Bot API deleteMessage.
 * Errors are caught and logged so message deletion failure never disrupts save or reply flows.
 */
export async function deleteTelegramMessage(
  botToken: string,
  chatId: number | string,
  messageId: number
): Promise<boolean> {
  if (!botToken || !chatId || !messageId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Telegram API] Could not delete message ${messageId} in chat ${chatId}:`, err);
      return false;
    }
    const data = await res.json();
    return Boolean(data.ok && data.result);
  } catch (err) {
    console.warn(`[Telegram API] Failed to reach Telegram deleteMessage:`, err);
    return false;
  }
}

/**
 * Processes an incoming Telegram message update.
 */
export async function processTelegramUpdate(
  update: TelegramUpdate,
  botToken?: string
): Promise<ProcessResult> {
  const message = update.message || update.edited_message || update.channel_post;
  if (!message) {
    return { handled: false, message: 'No message in update' };
  }

  const telegramUserId = message.from ? String(message.from.id) : undefined;
  const chatId = message.chat?.id;

  if (!telegramUserId || !chatId) {
    return { handled: false, message: 'Missing from.id or chat.id' };
  }

  const resolvedToken = botToken || getBotToken();
  const textContent = (message.text || message.caption || '').trim();

  // Handle /start command
  if (textContent === '/start') {
    const welcome =
      'Привет! Я бот SnapKeep.\n\n' +
      'Делитесь со мной ссылками из любых приложений (Threads, YouTube, Instagram, браузер и др.) через кнопку «Поделиться», ' +
      'и они будут мгновенно сохраняться в вашей библиотеке SnapKeep.';

    const replyMarkup = getMiniAppKeyboard();
    let replySent = false;
    if (resolvedToken) {
      replySent = await sendTelegramMessage(resolvedToken, chatId, welcome, replyMarkup);
    }
    return {
      handled: true,
      chatId,
      telegramUserId,
      replyText: welcome,
      replyMarkup,
      replySent,
    };
  }

  // Extract all URLs from message text, caption, and entities
  const extracted = extractUrlsFromTelegramMessage(message as TelegramMessagePayload);

  // If no URLs were found: do NOT save anything to database
  if (extracted.length === 0) {
    const replyText = 'Отправьте ссылку, чтобы сохранить её в SnapKeep ✓';
    const replyMarkup = getMiniAppKeyboard();
    let replySent = false;
    if (resolvedToken) {
      replySent = await sendTelegramMessage(resolvedToken, chatId, replyText, replyMarkup);
    }
    return {
      handled: true,
      chatId,
      telegramUserId,
      replyText,
      replyMarkup,
      replySent,
      newItemsCount: 0,
      duplicatesCount: 0,
    };
  }

  // Process all URLs for this user
  const results: SaveItemResult[] = [];
  for (const info of extracted) {
    const res = await saveUserItem({
      telegramUserId,
      url: info.url,
      title: info.title,
      sourceKind: info.sourceKind,
      sourceLabel: info.sourceLabel,
      category: 'Разное', // Default category: "Разное"
      createdAt: new Date().toISOString(),
    });
    results.push(res);
  }

  const newItems = results.filter((r) => !r.isDuplicate).map((r) => r.item);
  const duplicates = results.filter((r) => r.isDuplicate).map((r) => r.item);

  let replyText = '';

  // Single URL response matches user specification exactly:
  if (results.length === 1) {
    if (results[0].isDuplicate) {
      replyText = 'Эта ссылка уже сохранена ✓';
    } else {
      replyText = 'Сохранено в SnapKeep ✓';
    }
  } else {
    // Multiple URLs in one message
    if (newItems.length > 0 && duplicates.length === 0) {
      replyText = `Сохранено в SnapKeep ✓ (${newItems.length})`;
    } else if (newItems.length === 0 && duplicates.length > 0) {
      replyText = 'Все ссылки уже сохранены ✓';
    } else {
      replyText = `Сохранено в SnapKeep ✓ (${newItems.length})\nУже было сохранено: ${duplicates.length}`;
    }
  }

  const replyMarkup = getMiniAppKeyboard();

  // 1. Send the confirmation reply message to user
  let replySent = false;
  if (resolvedToken) {
    replySent = await sendTelegramMessage(resolvedToken, chatId, replyText, replyMarkup);
  }

  // 2. Delete the user's original message via deleteMessage after saving and replying
  let deletedOriginalMessage = false;
  if (resolvedToken && message.message_id) {
    deletedOriginalMessage = await deleteTelegramMessage(resolvedToken, chatId, message.message_id);
  }

  return {
    handled: true,
    chatId,
    telegramUserId,
    replyText,
    replyMarkup,
    replySent,
    deletedOriginalMessage,
    savedItems: newItems,
    newItemsCount: newItems.length,
    duplicatesCount: duplicates.length,
  };
}

/**
 * Registers the webhook with Telegram Bot API
 */
export async function registerWebhookWithTelegram(
  botToken?: string,
  appUrl?: string
): Promise<{ success: boolean; webhookUrl: string; data?: any; error?: string }> {
  const token = botToken || getBotToken();
  if (!token) {
    return { success: false, webhookUrl: '', error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }
  const cleanAppUrl = normalizeAppUrl(appUrl);
  const webhookUrl = getWebhookUrl(cleanAppUrl);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
      { method: 'POST' }
    );
    const data = await res.json();
    return { success: data.ok === true, webhookUrl, data };
  } catch (err: any) {
    return { success: false, webhookUrl, error: err.message };
  }
}

/**
 * Checks current webhook status from Telegram Bot API
 */
export async function getWebhookStatus(
  botToken?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = botToken || getBotToken();
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    return { success: data.ok === true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
