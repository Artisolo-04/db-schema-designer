export function setupUndoRedo({ graph, onRestore, onStateChange }) {
  const undoStack = [];
  const redoStack = [];
  let restoring = false;
  let lastSnapshotJson = JSON.stringify(graph.toJSON());

  function emitState() {
    onStateChange?.({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  }

  function snapshot() {
    if (restoring) return;
    const json = JSON.stringify(graph.toJSON());
    if (json === lastSnapshotJson) return;
    undoStack.push(lastSnapshotJson);
    lastSnapshotJson = json;
    redoStack.length = 0;
    if (undoStack.length > 100) undoStack.shift();
    emitState();
  }

  function restore(json) {
    restoring = true;
    graph.fromJSON(JSON.parse(json));
    lastSnapshotJson = json;
    restoring = false;
    onRestore?.();
    emitState();
  }

  function undo() {
    if (!undoStack.length) return;
    const current = lastSnapshotJson;
    const previous = undoStack.pop();
    redoStack.push(current);
    restore(previous);
  }

  function redo() {
    if (!redoStack.length) return;
    const current = lastSnapshotJson;
    const next = redoStack.pop();
    undoStack.push(current);
    restore(next);
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
