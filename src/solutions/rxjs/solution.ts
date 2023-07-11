/*
------------------------------->
TIME     00000000001111111111
         01234567890123456789
------------------------------->
hashes:  a
         b
         c   d   e f   g h
--------------------------------
a     :  |x  |   | |   | |
b     :  |x  |   | |   | |
c     :  |-----x | |   | |
d     :      |x  | |   | |
e     :          |x|   | |
f     :            |x  | |
g     :                |---x
h     :                  |x
------------------------------->
TIME     00000000001111111111
         01234567890123456789
------------------------------->
*/

import { endWith, exhaustMap, map, mergeMap, switchMap, takeWhile } from "rxjs"
import { concatMapEager } from "rxjs-etc/dist/cjs/operators/index.js"
import type { TestFn } from "@/types.js"
import { suite } from "@/api.js"
import { Merger, fromAbortControllerFn, fromCbCreator } from "./helpers.js"

const solveItWith =
  (merger: Merger): TestFn =>
  ({ listenToHashes, getBlockNumber, getBlockTime, output }) => {
    const getBlockTime$ = fromAbortControllerFn(getBlockTime)

    fromCbCreator(listenToHashes)
      .pipe(
        takeWhile((hash) => hash !== "h", true),
        merger((hash) =>
          getBlockTime$(hash).pipe(
            map((blockTime) => `${hash}-${blockTime}-${getBlockNumber(hash)}`),
          ),
        ),
        endWith(null),
      )
      .subscribe(output)
  }

export default suite("rxjs", {
  asTheyCome: solveItWith(mergeMap),
  ignoreNewOnesUntilResolved: solveItWith(exhaustMap),
  allInOrder: solveItWith(concatMapEager),
  newOneCancelsOldOne: solveItWith(switchMap),
})
