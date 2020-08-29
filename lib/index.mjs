import { CSSTransform } from './transform'
import { Selector } from './selectors'
import { Optionable, SelectorOptions } from './options'

export class CSSAuron extends Optionable {
  static create (opts = {}, matchComparison = SelectorOptions.caseSensitiveComparison) {
    return new CSSAuron(opts, matchComparison)
  }

  parse = (selector) => {
    const selectors = new Selector(this.options)

    CSSTransform.create(selector)
      .on('data', selectors.group)
      .end()

    return selectors.select
  }
}

export default (opts = {}, matchComparison = SelectorOptions.caseSensitiveComparison) => {
  return CSSAuron.create(opts, matchComparison).parse
}
