const puzzle = require("../index");
const test = require("tape");

// these are the puzzles I have collected from the times...
const knownPuzzles = [
    "34-14134454-32642351-82NW",
    "35-13145454-42472341-45NW",
    "37-13163445-34246341-84NW",
    "76-14153624-34464131-46NS",
    "26-15153723-32446251-48SE",
    "65-14153363-34533431-47SE",
    "66-13433724-52515441-86SW",
    "44-15352524-52463151-85SW",
    "54-14134544-54234341-48EW.53NE", // this has 2 initial pieces
    "63-13352624-34454141-44NW",
    "44-15352425-52643151-82NW",
    "74-14535242-34353251-73NE",
    "27-13154543-52425251-34EW",
    "64-13132647-32447151-75SE",
    "62-13462234-22451551-72NE.84NS", // another 2 initial piece one
    "25-13554323-44263241-24SE",
    "35-14155623-32446341-84SW"
];

// target is less the a frame at 60FPS.
const targetTime = 16;

// if the flag is there, show solutions with output
const show = process.env.SHOW_SOLUTIONS === "1";
let cumulativeTime = 0;
let cumulativeSteps = 0;
for (let i = 0; i < knownPuzzles.length; i++) {
    test(`Should solve puzzle ${i + 1}: ${knownPuzzles[i]}`, async t => {
        t.plan(2);
        const p = puzzle(knownPuzzles[i]);
        // we should be able to solve it in less than 16ms
        const before = process.hrtime();
        const solved = await p.solve();
        const after = process.hrtime(before);
        const time = after[0] * 1e3 + after[1] / 1e6;
        cumulativeTime += time;
        cumulativeSteps += p._steps;
        t.ok(solved, `Should solve puzzle`);
        t.ok(
            time < targetTime,
            `Should take less than ${targetTime}ms (took ${time}ms, ${p._steps} steps)`
        );
        if (show) {
            // tap output trims lines. we can't have that...
            t.comment(
                "|" +
                    p
                        .draw()
                        .split("\n")
                        .join("  |\n|") +
                    "  |"
            );
        }
        if (i === knownPuzzles.length - 1) {
            const atime = cumulativeTime / knownPuzzles.length;
            const astep = cumulativeSteps / knownPuzzles.length;
            const atimepstep = atime / astep;
            t.comment(`Avg ${atime.toFixed(3)}ms per puzzle`);
            t.comment(`Avg ${astep.toFixed(1)} steps per puzzle`);
            t.comment(`Avg ${atimepstep.toFixed(5)} ms per step`);
        }
    });
}
