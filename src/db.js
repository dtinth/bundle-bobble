import Dexie from "dexie";
export const db = new Dexie("bundlebobble");
db.version(1).stores({
  kv: "key"
});
