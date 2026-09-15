export type CategoryName =
  | 'Учёба'
  | 'Идеи'
  | 'Дизайн'
  | 'Деньги'
  | 'Творчество'
  | 'Разное';

export type SourceKind = 'video' | 'article' | 'note';

export interface SavedItem {
  id: string;
  title: string;
  url?: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  category: CategoryName;
  textContent?: string;
  createdAt: string; // ISO string
}

export interface CategoryInfo {
  name: CategoryName;
  count: number;
}

export type MainTab = 'HOME' | 'SAVED' | 'CATEGORIES';
