import { dia } from '@joint/core';
import { createRoot } from 'react-dom/client';
import TableNode from '../TableNode.jsx';

export default class TableElementView extends dia.ElementView {
  presentationAttributes = dia.ElementView.addPresentationAttributes({});

  onRender() {
    this.reactRoot = null;
    this.reactProps = {};
  }

  render() {
    super.render();
    this.foContentEl = this.selectors?.foContent || this.el.querySelector('[joint-selector="foContent"]');
    if (this.foContentEl && !this.reactRoot) {
      this.reactRoot = createRoot(this.foContentEl);
    }
    this.syncForeignObjectSize();
    this.renderReact(this.reactProps);
    return this;
  }

  syncForeignObjectSize() {
    const { width, height } = this.model.size();
    const foEl = this.selectors?.fo || this.el.querySelector('[joint-selector="fo"]');
    if (foEl) {
      foEl.setAttribute('width', width);
      foEl.setAttribute('height', height);
    }
  }

  update(...args) {
    super.update(...args);
    this.syncForeignObjectSize();
  }

  renderReact(props) {
    this.reactProps = props;
    if (!this.reactRoot) return;
    this.reactRoot.render(<TableNode id={this.model.id} data={this.model.get('data')} {...props} />);
  }

  onRemove() {
    const root = this.reactRoot;
    this.reactRoot = null;
    if (root) setTimeout(() => root.unmount(), 0);
    super.onRemove?.();
  }
}
