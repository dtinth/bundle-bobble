import { observable, action } from "mobx";

let graph;
const cutSet = observable.set();
const reachableMap = observable.map();
const info = observable({
  recomputedCount: 0
});

export function setGraph(g) {
  graph = g;
  recalculate();
}

export const toggleCut = action(id => {
  if (cutSet.has(id)) cutSet.delete(id);
  else cutSet.add(id);
  recalculate();
});

export const isCut = id => {
  return cutSet.has(id);
};

export function calculateReachability(graph, isNodeExcluded = () => false) {
  const visited = new Map();
  function visit(nodeId) {
    if (isCut(nodeId) || isNodeExcluded(nodeId)) {
      return;
    }
    if (visited.has(nodeId)) return;
    visited.set(nodeId, 0);
    const node = graph.nodes.get(nodeId);
    for (const depId of node.dependencies) {
      const edgeId = `${nodeId}=>${depId}`;
      if (isCut(edgeId)) {
        continue;
      }
      visit(depId);
      visited.set(depId, visited.get(depId) + 1);
    }
  }
  for (const rootId of graph.roots) {
    visit(rootId);
    visited.set(rootId, visited.get(rootId) + 1);
  }
  return visited;
}

function recalculate() {
  if (!graph) return;
  const visited = calculateReachability(graph);
  for (const nodeId of reachableMap.keys()) {
    if (!visited.has(nodeId)) reachableMap.delete(nodeId);
  }
  for (const [nodeId, count] of visited) {
    if (reachableMap.get(nodeId) !== count) reachableMap.set(nodeId, count);
  }
  info.recomputedCount++;
}

export const getRecomputedCount = () => {
  return info.recomputedCount;
};

export const getReachableCount = id => {
  return reachableMap.get(id) || 0;
};

export const getReachableModuleCount = () => reachableMap.size;

export const getReachableSize = () => calculateReachableSize(reachableMap);

export const calculateReachableSize = reachableMap =>
  Array.from(reachableMap).reduce((a, [id, count]) => {
    const node = count > 0 && graph && graph.nodes.get(id);
    const size = (node && node.size) || 0;
    return a + size;
  }, 0);
