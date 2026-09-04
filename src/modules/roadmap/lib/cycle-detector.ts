/**
 * Directed Graph Cycle Detection Engine for Roadmap Prerequisite DAG.
 * Uses Depth-First Search (DFS) reachability analysis to verify that adding
 * a candidate directed edge (source -> target) will not introduce a cycle.
 */

export interface EdgeDefinition {
  source: string;
  target: string;
}

/**
 * Pure function: Determines whether adding a proposed directed edge (source -> target)
 * into an existing set of directed edges would create a cycle.
 *
 * In Notis roadmap semantics:
 * - Edge `source` is the prerequisite topic (must be completed first).
 * - Edge `target` is the dependent topic (unlocked only after prerequisite).
 * - Knowledge flows in the direction `source -> target`.
 *
 * Algorithm:
 * 1. Reflexive check: If `newEdge.source === newEdge.target`, a self-loop is created -> returns true.
 * 2. Reachability check via DFS: If a path already exists from `newEdge.target` to `newEdge.source`
 *    in the existing graph, then adding `newEdge.source -> newEdge.target` completes a cycle -> returns true.
 * 3. Otherwise, adding the edge preserves the Directed Acyclic Graph (DAG) invariant -> returns false.
 *
 * @param existingEdges Array of existing directed edges ({ source, target })
 * @param newEdge Candidate directed edge to be inserted ({ source, target })
 * @returns true if adding the edge would introduce a cycle, false otherwise
 */
export function wouldCreateCycle(
  existingEdges: Array<EdgeDefinition>,
  newEdge: EdgeDefinition
): boolean {
  // 1. Reflexive self-loop check (A -> A)
  if (newEdge.source === newEdge.target) {
    return true;
  }

  // 2. Build adjacency list for existing directed edges
  const adj = new Map<string, string[]>();
  for (const edge of existingEdges) {
    if (!edge.source || !edge.target) continue;
    const neighbors = adj.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    } else {
      adj.set(edge.source, [edge.target]);
    }
  }

  // 3. DFS to check if newEdge.source is reachable from newEdge.target
  const visited = new Set<string>();
  const stack: string[] = [newEdge.target];
  visited.add(newEdge.target);

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      // If we reached the proposed edge's source, a cycle is detected
      if (neighbor === newEdge.source) {
        return true;
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return false;
}
