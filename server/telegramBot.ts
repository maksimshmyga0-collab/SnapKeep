import {
  extractUrlsFromTelegramMessage,
  ExtractedUrlInfo,
  TelegramMessagePayload,
} from './urlExtractor';
import { saveUserItem, SaveItemResult } from './db';
import { SavedItem } from '../src/types';

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
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
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

  const textContent = (message.text || message.caption || '').trim();

  // Handle /start command
  if (textContent === '/start') {
    const welcome =
      'Привет! Я бот SnapKeep.\n\n' +
      'Делитесь со мной ссылками из любых приложений (Threads, YouTube, Instagram, браузер и др.) через кнопку «Поделиться», ' +
      'и они будут мгновенно сохраняться в вашей библиотеке SnapKeep.';

    let replySent = false;
    if (botToken) {
      replySent = await sendTelegramMessage(botToken, chatId, welcome);
    }
    return {
      handled: true,
      chatId,
      telegramUserId,
      replyText: welcome,
      replySent,
    };
  }

  // Extract all URLs from message text, caption, and entities
  const extracted = extractUrlsFromTelegramMessage(message as TelegramMessagePayload);

  // If no URLs were found
  if (extracted.length === 0) {
    // If the message has text without URL, do not save as a link
    // Only inform the user politely if it looks like an intended action
    const replyText = 'Отправьте ссылку, чтобы сохранить её в SnapKeep ✓';
    let replySent = false;
    if (botToken) {
      replySent = await sendTelegramMessage(botToken, chatId, replyText);
    }
    return {
      handled: true,
      chatId,
      telegramUserId,
      replyText,
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

  // 1. Send the confirmation reply message to user first
  let replySent = false;
  if (botToken) {
    replySent = await sendTelegramMessage(botToken, chatId, replyText);
  }

  // 2. Delete the user's original message via deleteMessage after saving and replying
  let deletedOriginalMessage = false;
  if (botToken && message.message_id) {
    deletedOriginalMessage = await deleteTelegramMessage(botToken, chatId, message.message_id);
  }

  return {
    handled: true,
    chatId,
    telegramUserId,
    replyText,
    replySent,
    deletedOriginalMessage,
    savedItems: newItems,
    newItemsCount: newItems.length,
    duplicatesCount: duplicates.length,
  };
}

/**
 * Automatically registers the webhook with Telegram Bot API
 */
export async function registerWebhookWithTelegram(
  botToken: string,
  appUrl: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }
  if (!appUrl) {
    return { success: false, error: 'APP_URL is not configured' };
  }

  const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/telegram/webhook`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
      { method: 'POST' }
    );
    const data = await res.json();
    return { success: data.ok === true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Checks current webhook status from Telegram Bot API
 */
export async function getWebhookStatus(
  botToken: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await res.json();
    return { success: data.ok === true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
