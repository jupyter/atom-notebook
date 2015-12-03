'use babel';

import path from 'path';
import React from 'react';
import {CompositeDisposable} from 'atom';
import Dispatcher from './dispatcher';
import NotebookEditor from './notebook-editor';
import NotebookEditorView from './notebook-editor-view';``

export default {

  activate(state) {
    // console.log('Activated');
    fixPath();
    this.openerDisposable = atom.workspace.addOpener(openURI);
    this.commands = atom.commands.add('.notebook-cell atom-text-editor', 'jupyter-notebook-atom:run', this.run);
    atom.views.addViewProvider({
      modelConstructor: NotebookEditor,
      createView: model => {
        let el = document.createElement('div');
        el.classList.add('notebook-wrapper');
        let viewComponent = React.render(
          <NotebookEditorView store={model} />,
          el);
        return el;
      }
    });
  },

  deactivate() {
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.destroy
    });
    this.openerDisposable.dispose();
    this.commands.dispose();
  },

  toggle() {
    console.log('JupyterNotebookAtom was toggled!');
    if (this.modalPanel.isVisible()) {
      return this.modalPanel.hide();
    } else {
      return this.modalPanel.show();
    }
  },

  run() {
    // console.log('Run cell');
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.run_active_cell
      // cellID: this.props.data.getIn(['metadata', 'id'])
    });
  }

};

function fixPath() {
  process.env.PATH = process.env.PATH.split(':').reduce((result, path) => {
    if (result.find(item => item === path)) result.push(path);
    return result;
  }, [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/local/sbin',
    '/usr/sbin',
    '/sbin'
  ]).join(':');
}

function openURI(uriToOpen) {
  const notebookExtensions = ['.ipynb'];
  let uriExtension = path.extname(uriToOpen).toLowerCase();
  if (notebookExtensions.find(extension => extension === uriExtension)) return new NotebookEditor(uriToOpen);
}
