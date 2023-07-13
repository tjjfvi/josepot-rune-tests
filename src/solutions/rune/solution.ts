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
import { TestFn } from "@/types"
import { Rune, RunicArgs, ValueRune } from "capi"
import { fromCallbackCreator, mapWithSignal, runWithSignal } from "./helpers"

type RuneFn = (props: {
  hashes: ValueRune<string, never>
  blockNumberAt: <X>(
    ...args: RunicArgs<X, [hash: string]>
  ) => ValueRune<number, RunicArgs.U<X>>
  blockTimeAt: <X>(
    ...args: RunicArgs<X, [hash: string]>
  ) => ValueRune<number, RunicArgs.U<X>>
  output: (
    value: { hash: string; blockNumber: number; blockTime: number } | null,
  ) => void
}) => void

const runeWrapper =
  (runeFn: RuneFn): TestFn =>
  ({ listenToHashes, getBlockNumber, getBlockTime, output }) => {
    const hashes = fromCallbackCreator(listenToHashes)
    const blockNumberAt = <X>(...[hash]: RunicArgs<X, [hash: string]>) =>
      Rune.resolve(hash).map(getBlockNumber)
    const blockTimeAt = <X>(...[hash]: RunicArgs<X, [hash: string]>) =>
      mapWithSignal(Rune.resolve(hash), getBlockTime)
    runeFn({ hashes, blockNumberAt, blockTimeAt, output })
  }

export default suite("rune", {
  asTheyCome: runeWrapper(
    async ({ hashes, blockTimeAt, blockNumberAt, output }) => {
      let isListening = true
      let nRunning = 0

      for await (const hash of hashes.iter()) {
        nRunning++
        Rune.object({
          hash,
          blockTime: blockTimeAt(hash),
          blockNumber: blockNumberAt(hash),
        })
          .run()
          .then((x) => {
            output(x)
            if (--nRunning === 0 && !isListening) {
              output(null)
            }
          })

        if (hash === "h") {
          isListening = false
          break
        }
      }
    },
  ),
  ignoreNewOnesUntilResolved: runeWrapper(
    async ({ hashes, blockTimeAt, blockNumberAt, output }) => {
      let isListening = true
      let isRunning = false

      for await (const hash of hashes.iter()) {
        if (!isRunning) {
          isRunning = true
          Rune.object({
            hash,
            blockTime: blockTimeAt(hash),
            blockNumber: blockNumberAt(hash),
          })
            .run()
            .then((x) => {
              isRunning = false
              output(x)
              if (!isListening) {
                output(null)
              }
            })
        }

        if (hash === "h") {
          isListening = false
          break
        }
      }
    },
  ),
  newOneCancelsOldOne: runeWrapper(
    async ({ hashes, blockNumberAt, blockTimeAt, output }) => {
      let isListening = true
      let current = new AbortController()

      for await (const hash of hashes.iter()) {
        current.abort()

        current = new AbortController()
        runWithSignal(
          Rune.object({
            hash,
            blockTime: blockTimeAt(hash),
            blockNumber: blockNumberAt(hash),
          }),
          current.signal,
        )
          .then((x) => {
            output(x)
            if (!isListening) {
              output(null)
            }
          })
          .catch((e: Error) => {
            if (e.message !== "aborted") throw e
          })

        if (hash === "h") {
          isListening = false
          break
        }
      }
    },
  ),
  allInOrder: runeWrapper(
    async ({ hashes, blockNumberAt, blockTimeAt, output }) => {
      let isListening = true
      const onHold = new Map<number, any>()
      let nextidx = 0
      let waitingForIdx = 0

      for await (const hash of hashes.iter()) {
        let idx = nextidx++

        Rune.object({
          hash,
          blockTime: blockTimeAt(hash),
          blockNumber: blockNumberAt(hash),
        })
          .run()
          .then((x) => {
            if (idx !== waitingForIdx) return onHold.set(idx, x)

            output(x)

            while (onHold.has(++waitingForIdx)) {
              output(onHold.get(waitingForIdx))
              onHold.delete(waitingForIdx)
            }

            if (!isListening) output(null)
          })

        if (hash === "h") {
          isListening = false
          break
        }
      }
    },
  ),
})
