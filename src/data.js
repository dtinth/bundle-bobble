import { observable } from "mobx";
import { log } from "./logging";
import { db } from "./db";

export const data = observable.box(null, { deep: false });

export async function loadData() {
  const found = await db.kv.get("stats");
  if (!found)
    return log(
      "No saved data file found. Please first select a webpack JSON file."
    );
  log("Found file " + found.name);
  try {
    data.set((window.bundleStats = JSON.parse(await found.file.text())));
    log("Data has been read! (Available as `window.bundleStats`)");
  } catch (e) {
    log("Error loading: " + e);
  }
}
