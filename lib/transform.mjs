import { Transform } from 'stream'
import { CssTerms } from './terms'

export class CssTransform extends Transform {
  #escaped = false
  #gathered = []
  #state = CssTerms.READY
  #data = []
  #idx = 0
  #length
  #quote
  #depth
  #lhs
  #rhs
  #cmp
  #c
  #selector

  static create (selector) {
    return new CssTransform(selector)
  }

  constructor (selector) {
    super({
      objectMode: true
    })
    this.#selector = selector
  }

  end (chunk, encoding, callback = () => {}) {
    if (chunk) {
      this.analyze(chunk)
    }
    this.analyze(this.#selector)
    if (this.#gathered.length) {
      this.emitToken()
    }
    callback()
  }

  _transform (chunk, encoding, callback) {
    this.analyze(chunk)
    callback()
  }

  analyze (chunk) {
    this.#data = this.#data.concat(String(chunk).split(''))
    this.#length = this.#data.length

    while (this.#idx < this.#length && (this.#c = this.#data[this.#idx++])) {
      switch (this.#state) {
        case CssTerms.READY:
          this.stateReady()
          break
        case CssTerms.ANY_CHILD:
          this.stateAnyChild()
          break
        case CssTerms.OPERATION:
          this.stateOp()
          break
        case CssTerms.ATTR_START:
          this.stateAttrStart()
          break
        case CssTerms.ATTR_COMP:
          this.stateAttrCompare()
          break
        case CssTerms.ATTR_END:
          this.stateAttrEnd()
          break
        case CssTerms.PSEUDO_CLASS:
        case CssTerms.PSEUDO_PSEUDO:
          this.statePseudo()
          break
        case CssTerms.PSEUDO_START:
          this.statePseudoStart()
          break
        case CssTerms.ID:
        case CssTerms.TAG:
        case CssTerms.CLASS:
          this.stateGather()
          break
      }
    }

    this.#data = this.#data.slice(this.#idx)
  }

  stateOp () {
    if (/[>+~]/.test(this.#c)) {
      return this.#gathered.push(this.#c)
    }

    // chomp down the following whitespace.
    if (/\s/.test(this.#c)) {
      return
    }

    this.emitToken()
    this.#state = CssTerms.READY
    this.#idx--
  }

  stateAnyChild () {
    if (/\s/.test(this.#c)) {
      return
    }

    if (/[>+~]/.test(this.#c)) {
      this.#idx--
      this.#state = CssTerms.OPERATION
      return
    }

    this.emitToken()
    this.#state = CssTerms.READY
    this.#idx--
  }

  statePseudo () {
    this.#rhs = this.#state
    this.stateGather(true)

    if (this.#state !== CssTerms.READY) {
      return
    }

    if (this.#c === '(') {
      this.#lhs = this.#gathered.join('')
      this.#state = CssTerms.PSEUDO_START
      this.#gathered.length = 0
      this.#depth = 1
      this.#idx++
      return
    }

    this.#state = CssTerms.PSEUDO_CLASS
    this.emitToken()
    this.#state = CssTerms.READY
  }

  statePseudoStart () {
    if (this.#gathered.length === 0 && !this.#quote) {
      this.#quote = /['"]/.test(this.#c) ? this.#c : null

      if (this.#quote) {
        return
      }
    }

    if (this.#quote) {
      if (!this.#escaped && this.#c === this.#quote) {
        this.#quote = null
        return
      }

      if (this.#c === '\\') {
        this.#escaped ? this.#gathered.push(this.#c) : (this.#escaped = true)
        return
      }

      this.#escaped = false
      this.#gathered.push(this.#c)
      return
    }

    this.#gathered.push(this.#c)

    if (this.#c === '(') {
      this.#depth++
    } else if (this.#c === ')') {
      this.#depth--
    }

    if (!this.#depth) {
      this.#gathered.pop()
      this.push({
        type: this.#rhs,
        data: this.#lhs + '(' + this.#gathered.join('') + ')'
      })

      this.#state = CssTerms.READY
      this.#lhs = this.#rhs = this.#cmp = null
      this.#gathered.length = 0
    }
  }

  subject () {
    this.#state = CssTerms.SUBJECT
    this.#gathered = [CssTerms.SUBJECT]
    this.emitToken()
    this.#state = CssTerms.READY
  }

  star () {
    this.#state = CssTerms.STAR
    this.#gathered = [CssTerms.STAR]
    this.emitToken()
    this.#state = CssTerms.READY
  }

  comma () {
    this.#state = CssTerms.COMMA
    this.#gathered = [CssTerms.COMMA]
    this.emitToken()
    this.#state = CssTerms.READY
  }

  stateReady () {
    switch (true) {
      case this.#c === '#':
        this.#state = CssTerms.ID
        break
      case this.#c === '.':
        this.#state = CssTerms.CLASS
        break
      case this.#c === ':':
        this.#state = CssTerms.PSEUDO_CLASS
        break
      case this.#c === '[':
        this.#state = CssTerms.ATTR_START
        break
      case this.#c === '!':
        this.subject()
        break
      case this.#c === '*':
        this.star()
        break
      case this.#c === ',':
        this.comma()
        break
      case /[>+~]/.test(this.#c):
        this.#state = CssTerms.OPERATION
        break
      case /\s/.test(this.#c):
        this.#state = CssTerms.ANY_CHILD
        break
      case /[\w\d\-_]/.test(this.#c):
        this.#state = CssTerms.TAG
        this.#idx--
        break
    }
  }

  stateAttrStart () {
    this.stateGather(true)

    if (this.#state !== CssTerms.READY) {
      return
    }

    if (this.#c === ']') {
      this.#state = CssTerms.ATTR
      this.emitToken()
      this.#state = CssTerms.READY
      return
    }

    this.#lhs = this.#gathered.join('')
    this.#gathered.length = 0
    this.#state = CssTerms.ATTR_COMP
  }

  stateAttrCompare () {
    if (/[=~|$^*]/.test(this.#c)) {
      this.#gathered.push(this.#c)
    }

    if (this.#gathered.length === 2 || this.#c === '=') {
      this.#cmp = this.#gathered.join('')
      this.#gathered.length = 0
      this.#state = CssTerms.ATTR_END
      this.#quote = null
    }
  }

  stateAttrEnd () {
    if (!this.#gathered.length && !this.#quote) {
      this.#quote = /['"]/.test(this.#c) ? this.#c : null

      if (this.#quote) {
        return
      }
    }

    if (this.#quote) {
      if (!this.#escaped && this.#c === this.#quote) {
        this.#quote = null
        return
      }

      if (this.#c === '\\') {
        if (this.#escaped) {
          this.#gathered.push(this.#c)
        }
        this.#escaped = !this.#escaped
        return
      }

      this.#escaped = false
      this.#gathered.push(this.#c)
      return
    }

    this.stateGather(true)

    if (this.#state !== CssTerms.READY) {
      return
    }

    this.push({
      type: CssTerms.ATTR,
      data: {
        lhs: this.#lhs,
        rhs: this.#gathered.join(''),
        cmp: this.#cmp
      }
    })

    this.#state = CssTerms.READY
    this.#lhs = this.#rhs = this.#cmp = null
    this.#gathered.length = 0
  }

  stateGather (quietly) {
    if (/[^\d\w\-_]/.test(this.#c) && !this.#escaped) {
      if (this.#c === '\\') {
        this.#escaped = true
      } else {
        !quietly && this.emitToken()
        this.#state = CssTerms.READY
        this.#idx--
      }

      return
    }

    this.#escaped = false
    this.#gathered.push(this.#c)
  }

  emitToken () {
    const data = this.#gathered.join('')
    this.#gathered = []
    this.push({
      type: this.#state,
      data: data
    })
  }
}
