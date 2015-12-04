'use babel';

import React from 'react';
import {Transformime} from 'transformime';
import {
  StreamTransformer,
  TracebackTransformer,
  MarkdownTransformer,
  LaTeXTransformer,
  PDFTransformer
} from 'transformime-jupyter-transformers';

export default class DisplayArea extends React.Component {

  constructor(props) {
    super(props);
		this.transformer = new Transformime();
		this.transformer.transformers.push(new StreamTransformer());
		this.transformer.transformers.push(new TracebackTransformer());
		this.transformer.transformers.push(new MarkdownTransformer());
		this.transformer.transformers.push(new LaTeXTransformer());
		this.transformer.transformers.push(new PDFTransformer());
  }

  componentDidMount() {
    this.setupDOM();
  }

  componentDidUpdate() {
    this.el.innerHTML = '';
    let outputs = this.props.data.get('outputs').forEach(output => {
      let mimeBundle = this.makeMimeBundle(output);
      if (mimeBundle) {
        this.transformer.transformRichest(mimeBundle, document).then(res => {
          this.el.innerHTML += res.el.outerHTML;
        });
      }
		});
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

  makeMimeBundle(msg) {
  	let bundle = {};
  	switch (msg.output_type) {
  		case 'execute_result':
  		case 'display_data':
  			bundle = msg.data;
  			break;
  		case 'stream':
  			bundle = {'text/plain': msg.text};
  			// bundle = {
  			//   'jupyter/stream': msg
  			// };
  			break;
  		case 'error':
  			bundle = {
  				'jupyter/traceback': msg
  			};
  			break;
  		default:
  			console.warn('Unrecognized output type: ' + msg.output_type);
  			bundle = {
  				'text/plain': 'Unrecognized output type' + JSON.stringify(msg)
  			};
  	}
  	return bundle;
  }

}
