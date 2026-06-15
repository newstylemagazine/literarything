import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReaderState, CatalogEntry, WorkAlignment } from '@/types/alignment';

interface ReaderStore extends ReaderState {
  setTheme: (theme: "light" | "sepia" | "dark") => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setShowLineNumbers: (show: boolean) => void;
  setHighlightAlignment: (highlight: boolean) => void;
  setCurrentSegmentIndex: (index: number) => void;
  resetReader: () => void;
}

interface CatalogStore {
  works: CatalogEntry[];
  selectedWork: CatalogEntry | null;
  selectedLanguage: string;
  searchQuery: string;
  setWorks: (works: CatalogEntry[]) => void;
  setSelectedWork: (work: CatalogEntry | null) => void;
  setSelectedLanguage: (language: string) => void;
  setSearchQuery: (query: string) => void;
  filterWorks: () => CatalogEntry[];
}

interface AlignmentStore {
  alignments: Map<string, WorkAlignment>;
  currentAlignment: WorkAlignment | null;
  setCurrentAlignment: (alignment: WorkAlignment | null) => void;
  addAlignment: (alignment: WorkAlignment) => void;
  getAlignment: (workId: string) => WorkAlignment | undefined;
}

const defaultReaderState: ReaderState = {
  currentSegmentIndex: 0,
  theme: 'light',
  fontSize: 18,
  fontFamily: 'Georgia',
  showLineNumbers: false,
  highlightAlignment: true,
};

export const useReaderStore = create<ReaderStore>()(
  persist(
    (set) => ({
      ...defaultReaderState,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setHighlightAlignment: (highlightAlignment) => set({ highlightAlignment }),
      setCurrentSegmentIndex: (currentSegmentIndex) => set({ currentSegmentIndex }),
      resetReader: () => set(defaultReaderState),
    }),
    {
      name: 'literarything-reader-storage',
    }
  )
);

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  works: [],
  selectedWork: null,
  selectedLanguage: 'All',
  searchQuery: '',
  setWorks: (works) => set({ works }),
  setSelectedWork: (selectedWork) => set({ selectedWork }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  filterWorks: () => {
    const { works, selectedLanguage, searchQuery } = get();
    return works.filter((work) => {
      const languageMatch = selectedLanguage === 'All' || work.originalLanguage === selectedLanguage;
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = 
        work.title.toLowerCase().includes(searchLower) ||
        work.author.toLowerCase().includes(searchLower) ||
        work.summary.toLowerCase().includes(searchLower);
      return languageMatch && searchMatch;
    });
  },
}));

export const useAlignmentStore = create<AlignmentStore>((set, get) => ({
  alignments: new Map(),
  currentAlignment: null,
  setCurrentAlignment: (currentAlignment) => set({ currentAlignment }),
  addAlignment: (alignment) => {
    set((state) => {
      const newAlignments = new Map(state.alignments);
      newAlignments.set(alignment.workId, alignment);
      return { alignments: newAlignments };
    });
  },
  getAlignment: (workId) => {
    return get().alignments.get(workId);
  },
}));
