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
        .then((blockTime) => ({
          hash,
          blockTime,
          blockNumber: getBlockNumber(hash),
        }))
        .then((x) => {
          output(x)
          if (--nRunning === 0 && !isListening) {
            output(null)
          }
        })
    })
  },
  ignoreNewOnesUntilResolved({
    listenToHashes,
    getBlockNumber,
    getBlockTime,
    output,
  }) {
    let isListening = true
    let isRunning = false

    const stopListening = listenToHashes((hash) => {
      if (hash === "h") {
        stopListening()
        isListening = false
      }

      if (isRunning) return

      isRunning = true
      getBlockTime(hash)
        .then((blockTime) => ({
          hash,
          blockTime,
          blockNumber: getBlockNumber(hash),
        }))
        .then((x) => {
          isRunning = false
          output(x)
          if (!isListening) {
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
        .then((blockTime) => ({
          hash,
          blockTime,
          blockNumber: getBlockNumber(hash),
        }))
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
  allInOrder({ listenToHashes, getBlockNumber, getBlockTime, output }) {
    let isListening = true
    const onHold = new Map<number, any>()
    let nextidx = 0
    let waitingForIdx = 0

    const stopListening = listenToHashes((hash) => {
      let idx = nextidx++

      if (hash === "h") {
        stopListening()
        isListening = false
      }

      getBlockTime(hash)
        .then((blockTime) => ({
          hash,
          blockTime,
          blockNumber: getBlockNumber(hash),
        }))
        .then((x) => {
          if (idx !== waitingForIdx) return onHold.set(idx, x)

          output(x)

          while (onHold.has(++waitingForIdx)) {
            output(onHold.get(waitingForIdx))
            onHold.delete(waitingForIdx)
          }

          if (!isListening) output(null)
        })
    })
  },
})
