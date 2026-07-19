export function setupGlobalReroute({ graph, paper }) {
  let rerouteRAF = null;
  function scheduleGlobalReroute() {
    if (rerouteRAF) return;
    rerouteRAF = requestAnimationFrame(() => {
      rerouteRAF = null;
      graph.getLinks().forEach((link) => {
        const view = link.findView(paper);
        view?.update();
      });
    });
  }

  graph.on('change:position change:size', scheduleGlobalReroute);

  function teardownGlobalReroute() {
    if (rerouteRAF) cancelAnimationFrame(rerouteRAF);
  }

  return { teardownGlobalReroute };
}
