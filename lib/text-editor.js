"use babel";

let CompositeDisposable = require('atom').CompositeDisposable,
    Dispatcher = require('./dispatcher');

export default class Editor extends React.Component {
    constructor(props) {
        super(props);
        this.subscriptions = new CompositeDisposable();
    }

    componentDidMount() {
        this.textEditorView = React.findDOMNode(this);
        this.textEditor = this.textEditorView.getModel();

        let grammar = Editor.getGrammarForLanguage(this.props.language);
        this.textEditor.setGrammar(grammar);
        this.textEditor.setLineNumberGutterVisible(false);

        this.subscriptions.add(
            this.textEditor.onDidStopChanging(this.onTextChanged));
    }

    static getGrammarForLanguage(language) {
        let matchingGrammars = atom.grammars.grammars.filter(grammar => {
            return grammar.name.toLowerCase() == language.toLowerCase();
        });
        return matchingGrammars[0];
    }

    shouldComponentUpdate() {
        return false;
    }

    componentWillUnmount() {
        this.subscriptions.dispose();
    }

    onTextChanged = () => {
        Dispatcher.dispatch({
            actionType: Dispatcher.actions.cell_source_changed,
            cellID: this.props.data.get('id'),
            source: this.textEditor.getText()
        });
    };

    render() {
        return (
            <atom-text-editor className="cell-input">
                {this.props.data.get('source')}
            </atom-text-editor>
        );
    }
}
