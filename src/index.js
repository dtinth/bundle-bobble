import React from "react";
import ReactDOM from "react-dom";
import { useObserver } from "mobx-react-lite";
import "./styles.css";
import { db } from "./db";
import { log, logElementRef } from "./logging";
import { data, loadData } from "./data";

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
      {statsJson ? "OK" : <p>No stats loaded</p>}
      <h2>Logs</h2>
      <pre ref={logElementRef} />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
