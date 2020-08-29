import test from 'supertape'
import { one, parent, root } from './shared'

export default (lang) => {
  test('select subject', async (assert) => {
    assert.equal(lang(':root > :any(thing-tag, parent-tag, #asdf) > #one-id')(one), one,
      ':root > :any(thing-tag, parent-tag, #asdf) > #one-id')
    assert.equal(lang(':root > !parent-tag > #one-id')(one), parent,
      ':root > !parent-tag > #one-id')

    const anySel = ':root > !:any(thing-tag, parent-tag, #asdf) > !#one-id'
    const resAny = lang(anySel)(one)
    assert.equal(resAny[0], one, `${anySel} [one]`)
    assert.equal(resAny[1], parent, `${anySel} [parent]`)

    // one of these has a subject, one doesn't
    const subjSel = ':root > parent-tag > #one-id, !#root-id *'
    const subjRes = lang(subjSel)(one)
    assert.equal(subjRes[0], root, `${subjSel} [root]`)
    assert.equal(subjRes[1], one, `${subjSel} [one]`)

    // no duplicates, no matter how many valid selections, both sides select `one`.
    const duplicateSel = ':root > parent-tag > #one-id, #root-id !*'
    const duplicateRes = lang(duplicateSel)(one)
    assert.equal(duplicateRes, one, duplicateSel)

    assert.end()
  })
}
