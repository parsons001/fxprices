// Queue before starting MongoDB operations so waiting does not use their timeout.
export function createWriteQueue(limit = 5) {
  let active = 0;
  const waiting = [];
  return async function run(task) {
    if (active >= limit) await new Promise((resolve) => waiting.push(resolve));
    else active++;
    try { return await task(); }
    finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
