/// <reference types="react" />
/// <reference types="react-dom" />

enum PixelSymbol {
  One = "white",
  Another = "black",
  YetAnother = "gray"
};

function getStartingLine(first, second) {
  let [firstSymbol, firstCount] = first;
  let [secondSymbol, secondCount] = second;

  if (firstSymbol === secondSymbol) {
    throw new Error("The starting line consists of two different symbols");
  }
  if (firstCount < 3 || secondCount < 3) {
    throw new Error("Each symbol should be repeated at least three times, so that an interesting ending takes a couple of turns to reach")
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
  public readonly mark;
  public readonly pattern;

  private constructor([mark, pattern]: [string, string]) {
    this.mark = mark;
    this.pattern = pattern;
  }

  private static readonly Nothing = new PunctuationMark(["∅", "X"]);
  private static readonly Comma = new PunctuationMark([",", "wxw"]);
  private static readonly Ellipsis = new PunctuationMark(['…', "xw"]);
  private static readonly Period = new PunctuationMark([".", "wx"]);
  private static readonly DoubleQuotes = new PunctuationMark(['"', "xwx"]);

  public static readonly All: PunctuationMark[] = [
    PunctuationMark.Nothing,
    PunctuationMark.Comma,
    PunctuationMark.Ellipsis,
    PunctuationMark.Period,
    PunctuationMark.DoubleQuotes
  ];
}

function findPunctuationMark(line) : [number[], PunctuationMark]{
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
      } else if (patternPart === "x") {
        if ((i === line.length - 1 || (i < line.length - 1 && line[i] !== line[i + 1])) &&
          (punctuationMarkPositions.length === 0 ||
            line[punctuationMarkPositions[punctuationMarkPositions.length - 1]] === line[i])) {
          punctuationMarkPositions.push(i);
          ++i;
        } else {
          punctuationMarkPositions = [];
          break;
        }
      } else if (patternPart === "X") {
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
  } else {
    return Object.values(PixelSymbol).map(symbolOption => {
      let newLine = [...line];
      newLine[position] = symbolOption;
      return newLine;
    });
  }
}

type LineProps = {
  key: number;
  clickable: boolean;
  onClick: () => void;
  pixels: PixelSymbol[];
  onDropOnPixel: (pixelNumber: number) => void;
  punctuationMark?: [number[], PunctuationMark];
}

function Line(props: LineProps) {
    const result =
      <div className={"line" + (props.clickable ? " clickable" : "")} onClick={ev => props.onClick()}>
        {props.pixels.map((symbol, index) => 
          <div
              key = {index}
              className = {symbol + " pixel"}
              onDragOver = { ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; } }
              onDrop = { ev => { ev.preventDefault(); props.onDropOnPixel(index); } }>
            {
              props.punctuationMark !== undefined && props.punctuationMark[0].includes(index)
              ?
              props.punctuationMark[1]
              :
              null
            }
          </div>)} 
      </div>;
    return result;
}

type SpaceViewProps = {
  startingLine: PixelSymbol[];
}

type SpaceViewState = {
  foundMarks: Set<PunctuationMark>;
  inStep: boolean;
  lines: PixelSymbol[][];
}

class SpaceView extends React.Component<SpaceViewProps, SpaceViewState> {
  constructor(props) {
    super(props);
    this.state = {
      foundMarks: new Set(),
      inStep: false,
      lines: [this.props.startingLine]
    }
  }

  render() {
    let lines : React.ReactElement<LineProps>[] = this.state.lines.map((line, lineNumber) => {
      const punctuationMark = this.state.inStep ? undefined : findPunctuationMark(line);
      let result : React.ReactElement<LineProps> =
        <Line
          key = {lineNumber}
          pixels = {line}
          clickable = {this.state.inStep || punctuationMark !== undefined} 
          onDropOnPixel = { index => this.setState({ inStep: true, lines: getPossibleLines(line, index) }) }
          onClick = { () => this.setState(s =>
            punctuationMark === undefined ? {
              foundMarks: s.foundMarks,
              inStep: false,
              lines: [line]
            } : {
              foundMarks: new Set(Array.from(s.foundMarks).concat(punctuationMark[1])),
              inStep: false,
              lines: [this.props.startingLine]
            })
          }
          punctuationMark = { punctuationMark } />
      return result;
    });
    let punctuationMark = lines.map(it => it.props.punctuationMark).find(it => it !== undefined);
    let done = this.state.foundMarks.size === PunctuationMark.All.length;

    let result = [];
    if (!this.state.inStep) {
      result.push(
        <div key={-3} className={ "goals" + (this.state.foundMarks.size === 0 ? " invisible" : "") }>
          {PunctuationMark.All.map(it =>
            <span key={it.mark} className={ this.state.foundMarks.has(it.mark) ? "achieved" : "" }>{it.mark}</span>)}
        </div>);
      if (done) {
        result.push(
          <div className="goals" key={-2}><span className="achieved">That's all, folks!</span></div>);
      } else if (punctuationMark === undefined) {
        result.push(
          <div key={-1} className="variable pixel" draggable={true} onDragStart={ ev => ev.dataTransfer.effectAllowed = "move" }>X</div>);
      }
    }
    if (!done) {
      lines.forEach(it => result.push(it));
    }
    return result;
  }
}

ReactDOM.render(
  //<div>!!!</div>,
  <SpaceView startingLine={getStartingLine([PixelSymbol.One, 3], [PixelSymbol.Another, 3])} />,
  document.getElementById("wrapper"));
