/**
 * Copyright (c) 2017, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import { $$asyncIterator, getAsyncIterator } from 'iterall';

/**
 * Given an AsyncIterable and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 */
export default function mapAsyncIterator<T, U>(
  iterable: AsyncIterable<T>,
  callback: T => Promise<U> | U,
  rejectCallback?: any => Promise<U> | U
): AsyncGenerator<U, void, void> {
  const iterator = getAsyncIterator(iterable);
  let $return;
  let abruptClose;
  if (typeof iterator.return === 'function') {
    $return = iterator.return;
    abruptClose = error => {
      const rethrow = () => Promise.reject(error);
      return $return.call(iterator).then(rethrow, rethrow);
    };
  }

  function mapResult(result) {
    return result.done ?
      result :
      asyncMapValue(result.value, callback).then(iteratorResult, abruptClose);
  }

  let mapReject;
  if (rejectCallback) {
    mapReject = error => rejectCallback ?
      asyncMapValue(error, rejectCallback).then(iteratorResult, abruptClose) :
      error;
  }

  return {
    next() {
      return iterator.next().then(mapResult, mapReject);
    },
    return() {
      return $return ?
        $return.call(iterator).then(mapResult, mapReject) :
        Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      if (typeof iterator.throw === 'function') {
        return iterator.throw(error).then(mapResult, mapReject);
      }
      return Promise.reject(error).catch(abruptClose);
    },
    [$$asyncIterator]() {
      return this;
    },
  };
}

function asyncMapValue<T, U>(
  value: T,
  callback: T => Promise<U> | U
): Promise<U> {
  return new Promise(resolve => resolve(callback(value)));
}

function iteratorResult<T>(value: T): IteratorResult<T, void> {
  return { value, done: false };
}
