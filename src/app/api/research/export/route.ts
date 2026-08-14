import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sanitizeFilename,
  formatCitation,
  generateBibTeXExport,
  generateRISExport,
  generateMarkdownExport,
  generatePDFHTML,
} from '@/lib/research/export';

export async function POST(request: Request) {
  console.log('[RESEARCH EXPORT API] POST export request received');

  // 1. Authenticate User Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[RESEARCH EXPORT API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to export research.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Body Payload Parsing & Validation
  let body: any = null;
  try {
    const rawText = await request.text();
    body = JSON.parse(rawText);
  } catch (parseErr) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON payload.',
        code: 'INVALID_PAYLOAD',
      },
      { status: 400 }
    );
  }

  const { documentType, documentId, documentIds, format = 'markdown', citationStyle = 'apa', includeNotes = false } = body || {};

  const validFormats = ['pdf', 'markdown', 'bibtex', 'ris'];
  if (!validFormats.includes(format)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported export format "${format}". Valid formats: ${validFormats.join(', ')}`,
        code: 'INVALID_FORMAT',
      },
      { status: 400 }
    );
  }

  const validTypes = ['research_brief', 'literature_review', 'bulk_citations'];
  if (!validTypes.includes(documentType)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported document type "${documentType}". Valid types: ${validTypes.join(', ')}`,
        code: 'INVALID_DOCUMENT_TYPE',
      },
      { status: 400 }
    );
  }

  // 3. Document Retrieval & Ownership Verification (Strict 404 for unowned items)
  let targetDoc: any = null;
  let citationsToExport: any[] = [];
  let userNotes: any[] = [];

  if (documentType === 'research_brief') {
    if (documentId) {
      // Saved document — fetch from DB with ownership check
      const { data: rawDoc, error: fetchErr } = await supabase
        .from('research_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !rawDoc) {
        return NextResponse.json(
          { success: false, error: 'Research document not found.', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      targetDoc = rawDoc;
      citationsToExport = rawDoc.brief?.citations || [];

      if (includeNotes && (format === 'markdown' || format === 'pdf')) {
        const { data: annRows } = await supabase
          .from('research_annotations')
          .select('*')
          .eq('user_id', user.id)
          .eq('research_document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(50);

        userNotes = (annRows || []).map((r: any) => ({
          annotationType: r.annotation_type,
          selectedText: r.selected_text,
          note: r.note,
          sourceTitle: r.source_title,
        }));
      }
    } else if (body?.literatureReview?.brief) {
      // Unsaved live brief — use inline data from request body
      const inlineBrief = body.literatureReview.brief;
      targetDoc = {
        title: body.literatureReview.title || inlineBrief.title || 'CYRA Research Brief',
        query: body.literatureReview.query || '',
        intent: body.literatureReview.intent || 'general',
        brief: inlineBrief,
      };
      citationsToExport = inlineBrief.citations || [];
    } else {
      return NextResponse.json(
        { success: false, error: 'documentId or inline brief data is required for research_brief export.', code: 'MISSING_ID' },
        { status: 400 }
      );
    }
  } else if (documentType === 'literature_review') {
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required for literature_review export.', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    const { data: rawRev, error: fetchErr } = await supabase
      .from('research_literature_reviews')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !rawRev) {
      if (body.literatureReview) {
        targetDoc = body.literatureReview;
        citationsToExport = body.literatureReview.citations || [];
      } else {
        return NextResponse.json(
          { success: false, error: 'Literature review not found.', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    } else {
      targetDoc = rawRev.review || rawRev;
      citationsToExport = targetDoc.citations || [];
    }

    if (includeNotes && (format === 'markdown' || format === 'pdf')) {
      const firstDocId = citationsToExport?.[0]?.id || documentId;
      const { data: annRows } = await supabase
        .from('research_annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('research_document_id', firstDocId)
        .order('created_at', { ascending: false })
        .limit(50);

      userNotes = (annRows || []).map((r: any) => ({
        annotationType: r.annotation_type,
        selectedText: r.selected_text,
        note: r.note,
        sourceTitle: r.source_title,
      }));
    }
  } else if (documentType === 'bulk_citations') {
    const ids = documentIds || (documentId ? [documentId] : []);
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'documentIds array is required for bulk citations export.', code: 'MISSING_IDS' },
        { status: 400 }
      );
    }

    const { data: rawDocs, error: fetchErr } = await supabase
      .from('research_documents')
      .select('brief')
      .eq('user_id', user.id)
      .in('id', ids.slice(0, 6));

    if (fetchErr || !rawDocs || rawDocs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid owned research documents found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    rawDocs.forEach((d: any) => {
      if (d.brief?.citations) {
        citationsToExport.push(...d.brief.citations);
      }
    });

    targetDoc = { title: 'Bulk Research Citations' };
  }

  // 4. Generate Requested Export Content
  let exportContent = '';
  let contentType = 'text/plain';
  let fileExt = 'txt';
  const prefix = documentType === 'literature_review' ? 'cyra-literature-review' : 'cyra-research-brief';

  switch (format) {
    case 'bibtex': {
      // BibTeX excludes free-form notes to remain standards-compliant
      exportContent = generateBibTeXExport(citationsToExport);
      contentType = 'application/x-bibtex';
      fileExt = 'bib';
      break;
    }
    case 'ris': {
      // RIS excludes free-form notes to remain standards-compliant
      exportContent = generateRISExport(citationsToExport);
      contentType = 'application/x-research-info-systems';
      fileExt = 'ris';
      break;
    }
    case 'markdown': {
      exportContent = generateMarkdownExport(documentType, targetDoc, citationStyle, includeNotes ? userNotes : []);
      contentType = 'text/markdown; charset=utf-8';
      fileExt = 'md';
      break;
    }
    case 'pdf': {
      exportContent = generatePDFHTML(documentType, targetDoc, citationStyle, includeNotes ? userNotes : []);
      contentType = 'text/html; charset=utf-8';
      fileExt = 'pdf.html';
      break;
    }
  }

  const filename = sanitizeFilename(targetDoc.title || targetDoc.researchQuestion || 'report', prefix, fileExt);

  return new NextResponse(exportContent, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
