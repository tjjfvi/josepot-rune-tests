export type Callback<T> = (value: T) => void
export type UnsubscribeCb = () => void
export type CallbackCreator<T> = (fn: Callback<T>) => UnsubscribeCb
export type TestFn = (cbs: {
  listenToHashes: CallbackCreator<string>
  getBlockNumber: (hash: string) => number
  getBlockTime: (hash: string, signal?: AbortSignal) => Promise<number>
  output: (
    data: { hash: string; blockNumber: number; blockTime: number } | null,
  ) => void
}) => void
