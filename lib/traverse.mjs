import { Optionable } from './options'

export class Traversal extends Optionable {
  traverse

  static create (options, token) {
    return Traversal.create(options, token)
  }

  constructor (options, token) {
    super(options)
    this.traverse = this._map[token]
  }

  _map (token) {
    switch (token) {
      case '>': return this._directParent
      case '+': return this._directSibling
      case '~': return this._anySibling
      default: return this._anyParents
    }
  }

  _anyParents (node, next, subj) {
    do {
      node = this.options.parent(node)
    } while (node && !next(node, subj))
    return node
  }

  _directParent (node, next, subj) {
    node = this.options.parent(node)
    return node && next(node, subj) ? node : null
  }

  _directSibling (node, next, subj) {
    const parent = this.options.parent(node)
    const children = this.options.children(parent)
    const idx = Array.prototype.indexOf(node, children)
    // TODO Try -1 check instead
    return children[idx - 1] && next(children[idx - 1], subj)
      ? children[idx - 1]
      : null
  }

  _anySibling (node, next, subj) {
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
