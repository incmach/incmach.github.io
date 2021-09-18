import React from 'react';
import ReactDOM from 'react-dom';
var PixelSymbol;
(function (PixelSymbol) {
    PixelSymbol["One"] = "white";
    PixelSymbol["Another"] = "black";
    PixelSymbol["YetAnother"] = "gray";
})(PixelSymbol || (PixelSymbol = {}));
;
function getStartingLine(first, second) {
    let [firstSymbol, firstCount] = first;
    let [secondSymbol, secondCount] = second;
    if (firstSymbol === secondSymbol) {
        throw new Error("The starting line consists of two different symbols");
    }
    if (firstCount < 3 || secondCount < 3) {
        throw new Error("Each symbol should be repeated at least three times, so that an interesting ending takes a couple of turns to reach");
    }
    let result = new Array(firstCount + secondCount);
    for (let i = 0; i < firstCount; ++i) {
        result[i] = firstSymbol;
    }
    for (let i = secondCount; i < firstCount + secondCount; ++i) {
        result[i] = secondSymbol;
    }
    return result;
}
class PunctuationMark {
    mark;
    pattern;
    constructor([mark, pattern]) {
        this.mark = mark;
        this.pattern = pattern;
    }
    static Nothing = new PunctuationMark(["∅", "X"]);
    static Comma = new PunctuationMark([",", "wxw"]);
    static Ellipsis = new PunctuationMark(['…', "xw"]);
    static Period = new PunctuationMark([".", "wx"]);
    static DoubleQuotes = new PunctuationMark(['"', "xwx"]);
    static All = [
        PunctuationMark.Nothing,
        PunctuationMark.Comma,
        PunctuationMark.Ellipsis,
        PunctuationMark.Period,
        PunctuationMark.DoubleQuotes
    ];
}
function findPunctuationMark(line) {
    for (const pm of PunctuationMark.All) {
        let i = 0;
        let punctuationMarkPositions = [];
        for (const patternPart of pm.pattern) {
            if (patternPart === "w") {
                if (i + 1 >= line.length || line[i] !== line[i + 1]) {
                    punctuationMarkPositions = [];
                    break;
                }
                ++i;
                while (i < line.length &&
                    (line[i] === line[i - 1] || i + 1 < line.length && line[i] === line[i + 1])) {
                    ++i;
                }
            }
            else if (patternPart === "x") {
                if ((i === line.length - 1 || (i < line.length - 1 && line[i] !== line[i + 1])) &&
                    (punctuationMarkPositions.length === 0 ||
                        line[punctuationMarkPositions[punctuationMarkPositions.length - 1]] === line[i])) {
                    punctuationMarkPositions.push(i);
                    ++i;
                }
                else {
                    punctuationMarkPositions = [];
                    break;
                }
            }
            else if (patternPart === "X") {
                punctuationMarkPositions.push(i);
                while (++i < line.length && line[i] === line[i - 1]) {
                    punctuationMarkPositions.push(i);
                }
            }
        }
        if (punctuationMarkPositions.length > 0 && i === line.length) {
            return [punctuationMarkPositions, pm.mark];
        }
    }
    return undefined;
}
function getPossibleLines(line, position) {
    let positionsNeighborhood = new Set();
    positionsNeighborhood.add(line[position]);
    if (position > 0) {
        positionsNeighborhood.add(line[position - 1]);
    }
    if (position < line.length - 1) {
        positionsNeighborhood.add(line[position + 1]);
    }
    if (positionsNeighborhood.size === 1) {
        return [line];
    }
    else {
        return Object.values(PixelSymbol).map(symbolOption => {
            let newLine = [...line];
            newLine[position] = symbolOption;
            return newLine;
        });
    }
}
class Line extends React.Component {
    render() {
        return React.createElement("div", {
            className: "line" + (this.props.clickable ? " clickable" : ""),
            onClick: ev => this.props.onClick()
        }, this.props.pixels.map((symbol, index) => {
            return React.createElement("div", {
                key: index,
                className: symbol + " pixel",
                onDragOver: ev => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                },
                onDrop: ev => {
                    ev.preventDefault();
                    this.props.onDropOnPixel(index);
                },
            }, this.props.punctuationMark !== undefined && this.props.punctuationMark[0].includes(index) ?
                this.props.punctuationMark[1] :
                null);
        }));
    }
}
class SpaceView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            foundMarks: new Set(),
            inStep: false,
            lines: [this.props.startingLine]
        };
    }
    render() {
        let lines = this.state.lines.map((line, lineNumber) => {
            const punctuationMark = this.state.inStep ? undefined : findPunctuationMark(line);
            const props = {
                key: lineNumber,
                pixels: line,
                clickable: this.state.inStep || punctuationMark !== undefined,
                onDropOnPixel: index => this.setState({
                    inStep: true,
                    lines: getPossibleLines(line, index)
                }),
                onClick: () => this.setState(s => punctuationMark === undefined ? {
                    foundMarks: s.foundMarks,
                    inStep: false,
                    lines: [line]
                } : {
                    foundMarks: new Set(Array.from(s.foundMarks).concat(punctuationMark[1])),
                    inStep: false,
                    lines: [this.props.startingLine]
                }),
                punctuationMark: punctuationMark
            };
            return React.createElement(Line, props);
        });
        let punctuationMark = lines.map(it => it.props.punctuationMark).find(it => it !== undefined);
        let done = this.state.foundMarks.size === Object.values(PunctuationMark).length;
        let result = [];
        if (!this.state.inStep) {
            result.push(React.createElement("div", {
                className: "goals" + (this.state.foundMarks.size === 0 ? " invisible" : ""),
                key: -3
            }, Object.values(PunctuationMark).map(([it, _]) => React.createElement("span", {
                key: it,
                className: this.state.foundMarks.has(it) ? "achieved" : ""
            }, it))));
            if (done) {
                result.push(React.createElement("div", {
                    className: "goals",
                    key: -2
                }, React.createElement("span", {
                    className: "achieved"
                }, "That's all, folks!")));
            }
            else if (punctuationMark === undefined) {
                result.push(React.createElement("div", {
                    key: -1,
                    className: "variable pixel",
                    draggable: true,
                    onDragStart: ev => {
                        ev.dataTransfer.effectAllowed = "move";
                    }
                }, "X"));
            }
        }
        if (!done) {
            lines.forEach(it => result.push(it));
        }
        return result;
    }
}
ReactDOM.render(React.createElement(SpaceView, {
    startingLine: getStartingLine([PixelSymbol.One, 3], [PixelSymbol.Another, 3])
}, null), document.getElementById("wrapper"));
