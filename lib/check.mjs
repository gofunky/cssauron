export default () => {
  function _check (node, subj) {
    for (let i = 0; i < _check.bits.length; ++i) {
      if (!_check.bits[i](node)) {
        return false
      }
    }

    if (_check.subject) {
      subj.push(node)
    }

    return true
  }

  _check.bits = []
  _check.subject = false
  _check.push = (token) => {
    _check.bits.push(token)
  }

  return _check
}
