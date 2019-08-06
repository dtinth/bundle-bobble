import { observable } from "mobx";
import { log } from "./logging";
import { db } from "./db";

export const data = observable.box(null, { deep: false });

export async function loadData() {
  const found = await db.kv.get("stats");
  if (!found) return log("Not found");
  log("Found file " + found.name);
  data.set((window.bundleData = JSON.parse(await found.file.text())));
  log("Data has been read!");
}
