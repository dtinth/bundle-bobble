import React from "react";
import ReactDOM from "react-dom";
import { useObserver } from "mobx-react-lite";
import "./styles.css";
import { db } from "./db";
import { log, logElementRef } from "./logging";
import { data, loadData } from "./data";
import { ErrorBoundary } from "react-error-boundary";
import { Link, Router } from "@reach/router";

function App() {
  const form = React.useRef();
  const statsJson = useObserver(() => data.get());
  React.useEffect(() => {
    log("Hello!");
    if (data.get() === null) loadData();
    else log("Data has already been loaded");
  }, []);
  return (
    <div className="container p-4">
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

function Bobble({ stats, "*": groupName }) {
  const group = stats.namedChunkGroups[groupName];
  if (!group) return "Not found!";
  return (
    <div>
      <h3>Bobble chunk {groupName}</h3>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
