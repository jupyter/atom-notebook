# jupyter-notebook

A package that works like the Jupyter Notebook, but inside Atom. It's registered as an opener for `.ipynb` files — try opening one!

![Sweet baby integration](http://i.imgur.com/100MtXR.png)

## Install

1. Install dependencies:
  * Python 3: `brew install python3` (there are [issues](http://apple.stackexchange.com/questions/209572/how-to-use-pip-after-the-el-capitan-max-os-x-upgrade) with pip2 and OS X 10.11)
  * Jupyter and Jupyter Kernel Gateway: `pip3 install jupyter jupyter_kernel_gateway`
2. `apm install jupyter-notebook`

## Usage

* Run cell: SHIFT+ENTER, CMD+ENTER (or CTRL+ENTER on Windows)

## Developers

### Install

1. `git clone https://github.com/jupyter/atom-notebook.git`
2. `apm install`
3. `apm link`

### Achitecture

This package is built on React and the Flux architecture.

#### Map

- **main** tells Atom how to render `NotebookEditor` and registers as an Opener for `.ipynb` files
- **dispatcher** is a singleton flux.Dispatcher which contains the list of valid actions
- **notebook-editor** is the Store and handles all of the business logic. It loads the file in, creates a state, then receives Actions and updates the state accordingly.
- **notebook-editor-view**, notebook-cell, text-editor, display-area are the views. notebook-editor-view updates its state by fetching it from notebook-editor, then passes appropriate bits of that state down to the other views as props.

#### Flow

**Rendering:** `NotebookEditor -> NotebookEditorView -> [child views]`

**Updating:** `[external action] -> Dispatcher.dispatch -> NotebookEditor.onAction ?-> NotebookEditor._onChange -> NotebookEditorView._onChange`

#### Immutable state

The state returned by `NotebookEditor.getState` is an [`Immutable.js`](https://facebook.github.io/immutable-js/) object.

Accessing its properties inside a view looks like this:

```javascript
let executionCount = this.props.data.get('execution_count');
```

Changing it (in NotebookEditor) looks like this:

```javascript
this.state = this.state.setIn(
    ['cells', cellIndex, 'source'],
    payload.source);
```

or this:

```javascript
outputs = outputs.push(el.outerHTML);
```

Since React requires a view's state to be a regular JS object, the state of NotebookEditorView takes the form:

```javascript
{
    data: <Immutable object>
}
```

No other views have state.

### To do

- add more actions (duplicate cell, restart kernel, change cell type, etc)
- autocomplete
- files saved by this package are not currently loadable by `ipython notebook`
- tell React [our rendering is pure](https://facebook.github.io/react/docs/advanced-performance.html)
- test rendering performance with big notebooks
