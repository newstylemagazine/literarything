import type { GutenbergMetadata, Work, CatalogEntry } from '@/types/alignment';

const GUTENBERG_API_BASE = 'https://gutendex.com/books';

/**
 * Fetch books from Project Gutenberg API
 */
export async function fetchGutenbergBooks(params: {
  search?: string;
  language?: string;
  author?: string;
  page?: number;
}): Promise<{ results: GutenbergMetadata[]; next: string | null; previous: string | null }> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.append('search', params.search);
  if (params.language) searchParams.append('languages', params.language);
  if (params.author) searchParams.append('author', params.author);
  if (params.page) searchParams.append('page', params.page.toString());

  const response = await fetch(`${GUTENBERG_API_BASE}?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Gutenberg API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch specific book metadata by Gutenberg ID
 */
export async function fetchGutenbergBook(bookId: number): Promise<GutenbergMetadata> {
  const response = await fetch(`${GUTENBERG_API_BASE}/${bookId}`);
  
  if (!response.ok) {
    throw new Error(`Gutenberg API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch book text content
 */
export async function fetchBookText(url: string): Promise<string> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch book text: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Search for bilingual works (original + translation)
 */
export async function findBilingualWorks(originalLang: string): Promise<CatalogEntry[]> {
  // This is a simplified implementation - in production, you'd have a curated database
  // of known bilingual pairs or use more sophisticated matching
  
  const works: CatalogEntry[] = [
    {
      id: 'candide',
      title: 'Candide',
      author: 'Voltaire',
      originalLanguage: 'French',
      translationLanguage: 'English',
      year: 1759,
      era: 'Enlightenment',
      place: 'Geneva / Paris',
      originalSource: 'Voltaire',
      translationSource: 'William F. Fleming',
      gutenbergId: 19942,
      translationGutenbergId: 19942,
      summary: 'A satirical novella that follows the adventures of Candide, a young man who lives in the best of all possible worlds.',
      hasAlignment: false,
      segmentCount: 0,
    },
    {
      id: 'don-quixote',
      title: 'Don Quixote',
      author: 'Miguel de Cervantes',
      originalLanguage: 'Spanish',
      translationLanguage: 'English',
      year: 1605,
      era: 'Early modern',
      place: 'Madrid',
      originalSource: 'Miguel de Cervantes Saavedra',
      translationSource: 'John Ormsby',
      gutenbergId: 2000,
      translationGutenbergId: 2000,
      summary: 'A foundational Spanish novel that follows the adventures of a nobleman who reads so many chivalric romances that he loses his sanity.',
      hasAlignment: false,
      segmentCount: 0,
    },
    {
      id: 'divine-comedy',
      title: 'The Divine Comedy',
      author: 'Dante Alighieri',
      originalLanguage: 'Italian',
      translationLanguage: 'English',
      year: 1320,
      era: 'Late medieval',
      place: 'Florence',
      originalSource: 'Dante Alighieri',
      translationSource: 'Henry Wadsworth Longfellow',
      gutenbergId: 1000,
      translationGutenbergId: 8800,
      summary: 'An epic poem that describes the journey of the soul through Hell, Purgatory, and Heaven.',
      hasAlignment: false,
      segmentCount: 0,
    },
    {
      id: 'faust',
      title: 'Faust',
      author: 'Johann Wolfgang von Goethe',
      originalLanguage: 'German',
      translationLanguage: 'English',
      year: 1808,
      era: 'Weimar Classicism',
      place: 'Weimar',
      originalSource: 'Johann Wolfgang von Goethe',
      translationSource: 'Bayard Taylor',
      gutenbergId: 2229,
      translationGutenbergId: 2229,
      summary: 'A tragic play about a scholar who makes a pact with the devil in exchange for knowledge and worldly pleasures.',
      hasAlignment: false,
      segmentCount: 0,
    },
    {
      id: 'aeneid',
      title: 'The Aeneid',
      author: 'Virgil',
      originalLanguage: 'Latin',
      translationLanguage: 'English',
      year: -19,
      era: 'Classical antiquity',
      place: 'Rome',
      originalSource: 'Publius Vergilius Maro',
      translationSource: 'John Dryden',
      gutenbergId: 2285,
      translationGutenbergId: 2285,
      summary: 'An epic poem that tells the legendary story of Aeneas, a Trojan who traveled to Italy.',
      hasAlignment: false,
      segmentCount: 0,
    },
  ];

  return works.filter(work => 
    originalLang === 'All' || work.originalLanguage.toLowerCase() === originalLang.toLowerCase()
  );
}

/**
 * Process and align texts from Gutenberg
 */
export async function processAndAlignText(work: Work): Promise<any> {
  try {
    // Fetch original text
    if (!work.gutenbergId) {
      throw new Error('No Gutenberg ID for original text');
    }

    // For now, return a placeholder alignment
    // In production, this would:
    // 1. Fetch both texts from Gutenberg
    // 2. Process and clean the texts
    // 3. Run alignment algorithms
    // 4. Return structured alignment data
    
    return {
      status: 'placeholder',
      workId: work.id,
      message: 'Alignment processing not yet implemented',
    };
  } catch (error) {
    console.error('Error processing alignment:', error);
    throw error;
  }
}

/**
 * Get available languages from Gutenberg
 */
export function getAvailableLanguages(): string[] {
  return ['French', 'Spanish', 'Italian', 'German', 'Latin', 'Greek'];
}

/**
 * Convert Gutenberg metadata to our Work format
 */
export function gutenbergToWork(metadata: GutenbergMetadata, translationId?: number): Work {
  return {
    id: metadata.id.toString(),
    title: metadata.title,
    author: metadata.authors.map(a => a.name).join(', '),
    originalLanguage: metadata.languages[0] || 'unknown',
    translationLanguage: 'en',
    year: new Date().getFullYear(), // Gutenberg doesn't always provide year
    originalSource: metadata.authors.map(a => a.name).join(', '),
    translationSource: 'Unknown',
    gutenbergId: metadata.id,
    translationGutenbergId: translationId,
    summary: `Public domain work from Project Gutenberg. Downloaded ${metadata.download_count} times.`,
  };
}
