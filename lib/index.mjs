import { CSSTransform } from './transform'
import { Selector } from './selectors'
import { Optionable } from './options'

export class CSSAuron extends Optionable {
  parse (selector) {
    const selectors = Selector.create(this.options)

    CSSTransform.create(selector)
      .on('data', selectors.group)

    return selectors.select
  }
}
