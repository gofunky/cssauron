import { Optionable } from './options'

export class Traversal extends Optionable {
  constructor (options, token) {
    super(options)
    switch (token) {
      case '>': return this._directParent
      case '+': return this._directSibling
      case '~': return this._anySibling
      default: return this._anyParents
    }
  }

  static entry = (node, next, subj) => {
    return next(node, subj) ? node : null
  }

  _anyParents = (node, next, subj) => {
    do {
      node = this.options.parent(node)
    } while (node && !next(node, subj))
    return node
  }

  _directParent = (node, next, subj) => {
    node = this.options.parent(node)
    return node && next(node, subj) ? node : null
  }

  _directSibling = (node, next, subj) => {
    const parent = this.options.parent(node)
    const children = this.options.children(parent)
    const idx = children.indexOf(node)
    return idx >= 1 && next(children[idx - 1], subj)
      ? children[idx - 1]
      : null
  }

  _anySibling = (node, next, subj) => {
    const parent = this.options.parent(node)
    const children = this.options.children(parent)

    for (let i = 0; i < children.length; i++) {
      if (children[i] === node) {
        return null
      }
      if (next(children[i], subj)) {
        return children[i]
      }
    }
    return null
  }
}
