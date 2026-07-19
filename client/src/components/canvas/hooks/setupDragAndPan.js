import { collidesWithAny } from '../../../utils/collision.js';

export function setupDragAndPan({ graph, paper, container, GRID_SIZE, otherRects, emitChange, blurActiveInput }) {
  let draggingId = null;
  let skipNextChange = false;
  let lastValidPosition = null;

  paper.on('element:pointerdown', (elementView, evt) => {
    blurActiveInput();
    draggingId = elementView.model.id;
    lastValidPosition = { ...elementView.model.position() };
    elementView.el.classList.add('dragging-magnetic');
  });

  graph.on('change:position', (cell, newPosition) => {
    if (skipNextChange) {
      skipNextChange = false;
      return;
    }

    if (!cell.isElement?.() || cell.id !== draggingId) return;

    const cellSize = cell.size();
    const others = otherRects(cell.id);

    if (!collidesWithAny(cell.id, newPosition, cellSize, others, 80)) {
      lastValidPosition = { ...newPosition };
      return;
    }

    const slideX = { x: newPosition.x, y: lastValidPosition.y };
    const slideY = { x: lastValidPosition.x, y: newPosition.y };

    if (!collidesWithAny(cell.id, slideX, cellSize, others, 80)) {
      skipNextChange = true;
      cell.position(slideX.x, slideX.y);
      lastValidPosition = { ...slideX };
      return;
    }

    if (!collidesWithAny(cell.id, slideY, cellSize, others, 80)) {
      skipNextChange = true;
      cell.position(slideY.x, slideY.y);
      lastValidPosition = { ...slideY };
      return;
    }

    skipNextChange = true;
    cell.position(lastValidPosition.x, lastValidPosition.y);
  });

  paper.on('element:pointerup', (elementView) => {
    elementView.el.classList.remove('dragging-magnetic');
    draggingId = null;
    lastValidPosition = null;
    emitChange();
  });

  let panning = false;
  let panStart = null;
  const containerEl = container;

  paper.on('blank:pointerdown', (evt) => {
    blurActiveInput();
    panning = true;
    panStart = { x: evt.clientX, y: evt.clientY, tx: paper.translate().tx, ty: paper.translate().ty };
  });

  let autoPanRAF = null;
  let lastMousePos = null;

  function updateAutoPan(clientX, clientY) {
    if (!draggingId) {
      autoPanRAF = null;
      return;
    }

    const rect = containerEl.getBoundingClientRect();
    const threshold = 80;
    const panSpeed = 8;

    let dx = 0, dy = 0;

    if (clientX - rect.left < threshold) dx = panSpeed;
    else if (clientX - rect.left > rect.width - threshold) dx = -panSpeed;

    if (clientY - rect.top < threshold) dy = panSpeed;
    else if (clientY - rect.top > rect.height - threshold) dy = -panSpeed;

    if (dx !== 0 || dy !== 0) {
      const current = paper.translate();
      paper.translate(current.tx + dx, current.ty + dy);

      if (autoPanRAF) cancelAnimationFrame(autoPanRAF);
      autoPanRAF = requestAnimationFrame(() => {
        updateAutoPan(lastMousePos.x, lastMousePos.y);
      });
    } else {
      autoPanRAF = null;
    }
  }

  function handlePointerMove(evt) {
    lastMousePos = { x: evt.clientX, y: evt.clientY };

    if (!panning || !panStart) {
      if (draggingId && !autoPanRAF) {
        autoPanRAF = requestAnimationFrame(() => {
          updateAutoPan(lastMousePos.x, lastMousePos.y);
        });
      }
      return;
    }

    const scale = paper.scale().sx;
    const step = GRID_SIZE * scale;
    const rawTx = panStart.tx + (evt.clientX - panStart.x);
    const rawTy = panStart.ty + (evt.clientY - panStart.y);
    const snappedTx = Math.round(rawTx / step) * step;
    const snappedTy = Math.round(rawTy / step) * step;
    paper.translate(snappedTx, snappedTy);
  }

  function handlePointerUp() {
    panning = false;
    panStart = null;
    if (autoPanRAF) {
      cancelAnimationFrame(autoPanRAF);
      autoPanRAF = null;
    }
  }

  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);

  function teardownDragAndPan() {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }

  return { teardownDragAndPan };
}
