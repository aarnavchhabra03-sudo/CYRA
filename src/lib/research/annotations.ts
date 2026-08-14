import { ResearchAnnotationCreateRequest, ResearchAnnotationType } from './types';

/**
 * Strips dangerous HTML tags while preserving academic punctuation, math notation ($ and \), and Markdown.
 */
export function sanitizeAnnotationText(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .replace(/<script\b[^<]*>(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*>(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*>(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<style\b[^<]*>(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:[^\s]*/gi, '')
    .trim();
}

/**
 * Validates and normalizes annotation payloads.
 */
export function validateAnnotationInput(input: ResearchAnnotationCreateRequest): {
  valid: boolean;
  errors: string[];
  normalized?: {
    researchDocumentId: string;
    citationId: string | null;
    annotationType: ResearchAnnotationType;
    selectedText: string | null;
    note: string;
    sourceUrl: string | null;
    sourceTitle: string | null;
    positionStart: number | null;
    positionEnd: number | null;
  };
} {
  const errors: string[] = [];

  if (!input.researchDocumentId || typeof input.researchDocumentId !== 'string') {
    errors.push('researchDocumentId is required.');
  }

  const note = sanitizeAnnotationText(input.note);
  if (!note) {
    errors.push('Personal note content is required and cannot be blank.');
  } else if (note.length > 5000) {
    errors.push('Note exceeds maximum length limit of 5000 characters.');
  }

  const validTypes: ResearchAnnotationType[] = ['note', 'highlight', 'evidence'];
  const annotationType = input.annotationType && validTypes.includes(input.annotationType)
    ? input.annotationType
    : 'note';

  const selectedText = sanitizeAnnotationText(input.selectedText);
  if (selectedText && selectedText.length > 3000) {
    errors.push('Selected text exceeds maximum length limit of 3000 characters.');
  }

  const sourceTitle = sanitizeAnnotationText(input.sourceTitle);
  if (sourceTitle && sourceTitle.length > 500) {
    errors.push('Source title exceeds maximum length limit of 500 characters.');
  }

  const sourceUrl = input.sourceUrl ? input.sourceUrl.trim() : null;
  if (sourceUrl && sourceUrl.length > 2000) {
    errors.push('Source URL exceeds maximum length limit of 2000 characters.');
  }

  const citationId = input.citationId ? input.citationId.trim() : null;
  if (citationId && citationId.length > 100) {
    errors.push('Citation ID exceeds maximum length limit of 100 characters.');
  }

  const posStart = typeof input.positionStart === 'number' && input.positionStart >= 0 ? input.positionStart : null;
  const posEnd = typeof input.positionEnd === 'number' && input.positionEnd >= 0 ? input.positionEnd : null;

  if (posStart !== null && posEnd !== null && posStart > posEnd) {
    errors.push('positionStart cannot be greater than positionEnd.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      researchDocumentId: input.researchDocumentId,
      citationId: citationId || null,
      annotationType,
      selectedText: selectedText || null,
      note,
      sourceUrl: sourceUrl || null,
      sourceTitle: sourceTitle || null,
      positionStart: posStart,
      positionEnd: posEnd,
    },
  };
}
