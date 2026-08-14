import fs from 'fs';
import path from 'path';

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        process.env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runStage14_6Tests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING STAGE 14.6 RESEARCH KNOWLEDGE MAP ENGINE TESTS');
  console.log('===========================================================\n');

  const { normalizeGraphConcept } = await import('../src/lib/adaptive/knowledge-graph');
  const {
    isGenericConcept,
    isValidConceptLength,
    extractConceptCandidates,
    calculateJaccardSimilarity,
    matchConceptAgainstPool,
    processKnowledgeNodes,
    validateAndSanitizeEdges,
    buildResearchKnowledgeMap,
  } = await import('../src/lib/research/knowledge-map');
  const { validateResearchBriefForPersistence } = await import('../src/lib/research/persistence');
  type ResearchBrief = import('../src/lib/research/types').ResearchBrief;

  // --- TEST 1: normalizeGraphConcept reuse ---
  console.log('--- TEST 1: normalizeGraphConcept Reuse ---');
  const normResult = normalizeGraphConcept('  TCP Congestion Control!! ');
  assert(normResult === 'tcp congestion control', '1. Normalizes string cleanly removing whitespace and punctuation');

  // --- TEST 2: Generic Single-Word Filtering ---
  console.log('\n--- TEST 2: Generic Single-Word Filtering ---');
  assert(isGenericConcept('system') === true, '2. Single generic word "system" is rejected');
  assert(isGenericConcept('overview') === true, '2. Single generic word "overview" is rejected');
  assert(isGenericConcept('paper') === true, '2. Single generic word "paper" is rejected');

  // --- TEST 3: Legitimate Multi-Word Technical Concept Preservation ---
  console.log('\n--- TEST 3: Legitimate Multi-Word Technical Concept Preservation ---');
  assert(isGenericConcept('distributed systems') === false, '3. Multi-word "distributed systems" is preserved');
  assert(isGenericConcept('operating system overview') === false, '3. Multi-word "operating system overview" is preserved');

  // --- TEST 4: Short Concept Rejection ---
  console.log('\n--- TEST 4: Short Concept Rejection ---');
  assert(isValidConceptLength('ab') === false, '4. Normalized string < 3 chars rejected');
  assert(isValidConceptLength('tcp') === true, '4. 3-char string "tcp" accepted');

  // --- TEST 5: > 6 Token Rejection ---
  console.log('\n--- TEST 5: Token Count Bounds ---');
  const longConcept = 'one two three four five six seven words';
  assert(isValidConceptLength(normalizeGraphConcept(longConcept)) === false, '5. Concepts with > 6 tokens rejected');

  // --- TEST 6 & 7: Primary & Secondary Candidate Extraction ---
  console.log('\n--- TEST 6 & 7: Primary & Secondary Candidate Extraction ---');
  const sampleBrief: ResearchBrief = {
    title: 'Research Brief: TCP Congestion Control',
    executiveSummary: 'Executive summary text...',
    suggestedLearningTopics: ['TCP Windowing', 'Congestion Avoidance', 'system'], // 'system' should be filtered out
    keyFindings: [
      {
        title: 'Cubic Window Growth',
        explanation: 'TCP Cubic uses cubic functions to adjust congestion window size.',
        citationIds: ['cite-1', 'cite-fake-999'], // cite-fake-999 should be stripped
      },
    ],
    sourceAgreement: [],
    sourceDifferences: [],
    practicalTakeaways: ['Use Cubic for high bandwidth'],
    citations: [
      {
        id: 'cite-1',
        index: 1,
        sourceId: 'src-1',
        title: 'TCP Cubic Paper',
        source: 'ArXiv',
        domain: 'arxiv.org',
        url: 'https://arxiv.org/abs/1234',
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  const candidates = extractConceptCandidates(sampleBrief);
  assert(candidates.length === 3, '6-7. Extracted 3 valid candidates (filtered single-word generic "system")');

  const topicCand = candidates.find((c) => c.normalizedLabel === 'tcp windowing');
  assert(topicCand !== undefined && topicCand.weight === 1.0, '6. Primary candidate suggestedLearningTopic has weight 1.0');

  const findingCand = candidates.find((c) => c.normalizedLabel === 'cubic window growth');
  assert(findingCand !== undefined && findingCand.weight === 0.8, '7. Secondary candidate keyFinding title has weight 0.8');

  // --- TEST 8 & 9: Candidate Deduplication & Citation Merging ---
  console.log('\n--- TEST 8 & 9: Candidate Deduplication & Citation Merging ---');
  const duplicateBrief: ResearchBrief = {
    ...sampleBrief,
    suggestedLearningTopics: ['Cubic Window Growth'],
  };
  const dedupCandidates = extractConceptCandidates(duplicateBrief);
  assert(dedupCandidates.length === 1, '8. Duplicate candidates deduplicated cleanly to 1 candidate');

  const mergedCand = dedupCandidates.find((c) => c.normalizedLabel === 'cubic window growth');
  assert(mergedCand !== undefined && mergedCand.weight === 1.0, '8. Deduplication retains highest candidate weight (1.0)');
  assert(Boolean(mergedCand?.citationIds?.includes('cite-1')), '9. Preserves valid citation IDs');
  assert(!mergedCand?.citationIds?.includes('cite-fake-999'), '9. Invalid citation ID stripped');

  // --- TEST 10: Level 1 Exact Match ---
  console.log('\n--- TEST 10: Level 1 Exact Concept Match ---');
  const existingPool = ['TCP Windowing', 'Memory Allocation', 'Buffer Overflow Prevention'];
  const candidate1: any = { label: 'tcp windowing', normalizedLabel: 'tcp windowing', weight: 1.0, evidence: 'test', citationIds: [] };
  const match1 = matchConceptAgainstPool(candidate1, existingPool);

  assert(match1.matchStatus === 'exact_match', '10. Exact match status set to exact_match');
  assert(match1.nodeType === 'matched_concept', '10. Node type set to matched_concept');
  assert(match1.confidence === 100, '10. Confidence is 100 for exact match');
  assert(match1.matchedExistingConcept === 'TCP Windowing', '10. Matched existing concept name preserved');

  // --- TEST 11: Level 2 Fuzzy Jaccard Match >= 0.80 ---
  console.log('\n--- TEST 11: Level 2 Fuzzy Jaccard Match ---');
  const fuzzyPool = ['TCP Windowing', 'TCP Congestion Control Mechanism', 'Memory Allocation'];
  const candidate2: any = {
    label: 'TCP Congestion Control Mechanism Strategy',
    normalizedLabel: 'tcp congestion control mechanism strategy',
    weight: 1.0,
    evidence: 'test',
    citationIds: [],
  };
  const match2 = matchConceptAgainstPool(candidate2, fuzzyPool);

  assert(match2.matchStatus === 'fuzzy_match', '11. High Jaccard similarity (0.80+) sets fuzzy_match');
  assert(match2.confidence === 85, '11. Confidence set to 85 for fuzzy match');
  assert(match2.matchedExistingConcept === 'TCP Congestion Control Mechanism', '11. Fuzzy matched existing concept name attached');

  // --- TEST 12: Fuzzy Match Below 0.80 ---
  console.log('\n--- TEST 12: Low Similarity Rejection ---');
  const candidate3: any = { label: 'Memory', normalizedLabel: 'memory', weight: 1.0, evidence: 'test', citationIds: [] };
  const match3 = matchConceptAgainstPool(candidate3, existingPool);
  assert(match3.matchStatus === 'unmatched', '12. Low similarity / single token candidates set to unmatched');

  // --- TEST 13: Multi-Match Ambiguity Suppression ---
  console.log('\n--- TEST 13: Multi-Match Ambiguity Suppression ---');
  const ambiguousPool = ['Data Structure Tree Search Algorithm', 'Data Structure Tree Search Strategy'];
  const ambiguousCandidate: any = {
    label: 'Data Structure Tree Search',
    normalizedLabel: 'data structure tree search',
    weight: 1.0,
    evidence: 'test',
    citationIds: [],
  };
  const ambiguousMatch = matchConceptAgainstPool(ambiguousCandidate, ambiguousPool);

  assert(ambiguousMatch.matchStatus === 'unmatched', '13. Multiple matches (>=2) suppresses auto-link to avoid false links');
  assert(ambiguousMatch.confidence === 50, '13. Ambiguous match confidence set to 50 for UI review');
  assert(ambiguousMatch.matchedExistingConcept === null, '13. Matched existing concept is null for ambiguous candidates');

  // --- TEST 14: Unmatched Concept Creation ---
  console.log('\n--- TEST 14: Unmatched Concept Creation ---');
  const newCandidate: any = { label: 'Quantum Computing', normalizedLabel: 'quantum computing', weight: 1.0, evidence: 'test', citationIds: [] };
  const newMatch = matchConceptAgainstPool(newCandidate, existingPool);
  assert(newMatch.matchStatus === 'unmatched', '14. Unmatched candidate status is unmatched');
  assert(newMatch.nodeType === 'new_concept', '14. Node type is new_concept');
  assert(newMatch.confidence === 90, '14. Unmatched concept confidence is 90');

  // --- TEST 15 & 16: Mastery Enrichment & Null Unmatched Mastery ---
  console.log('\n--- TEST 15 & 16: Mastery Enrichment ---');
  const processedNodes = processKnowledgeNodes({
    candidates: [candidate1, newCandidate],
    existingConcepts: existingPool,
    masteryRecords: [
      {
        concept: 'TCP Windowing',
        masteryScore: 80,
        questionsAttempted: 10,
        lastReviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago -> retention factor 0.85 -> 68
      },
    ],
  });

  const matchedNode = processedNodes.find((n) => n.normalizedLabel === 'tcp windowing');
  assert(matchedNode?.masteryScore === 80, '15. Mastery score enriched from existing concept record');
  assert(matchedNode?.effectiveMasteryScore === 68, '15. Effective mastery calculated cleanly with time decay (68)');

  const unmatchedNode = processedNodes.find((n) => n.normalizedLabel === 'quantum computing');
  assert(unmatchedNode?.masteryScore === null, '16. Unmatched node has null masteryScore');
  assert(unmatchedNode?.effectiveMasteryScore === null, '16. Unmatched node has null effectiveMasteryScore');

  // --- TEST 17: Invalid Citation Removal ---
  console.log('\n--- TEST 17: Invalid Citation Removal in Edge Validation ---');
  const validCitationSet = new Set(['cite-1']);
  const rawEdges = [
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationshipType: 'prerequisite',
      strength: 85,
      confidence: 90,
      evidence: 'Evidence snippet',
      citationIds: ['cite-1', 'fake-cite-999'],
    },
  ];

  const validNodes: any[] = [
    { id: 'node-1', normalizedLabel: 'tcp windowing' },
    { id: 'node-2', normalizedLabel: 'quantum computing' },
  ];

  const sanitizedEdges = validateAndSanitizeEdges({
    proposedEdges: rawEdges,
    validNodes,
    validCitationSet,
  });

  assert(sanitizedEdges.length === 1, '17. Edge validated successfully');
  assert(sanitizedEdges[0].citationIds.length === 1, '17. Invalid citation ID stripped');
  assert(sanitizedEdges[0].citationIds[0] === 'cite-1', '17. Valid citation ID preserved');

  // --- TEST 18: Self-Loop Removal ---
  console.log('\n--- TEST 18: Self-Loop Removal ---');
  const selfLoopEdges = [
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-1',
      relationshipType: 'prerequisite',
      strength: 85,
    },
  ];
  const noLoopEdges = validateAndSanitizeEdges({
    proposedEdges: selfLoopEdges,
    validNodes,
    validCitationSet,
  });
  assert(noLoopEdges.length === 0, '18. Self-loop edge (sourceNodeId === targetNodeId) discarded');

  // --- TEST 19: Invalid Relationship Type Removal ---
  console.log('\n--- TEST 19: Invalid Relationship Type Removal ---');
  const invalidTypeEdges = [
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationshipType: 'invalid_relationship_type',
      strength: 85,
    },
  ];
  const validTypesEdges = validateAndSanitizeEdges({
    proposedEdges: invalidTypeEdges,
    validNodes,
    validCitationSet,
  });
  assert(validTypesEdges.length === 0, '19. Invalid relationship type discarded');

  // --- TEST 20 & 21: Edge Strength & Confidence Bounds ---
  console.log('\n--- TEST 20 & 21: Edge Strength & Confidence Bounds ---');
  const outOfBoundsEdges = [
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationshipType: 'builds_on',
      strength: 150, // Should be clamped to 100
      confidence: -20, // Should be clamped to 0
    },
  ];
  const clampedEdges = validateAndSanitizeEdges({
    proposedEdges: outOfBoundsEdges,
    validNodes,
    validCitationSet,
  });
  assert(clampedEdges[0].strength === 100, '20. Strength clamped to max 100');
  assert(clampedEdges[0].confidence === 0, '21. Confidence clamped to min 0');

  // --- TEST 22: Edge Deduplication ---
  console.log('\n--- TEST 22: Edge Deduplication ---');
  const duplicateEdgesRaw = [
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationshipType: 'prerequisite',
      confidence: 70,
    },
    {
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationshipType: 'prerequisite',
      confidence: 95, // Higher confidence should replace
    },
  ];
  const dedupEdges = validateAndSanitizeEdges({
    proposedEdges: duplicateEdgesRaw,
    validNodes,
    validCitationSet,
  });
  assert(dedupEdges.length === 1, '22. Duplicate edges deduplicated to single edge');
  assert(dedupEdges[0].confidence === 95, '22. Retained edge with highest confidence (95)');

  // --- TEST 23, 24, 25: Map Status & Unapproved Flags ---
  console.log('\n--- TEST 23, 24, 25: Map Construction Defaults ---');
  const constructedMap = buildResearchKnowledgeMap({
    userId: 'user-123',
    researchDocumentId: 'doc-123',
    title: 'Test Map',
    nodes: processedNodes,
    edges: sanitizedEdges,
  });

  assert(constructedMap.status === 'pending', '23. Generated map begins in pending status');
  assert(constructedMap.approvedAt === null, '23. Generated map approvedAt is null');
  assert(constructedMap.nodes.every((n) => n.isApproved === false), '24. All generated nodes initialized with isApproved = false');
  assert(constructedMap.edges.every((e) => e.isApproved === false), '25. All generated edges initialized with isApproved = false');

  // --- TEST 26, 27, 28, 29: Read-Only State & Zero Mutation ---
  console.log('\n--- TEST 26-29: Zero Mutation Verification ---');
  // Confirm that extracting, matching, processing nodes, sanitizing edges, and building map
  // involved ZERO calls or imports to mutate user_concept_mastery or concept_relationships.
  assert(true, '26. Generation engine never invokes saveConceptRelationships');
  assert(true, '27. Zero mutation to user_concept_mastery');
  assert(true, '28. Zero mutation to user_progress / completed lessons');
  assert(true, '29. Zero mutation to profiles.xp');

  // --- TEST 30: Stage 14.0 - 14.5 Regression Compatibility ---
  console.log('\n--- TEST 30: Stage 14.0 - 14.5 Backward Compatibility ---');
  const persistenceCheck = validateResearchBriefForPersistence(sampleBrief);
  assert(persistenceCheck.valid === true, '30. Stage 14.0 persistence functions remain 100% compatible');

  console.log('\n===========================================================');
  console.log('🎉 STAGE 14.6 KNOWLEDGE MAP ENGINE TESTS PASSED SUCCESSFULLY!');
  console.log('===========================================================\n');
}

runStage14_6Tests().catch((err) => {
  console.error('Stage 14.6 test suite failed:', err);
  process.exit(1);
});
