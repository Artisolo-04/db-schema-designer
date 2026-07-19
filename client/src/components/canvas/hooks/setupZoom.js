export function setupZoom({ graph, paper, container }) {
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 2;

  function zoomBy(delta) {
    const oldScale = paper.scale().sx;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale + delta));
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const translate = paper.translate();

    const graphX = (cx - translate.tx) / oldScale;
    const graphY = (cy - translate.ty) / oldScale;
    paper.scale(newScale, newScale);

    paper.translate(cx - graphX * newScale, cy - graphY * newScale);
  }

  function zoomToFit() {
    const elements = graph.getElements();
    const rect = container.getBoundingClientRect();
    if (!elements.length) {
      paper.scale(1, 1);
      paper.translate(rect.width / 2, rect.height / 2);
      return;
    }
    const bbox = graph.getBBox();
    const padding = 60;
    const scaleX = (rect.width - padding * 2) / bbox.width;
    const scaleY = (rect.height - padding * 2) / bbox.height;
    const scale = Math.min(1, Math.max(MIN_SCALE, Math.min(scaleX, scaleY)));
    paper.scale(scale, scale);
    const tx = rect.width / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = rect.height / 2 - (bbox.y + bbox.height / 2) * scale;
    paper.translate(tx, ty);
  }

  function handleWheel(evt) {
    evt.preventDefault();
    const oldScale = paper.scale().sx;
    const newScale = Math.min(2, Math.max(0.3, oldScale + (evt.deltaY < 0 ? 0.2 : -0.2)));
    const rect = container.getBoundingClientRect();
    const translate = paper.translate();

    const cursorX = evt.clientX - rect.left;
    const cursorY = evt.clientY - rect.top;
    const graphX = (cursorX - translate.tx) / oldScale;
    const graphY = (cursorY - translate.ty) / oldScale;

    paper.scale(newScale, newScale);

    const newTx = cursorX - graphX * newScale;
    const newTy = cursorY - graphY * newScale;
    paper.translate(newTx, newTy);
  }

  container.addEventListener('wheel', handleWheel, { passive: false });

  function teardownZoom() {
    container.removeEventListener('wheel', handleWheel);
  }

  return { zoomBy, zoomToFit, teardownZoom };
}
