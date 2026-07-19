export function setupResizeObserver({ paper, container }) {
  let disposed = false;
  const rafIds = [];

  function measureAndResize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      paper.setDimensions(rect.width, rect.height);
    }
  }

  measureAndResize();
  rafIds.push(requestAnimationFrame(() => {
    if (disposed) return;
    measureAndResize();
    rafIds.push(requestAnimationFrame(measureAndResize));
  }));

  const resizeObserver = new ResizeObserver(() => measureAndResize());
  resizeObserver.observe(container);

  function teardownResizeObserver() {
    disposed = true;
    rafIds.forEach(cancelAnimationFrame);
    resizeObserver.disconnect();
  }

  return { teardownResizeObserver };
}
