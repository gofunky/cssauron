export class SelectorOptions {
  match

  static caseSensitiveComparison (type, pattern, data) {
    return pattern === data
  }

  constructor (opts = {}, matchComparison = SelectorOptions.caseSensitiveComparison) {
    if (opts instanceof SelectorOptions) {
      return opts
    }
    this.match = matchComparison
    const remapped = SelectorOptions._remap(opts)
    return Object.freeze(Object.assign(this, remapped))
  }

  static _remap (opts) {
    for (const key in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, key) && typeof opts[key] === 'string') {
        const property = opts[key]
        opts[key] = (node, attr) => {
          return SelectorOptions._getProp(node, property, attr)
        }
      }
    }
    return opts
  }

  static _getProp (obj, prop, attr) {
    let fallback
    if (prop.includes('||')) {
      fallback = prop.replace(/[ ]*\|\|[ ]*["'`](.*)["'`]/g, '$1')
      prop = prop.replace(/[ ]*\|\|.*/g, '')
    }

    prop = prop.replace(/\[["'`](.*)["'`]]/g, '.$1')
    prop = prop.replace(/\[attr]/g, '.' + attr)

    const resultProperty = prop.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined
    }, obj)

    return resultProperty || fallback
  }
}

export class Optionable {
  options
  constructor (opts = {}, matchComparison = SelectorOptions.caseSensitiveComparison) {
    this.options = new SelectorOptions(opts, matchComparison)
  }
}
