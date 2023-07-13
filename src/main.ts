import rune from "./solutions/rune/solution.js"
import rxjsTests from "./solutions/rxjs/solution.js"
import vanilla from "./solutions/vanilla.js"

// // The test runner fails to exit properly when multiple suites are run
// rxjsTests().then(vanilla).then(rune)

rune()
