import test from 'supertape'
import { TestCase, testLang } from './shared'

export default (lang) => {
  test('select class list', async (assert) => {
    const data = [
      { class: 'a-class   b-class  c-class ' },
      { class: ['a-class', 'b-class', 'c-class'] }
    ]

    data.forEach((data) => {
      testLang(assert, lang, [
        new TestCase('.a-class', data),
        new TestCase('.b-class', data),
        new TestCase('.c-class', data),
        new TestCase('.one-other-class', data, false)
      ])
    })

    testLang(assert, lang, [
      new TestCase('.whatever', { class: null }, false)
    ])

    assert.end()
  })
}
