import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategoryName, MainTab, SavedItem } from './types';
import { initTelegramApp } from './services/telegram';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { SavedView } from './views/SavedView';
import { CategoriesView } from './views/CategoriesView';
import { SaveLinkSheet } from './components/SaveLinkSheet';
import { SaveNoteSheet } from './components/SaveNoteSheet';
import { ItemDetailSheet } from './components/ItemDetailSheet';
import { Toast } from './components/Toast';
import { DistortedGrid } from './components/DistortedGrid';

const STORAGE_KEY_ITEMS = 'snapkeep_user_saved_items_v3';

// Helper to determine if an ISO date string is from today
function isCreatedToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
}

export default function App() {
  // Telegram initialization & legacy demo key cleanup
  useEffect(() => {
    initTelegramApp();
    try {
      localStorage.removeItem('snapkeep_saved_items_v2');
      localStorage.removeItem('snapkeep_category_counts_v2');
      localStorage.removeItem('snapkeep_total_saved_v2');
      localStorage.removeItem('snapkeep_today_count_v2');
    } catch {}
  }, []);

  // Primary navigation state (Strictly 3 tabs: HOME, SAVED, CATEGORIES)
  const [activeTab, setActiveTab] = useState<MainTab>('HOME');

  // Persistence: Saved items (clean initial state: empty array)
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load stored items', e);
    }
    return [];
  });

  // Dynamic statistics strictly calculated from real saved items
  const totalSaved = savedItems.length;

  const todayCount = useMemo(() => {
    return savedItems.filter((item) => isCreatedToday(item.createdAt)).length;
  }, [savedItems]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryName, number> = {
      Учёба: 0,
      Идеи: 0,
      Дизайн: 0,
      Деньги: 0,
      Творчество: 0,
      Разное: 0,
    };
    for (const item of savedItems) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [savedItems]);

  // Search state for SAVED screen
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoFocusSearch, setAutoFocusSearch] = useState<boolean>(false);

  // Category view active filter
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | null>(null);

  // Modals / Bottom sheets
  const [isSaveLinkOpen, setIsSaveLinkOpen] = useState<boolean>(false);
  const [isSaveNoteOpen, setIsSaveNoteOpen] = useState<boolean>(false);
  const [activeDetailItem, setActiveDetailItem] = useState<SavedItem | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync saved items to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(savedItems));
    } catch (e) {
      console.warn('Failed to persist items', e);
    }
  }, [savedItems]);

  // Handlers for Save actions
  const handleSaveItem = (itemData: Omit<SavedItem, 'id' | 'createdAt'>) => {
    const newItem: SavedItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    setSavedItems((prev) => [newItem, ...prev]);
  };

  // Quick Save from Clipboard
  const handleSaveClipboardLink = (url: string) => {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let source = 'ссылка';
    try {
      const parsed = new URL(formattedUrl);
      source = parsed.hostname.replace(/^www\./, '');
    } catch {
      source = 'ссылка';
    }

    const isVideo =
      formattedUrl.includes('youtube') ||
      formattedUrl.includes('youtu.be') ||
      formattedUrl.includes('vimeo') ||
      formattedUrl.includes('tiktok');

    let title = source;
    try {
      const parsed = new URL(formattedUrl);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = decodeURIComponent(segments[segments.length - 1]).replace(/[-_]/g, ' ');
        if (last.length > 3) {
          title = last.slice(0, 60);
        }
      }
    } catch {}

    if (!title || title === source) {
      title = isVideo ? `Видео (${source})` : `Ссылка (${source})`;
    }

    handleSaveItem({
      title,
      url: formattedUrl,
      sourceKind: isVideo ? 'video' : 'article',
      sourceLabel: source,
      category: 'Разное',
    });
  };

  // Handler for Deleting an item
  const handleDeleteItem = (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Handler for updating an item's category
  const handleUpdateCategory = (id: string, newCategory: CategoryName) => {
    setSavedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCategory } : item))
    );
    setActiveDetailItem((prev) => (prev && prev.id === id ? { ...prev, category: newCategory } : prev));
  };

  // Home Screen: Tapping Search opens Saved screen with search active
  const handleOpenSearchFromHome = () => {
    setAutoFocusSearch(true);
    setActiveTab('SAVED');
  };

  // Home Screen: Tapping a Category chip opens Categories screen filtered to that category
  const handleSelectCategoryFromHome = (cat: CategoryName) => {
    setSelectedCategory(cat);
    setActiveTab('CATEGORIES');
  };

  return (
    <div
      id="snapkeep-app-root"
      className="w-full min-h-[100dvh] h-[100dvh] bg-[#111214] matte-graphite-bg text-[#F2F3F5] flex flex-col overflow-hidden select-none"
      style={{
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Full-screen Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col overflow-hidden relative">
        {/* Organic Distorted Grid at Top with Vertical Fade */}
        <DistortedGrid />

        {/* VIEW 1: HOME */}
        {activeTab === 'HOME' && (
          <HomeView
            totalSaved={totalSaved}
            todayCount={todayCount}
            categoryCounts={categoryCounts}
            savedItems={savedItems}
            onOpenSearch={handleOpenSearchFromHome}
            onSelectCategory={handleSelectCategoryFromHome}
            onOpenSaveLink={() => setIsSaveLinkOpen(true)}
            onOpenSaveNote={() => setIsSaveNoteOpen(true)}
            onSaveClipboardLink={handleSaveClipboardLink}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 2: SAVED */}
        {activeTab === 'SAVED' && (
          <SavedView
            items={savedItems}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectItem={(item) => setActiveDetailItem(item)}
            autoFocusSearch={autoFocusSearch}
          />
        )}

        {/* VIEW 3: CATEGORIES */}
        {activeTab === 'CATEGORIES' && (
          <CategoriesView
            categoryCounts={categoryCounts}
            items={savedItems}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectItem={(item) => setActiveDetailItem(item)}
          />
        )}

        {/* BOTTOM NAVIGATION: Strictly 3 tabs (HOME, SAVED, CATEGORIES) */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'SAVED' && activeTab !== 'SAVED') {
              setAutoFocusSearch(false);
            }
            setActiveTab(tab);
          }}
          savedCount={totalSaved}
        />
      </div>

      {/* SAVE LINK FLOW (Bottom Sheet) */}
      <SaveLinkSheet
        isOpen={isSaveLinkOpen}
        onClose={() => setIsSaveLinkOpen(false)}
        onSave={handleSaveItem}
      />

      {/* SAVE NOTE FLOW (Bottom Sheet) */}
      <SaveNoteSheet
        isOpen={isSaveNoteOpen}
        onClose={() => setIsSaveNoteOpen(false)}
        onSave={handleSaveItem}
      />

      {/* ITEM DETAIL & ACTIONS (Bottom Sheet) */}
      <ItemDetailSheet
        item={activeDetailItem}
        onClose={() => setActiveDetailItem(null)}
        onDelete={handleDeleteItem}
        onUpdateCategory={handleUpdateCategory}
      />
    </div>
  );
}
