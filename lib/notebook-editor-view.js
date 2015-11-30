'use babel';

import path from 'path';
import fs from 'fs-plus';
import File from 'pathwatcher';
import React from 'react';
import _ from 'lodash';
import Immutable from 'immutable';
import {CompositeDisposable} from 'atom';
import {$, ScrollView} from 'atom-space-pen-views';
import NotebookCell from './notebook-cell';

export default class NotebookEditorView extends React.Component {

  constructor(props) {
    super(props);
    this.store = props.store;
    this.subscriptions = new CompositeDisposable();
    //TODO: remove these development handles
    global.editorView = this;
  }

  componentDidMount() {
    this.subscriptions.add(this.store.addStateChangeListener(this._onChange));
  }

  componentDidUpdate(prevProps, prevState) {

  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  render() {
    // console.log('notebookeditorview render called');
    if (this.state.data.get('cells') === null
    || this.state.data.get('cells') === undefined) {
      return <h1>Not Initialized</h1>;
    } else {
      let language = this.state.data.getIn(['metadata', 'kernelspec', 'language']);
      // console.log('Language:', language);
      let notebookCells = this.state.data.get('cells').map((cell) => {
        cell = cell.set('language', language);
        return (
          <NotebookCell
            data={cell}
            key={cell.get('id')}
            language={language}
          />
        );
      });
      return (
        <div className="notebook-editor">
          <header className="notebook-toolbar">
            <button className="btn icon inline-block-tight icon-plus add-cell" onClick={this.addCell}></button>
            <div className='inline-block btn-group'>
              <button className='btn icon icon-playback-play' onClick={this.runActiveCell}></button>
              <button className='btn icon icon-primitive-square' onClick={this.interruptKernel}></button>
            </div>
          </header>
          <div className="notebook-cells-container">
            <div className="redundant-cells-container">
              {notebookCells}
            </div>
          </div>
        </div>
      );
    }
  }

  addCell() {
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.add_cell
      // cellID: this.props.data.get('id')
    });
  }

  runActiveCell() {
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.run_active_cell
      // cellID: this.props.data.get('id')
    });
  }

  interruptKernel() {
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.interrupt_kernel
      // cellID: this.props.data.get('id')
    });
  }

  _fetchState = () => {
    // console.log('fetching NE state');
    if (this.store !== undefined) {
      return this.store.getState();
    } else {
      return Immutable.Map();
    }
  };

  // private onChange handler for use in callbacks
  _onChange = () => {
    let newState = this._fetchState();
    // console.log('Setting state:', newState.toString());
    this.setState({data: newState});
  };

  // set the initial state
  state = {
    data: this.props.store.getState()
  };

}
