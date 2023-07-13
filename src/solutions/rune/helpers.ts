import { CallbackCreator } from "@/types"
import {
  Receipt,
  Run,
  Rune,
  Runner,
  RunStream,
  Timeline,
  ValueRune,
} from "capi"

export const fromCallbackCreator = <T>(cbCreator: CallbackCreator<T>) =>
  ValueRune.new(RunCallbackCreator, cbCreator)

class RunCallbackCreator<T> extends RunStream<T> {
  constructor(runner: Runner, cbCreator: CallbackCreator<T>) {
    super(runner)
    this.cleanup = cbCreator((value) => {
      this.push(value)
    })
  }
}

export async function runWithSignal<T>(
  rune: Rune<T, unknown>,
  signal: AbortSignal,
) {
  const runner = new RootRunner()
  let time = runner.timeline.current
  const primed = runner.prime(rune)
  primed.reference()
  let dereferenced = false
  signal.addEventListener("abort", () => {
    if (!dereferenced) {
      dereferenced = false
      primed.dereference()
    }
  })
  try {
    while (time !== Infinity) {
      const receipt = new Receipt()
      const value = await primed.evaluate(time, receipt)
      if (receipt.ready && receipt.novel) {
        return value
      }
      await receipt.finalized()
      time = receipt.nextTime
    }
  } finally {
    if (!dereferenced) {
      dereferenced = false
      primed.dereference()
    }
  }
  throw new Error("Rune did not yield any values")
}

class RootRunner extends Runner {
  order = 0
  timeline = new Timeline()

  protected _prime<T, U>(rune: Rune<T, U>): Run<T, U> {
    return rune._prime(this)
  }
}

export const mapWithSignal = <T1, U, T2>(
  source: Rune<T1, U>,
  fn: (x: T1, signal: AbortSignal) => T2 | Promise<T2>,
) => ValueRune.new(RunMapCancellable, source, fn)

class RunMapCancellable<T1, U, T2> extends Run<T2, U> {
  source
  constructor(
    runner: Runner,
    source: Rune<T1, U>,
    readonly fn: (value: T1, signal: AbortSignal) => T2 | Promise<T2>,
  ) {
    super(runner)
    this.source = this.use(source)
  }

  controller = new AbortController()

  lastValue!: T2
  async _evaluate(time: number, receipt: Receipt) {
    const source = await this.source.evaluate(time, receipt)
    if (!receipt.ready || !receipt.novel) {
      return this.lastValue
    }
    return (this.lastValue = await this.fn(source, this.controller.signal))
  }

  cleanup(): void {
    this.controller.abort()
  }
}
