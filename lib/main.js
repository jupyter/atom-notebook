'use babel';

import path from 'path';
import React from 'react';
import uuid from 'uuid';
import _ from 'lodash';
import {CompositeDisposable} from 'atom';
import Dispatcher from './dispatcher';
import NotebookEditor from './notebook-editor';
import NotebookEditorView from './notebook-editor-view';``

export default {

  activate(state) {
    console.log('Activated.');
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
    console.log('Run cell');
    Dispatcher.dispatch({
      actionType: Dispatcher.actions.run_active_cell
      // cellID: this.props.data.get('id')
    });
  }

};

function openURI(uriToOpen) {
  const notebookExtensions = ['.ipynb'];
  let uriExtension = path.extname(uriToOpen).toLowerCase();
  if (_.include(notebookExtensions, uriExtension)) return new NotebookEditor(uriToOpen);
}
