import { Transform } from 'stream'

export class CSSTransform extends Transform {
  static PSEUDO_START = 'pseudo-start'
  static ATTR_START = 'attr-start'
  static ANY_CHILD = 'any-child'
  static ATTR_COMP = 'attr-comp'
  static ATTR_END = 'attr-end'
  static PSEUDO_PSEUDO = '::'
  static PSEUDO_CLASS = ':'
  static READY = '(ready)'
  static OPERATION = 'op'
  static CLASS = 'class'
  static COMMA = 'comma'
  static ATTR = 'attr'
  static SUBJECT = '!'
  static TAG = 'tag'
  static STAR = '*'
  static ID = 'id'

  #escaped = false
  #gathered = []
  #state = CSSTransform.READY
  #data = []
  #idx = 0
  #length
  #quote
  #depth
  #lhs
  #rhs
  #cmp
  #c

  static create (selector) {
    return new CSSTransform(selector)
  }

  constructor (selector) {
    // TODO was onEnd before - equal?
    super({
      objectMode: true
    })
    this.analyze(selector)
    this.emitToken()
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
        case CSSTransform.READY:
          this.stateReady()
          break
        case CSSTransform.ANY_CHILD:
          this.stateAnyChild()
          break
        case CSSTransform.OPERATION:
          this.stateOp()
          break
        case CSSTransform.ATTR_START:
          this.stateAttrStart()
          break
        case CSSTransform.ATTR_COMP:
          this.stateAttrCompare()
          break
        case CSSTransform.ATTR_END:
          this.stateAttrEnd()
          break
        case CSSTransform.PSEUDO_CLASS:
        case CSSTransform.PSEUDO_PSEUDO:
          this.statePseudo()
          break
        case CSSTransform.PSEUDO_START:
          this.statePseudoStart()
          break
        case CSSTransform.ID:
        case CSSTransform.TAG:
        case CSSTransform.CLASS:
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
    this.#state = CSSTransform.READY
    this.#idx--
  }

  stateAnyChild () {
    if (/\s/.test(this.#c)) {
      return
    }

    if (/[>+~]/.test(this.#c)) {
      this.#idx--
      this.#state = CSSTransform.OPERATION
      return
    }

    this.emitToken()
    this.#state = CSSTransform.READY
    this.#idx--
  }

  statePseudo () {
    this.#rhs = this.#state
    this.stateGather(true)

    if (this.#state !== CSSTransform.READY) {
      return
    }

    if (this.#c === '(') {
      this.#lhs = this.#gathered.join('')
      this.#state = CSSTransform.PSEUDO_START
      this.#gathered.length = 0
      this.#depth = 1
      this.#idx++
      return
    }

    this.#state = CSSTransform.PSEUDO_CLASS
    this.emitToken()
    this.#state = CSSTransform.READY
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

      this.#state = CSSTransform.READY
      this.#lhs = this.#rhs = this.#cmp = null
      this.#gathered.length = 0
    }
  }

  subject () {
    this.#state = CSSTransform.SUBJECT
    this.#gathered = [CSSTransform.SUBJECT]
    this.emitToken()
    this.#state = CSSTransform.READY
  }

  star () {
    this.#state = CSSTransform.STAR
    this.#gathered = [CSSTransform.STAR]
    this.emitToken()
    this.#state = CSSTransform.READY
  }

  comma () {
    this.#state = CSSTransform.COMMA
    this.#gathered = [CSSTransform.COMMA]
    this.emitToken()
    this.#state = CSSTransform.READY
  }

  stateReady () {
    switch (true) {
      case this.#c === '#':
        this.#state = CSSTransform.ID
        break
      case this.#c === '.':
        this.#state = CSSTransform.CLASS
        break
      case this.#c === ':':
        this.#state = CSSTransform.PSEUDO_CLASS
        break
      case this.#c === '[':
        this.#state = CSSTransform.ATTR_START
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
        this.#state = CSSTransform.OPERATION
        break
      case /\s/.test(this.#c):
        this.#state = CSSTransform.ANY_CHILD
        break
      case /[\w\d\-_]/.test(this.#c):
        this.#state = CSSTransform.TAG
        this.#idx--
        break
    }
  }

  stateAttrStart () {
    this.stateGather(true)

    if (this.#state !== CSSTransform.READY) {
      return
    }

    if (this.#c === ']') {
      this.#state = CSSTransform.ATTR
      this.emitToken()
      this.#state = CSSTransform.READY
      return
    }

    this.#lhs = this.#gathered.join('')
    this.#gathered.length = 0
    this.#state = CSSTransform.ATTR_COMP
  }

  stateAttrCompare () {
    if (/[=~|$^*]/.test(this.#c)) {
      this.#gathered.push(this.#c)
    }

    if (this.#gathered.length === 2 || this.#c === '=') {
      this.#cmp = this.#gathered.join('')
      this.#gathered.length = 0
      this.#state = CSSTransform.ATTR_END
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

    if (this.#state !== CSSTransform.READY) {
      return
    }

    this.push({
      type: CSSTransform.ATTR,
      data: {
        lhs: this.#lhs,
        rhs: this.#gathered.join(''),
        cmp: this.#cmp
      }
    })

    this.#state = CSSTransform.READY
    this.#lhs = this.#rhs = this.#cmp = null
    this.#gathered.length = 0
  }

  stateGather (quietly) {
    if (/[^\d\w\-_]/.test(this.#c) && !this.#escaped) {
      if (this.#c === '\\') {
        this.#escaped = true
      } else {
        !quietly && this.emitToken()
        this.#state = CSSTransform.READY
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
