import { Callback, CallbackCreator, TestFn } from "@/types.js"

const hashes = {
  a: 0,
  b: 0,
  c: 0,
  d: 4,
  e: 8,
  f: 10,
  g: 14,
  h: 16,
}

const completions = {
  a: 1,
  b: 1,
  c: 6,
  d: 5,
  e: 9,
  f: 11,
  g: 18,
  h: 17,
}

let unsubscriptions: Record<number, Array<string>> = {}

const hashListeners = new Set<Callback<string>>()
const blockTimeListeners = new Map<string, Callback<number>>()
const times = new Set<number>([
  ...Object.values(hashes),
  ...Object.values(completions),
])
const sortedTimes = [...times].sort((a, b) => a - b)

let currentTimeIdx = -1

const startEmitting = () => {
  const time = sortedTimes[++currentTimeIdx]

  const hashesToEmit = Object.entries(hashes)
    .filter(([, _time]) => _time === time)
    .map(([key]) => key)

  const completionsToEmit = Object.entries(completions)
    .filter(([, _time]) => _time === time)
    .map(([key]) => key)

  hashListeners.forEach((listener) => {
    for (
      let i = 0;
      i < hashesToEmit.length && hashListeners.has(listener);
      i++
    ) {
      listener(hashesToEmit[i])
    }
  })

  completionsToEmit.forEach((hash) => {
    const listener = blockTimeListeners.get(hash)
    if (listener) {
      listener(hashes[hash as "a"])
    }
  })

  if (currentTimeIdx !== times.size - 1) {
    setTimeout(startEmitting, 0)
  }
}

const addUnsubscription = (name: string) => {
  const time = sortedTimes[currentTimeIdx]
  const entries = unsubscriptions[time] ?? []
  entries.push(name)
  unsubscriptions[time] = entries
}

const listenToHashes: CallbackCreator<string> = (listener) => {
  hashListeners.add(listener)
  if (currentTimeIdx === -1) startEmitting()

  return () => {
    hashListeners.delete(listener)
    if (hashListeners.size === 0) {
      addUnsubscription("hashes")
    }
  }
}

const getBlockNumber = (hash: string): number => hash.charCodeAt(0) - 96

const getBlockTime = (hash: string, signal?: AbortSignal): Promise<number> =>
  new Promise((res, rej) => {
    const resolve = (input: number) => {
      signal?.removeEventListener("abort", onAbort)
      blockTimeListeners.delete(hash)
      res(input)
    }

    const onAbort = () => {
      addUnsubscription(hash)
      blockTimeListeners.delete(hash)
      rej(new Error("aborted"))
    }

    signal?.addEventListener("abort", onAbort, { once: true })

    if (blockTimeListeners.has(hash)) {
      return rej(new Error(`Duplicated getBlockTime(${hash})`))
    }

    blockTimeListeners.set(hash, resolve)
  })

interface Tests {
  asTheyCome: TestFn
  allInOrder: TestFn
  newOneCancelsOldOne: TestFn
  ignoreNewOnesUntilResolved: TestFn
}

const allExpectedValues = {
  asTheyCome: "a-0-1 b-0-2 d-4-4 c-0-3 e-8-5 f-10-6 h-16-8 g-14-7",
  allInOrder: "a-0-1 b-0-2 c-0-3 d-4-4 e-8-5 f-10-6 g-14-7 h-16-8",
  newOneCancelsOldOne: "d-4-4 e-8-5 f-10-6 h-16-8",
  ignoreNewOnesUntilResolved: "a-0-1 d-4-4 e-8-5 f-10-6 g-14-7",
}
const allExpectedCancelations = {
  asTheyCome: "16-hashes",
  allInOrder: "16-hashes",
  newOneCancelsOldOne: "0-a-b 4-c 16-g-hashes",
  ignoreNewOnesUntilResolved: "16-hashes",
}

export const suite = (suite: string, tests: Partial<Tests>) => () =>
  new Promise<void>((res) => {
    const functions = Object.entries(tests).map(([name, fn]) => {
      const expectedValues = allExpectedValues[name as "allInOrder"]
      const expectedCancelations = allExpectedCancelations[name as "allInOrder"]

      const values: Array<string> = []
      return () =>
        fn({
          listenToHashes,
          getBlockNumber,
          getBlockTime,
          output: (data: string | null) => {
            if (data !== null) return values.push(data)

            const receivedValues = values.join(" ")

            if (receivedValues !== expectedValues) {
              console.error(
                `${suite}-${name}: did not emmit the correct values`,
              )
              console.log(`expected: ${expectedValues}`)
              console.log(`received: ${receivedValues}`)
              process.exit(1)
            }

            const receivedCancelations = Object.entries(unsubscriptions)
              .map(([time, keys]) => `${time}-${keys.sort().join("-")}`)
              .join(" ")
            unsubscriptions = {}
            currentTimeIdx = -1

            if (receivedCancelations !== expectedCancelations) {
              console.error(
                `${suite}-${name}: did not produce the correct cancelations`,
              )
              console.log(`expected: ${expectedCancelations}`)
              console.log(`received: ${receivedCancelations}`)
              process.exit(1)
            }

            console.log(`${suite}-${name} passes the tests!`)

            if (functions.length === 0) {
              res()
              return
            }
            functions.shift()!()
          },
        })
    })

    functions.shift()!()
  })
