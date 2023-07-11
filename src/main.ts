import rxjsTests from "./solutions/rxjs/solution.js"
import vanilla from "./solutions/vanilla.js"
import capi from "./solutions/capi/solution.js"

rxjsTests().then(vanilla).then(capi)
