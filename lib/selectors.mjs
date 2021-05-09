import { CssTerms } from './terms'
import { Optionable } from './options'
import { CSSAuron } from './index'
import check from './check'
import { Traversal } from './traverse'

export class Selector extends Optionable {
  #items = [[]]
  #bits = this.#items[0]

  select = (node, asBoolean = false) => {
    const orig = node
    const set = []

    for (let i = 0; i < this.#items.length; i++) {
      this.#bits = this.#items[i]
      let current = Traversal.entry
      node = orig
      const subj = []

      let j = 0
      while (j < this.#bits.length) {
        node = current(node, this.#bits[j], subj)

        if (!node) {
          break
        }

        current = this.#bits[j + 1]
        j += 2
      }

      if (j >= this.#bits.length) {
        if (asBoolean) {
          return true
        }

        Selector._add(set, !this.#bits.subject ? [orig] : subj)
      }
    }

    if (asBoolean) {
      return false
    }

    return !set.length
? false
      : set.length === 1
? set[0]
        : set
  }

  static _add (set, addition) {
    while (addition.length) {
      const next = addition.shift()

      if (set.indexOf(next) === -1) {
        set.push(next)
      }
    }
  }

  group = (token) => {
    if (token.type === CssTerms.COMMA) {
      this.#items.unshift(this.#bits = [])
      return
    }

    if (token.type === CssTerms.OPERATION || token.type === CssTerms.ANY_CHILD) {
      this.#bits.unshift(new Traversal(this.options, token.data))
      this.#bits.unshift(check())
      return
    }

    this.#bits[0] = this.#bits[0] || check()
    const crnt = this.#bits[0]

    if (token.type === CssTerms.SUBJECT) {
      crnt.subject = this.#items[0].subject = true
      return
    }

    crnt.push(
      token.type === CssTerms.CLASS
? this._listContains(token.type, token.data)
        : token.type === CssTerms.ATTR
? this._attr(token)
          : token.type === CssTerms.PSEUDO_CLASS || token.type === CssTerms.PSEUDO_PSEUDO
? this._pseudo(token)
            : token.type === CssTerms.STAR
? Boolean
              : this._matches(token.type, token.data)
    )
  }

  _matches (type, data) {
    return (node) => {
      return this.options.match(type, this.options[type](node), data)
    }
  }

  _listContains (type, data) {
    return (node) => {
      const val = this.options[type](node)
      const valArr =
        Array.isArray(val)
? val
          : val
? val.toString().split(/\s+/)
            : []
      return valArr.indexOf(data) >= 0
    }
  }

  _attr (token) {
    return token.data.lhs
? this._validAttr(
      this.options.attr,
      token.data.lhs,
      token.data.cmp,
      token.data.rhs
    )
: this._validAttr(this.options.attr, token.data)
  }

  _validAttr (fn, lhs, cmp, rhs) {
    return (node) => {
      const attr = fn(node, lhs)

      if (!cmp) {
        return !!attr
      }

      if (cmp.length === 1) {
        return attr === rhs
      }

      if (attr === undefined || attr === null) {
        return false
      }

      return Selector._checkAttributes(cmp.charAt(0), attr, rhs)
    }
  }

  _pseudo (token) {
    switch (token.data) {
      case 'empty':
        return (node) => {
          return this.options.children(node).length === 0
        }
      case 'first-child':
        return (node) => {
          return this.options.children(this.options.parent(node))[0] === node
        }
      case 'last-child':
        return (node) => {
          const children = this.options.children(this.options.parent(node))
          return children[children.length - 1] === node
        }
      case 'root':
        return (node) => {
          return !this.options.parent(node)
        }
    }

    if (token.data.indexOf('contains') === 0) {
      return (node) => {
        return this.options.contents(node).indexOf(token.data.slice(9, -1)) !== -1
      }
    }

    if (token.data.indexOf('any') === 0) {
      return CSSAuron.create(this.options).parse(token.data.slice(4, -1))
    }

    if (token.data.indexOf('not') === 0) {
      const subParser = CSSAuron.create(this.options).parse(token.data.slice(4, -1))
      return (node) => {
        return !subParser(node, true)
      }
    }

    if (token.data.indexOf('nth-child') === 0) {
      return this._validNthChild(token.data.slice(10, -1))
    }

    return (..._) => {
      return false
    }
  }

  static _checkAttributes (sel, l, r) {
    switch (sel) {
      default: return l.slice(l.length - r.length) === r
      case '^': return l.slice(0, r.length) === r
      case '*': return l.indexOf(r) > -1
      case '~': return l.split(/\s+/).indexOf(r) > -1
      case '|': return l.split('-').indexOf(r) > -1
    }
  }

  _validNthChild (nth) {
    let test = (_, __) => {
      return false
    }
    if (nth === 'odd') {
      nth = '2n+1'
    } else if (nth === 'even') {
      nth = '2n'
    }
    const regexp = /( ?([-|+])?(\d*)n)? ?(([+-])? ?(\d+))? ?/
    const matches = nth.match(regexp)
    if (matches) {
      let growth = 0
      if (matches[1]) {
        const positiveGrowth = (matches[2] !== '-')
        growth = parseInt(matches[3] === '' ? 1 : matches[3])
        growth = growth * (positiveGrowth ? 1 : -1)
      }
      let offset = 0
      if (matches[4]) {
        offset = parseInt(matches[6])
        const positiveOffset = (matches[5] !== '-')
        offset = offset * (positiveOffset ? 1 : -1)
      }
      if (growth === 0) {
        if (offset !== 0) {
          test = (children, node) => {
            return children[offset - 1] === node
          }
        }
      } else {
        test = (children, node) => {
          const validPositions = []
          for (let position = 1; position <= children.length; position++) {
            const divisible = ((position - offset) % growth) === 0
            if (divisible) {
              if (growth > 0) {
                validPositions.push(position)
              } else {
                if ((position - offset) / growth >= 0) {
                  validPositions.push(position)
                }
              }
            }
          }
          for (let i = 0; i < validPositions.length; i++) {
            if (children[validPositions[i] - 1] === node) {
              return true
            }
          }
          return false
        }
      }
    }
    return (node) => {
      const children = this.options.children(this.options.parent(node))
      return test(children, node)
    }
  }
}
