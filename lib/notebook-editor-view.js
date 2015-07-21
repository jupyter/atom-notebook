"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash',)
    Immutable = require('immutable'),
    React = require('react'),
    {$, ScrollView} = require('atom-space-pen-views'),


    NotebookCell = require('./notebook-cell');

export default class NotebookEditorView extends React.Component {

    constructor(props) {
        super(props);
        this.store = props.store;
    }

    componentDidMount() {
        this._onChange();
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("Updated. Previous state:",
                    prevState.data.toString(),
                    "New state:",
                    this.state.data.toString());
    }

    render() {
        console.log("notebookeditorview render called");
        if(this.state.data.get('cells') === null || this.state.data.get('cells') === undefined) {
            return <h1>Not Initialized</h1>;
        } else {
            let notebookCells = this.state.data.get('cells').map((cell) => {
                cell = cell.set('language',
                                this.state.data.getIn(['metadata', 'kernelspec', 'language']));
                return <NotebookCell data={cell} />;
            });

            return (
                <div>
                    {notebookCells}
                </div>
            );
        }
    }

    _fetchState = () => {
        console.log("fetching NE state");
        if (this.store !== undefined) {
            return this.store.getState();
        } else {
            return Immutable.Map();
        }
    };

    // private onChange handler for use in callbacks
    _onChange = () => {
        let newState = this._fetchState();
        console.log("Setting state:", newState.toString());
        this.setState({
            data: newState
        });
    };

    // set the initial state
    state = {
        data: this._fetchState()
    };
}
