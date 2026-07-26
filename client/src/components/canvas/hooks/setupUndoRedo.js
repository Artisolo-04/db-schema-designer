export function setupUndoRedo({ graph, getExtras, applyExtras, onRestore, onStateChange }) {
  const undoStack = [];
  const redoStack = [];
  let restoring = false;
  function buildSnapshot() {
    return JSON.stringify({
      graph: graph.toJSON(),
      extras: getExtras ? getExtras() : null,
    });
  }
  let lastSnapshotJson = buildSnapshot();
  let lastMeta = null;
  function emitState() {
    onStateChange?.({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  }
  function snapshot(meta = null) {
    if (restoring) return;
    const json = buildSnapshot();
    if (json === lastSnapshotJson) return;
    undoStack.push({ json: lastSnapshotJson, meta: lastMeta });
    lastSnapshotJson = json;
    lastMeta = meta;
    redoStack.length = 0;
    if (undoStack.length > 100) undoStack.shift();
    emitState();
  }
  function restore(entry, changeMeta) {
    restoring = true;
    const parsed = JSON.parse(entry.json);
    graph.fromJSON(parsed.graph);
    if (applyExtras) applyExtras(parsed.extras);
    lastSnapshotJson = entry.json;
    lastMeta = entry.meta;
    restoring = false;
    onRestore?.(changeMeta);
    emitState();
  }
  function undo() {
    if (!undoStack.length) return;
    const currentEntry = { json: lastSnapshotJson, meta: lastMeta };
    const previous = undoStack.pop();
    redoStack.push(currentEntry);
    restore(previous, currentEntry.meta);
  }
  function redo() {
    if (!redoStack.length) return;
    const currentEntry = { json: lastSnapshotJson, meta: lastMeta };
    const next = redoStack.pop();
    undoStack.push(currentEntry);
    restore(next, next.meta);
  }
  emitState();
  return {
    snapshot,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
