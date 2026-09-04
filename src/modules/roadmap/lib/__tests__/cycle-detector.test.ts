import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { wouldCreateCycle, type EdgeDefinition } from "../cycle-detector";

describe("Roadmap Cycle Detection Algorithm (DFS)", () => {
  test("1. Identifies reflexive self-loop (A -> A) as cycle", () => {
    const existingEdges: EdgeDefinition[] = [];
    const newEdge: EdgeDefinition = { source: "topic-a", target: "topic-a" };

    const createsCycle = wouldCreateCycle(existingEdges, newEdge);
    assert.equal(createsCycle, true, "Connecting topic to itself must create a cycle");
  });

  test("2. Detects mutual cycle of length 2 (A -> B, attempt B -> A)", () => {
    const existingEdges: EdgeDefinition[] = [
      { source: "topic-a", target: "topic-b" },
    ];
    const newEdge: EdgeDefinition = { source: "topic-b", target: "topic-a" };

    const createsCycle = wouldCreateCycle(existingEdges, newEdge);
    assert.equal(createsCycle, true, "Reverse prerequisite must create a cycle");
  });

  test("3. Detects transitive cycle of length 3 (A -> B -> C, attempt C -> A)", () => {
    const existingEdges: EdgeDefinition[] = [
      { source: "topic-a", target: "topic-b" },
      { source: "topic-b", target: "topic-c" },
    ];
    const newEdge: EdgeDefinition = { source: "topic-c", target: "topic-a" };

    const createsCycle = wouldCreateCycle(existingEdges, newEdge);
    assert.equal(createsCycle, true, "Cycle A -> B -> C -> A must be detected");
  });

  test("4. Allows valid parallel dependencies in diamond DAG (A -> B -> D, A -> C -> D, attempt B -> C)", () => {
    // Diamond structure:
    //      A
    //     / \
    //    B   C
    //     \ /
    //      D
    const existingEdges: EdgeDefinition[] = [
      { source: "topic-a", target: "topic-b" },
      { source: "topic-a", target: "topic-c" },
      { source: "topic-b", target: "topic-d" },
      { source: "topic-c", target: "topic-d" },
    ];

    // Adding cross-link B -> C: Valid DAG (A -> B -> C -> D)
    const validCrossEdge: EdgeDefinition = { source: "topic-b", target: "topic-c" };
    assert.equal(
      wouldCreateCycle(existingEdges, validCrossEdge),
      false,
      "Valid cross-edge B -> C should not form a cycle"
    );

    // Adding back-edge D -> A: Invalid (cycle)
    const cycleEdge: EdgeDefinition = { source: "topic-d", target: "topic-a" };
    assert.equal(
      wouldCreateCycle(existingEdges, cycleEdge),
      true,
      "Back-edge D -> A must be detected as a cycle"
    );
  });

  test("5. Detects deep transitive cycle of length 5 (A -> B -> C -> D -> E, attempt E -> A)", () => {
    const existingEdges: EdgeDefinition[] = [
      { source: "topic-1", target: "topic-2" },
      { source: "topic-2", target: "topic-3" },
      { source: "topic-3", target: "topic-4" },
      { source: "topic-4", target: "topic-5" },
    ];

    // E -> A
    assert.equal(
      wouldCreateCycle(existingEdges, { source: "topic-5", target: "topic-1" }),
      true,
      "Deep cycle topic-5 -> topic-1 must be detected"
    );

    // E -> C
    assert.equal(
      wouldCreateCycle(existingEdges, { source: "topic-5", target: "topic-3" }),
      true,
      "Mid-chain cycle topic-5 -> topic-3 must be detected"
    );

    // Valid forward shortcut A -> E
    assert.equal(
      wouldCreateCycle(existingEdges, { source: "topic-1", target: "topic-5" }),
      false,
      "Forward shortcut topic-1 -> topic-5 is valid"
    );
  });

  test("6. Handles disconnected subgraphs and allows valid cross-component edge", () => {
    // Subgraph 1: X -> Y -> Z
    // Subgraph 2: A -> B
    const existingEdges: EdgeDefinition[] = [
      { source: "topic-x", target: "topic-y" },
      { source: "topic-y", target: "topic-z" },
      { source: "topic-a", target: "topic-b" },
    ];

    // Connecting Subgraph 1 to Subgraph 2: Z -> A (valid)
    assert.equal(
      wouldCreateCycle(existingEdges, { source: "topic-z", target: "topic-a" }),
      false,
      "Cross-subgraph connection Z -> A is valid"
    );

    // Adding reverse connection across components after Z -> A exists
    const mergedEdges: EdgeDefinition[] = [
      ...existingEdges,
      { source: "topic-z", target: "topic-a" },
    ];
    // Attempting B -> X: X -> Y -> Z -> A -> B -> X (cycle)
    assert.equal(
      wouldCreateCycle(mergedEdges, { source: "topic-b", target: "topic-x" }),
      true,
      "Cross-subgraph loop B -> X must be detected"
    );
  });

  test("7. Returns false for the first edge in an empty graph", () => {
    const existingEdges: EdgeDefinition[] = [];
    const newEdge: EdgeDefinition = { source: "topic-start", target: "topic-next" };

    assert.equal(
      wouldCreateCycle(existingEdges, newEdge),
      false,
      "First edge in empty graph cannot form a cycle"
    );
  });
});
