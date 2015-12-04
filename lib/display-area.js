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
    this.state = {
      outputs: []
    };
  }

  componentWillMount() {
    this.transformMimeBundle(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.transformMimeBundle(nextProps);
  }

  render() {
    return (
      <div className="cell-display-area native-key-bindings"
        tabIndex="-1"
        dangerouslySetInnerHTML={{__html: this.state.outputs}}
      >
      </div>
    );
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

  transformMimeBundle(props) {
    let promises = props.data.get('outputs').toJS().map(output => {
      let mimeBundle = this.makeMimeBundle(output);
      if (mimeBundle) {
        return this.transformer.transformRichest(mimeBundle, document).then(mime => mime.el.outerHTML);
      } else return;
		});
    Promise.all(promises).then(outputs => {
      this.setState({outputs: outputs.join('')});
    });
  }

}
