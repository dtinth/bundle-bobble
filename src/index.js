import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { useObserver, Observer, useComputed } from "mobx-react-lite";
import "./styles.css";
import { db } from "./db";
import { log, logElementRef } from "./logging";
import { data, loadData } from "./data";
import { ErrorBoundary } from "react-error-boundary";
import { Link, Router } from "@reach/router";
import {
  isCut,
  toggleCut,
  setGraph,
  isReachable,
  getReachableModuleCount,
  getReachableSize,
  getReachableCount
} from "./reachability";
import uiState from "./ui-state";

function App() {
  const form = React.useRef();
  const statsJson = useObserver(() => data.get());
  React.useEffect(() => {
    log("Hello!");
    if (data.get() === null) loadData();
    else log("Data has already been loaded");
  }, []);
  return (
    <div className="container-fluid p-4">
      <h1>Bundle Bobble</h1>
      <h2>Select webpack stats JSON file</h2>
      <form
        ref={form}
        onSubmit={async e => {
          e.preventDefault();
          const file = form.current.file.files[0];
          log(`Saving file ${file.name} to IndexedDB`);
          try {
            await db.kv.put({
              key: "stats",
              file: file,
              name: file.name,
              time: Date.now()
            });
            log("Saved file to IndexedDB. Loading it...");
            loadData();
          } catch (e) {
            log("Error: " + e);
          }
        }}
      >
        <p>
          <input type="file" name="file" />
        </p>
        <p>
          <input type="submit" />
        </p>
      </form>
      <h2>Analyzer</h2>
      {statsJson ? (
        <ErrorBoundary FallbackComponent={MyFallbackComponent}>
          <p>Built at: {new Date(statsJson.builtAt).toString()}</p>
          <Analyzer stats={statsJson} />
        </ErrorBoundary>
      ) : (
        <p>No stats loaded</p>
      )}
      <h2>Logs</h2>
      <pre ref={logElementRef} />
    </div>
  );
}

const MyFallbackComponent = ({ error }) => (
  <div className="alert alert-danger" role="alert">
    <p>
      <strong>Oops! An error occured!</strong>
    </p>
    <p className="mb-0">
      <strong>Error:</strong> {String(error)}
    </p>
  </div>
);

function Analyzer({ stats }) {
  return (
    <Router>
      <Bobble path="/chunkgroup/*" stats={stats} />
      <Home path="/" stats={stats} />
    </Router>
  );
}

function Home({ stats }) {
  return (
    <div>
      <h3>Which chunk to bobble?</h3>
      <div className="list-group">
        {Object.keys(stats.namedChunkGroups).map(key => (
          <Link
            key={key}
            className="list-group-item list-group-item-action"
            to={`/chunkgroup/${key}`}
          >
            {key}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Bobble({ stats, "*": rest }) {
  const groupNames = new Set(rest.split(","));
  const groups = Object.keys(stats.namedChunkGroups).filter(k =>
    groupNames.has(k)
  );
  if (!groups.length) return "Not found!";
  const chunkIds = new Set(
    [].concat(...groups.map(k => stats.namedChunkGroups[k].chunks))
  );
  const chunks = stats.chunks.filter(c => chunkIds.has(c.id));
  const moduleIds = new Set(
    [].concat(...chunks.map(c => c.modules.map(m => m.id)))
  );
  const modulesMap = new Map(stats.modules.map(m => [m.id, m]));
  const totalSize = Array.from(moduleIds).reduce(
    (a, id) => a + modulesMap.get(id).size,
    0
  );
  const graph = (window.graph = generateGraph(moduleIds, {
    getParents(id) {
      return modulesMap.get(id).reasons.map(r => r.moduleId);
    },
    getNodeInfo(id) {
      const m = modulesMap.get(id);
      return { name: m.name, size: m.size, stats: m };
    }
  }));
  return (
    <div>
      <h3>Bobble chunk group {[...groupNames].join(", ")}</h3>
      <ul>
        <li>
          IDs of chunks contained in this group: {[...chunkIds].join(", ")}
        </li>
        <li>Number of modules: {moduleIds.size}</li>
        <li>Total size: {totalSize}</li>
      </ul>
      <GraphViewer graph={graph} />
    </div>
  );
}

function GraphViewer({ graph }) {
  useEffect(() => setGraph(graph), [graph]);
  return (
    <div className="card" style={{ display: "block" }}>
      <div
        className="card-header text-right"
        style={{ position: "sticky", top: 0, zIndex: 3 }}
      >
        <Observer>
          {() => (
            <span>
              {getReachableModuleCount()} reachable, size={getReachableSize()}
            </span>
          )}
        </Observer>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col">
            <Nodes graph={graph} nodeIds={graph.roots} path="" />
          </div>
          <div className="col">
            <div style={{ position: "sticky", top: 64 }}>
              <FocusView graph={graph} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Nodes = React.memo(function Nodes({ graph, nodeIds, parentId, path }) {
  return (
    <ul>
      {Array.from(nodeIds).map(id => {
        return (
          <li key={id}>
            <Node
              graph={graph}
              nodeId={id}
              parentId={parentId}
              path={path + "=>" + id}
            />
          </li>
        );
      })}
    </ul>
  );
});

const Node = React.memo(function Node({ graph, nodeId, parentId, path }) {
  const shown = useObserver(() => uiState.expanded.get(path));
  const setShown = v => uiState.expanded.set(path, v);
  const node = graph.nodes.get(nodeId);
  // const edgeId = parentId ? `${parentId}=>${nodeId}` : null;
  const name = (
    <Observer>
      {() => {
        const count = getReachableCount(nodeId);
        return (
          <span className={`name ${count > 0 ? "-reachable" : "-pruned"}`}>
            {node.name} [{count}]
          </span>
        );
      }}
    </Observer>
  );
  const onFocus = () => (uiState.focus = { nodeId, parentId });
  return (
    <React.Fragment>
      {node.dependencies.size > 0 ? (
        <label>
          <input
            type="checkbox"
            checked={shown}
            onClick={() => setShown(!shown)}
            onFocus={onFocus}
          />
          {name}
        </label>
      ) : (
        <div tabIndex={0} onFocus={onFocus}>
          <input type="checkbox" disabled />
          {name}
        </div>
      )}
      {shown && (
        <Nodes
          graph={graph}
          nodeIds={node.dependencies}
          parentId={nodeId}
          path={path}
        />
      )}
    </React.Fragment>
  );
});

function generateGraph(moduleIds, { getNodeInfo, getParents }) {
  const nodes = new Map();
  const roots = new Set(moduleIds);
  for (const id of moduleIds) {
    nodes.set(id, {
      id,
      ...getNodeInfo(id),
      dependencies: new Set(),
      reasons: new Set()
    });
  }
  for (const id of moduleIds) {
    const node = nodes.get(id);
    const parentIds = getParents(id);
    for (const parentId of parentIds) {
      const parent = nodes.get(parentId);
      if (!parent) continue;
      roots.delete(id);
      node.reasons.add(parentId);
      parent.dependencies.add(id);
    }
  }
  return { roots, nodes };
}

function FocusView({ graph }) {
  const focus = useObserver(() => uiState.focus);
  if (!focus) {
    return "Select a module to focus";
  }
  const focusModule = graph.nodes.get(focus.nodeId);
  const focusParent = graph.nodes.get(focus.parentId);
  if (!focusModule) {
    return `Focus module not found: ${focus.nodeId}`;
  }
  return (
    <div>
      <h3>{focusModule.name}</h3>
      <h4>Reasons</h4>
      <ul>
        {focusModule.stats.reasons.map((r, i) => (
          <li key={i}>{r.moduleName}</li>
        ))}
      </ul>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
