export function setupMinimap({ graph, paper, container, minimapContainer }) {
  let minimapSvg = null;
  let minimapViewportRect = null;
  const nodeRectsById = new Map();

  if (minimapContainer) {
    minimapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    minimapSvg.setAttribute('width', '100%');
    minimapSvg.setAttribute('height', '100%');
    minimapSvg.style.display = 'block';
    minimapSvg.style.cursor = 'pointer';
    minimapContainer.appendChild(minimapSvg);

    minimapViewportRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    minimapViewportRect.setAttribute('fill', 'rgba(124, 77, 242, 0.15)');
    minimapViewportRect.setAttribute('stroke', '#7c4df2');
    minimapViewportRect.setAttribute('stroke-width', '3');
    minimapViewportRect.setAttribute('vector-effect', 'non-scaling-stroke');
  }

  function renderMinimapNodes() {
    if (!minimapSvg) return;
    nodeRectsById.forEach((rect) => rect.remove());
    nodeRectsById.clear();
    graph.getElements().forEach((el) => {
      const { x, y } = el.position();
      const { width, height } = el.size();
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('rx', 6);
      rect.setAttribute('fill', '#4a37c2');
      rect.setAttribute('stroke', '#8b82ff');
      rect.setAttribute('stroke-width', '2');
      minimapSvg.appendChild(rect);
      nodeRectsById.set(el.id, rect);
    });
    if (minimapViewportRect) minimapSvg.appendChild(minimapViewportRect);
  }

  function updateMinimapViewBox() {
    if (!minimapSvg) return;
    const bbox = graph.getBBox();
    const padding = 120;
    const vb = !bbox || (bbox.width === 0 && bbox.height === 0)
      ? { x: -500, y: -500, width: 1000, height: 1000 }
      : { x: bbox.x - padding, y: bbox.y - padding, width: bbox.width + padding * 2, height: bbox.height + padding * 2 };
    minimapSvg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  function updateMinimapViewport() {
    if (!minimapViewportRect) return;
    const scale = paper.scale().sx;
    const translate = paper.translate();
    const rect = container.getBoundingClientRect();
    minimapViewportRect.setAttribute('x', -translate.tx / scale);
    minimapViewportRect.setAttribute('y', -translate.ty / scale);
    minimapViewportRect.setAttribute('width', rect.width / scale);
    minimapViewportRect.setAttribute('height', rect.height / scale);
  }

  let minimapRAF = null;
  function scheduleMinimapUpdate() {
    if (minimapRAF) return;
    minimapRAF = requestAnimationFrame(() => {
      minimapRAF = null;
      updateMinimapViewBox();
      renderMinimapNodes();
      updateMinimapViewport();
    });
  }
  scheduleMinimapUpdate();

  graph.on('add remove change:position change:size', scheduleMinimapUpdate);
  paper.on('scale translate', scheduleMinimapUpdate);

  function panFromMinimapEvent(evt) {
    if (!minimapSvg) return;
    const svgRect = minimapSvg.getBoundingClientRect();
    const vb = minimapSvg.viewBox.baseVal;
    const graphX = vb.x + ((evt.clientX - svgRect.left) / svgRect.width) * vb.width;
    const graphY = vb.y + ((evt.clientY - svgRect.top) / svgRect.height) * vb.height;
    const scale = paper.scale().sx;
    const rect = container.getBoundingClientRect();
    paper.translate(-(graphX * scale) + rect.width / 2, -(graphY * scale) + rect.height / 2);
  }

  return function teardownMinimap() {
    graph.off('add remove change:position change:size', scheduleMinimapUpdate);
    paper.off('scale translate', scheduleMinimapUpdate);
    if (minimapRAF) cancelAnimationFrame(minimapRAF);
    if (minimapContainer && minimapSvg) minimapContainer.removeChild(minimapSvg);
  };
}
