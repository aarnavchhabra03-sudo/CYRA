import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { approveAndMergeKnowledgeMap, RelationshipType } from '@/lib/adaptive/knowledge-graph';
import { serializeDbKnowledgeMap } from '../../route';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  'prerequisite',
  'related',
  'builds_on',
  'application_of',
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[KNOWLEDGE MAP APPROVE API] POST approval request for map ID: ${id}`);

  // 1. Validate Map ID UUID Format
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid knowledge map ID.',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // 2. Authenticate User Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
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
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // 3. Parse Request Body (Optional selections)
  let approvedNodeIdsInput: string[] | undefined;
  let approvedEdgeIdsInput: string[] | undefined;

  try {
    const rawText = await request.text();
    if (rawText && rawText.trim()) {
      const body = JSON.parse(rawText);

      if (body.approvedNodeIds !== undefined) {
        if (!Array.isArray(body.approvedNodeIds) || !body.approvedNodeIds.every((i: any) => typeof i === 'string' && i.trim())) {
          return NextResponse.json(
            {
              success: false,
              error: 'approvedNodeIds must be an array of non-empty strings.',
              code: 'INVALID_REQUEST',
            },
            { status: 400 }
          );
        }
        approvedNodeIdsInput = Array.from(new Set(body.approvedNodeIds.map((s: string) => s.trim())));
      }

      if (body.approvedEdgeIds !== undefined) {
        if (!Array.isArray(body.approvedEdgeIds) || !body.approvedEdgeIds.every((i: any) => typeof i === 'string' && i.trim())) {
          return NextResponse.json(
            {
              success: false,
              error: 'approvedEdgeIds must be an array of non-empty strings.',
              code: 'INVALID_REQUEST',
            },
            { status: 400 }
          );
        }
        approvedEdgeIdsInput = Array.from(new Set(body.approvedEdgeIds.map((s: string) => s.trim())));
      }
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // 4. Fetch Owned Map strictly by ID AND user_id
  const { data: mapRow, error: fetchErr } = await adminClient
    .from('research_knowledge_maps')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !mapRow) {
    console.warn(`[KNOWLEDGE MAP APPROVE API] Knowledge map not found or unowned: ${id}`);
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map not found',
        code: 'NOT_FOUND',
      },
      { status: 404 }
    );
  }

  // 5. Verify Map Status (Only pending maps can be approved)
  if (mapRow.status === 'approved') {
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map is already approved',
        code: 'MAP_ALREADY_APPROVED',
      },
      { status: 400 }
    );
  }

  if (mapRow.status === 'rejected') {
    return NextResponse.json(
      {
        success: false,
        error: 'Rejected knowledge maps must be regenerated before approval',
        code: 'MAP_NOT_PENDING',
      },
      { status: 400 }
    );
  }

  if (mapRow.status !== 'pending') {
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map is not pending approval',
        code: 'MAP_NOT_PENDING',
      },
      { status: 400 }
    );
  }

  // 6. Validate Stored Nodes & Selection
  const nodes = mapRow.nodes;
  if (!Array.isArray(nodes)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Stored knowledge map nodes data is corrupted.',
        code: 'CORRUPTED_DATA',
      },
      { status: 500 }
    );
  }

  const nodeMap = new Map<string, any>();
  for (const node of nodes) {
    if (node && typeof node === 'object' && node.id) {
      nodeMap.set(node.id, node);
    }
  }

  let selectedNodeIdSet: Set<string>;
  if (approvedNodeIdsInput !== undefined) {
    for (const selectedId of approvedNodeIdsInput) {
      if (!nodeMap.has(selectedId)) {
        return NextResponse.json(
          {
            success: false,
            error: `Selected node ID "${selectedId}" does not exist in the knowledge map.`,
            code: 'INVALID_SELECTION',
          },
          { status: 400 }
        );
      }
    }
    selectedNodeIdSet = new Set(approvedNodeIdsInput);
  } else {
    selectedNodeIdSet = new Set(nodes.map((n: any) => n.id));
  }

  // 7. Validate Stored Edges & Selection
  const edges = mapRow.edges;
  if (!Array.isArray(edges)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Stored knowledge map edges data is corrupted.',
        code: 'CORRUPTED_DATA',
      },
      { status: 500 }
    );
  }

  const edgeMap = new Map<string, any>();
  for (const edge of edges) {
    if (edge && typeof edge === 'object' && edge.id) {
      edgeMap.set(edge.id, edge);
    }
  }

  let candidateEdgeIds: string[];
  if (approvedEdgeIdsInput !== undefined) {
    for (const selectedEdgeId of approvedEdgeIdsInput) {
      if (!edgeMap.has(selectedEdgeId)) {
        return NextResponse.json(
          {
            success: false,
            error: `Selected edge ID "${selectedEdgeId}" does not exist in the knowledge map.`,
            code: 'INVALID_SELECTION',
          },
          { status: 400 }
        );
      }
    }
    candidateEdgeIds = approvedEdgeIdsInput;
  } else {
    candidateEdgeIds = edges.map((e: any) => e.id);
  }

  // 8. Critical Edge Endpoint & Integrity Validation
  const approvedEdgesToMerge: any[] = [];
  const approvedEdgeIdSet = new Set<string>();

  for (const edgeId of candidateEdgeIds) {
    const edge = edgeMap.get(edgeId);
    if (!edge) continue;

    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);

    if (!sourceNode || !targetNode) {
      return NextResponse.json(
        {
          success: false,
          error: `Edge "${edgeId}" references non-existent node endpoints.`,
          code: 'INVALID_EDGE',
        },
        { status: 400 }
      );
    }

    if (sourceNode.id === targetNode.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Edge "${edgeId}" is a self-loop. Self-loops are strictly forbidden.`,
          code: 'INVALID_EDGE',
        },
        { status: 400 }
      );
    }

    const sourceApproved = selectedNodeIdSet.has(sourceNode.id);
    const targetApproved = selectedNodeIdSet.has(targetNode.id);

    if (approvedEdgeIdsInput !== undefined && (!sourceApproved || !targetApproved)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Every approved edge must connect two approved nodes',
          code: 'INVALID_SELECTION',
        },
        { status: 400 }
      );
    }

    if (sourceApproved && targetApproved) {
      // Validate relationship type
      const relType = String(edge.relationshipType || '').toLowerCase() as RelationshipType;
      if (!VALID_RELATIONSHIP_TYPES.has(relType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Edge "${edgeId}" contains unsupported relationship type "${edge.relationshipType}".`,
            code: 'INVALID_EDGE',
          },
          { status: 400 }
        );
      }

      // Validate numeric strength range (0-100)
      const strengthNum = Number(edge.strength);
      if (typeof edge.strength !== 'number' || isNaN(strengthNum) || !isFinite(strengthNum) || strengthNum < 0 || strengthNum > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Edge "${edgeId}" contains invalid numeric strength.`,
            code: 'INVALID_EDGE',
          },
          { status: 400 }
        );
      }

      // Concept Resolution
      const sourceConcept = (sourceNode.matchedExistingConcept || sourceNode.label || '').trim();
      const targetConcept = (targetNode.matchedExistingConcept || targetNode.label || '').trim();

      if (!sourceConcept || !targetConcept) {
        return NextResponse.json(
          {
            success: false,
            error: `Edge "${edgeId}" resolves to empty source or target concept string.`,
            code: 'INVALID_EDGE',
          },
          { status: 400 }
        );
      }

      approvedEdgeIdSet.add(edge.id);
      approvedEdgesToMerge.push({
        sourceConcept,
        targetConcept,
        relationshipType: relType,
        strength: Math.round(strengthNum),
      });
    }
  }

  // 9. Convert & Deduplicate Concept Relationships
  const relDeduplicationMap = new Map<string, any>();
  for (const item of approvedEdgesToMerge) {
    const key = `${item.sourceConcept}:${item.targetConcept}:${item.relationshipType}`;
    if (!relDeduplicationMap.has(key)) {
      relDeduplicationMap.set(key, {
        sourceConcept: item.sourceConcept,
        targetConcept: item.targetConcept,
        relationshipType: item.relationshipType,
        strength: item.strength,
      });
    }
  }

  const relationshipsToPersist = Array.from(relDeduplicationMap.values());

  // 10. Update Node and Edge Item Approval Flags
  const updatedNodes = nodes.map((node: any) => ({
    ...node,
    isApproved: selectedNodeIdSet.has(node.id),
  }));

  const updatedEdges = edges.map((edge: any) => ({
    ...edge,
    isApproved: approvedEdgeIdSet.has(edge.id),
  }));

  // 11. Execute Atomic PostgreSQL Transaction (Merge Graph Edges + Approve Map Lifecycle)
  console.log(`[KNOWLEDGE MAP APPROVE API] Executing atomic approval for map ${id} (User: ${user.id}, ${relationshipsToPersist.length} relationships)`);

  const atomicResult = await approveAndMergeKnowledgeMap({
    userId: user.id,
    mapId: id,
    relationships: relationshipsToPersist,
    updatedNodes,
    updatedEdges,
  });

  if (!atomicResult.success || !atomicResult.data) {
    console.error('[KNOWLEDGE MAP APPROVE API] Atomic approval failed:', atomicResult.error);
    const statusCode = atomicResult.code === 'MAP_NOT_PENDING' ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error: atomicResult.error || 'Failed to merge knowledge map into learner graph',
        code: atomicResult.code || 'GRAPH_MERGE_FAILED',
      },
      { status: statusCode }
    );
  }

  const serializedMap = serializeDbKnowledgeMap(atomicResult.data);

  return NextResponse.json(
    {
      success: true,
      data: serializedMap,
    },
    { status: 200 }
  );
}
