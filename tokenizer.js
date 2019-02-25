module.exports = tokenize

const through = require('through')

const PSEUDOSTART = 'pseudo-start'
const ATTR_START = 'attr-start'
const ANY_CHILD = 'any-child'
const ATTR_COMP = 'attr-comp'
const ATTR_END = 'attr-end'
const PSEUDOPSEUDO = '::'
const PSEUDOCLASS = ':'
const READY = '(ready)'
const OPERATION = 'op'
const CLASS = 'class'
const COMMA = 'comma'
const ATTR = 'attr'
const SUBJECT = '!'
const TAG = 'tag'
const STAR = '*'
const ID = 'id'

function tokenize () {
  let escaped = false
  let gathered = []
  let state = READY
  let data = []
  let idx = 0
  let length
  let quote
  let depth
  let lhs
  let rhs
  let cmp
  let c
  const stream = through(onData, onend)

  return stream

  function onData (chunk) {
    data = data.concat(chunk.split(''))
    length = data.length

    while (idx < length && (c = data[idx++])) {
      switch (state) {
        case READY: stateReady(); break
        case ANY_CHILD: stateAnyChild(); break
        case OPERATION: stateOp(); break
        case ATTR_START: stateAttrStart(); break
        case ATTR_COMP: stateAttrCompare(); break
        case ATTR_END: stateAttrEnd(); break
        case PSEUDOCLASS:
        case PSEUDOPSEUDO: statePseudo(); break
        case PSEUDOSTART: statePseudoStart(); break
        case ID:
        case TAG:
        case CLASS: stateGather(); break
      }
    }

    data = data.slice(idx)
  }

  function onend (chunk) {
    if (arguments.length) {
      onData(chunk)
    }

    if (gathered.length) {
      stream.queue(token())
    }
  }

  function stateReady () {
    switch (true) {
      case c === '#': state = ID; break
      case c === '.': state = CLASS; break
      case c === ':': state = PSEUDOCLASS; break
      case c === '[': state = ATTR_START; break
      case c === '!': subject(); break
      case c === '*': star(); break
      case c === ',': comma(); break
      case /[>+~]/.test(c): state = OPERATION; break
      case /\s/.test(c): state = ANY_CHILD; break
      case /[\w\d\-_]/.test(c): state = TAG; --idx; break
    }
  }

  function subject () {
    state = SUBJECT
    gathered = ['!']
    stream.queue(token())
    state = READY
  }

  function star () {
    state = STAR
    gathered = ['*']
    stream.queue(token())
    state = READY
  }

  function comma () {
    state = COMMA
    gathered = [',']
    stream.queue(token())
    state = READY
  }

  function stateOp () {
    if (/[>+~]/.test(c)) {
      return gathered.push(c)
    }

    // chomp down the following whitespace.
    if (/\s/.test(c)) {
      return
    }

    stream.queue(token())
    state = READY
    --idx
  }

  function stateAnyChild () {
    if (/\s/.test(c)) {
      return
    }

    if (/[>+~]/.test(c)) {
      --idx
      state = OPERATION
      return
    }

    stream.queue(token())
    state = READY
    --idx
  }

  function statePseudo () {
    rhs = state
    stateGather(true)

    if (state !== READY) {
      return
    }

    if (c === '(') {
      lhs = gathered.join('')
      state = PSEUDOSTART
      gathered.length = 0
      depth = 1
      ++idx

      return
    }

    state = PSEUDOCLASS
    stream.queue(token())
    state = READY
  }

  function statePseudoStart () {
    if (gathered.length === 0 && !quote) {
      quote = /['"]/.test(c) ? c : null

      if (quote) {
        return
      }
    }

    if (quote) {
      if (!escaped && c === quote) {
        quote = null

        return
      }

      if (c === '\\') {
        escaped ? gathered.push(c) : (escaped = true)

        return
      }

      escaped = false
      gathered.push(c)

      return
    }

    gathered.push(c)

    if (c === '(') {
      ++depth
    } else if (c === ')') {
      --depth
    }

    if (!depth) {
      gathered.pop()
      stream.queue({
        type: rhs,
        data: lhs + '(' + gathered.join('') + ')'
      })

      state = READY
      lhs = rhs = cmp = null
      gathered.length = 0
    }
  }

  function stateAttrStart () {
    stateGather(true)

    if (state !== READY) {
      return
    }

    if (c === ']') {
      state = ATTR
      stream.queue(token())
      state = READY

      return
    }

    lhs = gathered.join('')
    gathered.length = 0
    state = ATTR_COMP
  }

  function stateAttrCompare () {
    if (/[=~|$^*]/.test(c)) {
      gathered.push(c)
    }

    if (gathered.length === 2 || c === '=') {
      cmp = gathered.join('')
      gathered.length = 0
      state = ATTR_END
      quote = null
    }
  }

  function stateAttrEnd () {
    if (!gathered.length && !quote) {
      quote = /['"]/.test(c) ? c : null

      if (quote) {
        return
      }
    }

    if (quote) {
      if (!escaped && c === quote) {
        quote = null

        return
      }

      if (c === '\\') {
        if (escaped) {
          gathered.push(c)
        }

        escaped = !escaped

        return
      }

      escaped = false
      gathered.push(c)

      return
    }

    stateGather(true)

    if (state !== READY) {
      return
    }

    stream.queue({
      type: ATTR,
      data: {
        lhs: lhs,
        rhs: gathered.join(''),
        cmp: cmp
      }
    })

    state = READY
    lhs = rhs = cmp = null
    gathered.length = 0
  }

  function stateGather (quietly) {
    if (/[^\d\w\-_]/.test(c) && !escaped) {
      if (c === '\\') {
        escaped = true
      } else {
        !quietly && stream.queue(token())
        state = READY
        --idx
      }

      return
    }

    escaped = false
    gathered.push(c)
  }

  function token () {
    const data = gathered.join('')

    gathered.length = 0

    return {
      type: state,
      data: data
    }
  }
}
