import test from 'supertape'
import { one, TestCase, testLang } from './shared'

export default (lang) => {
  test('select single', async (assert) => {
    testLang(assert, lang, [
      new TestCase('#one-id', one),
      new TestCase('#one-id-false', one, false),
      new TestCase('.one-class', one),
      new TestCase('.one-other-class', one, false),
      new TestCase('one-tag', one),
      new TestCase('two-tag', one, false),
      new TestCase('ONE-TAG', one),
      new TestCase('TWO-TAG', one, false)
    ])

    assert.end()
  })
}
