import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format year with BCE/CE notation
 */
export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return year.toString();
}

/**
 * Format language code to full name
 */
export function formatLanguage(code: string): string {
  const languages: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    de: "German",
    la: "Latin",
    gr: "Greek",
    ru: "Russian",
    pt: "Portuguese",
  };
  return languages[code] || code.toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Simple text alignment algorithm (placeholder for more sophisticated NLP)
 * This is a basic implementation that will be enhanced with proper NLP libraries
 */
export function alignTexts(
  originalText: string,
  translatedText: string,
  originalLang: string,
  targetLang: string
): Array<{ original: string; translation: string; confidence: number }> {
  // Split into sentences (basic implementation)
  const originalSentences = originalText.split(/(?<=[.!?])\s+/);
  const translatedSentences = translatedText.split(/(?<=[.!?])\s+/);

  // Simple 1:1 mapping (will be enhanced with proper alignment algorithms)
  const maxLength = Math.max(originalSentences.length, translatedSentences.length);
  const alignments: Array<{ original: string; translation: string; confidence: number }> = [];

  for (let i = 0; i < maxLength; i++) {
    alignments.push({
      original: originalSentences[i] || "",
      translation: translatedSentences[i] || "",
      confidence: originalSentences[i] && translatedSentences[i] ? 0.8 : 0.3,
    });
  }

  return alignments;
}

/**
 * Parse alignment data from structured format
 */
export function parseAlignmentData(data: any): any {
  // This will be implemented to parse various alignment formats
  // For now, return the data as-is
  return data;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
