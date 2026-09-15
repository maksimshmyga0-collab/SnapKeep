import React, { useState, useEffect, useMemo } from 'react';
import { CategoryName, MainTab, SavedItem } from './types';
import { INITIAL_CATEGORY_COUNTS, INITIAL_SAVED_ITEMS } from './data/initialData';
import { initTelegramApp, triggerHaptic } from './services/telegram';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { SavedView } from './views/SavedView';
import { CategoriesView } from './views/CategoriesView';
import { SaveLinkSheet } from './components/SaveLinkSheet';
import { SaveNoteSheet } from './components/SaveNoteSheet';
import { ItemDetailSheet } from './components/ItemDetailSheet';

const STORAGE_KEY_ITEMS = 'snapkeep_saved_items_v2';
const STORAGE_KEY_COUNTS = 'snapkeep_category_counts_v2';
const STORAGE_KEY_TOTAL = 'snapkeep_total_saved_v2';
const STORAGE_KEY_TODAY = 'snapkeep_today_count_v2';

export default function App() {
  // Telegram initialization
  useEffect(() => {
    initTelegramApp();
  }, []);

  // Primary navigation state (Only 3 tabs: HOME, SAVED, CATEGORIES)
  const [activeTab, setActiveTab] = useState<MainTab>('HOME');

  // Persistence: Saved items
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load stored items', e);
    }
    return INITIAL_SAVED_ITEMS;
  });

  // Category counts
  const [categoryCounts, setCategoryCounts] = useState<Record<CategoryName, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COUNTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load category counts', e);
    }
    return INITIAL_CATEGORY_COUNTS;
  });

  // Main statistics
  const [totalSaved, setTotalSaved] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOTAL);
      if (stored) return Number(stored);
    } catch {}
    return 248;
  });

  const [todayCount, setTodayCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TODAY);
      if (stored) return Number(stored);
    } catch {}
    return 6;
  });

  // Search state for SAVED screen
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoFocusSearch, setAutoFocusSearch] = useState<boolean>(false);

  // Category view active filter
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | null>(null);

  // Modals / Bottom sheets
  const [isSaveLinkOpen, setIsSaveLinkOpen] = useState<boolean>(false);
  const [isSaveNoteOpen, setIsSaveNoteOpen] = useState<boolean>(false);
  const [activeDetailItem, setActiveDetailItem] = useState<SavedItem | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(savedItems));
      localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(categoryCounts));
      localStorage.setItem(STORAGE_KEY_TOTAL, String(totalSaved));
      localStorage.setItem(STORAGE_KEY_TODAY, String(todayCount));
    } catch (e) {
      console.warn('Failed to persist state', e);
    }
  }, [savedItems, categoryCounts, totalSaved, todayCount]);

  // Handlers for Save actions
  const handleSaveItem = (itemData: Omit<SavedItem, 'id' | 'createdAt'>) => {
    const newItem: SavedItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    setSavedItems((prev) => [newItem, ...prev]);
    setTotalSaved((prev) => prev + 1);
    setTodayCount((prev) => prev + 1);

    setCategoryCounts((prev) => ({
      ...prev,
      [newItem.category]: (prev[newItem.category] || 0) + 1,
    }));
  };

  // Handler for Deleting an item
  const handleDeleteItem = (id: string) => {
    const itemToDelete = savedItems.find((item) => item.id === id);
    if (!itemToDelete) return;

    setSavedItems((prev) => prev.filter((item) => item.id !== id));
    setTotalSaved((prev) => Math.max(0, prev - 1));

    setCategoryCounts((prev) => ({
      ...prev,
      [itemToDelete.category]: Math.max(0, (prev[itemToDelete.category] || 1) - 1),
    }));
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
      className="w-full min-h-[100dvh] h-[100dvh] bg-[#0B0C0E] text-[#F2F3F5] flex flex-col overflow-hidden select-none"
      style={{
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Full-screen Responsive Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col overflow-hidden relative">
        {/* VIEW 1: HOME */}
        {activeTab === 'HOME' && (
          <HomeView
            totalSaved={totalSaved}
            todayCount={todayCount}
            categoryCounts={categoryCounts}
            onOpenSearch={handleOpenSearchFromHome}
            onSelectCategory={handleSelectCategoryFromHome}
            onOpenSaveLink={() => setIsSaveLinkOpen(true)}
            onOpenSaveNote={() => setIsSaveNoteOpen(true)}
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
      />
    </div>
  );
}
