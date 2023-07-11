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

export default suite("vanilla", {
  asTheyCome: ({ listenToHashes, getBlockNumber, getBlockTime, output }) => {
    let isListening = true
    let nRunning = 0

    const stopListening = listenToHashes((hash) => {
      if (hash === "h") {
        stopListening()
        isListening = false
      }

      nRunning++
      getBlockTime(hash)
        .then((blockTime) => `${hash}-${blockTime}-${getBlockNumber(hash)}`)
        .then((x) => {
          output(x)
          if (--nRunning === 0 && !isListening) {
            output(null)
          }
        })
    })
  },
  newOneCancelsOldOne: ({
    listenToHashes,
    getBlockNumber,
    getBlockTime,
    output,
  }) => {
    let isListening = true
    let current = new AbortController()

    const stopListening = listenToHashes((hash) => {
      if (hash === "h") {
        stopListening()
        isListening = false
      }

      current.abort()

      current = new AbortController()
      getBlockTime(hash, current.signal)
        .then((blockTime) => `${hash}-${blockTime}-${getBlockNumber(hash)}`)
        .then((x) => {
          output(x)
          if (!isListening) {
            output(null)
          }
        })
        .catch((e: Error) => {
          if (e.message !== "aborted") throw e
        })
    })
  },
})
