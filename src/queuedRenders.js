import { useEffect, useState, useRef } from "react";
let queueContents = new Map();
let latestWorker = null;

function workOnQueue() {
  const worker = {
    stop() {
      latestWorker = null;
    }
  };
  latestWorker = worker;
  void (async () => {
    let lastFrame = performance.now();
    while (latestWorker === worker) {
      if (queueContents.size === 0) latestWorker = null;
      for (const [key, value] of queueContents) {
        queueContents.delete(key);
        try {
          await value.update();
        } catch (e) {
          setTimeout(() => {
            throw e;
          });
        }
        break;
      }
      let elapsed = performance.now() - lastFrame;
      if (elapsed > 20) {
        await new Promise(r => setTimeout(r, 1));
        lastFrame = performance.now();
      }
    }
  })();
}

export function useComputationallyIntensiveValue(f) {
  let ref = useRef();
  let [state, setState] = useState({ value: null, source: null });
  useEffect(() => {
    queueContents.set(ref, {
      async update() {
        const v = await f();
        setState({ value: v, source: f });
      }
    });
    if (!latestWorker) {
      workOnQueue();
    }
    return () => {
      queueContents.delete(ref);
    };
  }, [f]);
  return state;
}
