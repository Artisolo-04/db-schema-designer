export function setupSelection({ graph, paper, setSelected, blurActiveInput }) {
  let selectedCell = null;

  function setLinksDimmed(exceptId) {
    graph.getLinks().forEach((link) => {
      const view = paper.findViewByModel(link);
      if (!view) return;
      view.el.style.opacity = link.id === exceptId ? '1' : '0.4';
    });
  }

  function clearLinksDimmed() {
    graph.getLinks().forEach((link) => {
      const view = paper.findViewByModel(link);
      if (view) view.el.style.opacity = '1';
    });
  }

  function clearSelection() {
    if (!selectedCell) return;
    if (selectedCell.isLink()) setSelected(selectedCell, false);
    else paper.findViewByModel(selectedCell)?.el.classList.remove('joint-selected');
    clearLinksDimmed();
    selectedCell = null;
  }

  function selectCell(cell) {
    if (selectedCell === cell) return;
    clearSelection();
    selectedCell = cell;
    if (cell.isLink()) {
      setSelected(cell, true);
      setLinksDimmed(cell.id);
    } else {
      paper.findViewByModel(cell)?.el.classList.add('joint-selected');
    }
  }

  paper.on('element:pointerdown', (cellView) => { blurActiveInput(); selectCell(cellView.model); });
  paper.on('link:pointerclick', (cellView) => selectCell(cellView.model));
  paper.on('blank:pointerdown', () => { blurActiveInput(); clearSelection(); });

  return {
    getSelectedCell: () => selectedCell,
    clearSelectionSelectedRef: () => { selectedCell = null; },
  };
}
