export function setupSelection({ graph, paper, setSelected, blurActiveInput, onSelectionChange }) {
  let selectedCell = null;
  let selectedOriginalZ = null;

  function getLineNode(link) {
    const view = paper.findViewByModel(link);
    return view ? view.el.querySelector('[joint-selector="line"]') : null;
  }

  function setLinksDimmed(exceptId) {
    graph.getLinks().forEach((link) => {
      const lineNode = getLineNode(link);
      if (!lineNode) return;
      if (link.id === exceptId) {
        lineNode.classList.remove('edge-dimmed');
      } else {
        lineNode.classList.add('edge-dimmed');
      }
    });
  }

  function clearLinksDimmed() {
    graph.getLinks().forEach((link) => {
      const lineNode = getLineNode(link);
      if (lineNode) lineNode.classList.remove('edge-dimmed');
    });
  }

  function activateElectron(link) {
    const lineNode = getLineNode(link);
    if (lineNode) lineNode.classList.add('edge-premium', 'edge-flowing');
    selectedOriginalZ = link.get('z') ?? 0;
    link.toFront();
  }

  function deactivateElectron(link) {
    const lineNode = getLineNode(link);
    if (lineNode) lineNode.classList.remove('edge-premium', 'edge-flowing');
    if (selectedOriginalZ !== null) {
      link.set('z', selectedOriginalZ);
      selectedOriginalZ = null;
    }
  }

  function clearSelection() {
    if (!selectedCell) return;
    if (selectedCell.isLink()) {
      setSelected(selectedCell, false);
      deactivateElectron(selectedCell);
    } else {
      paper.findViewByModel(selectedCell)?.el.classList.remove('joint-selected');
    }
    clearLinksDimmed();
    selectedCell = null;
    onSelectionChange?.(null);
  }

  function selectCell(cell) {
    if (selectedCell === cell) return;
    clearSelection();
    selectedCell = cell;
    if (cell.isLink()) {
      setSelected(cell, true);
      activateElectron(cell);
      setLinksDimmed(cell.id);
    } else {
      paper.findViewByModel(cell)?.el.classList.add('joint-selected');
    }
    onSelectionChange?.(cell);
  }

  paper.on('element:pointerdown', (cellView) => { blurActiveInput(); selectCell(cellView.model); });
  paper.on('link:pointerclick', (cellView) => selectCell(cellView.model));
  paper.on('blank:pointerdown', () => { blurActiveInput(); clearSelection(); });

  return {
    getSelectedCell: () => selectedCell,
    clearSelectionSelectedRef: () => { selectedCell = null; },
  };
}
