import {
  Observable,
  ObservableInput,
  ObservedValueOf,
  OperatorFunction,
} from "rxjs"
import { CallbackCreator } from "@/types.js"

export type Merger = <T, O extends ObservableInput<any>>(
  project: (value: T) => O,
) => OperatorFunction<T, ObservedValueOf<O>>

export const fromCbCreator = <T>(input: CallbackCreator<T>): Observable<T> =>
  new Observable<T>((observer) =>
    input((value) => {
      observer.next(value)
    }),
  )

export const fromAbortControllerFn =
  <A extends Array<any>, T>(
    fn: (...args: [...A, ...[abortSignal: AbortSignal]]) => Promise<T>,
  ) =>
  (...args: A): Observable<T> =>
    new Observable((observer) => {
      const aborter = new AbortController()

      fn(...[...args, aborter.signal]).then(
        (value: any) => {
          observer.next(value)
          observer.complete()
        },
        (error: any) => {
          observer.error(error)
        },
      )

      return () => {
        aborter.abort()
      }
    })
