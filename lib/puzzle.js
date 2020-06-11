// railroadSolver
// the puzzle is an 8*8 grid.
// each row and column has a number, which is the constraint
// on how many pieces can be put in the that row/column
// also there are 2 pieces: the start and finish already on the board
// pieces are either straight (2 orientations, or 90deg corners (4 orientations)
// so we have 6 possible pieces
const chalk = require("chalk");

const gridColor = chalk.grey;
const routeColor = chalk.bold.green;
const endpointColor = chalk.bold.cyan;
const initialPieceColor = chalk.bold.magenta;
const constraintColor = chalk.bold.white;

// HELPERS
const isPositiveInteger = n => Math.floor(n) === n;

// DIRECTIONS
// we use the binary masks to allow easy lookup.
let dirMask = 1;
const nextDirMask = () => {
    const n = dirMask;
    dirMask = dirMask << 1;
    return n;
};
class Direction {
    constructor(char, reverse, increment) {
        this.char = char;
        this.reverse = reverse;
        this.increment = increment;
        this.mask = nextDirMask();
    }
    toString() {
        return this.char;
    }
}

const NORTH = new Direction("⇧", () => SOUTH, (x, y) => [x, y + 1]);
const SOUTH = new Direction("⇩", () => NORTH, (x, y) => [x, y - 1]);
const EAST = new Direction("⇨", () => WEST, (x, y) => [x + 1, y]);
const WEST = new Direction("⇦", () => EAST, (x, y) => [x - 1, y]);

// PIECES
class Piece {
    constructor(char, name, d1, d2) {
        this.name = name;
        this.char = char;
        this.d1 = d1;
        this.d2 = d2;
    }

    // d1 and d2 must be in the list
    orientsTo(dirs) {
        return dirs.includes(this.d1) && dirs.includes(this.d2);
    }
    // points to any direction in the list.
    pointsToAny(dirs) {
        return dirs.includes(this.d1) || dirs.includes(this.d2);
    }
    pointsTo(dir) {
        return dir === this.d1 || dir === this.d2;
    }
    comesFrom(dir) {
        return this.pointsTo(dir.reverse());
    }
    outDir(inDir) {
        const rev = inDir.reverse();
        if (rev === this.d1) {
            return this.d2;
        }
        if (rev === this.d2) {
            return this.d1;
        }
        throw new Error("invalid route through piece");
    }
    toString() {
        return this.char;
    }
}
const OUT_OF_BOUNDS = new Piece("X");
const UNKNOWN = new Piece(" "); //subtle difference in the algorithm, no visual difference
const BLANK = new Piece(" ");
const NOUTH_SOUTH = new Piece("┃", "NS", NORTH, SOUTH);
const EAST_WEST = new Piece("━", "EW", EAST, WEST);
const NORTH_EAST = new Piece("┗", "NE", NORTH, EAST);
const NORTH_WEST = new Piece("┛", "NW", NORTH, WEST);
const SOUTH_EAST = new Piece("┏", "SE", SOUTH, EAST);
const SOUTH_WEST = new Piece("┓", "SW", SOUTH, WEST);

const allValidPieces = [
    NOUTH_SOUTH,
    EAST_WEST,
    NORTH_EAST,
    NORTH_WEST,
    SOUTH_EAST,
    SOUTH_WEST
];

// pieces based on directions.

// if we have 2 directions.
const twoDirPieces = [];
twoDirPieces[NORTH.mask | SOUTH.mask] = [NOUTH_SOUTH];
twoDirPieces[NORTH.mask | EAST.mask] = [NORTH_EAST];
twoDirPieces[NORTH.mask | WEST.mask] = [NORTH_WEST];
twoDirPieces[SOUTH.mask | EAST.mask] = [SOUTH_EAST];
twoDirPieces[SOUTH.mask | WEST.mask] = [SOUTH_WEST];
twoDirPieces[EAST.mask | WEST.mask] = [EAST_WEST];
const twoDirPiece = (d1, d2) => twoDirPieces[d1.mask | d2.mask];

// if we have 1 direction
const oneDirPieces = [];
[NORTH, SOUTH, EAST, WEST]
    .map((v, i, a) => ({
        prime: v,
        rest: a.filter(x => x !== v)
    }))
    .forEach(({ prime, rest: [da, db, dc] }) => {
        const p = prime.mask;
        const a = da.mask;
        const b = db.mask;
        const c = dc.mask;
        const x = [];
        oneDirPieces[p] = x;
        // now combinations!
        x[a | b | c] = twoDirPieces[p | a]
            .concat(twoDirPieces[p | b])
            .concat(twoDirPieces[p | c]);
        x[a | b] = twoDirPieces[p | a].concat(twoDirPieces[p | b]);
        x[a | c] = twoDirPieces[p | a].concat(twoDirPieces[p | c]);
        x[b | c] = twoDirPieces[p | b].concat(twoDirPieces[p | c]);
        x[a] = twoDirPieces[p | a];
        x[b] = twoDirPieces[p | b];
        x[c] = twoDirPieces[p | c];
    });
const reduceMask = ds => ds.reduce((m, d) => m | d.mask, 0);

const oneDirPiece = (d1, available) =>
    oneDirPieces[d1.mask][reduceMask(available)];

// if we have no fixed direction...
const anyDirPieces = [];
// now we need the set of combinations of 2 or 3 directions, 4 is  anywhere.
anyDirPieces[NORTH.mask | SOUTH.mask | EAST.mask | WEST.mask] = allValidPieces;
anyDirPieces[NORTH.mask | SOUTH.mask] = [NOUTH_SOUTH];
anyDirPieces[NORTH.mask | EAST.mask] = [NORTH_EAST];
anyDirPieces[NORTH.mask | WEST.mask] = [NORTH_WEST];
anyDirPieces[NORTH.mask | SOUTH.mask | EAST.mask] = [
    NOUTH_SOUTH,
    NORTH_EAST,
    SOUTH_EAST
];
anyDirPieces[NORTH.mask | SOUTH.mask | WEST.mask] = [
    NOUTH_SOUTH,
    NORTH_WEST,
    SOUTH_WEST
];
anyDirPieces[NORTH.mask | WEST.mask | EAST.mask] = [
    NORTH_WEST,
    NORTH_EAST,
    EAST_WEST
];
anyDirPieces[SOUTH.mask | EAST.mask] = [SOUTH_EAST];
anyDirPieces[SOUTH.mask | WEST.mask] = [SOUTH_WEST];
anyDirPieces[SOUTH.mask | WEST.mask | EAST.mask] = [
    SOUTH_WEST,
    SOUTH_EAST,
    EAST_WEST
];
anyDirPieces[EAST.mask | WEST.mask] = [EAST_WEST];

const anyDirPiece = ds => anyDirPieces[reduceMask(ds)];

const isValidNonBlankPiece = piece => {
    return allValidPieces.includes(piece);
};

// grid size
const SIZE = 8;
const isValidConstraint = n => isPositiveInteger(n) && n <= SIZE;
const isValidPosition = n => isPositiveInteger(n) && n < SIZE;

// grid characters.
const CORNER_TOP_LEFT = "┌";
const CORNER_TOP_RIGHT = "┐";
const CORNER_BOTTOM_RIGHT = "┘";
const CORNER_BOTTOM_LEFT = "└";
const T_LEFT = "┤";
const T_RIGHT = "├";
const T_UP = "┴";
const T_DOWN = "┬";
const LINE_H = "─";
const LINE_V = "│";
const CROSS = "┼";

const TOP_LINE = gridColor(
    CORNER_TOP_LEFT +
        Array(SIZE)
            .fill(LINE_H)
            .join(T_DOWN) +
        CORNER_TOP_RIGHT
);
const INNER_LINE = gridColor(
    T_RIGHT +
        Array(SIZE)
            .fill(LINE_H)
            .join(CROSS) +
        T_LEFT
);
const BOTTOM_LINE = gridColor(
    CORNER_BOTTOM_LEFT +
        Array(SIZE)
            .fill(LINE_H)
            .join(T_UP) +
        CORNER_BOTTOM_RIGHT
);

// some unique values for the solution stepping
const SOLVED = {};
const FAILED = {};
const CONTINUE = {};

// default animation
const CLEAR = "\x1b[2J\x1b[;H";
function defaultAnimation(puzzle) {
    console.log(CLEAR + puzzle.draw());
}

// the game!
class Puzzle {
    // (row/col)Nums are the constraints, A, B are where the track starts and finishs
    // A is always x=0 (the left), B is always Y=0 (bottom)
    init({ cols, rows, A, B, initialPieces = [] }) {
        if (rows.length !== SIZE || !rows.every(isValidConstraint)) {
            throw new Error("Invalid row constraints");
        }
        if (cols.length !== SIZE || !cols.every(isValidConstraint)) {
            throw new Error("Invalid col constraints");
        }
        // create the empty grid
        this._grid = Array.from({ length: SIZE * SIZE }).fill(UNKNOWN);

        // these are the constraints
        this._x = cols; //columns are in the x direction
        this._y = rows; //rows in the y direction

        // these are the counts
        this._rowCounts = Array(SIZE).fill(0);
        this._colCounts = Array(SIZE).fill(0);

        const startIdx = initialPieces.findIndex(({x,y}) => x === 0 && y === A);
        if (startIdx === -1) {
          this._start = { x: 0, y: A, piece: EAST_WEST };
        } else {
          this._start = initialPieces.splice(startIdx, 1)[0];
        }
        const finIdx = initialPieces.findIndex(({x,y}) => x === B && y === 0);
        if (finIdx === -1) {
          this._finish = { x: B, y: 0, piece: NOUTH_SOUTH };
        } else {
          this._finish = initialPieces.splice(finIdx, 1)[0];
        }
        this._initial = initialPieces; // for drawing.

        this._depth = 0;
        this._steps = 0;
        this._lastPiece = this._start;
        [this._start, this._finish]
            .concat(initialPieces)
            .forEach(({ piece, x, y }) => {
                if (!isValidNonBlankPiece(piece)) {
                    throw new Error(
                        `Invalid initial piece type given: ${piece}`
                    );
                }
                if (!(isValidPosition(x) && isValidPosition(y))) {
                    throw new Error(
                        `Invalid initial piece position given: [${x},${y}] `
                    );
                }
                this.setPiece(x, y, piece);
            });

        // this is for the solution checkpoints.
        this._stack = [];

        return this;
    }

    // set a piece on the grid
    setPiece(x, y, piece) {
        if (isValidPosition(x) && isValidPosition(y)) {
            const prev = this._grid[x * SIZE + y];
            if (prev !== piece) {
                // then if it was valid, and now isn't: decrement
                // if wasn't valid now is: increment
                const prevValid = isValidNonBlankPiece(prev);
                const nextValid = isValidNonBlankPiece(piece);
                if (prevValid && !nextValid) {
                    this._colCounts[x]--;
                    this._rowCounts[y]--;
                }
                if (!prevValid && nextValid) {
                    this._colCounts[x]++;
                    this._rowCounts[y]++;
                }
                this._grid[x * SIZE + y] = piece;
            }
            this._lastPiece = { x, y, piece };
        } else {
            throw new Error(`Invalid position: (${x}, ${y})`);
        }
    }

    // get a piece on the grid
    getPiece(x, y) {
        if (isValidPosition(x) && isValidPosition(y)) {
            return this._grid[x * SIZE + y];
        } else {
            return OUT_OF_BOUNDS;
        }
    }

    getPieceInDirection(x, y, dir) {
        return this.getPiece(...dir.increment(x, y));
    }

    // get the pieces of a row
    getRow(y) {
        return Array.from({ length: SIZE }).map((_, i) => this.getPiece(i, y));
    }

    // get the pieces of a column
    getCol(x) {
        return Array.from({ length: SIZE }).map((_, i) => this.getPiece(x, i));
    }

    // dump the printable representation of the board.
    /* looks better in a monospaced font...
    ```
         1 2 3 4 5 6 7 8
        +-+-+-+-+-+-+-+-+    // TOP_LINE
        | | | | | | | | | 1
        +-+-+-+-+-+-+-+-+    // INNER_LINE
        | | | | | | | | | 2
        +-+-+-+-+-+-+-+-+
        | | | | | | | | | 3
        +-+-+-+-+-+-+-+-+
      A | | | | | | | | | 4
        +-+-+-+-+-+-+-+-+
        | | | | | | | | | 5
        +-+-+-+-+-+-+-+-+
        | | | | | | | | | 6
        +-+-+-+-+-+-+-+-+
        | | | | | | | | | 7
        +-+-+-+-+-+-+-+-+
        | | | | | | | | | 8
        +-+-+-+-+-+-+-+-+    //BOTTOM LINE
                 B
    ```
    */
    draw() {
        const lines = [];
        // the very top is 3 spaces + (space + constraint)
        const prefix = "   ";
        const suffix = "  "; // just 2 spaces (" X") for constraint.
        lines.push(
            prefix + " " + constraintColor(this._x.join(" ")) + " " + suffix
        );
        lines.push(prefix + TOP_LINE + suffix);
        // now for each y if the start is there we put the A
        let y = SIZE;

        // drawing with color.
        // pieces need to be colored if they are start/finish/initial
        const getPieceWithColor = (x, y) => {
            const piece = "" + this.getPiece(x, y);
            if (
                (x === 0 && y === this._start.y) ||
                (y === 0 && x === this._finish.x)
            ) {
                return endpointColor(piece);
            }
            if (this._initial.find(p => p.x === x && p.y == y)) {
                return initialPieceColor(piece);
            }
            return routeColor(piece);
        };

        const v = gridColor(LINE_V);
        const range = Array.from({ length: SIZE }).map((_, i) => i);
        // because of the coloring, we ensure all lines are the same visual length here.
        while (y--) {
            const isStart = this._start.y === y;

            lines.push(
                (isStart
                    ? endpointColor(" A ")
                    : gridColor(" " + (y + 1) + " ")) +
                    v +
                    range.map(x => getPieceWithColor(x, y)).join(v) +
                    v +
                    " " +
                    constraintColor(this._y[y])
            );
            if (y) {
                // not the end...
                lines.push(prefix + INNER_LINE + suffix);
            }
        }
        lines.push(prefix + BOTTOM_LINE + suffix);
        // now add the line for the finish.
        const markers = Array.from({ length: SIZE }).map((_, i) => {
            return i === this._finish.x ? endpointColor("B") : gridColor(i + 1);
        });
        lines.push(prefix + " " + markers.join(" ") + " " + suffix);
        return lines.join("\n");
    }

    // this should be fairly cheap, all non-mutable stuff is referenced not copied
    // somewhere to go back to if onwards solution fails
    checkpoint(x, y, dir) {
        [x, y] = dir.increment(x, y);
        this._stack.push({
            grid: this._grid.slice(),
            cols: this._colCounts.slice(),
            rows: this._rowCounts.slice(),
            i: 0, // index into possibilities
            x, // current x pos
            y, // current y pos
            dir, //current direction of motion,
            p: this.findPossiblePiecesFor(x, y) // possibilities
        });
    }

    // go back the the next previous state that has a new possibility.
    rollback() {
        while (this._stack.length) {
            const entry = this._stack.pop();
            if (entry.i < entry.p.length) {
                //OK, let's go back to this one.
                this._stack.push(entry); // put this one back on top.ss
                const { grid, rows, cols } = entry;
                this._grid = grid.slice();
                this._colCounts = cols.slice();
                this._rowCounts = rows.slice();
                return true;
            }
        }
        return false;
    }

    async solve({ animate = 0, drawFrame = defaultAnimation } = {}) {
        this.initialiseSolution();
        let result;
        do {
            result = this.step();
            if (animate) {
                drawFrame(this);
                await new Promise(r => setTimeout(r, animate));
            }
        } while (result === CONTINUE);
        return result === SOLVED;
    }

    initialiseSolution() {
        // create the initial checkpoint.
        this._stack = []; // flatten stack
        this.checkpoint(this._start.x, this._start.y, this._start.piece.outDir(EAST));
    }

    // this is brute-force.
    // we take each possible path and backtrack when it fails.
    // however we should be able to intelligently "fail-early"
    // in a number of situations, the most common being no route to
    // rows/cols with missing data, i.e.
    //  - if row N has it's full constraint, and we are at row before/after N, and there exists
    //      a row after/before N that is not full constraint the path must be wrong (we can't get back to fill it)
    step() {
        this._steps++;
        const top = this._stack[this._stack.length - 1];
        const { x, y, i, dir, p } = top;
//        console.log(top);
        top.i++; //never forget to increment i in the stack entry. (NB this doesn't increment our local `i`)
        const failOrRollback = () => {
            if (this.rollback()) {
                return CONTINUE;
            }
            // no more stack. we have failed.
            return FAILED;
        };
        if (x === this._finish.x && y === this._finish.y) {
            // we are at the end. we might be solved, we might be not..
            return this.isSolved() ? SOLVED : failOrRollback();
        }

        if (p.length === 0) {
            // no more options, fail.
            return failOrRollback();
        }
        // other wise we need to choose the next piece.
        if (i < p.length && isValidNonBlankPiece(p[i])) {
            // we have a possibility, go with it.
            // we need to mutate the value of `i` in the stack.
            this.setPiece(x, y, p[i]);
            const nextDir = p[i].outDir(dir);
            this.checkpoint(x, y, nextDir);
            return CONTINUE;
        }
        //boo. no more possibilities
        return failOrRollback();
    }

    // find the array of possible pieces here.
    // if constraint fail, only possibility is blank.
    // if not, check pieces around and if there are more than
    // 2 inbounds, no possibilities.
    // if 2 inbounds, 1 possibility
    // if 1 inbound, any that connect.
    findPossiblePiecesFor(x, y) {
        const piece = this.getPiece(x, y);
        if (piece !== UNKNOWN) {
            // piece already set. no options!
            return [piece];
        }

        if (this._colCounts[x] >= this._x[x]) {
            return [BLANK];
        }
        const onlyOneMoreInColumn = this._colCounts[x] === this._x[x] - 1;
        if (this._rowCounts[y] >= this._y[y]) {
            return [BLANK];
        }
        const onlyOneMoreInRow = this._rowCounts[y] === this._y[y] - 1;
        // OK, lets go around and list entry directions.
        // there are only 4 possible
        const { inbound, available } = [NORTH, SOUTH, EAST, WEST].reduce(
            (map, dir) => {
                const piece = this.getPieceInDirection(x, y, dir);
                const inbound =
                    isValidNonBlankPiece(piece) && piece.comesFrom(dir);
                if (inbound) {
                    map.inbound.push(dir);
                } else if (piece === UNKNOWN) {
                    // this is unknown now, but if we added a piece at x,y
                    // would this unavailable become blank? (constrained)
                    const rowOK =
                        dir === NORTH || dir === SOUTH || !onlyOneMoreInRow;
                    const colOK =
                        dir === WEST || dir === EAST || !onlyOneMoreInColumn;

                    if (rowOK && colOK) {
                        map.available.push(dir);
                    }
                }
                return map;
            },
            { inbound: [], available: [] }
        );
        // OK so here's the deal
        // inbounds > 2 => no options.
        // inbounds === 2 => 1 option
        // inbounds + unknowns < 2 => no options
        // inbounds + unknowns === 2 => 1 option
        // inbounds + unknowns  > 2   => more than 1 option
        const sum = inbound.length + available.length;
        if (inbound.length > 2 || sum < 2) {
            // no options
            return [];
        }
        if (inbound.length === 2) {
            // find the 1 option!
            return twoDirPiece(...inbound);
        }
        if (inbound.length === 1) {
            // the options are pieces that pointTo inbound[0]
            // and pointTo an available direction
            return oneDirPiece(inbound[0], available);
        }
        // inbound === 0
        // so all pieces that point to available directions
        return anyDirPiece(available);
    }

    isSolved() {
        return this.findUnsolvedProblems().length === 0;
    }

    findUnsolvedProblems() {
        // must be a route from start to finish
        // constraints must be honored
        const problems = this.calculateBrokenConstraints();
        if (!this.canRunStartToFinish()) {
            problems.unshift("No route from start to finish.");
        }
        return problems;
    }

    calculateBrokenConstraints() {
        // count non-zero pieces in each row/col
        // count for row n must match constraint y[n]
        // must match constraints
        const broken = [];
        let c;
        // hey, this is a square, why loop twice?
        for (let i = 0; i < SIZE; i++) {
            if (this._colCounts[i] !== this._x[i]) {
                c = this._colCounts[i];
                broken.push(
                    `col ${i + 1} wants ${this._x[i]} pieces, ${c} present.`
                );
            }
            if (this._rowCounts[i] !== this._y[i]) {
                c = this._rowCounts[i];
                broken.push(
                    `row ${i + 1} wants ${this._y[i]} pieces, ${c} present.`
                );
            }
        }
        return broken;
    }

    canRunStartToFinish() {
        // try and move from start to finish.
        // start is always EAST
        // finish is always NORTH
        return this.canMoveFromAtoB(this._start, this._finish, EAST);
    }

    canMoveFromAtoB(a, b, initialDirection) {
        let current = { ...a, direction: initialDirection };
        let moves = 0; //infinite loop preventions
        while (moves < SIZE * SIZE) {
            // move to the next piece, if blank => false
            if (!isValidNonBlankPiece(current.piece)) {
                return false;
            }
            // if this._finish => true;
            // else continue;
            if (current.x === b.x && current.y === b.y) {
                return true;
            }

            if (!current.piece.comesFrom(current.direction)) {
                throw new Error(
                    `unexpected piece: ${current.piece.char} (${current.x}, ${current.y}, ${current.direction.char})`
                );
            }
            // now where to turn.
            switch (current.piece.outDir(current.direction)) {
                case NORTH:
                    current.y++;
                    current.direction = NORTH;
                    break;
                case SOUTH:
                    current.y--;
                    current.direction = SOUTH;
                    break;
                case EAST:
                    current.x++;
                    current.direction = EAST;
                    break;
                case WEST:
                    current.x--;
                    current.direction = WEST;
                    break;
            }

            if (
                !isValidConstraint(current.x) ||
                !isValidConstraint(current.y)
            ) {
                // we have gone off the board.
                throw new Error("fallen off the board");
            }
            // get the next piece.
            current.piece = this.getPiece(current.x, current.y);
            moves++;
        }
        // this means we hit a loop or travelled to every square on the board.
        // we can't travel to all squares without hitting the end, so
        // this is a loop. either way => false
        return false;
    }

    getCode() {
        return encode(this);
    }
}

// the point of the encoding is to make it easier to enter
// puzzles.
// the encoding is roughly:
// 12|12345678|12345678|12NW|13NS
//
// where the first xy is the X and Y positions of the
// start and finish (1-based)
// the 2 sequences of 8 numbers are the 8 constraints
// in each direction.
// they should read, along the top, down the side.
// which means cols ascending, the rows descending
// finally the initialpieces (usually only one, xy<DIR>, 1-based)
const encode = puzzle => {
    const a = puzzle._start.y;
    const b = puzzle._finish.x;
    const r = puzzle._y.join("");
    const c = puzzle._x.join("");
    const p = puzzle._grid
        .map((p, n) => {
            if (isValidNonBlankPiece(p)) {
                const y = n % SIZE;
                const x = (n - y) / SIZE;
                if (x === 0 && y === a) {
                    //start...
                } else if (y === 0 && x === b) {
                    // finish
                } else {
                    return `${x + 1}${y + 1}${p.name}`;
                }
            }
        })
        .filter(Boolean)
        .join(".");
    return `${a + 1}${b + 1}-${r}-${c}-${p}`;
};

const puzRe = /^([1-8])([0-7])-([1-8]{8})-([1-8]{8})-(|[1-8]{2}(NE|NW|NS|SE|SW|EW)|([1-8]{2}(NE|NW|NS|SE|SW|EW)(\.[1-8]{2}(NE|NW|NS|SE|SW|EW))+))$/;

const decode = str => {
    const matches = str.match(puzRe);
    if (!matches) {
        throw new Error("Invalid puzzle encoding");
    }
    const A = Number(matches[1]) - 1;
    const B = Number(matches[2]) - 1;
    const cols = matches[3].split("").map(Number); // left-to-right along the top.
    const rows = matches[4]
        .split("")
        .map(Number)
        .reverse(); // this one is in top-bottom order, but that is not how we have it in the code.

    const initialPieces = matches[5]
        .split(".")
        .filter(Boolean)
        .map(c => {
            const [x, y] = [Number(c[0]) - 1, Number(c[1]) - 1];
            let piece;
            switch (c.slice(-2)) {
                case "NE":
                    piece = NORTH_EAST;
                    break;
                case "NW":
                    piece = NORTH_WEST;
                    break;
                case "SE":
                    piece = SOUTH_EAST;
                    break;
                case "SW":
                    piece = SOUTH_WEST;
                    break;
                case "NS":
                    piece = NOUTH_SOUTH;
                    break;
                case "EW":
                    piece = EAST_WEST;
                    break;
            }
            return { x, y, piece };
        });
    return { cols, rows, A, B, initialPieces };
};

function puzzle(input) {
    if (typeof input === "string") {
        input = decode(input);
    }
    return new Puzzle().init(input);
}

module.exports = {
    puzzle,
    NOUTH_SOUTH,
    EAST_WEST,
    NORTH_EAST,
    NORTH_WEST,
    SOUTH_EAST,
    SOUTH_WEST,
    NORTH,
    EAST,
    SOUTH,
    WEST
};
