'use babel';

import React from 'react';
import {Transformime} from 'transformime';
import {
	StreamTransformer,
	TracebackTransformer,
	MarkdownTransformer,
}
from 'transformime-jupyter-transformers';

export default class DisplayArea extends React.Component {

  constructor(props) {
      super(props);
    this.transformer = new Transformime();
    this.transformer.transformers.push(new StreamTransformer());
    this.transformer.transformers.push(new TracebackTransformer());
      this.transformer.transformers.push(new MarkdownTransformer());
  }

  componentDidMount() {
    this.setupDOM();
  }

  // transformime-generated HTML is in outputs
  // after every render, fill our element with that HTML
  componentDidUpdate() {
    let outputs = this.props.data.get('outputs');
    let outputHTML = outputs.join('');
    this.el.innerHTML = outputHTML;
  }

  render() {
    return (
      <div className="cell-display-area native-key-bindings" tabIndex="-1">
      </div>
    );
  }

  setupDOM() {
    let container = React.findDOMNode(this);
    let outputNode = document.createElement('div');
    outputNode.style.backgroundColor = 'white';
    this.shadow = container.createShadowRoot();
    this.shadow.appendChild(outputNode);
    this.document = this.shadow.ownerDocument;
    this.el = outputNode;
  }

}
