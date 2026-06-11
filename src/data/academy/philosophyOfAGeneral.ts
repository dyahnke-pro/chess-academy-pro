import bookData from './philosophy-of-a-general.json';

/** One chapter / lesson of an Academy book (board-free doctrine). */
export interface AcademyChapter {
  id: string;
  /** "Prologue" | "Lesson 1" | "Epilogue" … */
  label: string;
  title: string;
  /** Body prose paragraphs — also the text spoken in Listen mode. */
  paragraphs: string[];
  cliffsNotes: string[];
  /** The independent-verification sources line. */
  sources: string;
}

export interface AcademyBook {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  chapters: AcademyChapter[];
}

/**
 * "The Philosophy of A General" — the Academy's board-free doctrine, generated
 * from `docs/academy/philosophy-of-a-general.md` (the editable manuscript) via
 * `scripts/build-academy-book.mjs`. Read on screen or listened to via TTS
 * (`voiceService.speakReadAloud`) as an audiobook. Zero-LLM: authored prose only.
 */
export const PHILOSOPHY_OF_A_GENERAL: AcademyBook = bookData as AcademyBook;
