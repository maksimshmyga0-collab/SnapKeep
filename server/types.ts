export type CategoryName =
  | 'Учёба'
  | 'Идеи'
  | 'Дизайн'
  | 'Деньги'
  | 'Творчество'
  | 'Разное';

export type SourceKind =
  | 'video'
  | 'article'
  | 'note'
  | 'telegram'
  | 'web'
  | 'manual'
  | 'instagram'
  | 'youtube'
  | 'twitter';

export interface SavedItem {
  id: string;
  telegramUserId?: string;
  title: string;
  url?: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  category: CategoryName;
  textContent?: string;
  createdAt: string;
}
