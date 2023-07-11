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

import { suite } from "@/api"

export default suite("capi", {
  asTheyCome: ({ listenToHashes, getBlockNumber, getBlockTime, output }) => {
    const stopListening = listenToHashes((hash) => {
      output(hash)
      if (hash === "h") {
        stopListening()
        output(null)
      }
    })
  },
  ignoreNewOnesUntilResolved: ({
    listenToHashes,
    getBlockNumber,
    getBlockTime,
    output,
  }) => {},
  allInOrder: ({ listenToHashes, getBlockNumber, getBlockTime, output }) => {},
  newOneCancelsOldOne: ({
    listenToHashes,
    getBlockNumber,
    getBlockTime,
    output,
  }) => {},
})
