const getGetterWatchedByArray = computedAsyncProperty =>
  function getter () {
    computedAsyncProperty.watch.forEach(key => {
      // Check if nested key is watched.
      const splittedByDot = key.split('.')
      if (splittedByDot.length === 1) {
        // If not, just access it.
        // eslint-disable-next-line no-unused-expressions
        this[key]
      } else {
        // Access the nested propety.
        try {
          let start = this
          splittedByDot.forEach(part => {
            start = start[part]
          })
        } catch (error) {
          console.error('AsyncComputed: bad path: ', key)
          throw error
        }
      }
    })
    return computedAsyncProperty.get.call(this)
  }

const getGetterWatchedByFunction = computedAsyncProperty =>
  function getter () {
    computedAsyncProperty.watch.call(this)
    return computedAsyncProperty.get.call(this)
  }

export function getWatchedGetter (computedAsyncProperty) {
  if (typeof computedAsyncProperty.watch === 'function') {
    return getGetterWatchedByFunction(computedAsyncProperty)
  } else if (Array.isArray(computedAsyncProperty.watch)) {
    computedAsyncProperty.watch.forEach(key => {
      if (typeof key !== 'string') {
        throw new Error('AsyncComputed: watch elemnts must be strings')
      }
    })
    return getGetterWatchedByArray(computedAsyncProperty)
  } else {
    throw Error('AsyncComputed: watch should be function or an array')
  }
}
