/**
 * Text segment position information
 */
export interface TextPosition {
  startChar: number;
  endChar: number;
  lineNumber: number;
}

/**
 * Original text segment with alignment data
 */
export interface OriginalSegment {
  id: string;
  text: string;
  position: TextPosition;
  language: string;
  metadata: {
    paragraphId: string;
    sentenceId?: string;
    partOfSpeech?: string;
    lemma?: string;
  };
}

/**
 * Translation text segment with alignment data
 */
export interface TranslationSegment {
  id: string;
  text: string;
  position: TextPosition;
  language: string; // typically "en"
  alignmentTo: string[]; // Array of original segment IDs this aligns to
  metadata: {
    confidence: number; // 0-1 score for alignment quality
    translatorNotes?: string;
  };
}

/**
 * Aligned pair connecting original and translation
 */
export interface AlignedPair {
  id: string;
  originalId: string;
  translationId: string;
  confidence: number;
  alignmentType: "sentence" | "phrase" | "word" | "paragraph";
}

/**
 * Complete alignment for a work
 */
export interface WorkAlignment {
  id: string;
  workId: string;
  originalLanguage: string;
  translationLanguage: string;
  originalSegments: OriginalSegment[];
  translationSegments: TranslationSegment[];
  alignments: AlignedPair[];
  metadata: {
    alignmentMethod: string;
    lastUpdated: string;
    version: string;
  };
}

/**
 * Work metadata from catalog
 */
export interface Work {
  id: string;
  title: string;
  author: string;
  originalLanguage: string;
  translationLanguage: string;
  year: number;
  era?: string;
  place?: string;
  originalSource: string;
  translationSource: string;
  gutenbergId?: number;
  translationGutenbergId?: number;
  summary: string;
  alignmentId?: string;
}

/**
 * Catalog entry with alignment status
 */
export interface CatalogEntry extends Work {
  hasAlignment: boolean;
  alignmentQuality?: number;
  segmentCount?: number;
}

/**
 * Reader state for navigating aligned text
 */
export interface ReaderState {
  currentSegmentIndex: number;
  theme: "light" | "sepia" | "dark";
  fontSize: number;
  fontFamily: string;
  showLineNumbers: boolean;
  highlightAlignment: boolean;
}

/**
 * Search result in aligned text
 */
export interface SearchResult {
  workId: string;
  workTitle: string;
  author: string;
  segmentId: string;
  originalText: string;
  translatedText: string;
  relevanceScore: number;
}

/**
 * Project Gutenberg metadata
 */
export interface GutenbergMetadata {
  id: number;
  title: string;
  authors: {
    name: string;
    birth_year?: number;
    death_year?: number;
  }[];
  languages: string[];
  download_count: number;
  copyright: boolean;
  media_type: string;
  formats: {
    [key: string]: string;
  };
}

/**
 * Alignment processing status
 */
export interface AlignmentStatus {
  workId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
}
