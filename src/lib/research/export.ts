import { ResearchExportFormat, ResearchCitationStyle, ResearchExportDocumentType } from './types';

/**
 * Sanitizes document titles into safe, clean filenames
 */
export function sanitizeFilename(title: string, prefix: string, extension: string): string {
  const cleanTitle = (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);

  return `${prefix}-${cleanTitle}.${extension}`;
}

/**
 * Deterministic Citation Style Formatter (APA, MLA, Chicago, Plain)
 * Never fabricates missing bibliographic metadata.
 */
export function formatCitation(citation: any, style: ResearchCitationStyle = 'apa'): string {
  const authors = citation.authors && citation.authors.length > 0 ? citation.authors.join(', ') : '';
  const title = citation.title || 'Untitled Source';
  const url = citation.url || '';
  const domain = citation.domain || 'Web Source';
  const year = citation.publishedAt || citation.publishedDate
    ? new Date(citation.publishedAt || citation.publishedDate).getFullYear()
    : '';

  switch (style) {
    case 'apa': {
      const authorPart = authors ? `${authors}.` : '';
      const yearPart = year ? ` (${year}).` : '';
      const titlePart = ` ${title}.`;
      const sourcePart = domain ? ` ${domain}.` : '';
      const urlPart = url && url !== '#' ? ` ${url}` : '';
      return `${authorPart}${yearPart}${titlePart}${sourcePart}${urlPart}`.trim();
    }
    case 'mla': {
      const authorPart = authors ? `${authors}. ` : '';
      const titlePart = `"${title}." `;
      const domainPart = domain ? `${domain}, ` : '';
      const yearPart = year ? `${year}, ` : '';
      const urlPart = url && url !== '#' ? url : '';
      return `${authorPart}${titlePart}${domainPart}${yearPart}${urlPart}`.trim();
    }
    case 'chicago': {
      const authorPart = authors ? `${authors}. ` : '';
      const titlePart = `"${title}." `;
      const domainPart = domain ? `${domain}. ` : '';
      const yearPart = year ? `(${year}). ` : '';
      const urlPart = url && url !== '#' ? url : '';
      return `${authorPart}${titlePart}${domainPart}${yearPart}${urlPart}`.trim();
    }
    case 'plain':
    default: {
      const parts = [authors, title, domain, year ? `(${year})` : '', url].filter(Boolean);
      return parts.join(' — ');
    }
  }
}

/**
 * Generates valid BibTeX entries for academic reference managers
 */
export function generateBibTeXExport(citations: any[]): string {
  if (!citations || citations.length === 0) return '% No citations found.';

  const entries = citations.map((c, idx) => {
    const authors = c.authors && c.authors.length > 0 ? c.authors.join(' and ') : 'Anonymous';
    const firstAuthorKey = (c.authors?.[0] || 'source').toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
    const year = c.publishedAt || c.publishedDate ? new Date(c.publishedAt || c.publishedDate).getFullYear() : '2025';
    const titleKey = (c.title || 'paper').toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
    const citeKey = `${firstAuthorKey}${year}${titleKey}${idx + 1}`;

    const isArxiv = c.sourceType === 'arxiv' || (c.url && c.url.includes('arxiv.org')) || c.arxivId;

    if (isArxiv) {
      const arxivId = c.arxivId || (c.url ? c.url.split('/abs/')[1] : '');
      return `@misc{${citeKey},
  author = {${authors}},
  title = {${c.title}},
  year = {${year}},
  eprint = {${arxivId || 'N/A'}},
  archivePrefix = {arXiv},
  url = {${c.url || ''}}
}`;
    }

    return `@article{${citeKey},
  author = {${authors}},
  title = {${c.title}},
  year = {${year}},
  journal = {${c.domain || 'Academic Research'}},
  url = {${c.url || ''}}
}`;
  });

  return entries.join('\n\n');
}

/**
 * Generates valid RIS records for reference managers (EndNote, Zotero, Mendeley)
 */
export function generateRISExport(citations: any[]): string {
  if (!citations || citations.length === 0) return 'TY  - ELEC\nER  -\n';

  const records = citations.map((c) => {
    const lines: string[] = ['TY  - JOUR'];

    if (c.authors && Array.isArray(c.authors)) {
      c.authors.forEach((a: string) => lines.push(`AU  - ${a}`));
    }

    lines.push(`TI  - ${c.title || 'Untitled Paper'}`);

    const year = c.publishedAt || c.publishedDate ? new Date(c.publishedAt || c.publishedDate).getFullYear() : null;
    if (year) {
      lines.push(`PY  - ${year}`);
    }

    if (c.domain) {
      lines.push(`JO  - ${c.domain}`);
    }

    if (c.url && c.url !== '#') {
      lines.push(`UR  - ${c.url}`);
    }

    lines.push('ER  -');
    return lines.join('\n');
  });

  return records.join('\n\n');
}

/**
 * Generates clean Markdown export for Research Briefs or Literature Reviews
 */
export function generateMarkdownExport(
  documentType: ResearchExportDocumentType,
  doc: any,
  citationStyle: ResearchCitationStyle = 'apa',
  notes: any[] = []
): string {
  if (documentType === 'literature_review') {
    const review = doc;
    const lines: string[] = [
      `# CYRA Literature Review: ${review.title || review.researchQuestion}`,
      '',
      `**Research Question:** ${review.researchQuestion}`,
      `**Generated Date:** ${new Date(review.generatedAt || Date.now()).toLocaleDateString()}`,
      `**Review Scope:** ${review.scope ? review.scope.toUpperCase() : 'COMPARATIVE'}`,
      '',
      '## Executive Summary',
      '',
      review.executiveSummary || 'No executive summary provided.',
      '',
    ];

    if (review.themes && review.themes.length > 0) {
      lines.push('## Key Themes', '');
      review.themes.forEach((t: any, idx: number) => {
        lines.push(`### ${idx + 1}. ${t.theme}`);
        lines.push(t.explanation);
        lines.push('');
      });
    }

    if (review.agreements && review.agreements.length > 0) {
      lines.push('## Where Sources Agree (Consensus)', '');
      review.agreements.forEach((a: any) => {
        lines.push(`- **${a.claim}:** ${a.supportingSummary}`);
      });
      lines.push('');
    }

    if (review.disagreements && review.disagreements.length > 0) {
      lines.push('## Where Sources Differ (Divergence)', '');
      review.disagreements.forEach((d: any) => {
        lines.push(`- **${d.topic}:** ${d.perspectiveA} vs ${d.perspectiveB}`);
      });
      lines.push('');
    }

    if (review.researchGaps && review.researchGaps.length > 0) {
      lines.push('## Identified Research Gaps', '');
      review.researchGaps.forEach((g: any, idx: number) => {
        lines.push(`${idx + 1}. ${g.statement}`);
      });
      lines.push('');
    }

    if (review.openQuestions && review.openQuestions.length > 0) {
      lines.push('## Grounded Open Questions', '');
      review.openQuestions.forEach((q: any) => {
        lines.push(`- **"${q.question}":** ${q.motivation || ''}`);
      });
      lines.push('');
    }

    if (review.citations && review.citations.length > 0) {
      lines.push('## Analyzed Source References', '');
      review.citations.forEach((c: any) => {
        lines.push(`[${c.index || 1}] ${formatCitation(c, citationStyle)}`);
      });
      lines.push('');
    }

    if (notes && notes.length > 0) {
      lines.push('## Personal Research Notes', '');
      notes.forEach((n: any, idx: number) => {
        lines.push(`### Note ${idx + 1} (${n.annotationType ? n.annotationType.toUpperCase() : 'NOTE'})`);
        if (n.sourceTitle) lines.push(`**Source:** ${n.sourceTitle}`);
        if (n.selectedText) lines.push(`> **Selected Evidence:** "${n.selectedText}"`);
        lines.push(`**My Note:** ${n.note}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  // Default: Research Brief
  const brief = doc.brief || doc;
  const lines: string[] = [
    `# CYRA Research Brief: ${doc.title || brief.title || 'Research Synthesis'}`,
    '',
    `**Research Query:** ${doc.query || brief.query || ''}`,
    `**Intent:** ${doc.intent || brief.intent || 'General'}`,
    `**Generated Date:** ${new Date(doc.createdAt || brief.generatedAt || Date.now()).toLocaleDateString()}`,
    '',
    '## Executive Summary',
    '',
    brief.executiveSummary || '',
    '',
  ];

  if (brief.keyFindings && brief.keyFindings.length > 0) {
    lines.push('## Key Findings', '');
    brief.keyFindings.forEach((f: any, idx: number) => {
      lines.push(`### ${idx + 1}. ${f.statement}`);
      lines.push(f.explanation || '');
      lines.push('');
    });
  }

  if (brief.sourceAgreement && brief.sourceAgreement.length > 0) {
    lines.push('## Where Sources Agree', '');
    brief.sourceAgreement.forEach((a: any) => {
      lines.push(`- **${a.claim}:** ${a.supportingSummary || ''}`);
    });
    lines.push('');
  }

  if (brief.citations && brief.citations.length > 0) {
    lines.push('## References', '');
    brief.citations.forEach((c: any, idx: number) => {
      lines.push(`[${idx + 1}] ${formatCitation(c, citationStyle)}`);
    });
    lines.push('');
  }

  if (notes && notes.length > 0) {
    lines.push('## Personal Research Notes', '');
    notes.forEach((n: any, idx: number) => {
      lines.push(`### Note ${idx + 1} (${n.annotationType ? n.annotationType.toUpperCase() : 'NOTE'})`);
      if (n.sourceTitle) lines.push(`**Source:** ${n.sourceTitle}`);
      if (n.selectedText) lines.push(`> **Selected Evidence:** "${n.selectedText}"`);
      lines.push(`**My Note:** ${n.note}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Prepares professional, academic PDF-renderable HTML content
 */
export function generatePDFHTML(
  documentType: ResearchExportDocumentType,
  doc: any,
  citationStyle: ResearchCitationStyle = 'apa',
  notes: any[] = []
): string {
  const mdContent = generateMarkdownExport(documentType, doc, citationStyle, notes);
  const title = doc.title || 'CYRA Academic Research Report';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #111; line-height: 1.6; }
    h1 { font-size: 22px; text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; text-transform: uppercase; }
    h2 { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; text-transform: uppercase; }
    h3 { font-size: 14px; margin-top: 16px; }
    p, li { font-size: 12px; }
    .meta { text-align: center; font-style: italic; font-size: 11px; color: #555; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 10px; color: #777; border-top: 1px solid #eee; margin-top: 40px; padding-top: 10px; }
  </style>
</head>
<body>
  <div className="content">
    <pre style="white-space: pre-wrap; font-family: inherit;">${mdContent}</pre>
  </div>
  <div className="footer">Generated by CYRA AI Academic Research Workstation</div>
</body>
</html>`;
}
