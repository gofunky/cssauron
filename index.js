module.exports = language

const tokenizer = require('./tokenizer')

function language (lookups, matchComparison) {
  return function (selector) {
    return parse(selector, remap(lookups),
      matchComparison || caseSensitiveComparison)
  }
}

function remap (opts) {
  for (const key in opts) {
    if (Object.prototype.hasOwnProperty.call(opts, key) && typeof opts[key] === 'string') {
      const property = opts[key]
      opts[key] = function (node, attr) {
        return getProp(node, property, attr)
      }
    }
  }
  return opts
}

function getProp (obj, prop, attr) {
  let fallback
  if (prop.includes('||')) {
    fallback = prop.replace(/[ ]*\|\|[ ]*["'`](.*)["'`]/g, '$1')
    prop = prop.replace(/[ ]*\|\|.*/g, '')
  }

  prop = prop.replace(/\[["'`](.*)["'`]]/g, '.$1')
  prop = prop.replace(/\[attr]/g, '.' + attr)

  const resultProperty = prop.split('.').reduce(function (prev, curr) {
    return prev ? prev[curr] : undefined
  }, obj)

  return resultProperty || fallback
}

function parse (selector, options, matchComparison) {
  const stream = tokenizer()
  const selectors = [[]]
  let bits

  bits = selectors[0]

  const traversal = {
    '': anyParents,
    '>': directParent,
    '+': directSibling,
    '~': anySibling
  }

  stream
    .on('data', group)
    .end(selector)

  function group (token) {
    if (token.type === 'comma') {
      selectors.unshift(bits = [])

      return
    }

    if (token.type === 'op' || token.type === 'any-child') {
      bits.unshift(traversal[token.data])
      bits.unshift(check())

      return
    }

    bits[0] = bits[0] || check()
    const crnt = bits[0]

    if (token.type === '!') {
      crnt.subject =
                selectors[0].subject = true

      return
    }

    crnt.push(
      token.type === 'class' ? listContains(token.type, token.data)
        : token.type === 'attr' ? attr(token)
          : token.type === ':' || token.type === '::' ? pseudo(token)
            : token.type === '*' ? Boolean
              : matches(token.type, token.data, matchComparison)
    )
  }

  return selectorFn

  function selectorFn (node, asBoolean) {
    let current,
      length,
      subj

    const orig = node
    const set = []

    let i = 0
    const len = selectors.length
    for (; i < len; ++i) {
      bits = selectors[i]
      current = entry
      length = bits.length
      node = orig
      subj = []

      let j
      for (j = 0; j < length; j += 2) {
        node = current(node, bits[j], subj)

        if (!node) {
          break
        }

        current = bits[j + 1]
      }

      if (j >= length) {
        if (asBoolean) {
          return true
        }

        add(!bits.subject ? [orig] : subj)
      }
    }

    if (asBoolean) {
      return false
    }

    return !set.length ? false
      : set.length === 1 ? set[0]
        : set

    function add (items) {
      let next

      while (items.length) {
        next = items.shift()

        if (set.indexOf(next) === -1) {
          set.push(next)
        }
      }
    }
  }

  function check () {
    _check.bits = []
    _check.subject = false
    _check.push = function (token) {
      _check.bits.push(token)
    }

    return _check

    function _check (node, subj) {
      let i = 0
      const len = _check.bits.length
      for (; i < len; ++i) {
        if (!_check.bits[i](node)) {
          return false
        }
      }

      if (_check.subject) {
        subj.push(node)
      }

      return true
    }
  }

  function listContains (type, data) {
    return function (node) {
      let val = options[type](node)
      val =
                Array.isArray(val) ? val
                  : val ? val.toString().split(/\s+/)
                    : []
      return val.indexOf(data) >= 0
    }
  }

  function attr (token) {
    return token.data.lhs
      ? validAttr(
        options.attr
        , token.data.lhs
        , token.data.cmp
        , token.data.rhs
      )
      : validAttr(options.attr, token.data)
  }

  function matches (type, data, matchComparison) {
    return function (node) {
      return matchComparison(type, options[type](node), data)
    }
  }

  function anyParents (node, next, subj) {
    do {
      node = options.parent(node)
    } while (node && !next(node, subj))

    return node
  }

  function directParent (node, next, subj) {
    node = options.parent(node)

    return node && next(node, subj) ? node : null
  }

  function directSibling (node, next, subj) {
    const parent = options.parent(node)
    let idx = 0

    const children = options.children(parent)

    let i = 0
    const len = children.length
    for (; i < len; ++i) {
      if (children[i] === node) {
        idx = i

        break
      }
    }

    return children[idx - 1] && next(children[idx - 1], subj)
      ? children[idx - 1]
      : null
  }

  function anySibling (node, next, subj) {
    const parent = options.parent(node)

    const children = options.children(parent)

    let i = 0
    const len = children.length
    for (; i < len; ++i) {
      if (children[i] === node) {
        return null
      }

      if (next(children[i], subj)) {
        return children[i]
      }
    }

    return null
  }

  function pseudo (token) {
    return validPseudo(options, token.data, matchComparison)
  }
}

function entry (node, next, subj) {
  return next(node, subj) ? node : null
}

function validPseudo (options, match, matchComparison) {
  switch (match) {
    case 'empty':
      return validEmpty(options)
    case 'first-child':
      return validFirstChild(options)
    case 'last-child':
      return validLastChild(options)
    case 'root':
      return validRoot(options)
  }

  if (match.indexOf('contains') === 0) {
    return validContains(options, match.slice(9, -1))
  }

  if (match.indexOf('any') === 0) {
    return validAnyMatch(options, match.slice(4, -1), matchComparison)
  }

  if (match.indexOf('not') === 0) {
    return validNotMatch(options, match.slice(4, -1), matchComparison)
  }

  if (match.indexOf('nth-child') === 0) {
    return ValidNthChild(options, match.slice(10, -1))
  }

  return function () {
    return false
  }
}

function validNotMatch (options, selector, matchComparison) {
  const fn = parse(selector, options, matchComparison)

  return notFunction

  function notFunction (node) {
    return !fn(node, true)
  }
}

function validAnyMatch (options, selector, matchComparison) {
  return parse(selector, options, matchComparison)
}

const checkAttributes = {
  $: checkEnd,
  '^': checkBeg,
  '*': checkAny,
  '~': checkSpc,
  '|': checkDsh
}

function validAttr (fn, lhs, cmp, rhs) {
  return function (node) {
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

    return checkAttributes[cmp.charAt(0)](attr, rhs)
  }
}

function validFirstChild (options) {
  return function (node) {
    return options.children(options.parent(node))[0] === node
  }
}

function validLastChild (options) {
  return function (node) {
    const children = options.children(options.parent(node))

    return children[children.length - 1] === node
  }
}

function validEmpty (options) {
  return function (node) {
    return options.children(node).length === 0
  }
}

function validRoot (options) {
  return function (node) {
    return !options.parent(node)
  }
}

function validContains (options, contents) {
  return function (node) {
    return options.contents(node).indexOf(contents) !== -1
  }
}

function ValidNthChild (options, nth) {
  let test = function (..._) {
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
        test = function (children, node) {
          return children[offset - 1] === node
        }
      }
    } else {
      test = function (children, node) {
        const validPositions = []
        const len = children.length
        for (let position = 1; position <= len; position++) {
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
  return function (node) {
    const children = options.children(options.parent(node))

    return test(children, node)
  }
}

function checkEnd (l, r) {
  return l.slice(l.length - r.length) === r
}

function checkBeg (l, r) {
  return l.slice(0, r.length) === r
}

function checkAny (l, r) {
  return l.indexOf(r) > -1
}

function checkSpc (l, r) {
  return l.split(/\s+/).indexOf(r) > -1
}

function checkDsh (l, r) {
  return l.split('-').indexOf(r) > -1
}

function caseSensitiveComparison (type, pattern, data) {
  return pattern === data
}
