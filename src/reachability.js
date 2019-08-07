import { observable, action } from "mobx";

let graph;
const cutSet = observable.set();

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

function recalculate() {
  if (!graph) return;
}
