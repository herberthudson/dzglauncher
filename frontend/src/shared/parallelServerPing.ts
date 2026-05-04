import type {domain} from '../../wailsjs/go/models';

export type PingOneFn = (row: domain.ServerRow) => Promise<domain.ServerRow>;

export async function parallelServerPing(
  rows: domain.ServerRow[],
  pingOne: PingOneFn,
  concurrency: number,
  onEach: (updated: domain.ServerRow) => void,
): Promise<domain.ServerRow[]> {
  const results: domain.ServerRow[] = [];
  const queue = [...rows];
  const limit = Math.max(1, Math.min(concurrency, Math.max(1, queue.length)));
  const workers = Array.from({length: limit}, async () => {
    for (;;) {
      const row = queue.shift();
      if (!row) {
        return;
      }
      try {
        const updated = await pingOne(row);
        results.push(updated);
        onEach(updated);
      } catch {
        results.push(row);
        onEach(row);
      }
    }
  });
  await Promise.all(workers);
  return results;
}
