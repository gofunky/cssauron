import test from 'supertape'
import { one, three, two, parent, TestCase, testLang } from './shared'

const tests = [
  new TestCase('#root-id #one-id', one),
  new TestCase('#nope,#root-id #one-id', one),
  new TestCase('#nope, #nada', one, false),
  new TestCase('#root-id > #one-id', one, false),
  new TestCase('#root-id > #parent-id > #one-id', one),
  new TestCase('#parent-id > #one-id,\n#root-id > #parent-id > #one-id', one),
  new TestCase('#ok,\n    #parent-id > #one-id,\n#root-id > #parent-id > #one-id', one),
  new TestCase('.one-class + .two-class', two),
  new TestCase('.one-class + #one-id', one, false),
  new TestCase('one-tag ~ #three-id', three),
  new TestCase('ONE-TAG ~ #three-id', three),
  new TestCase('one-tag:first-child', one),
  new TestCase('one-tag:empty', one),
  new TestCase('#parent-id:empty', parent, false),
  new TestCase('one-tag:last-child', one, false),
  new TestCase('three-tag:last-child', three),
  new TestCase('one-tag:nth-child(1)', one),
  new TestCase('two-tag:nth-child(2)', two),
  new TestCase('three-tag:nth-child(3)', three),
  new TestCase('three-tag:nth-child(1)', one, false),
  new TestCase('one-tag:nth-child(odd)', one),
  new TestCase('two-tag:nth-child(odd)', two, false),
  new TestCase('three-tag:nth-child(odd)', three),
  new TestCase('one-tag:nth-child(even)', one, false),
  new TestCase('two-tag:nth-child(even)', two),
  new TestCase('three-tag:nth-child(even)', three, false),
  new TestCase('one-tag:nth-child(2n+1)', one),
  new TestCase('one-tag:nth-child(2n+0)', one, false),
  new TestCase('two-tag:nth-child(2n+0)', two),
  new TestCase('one-tag:nth-child(0n+1)', one),
  new TestCase('three-tag:nth-child(0n+3)', three),
  new TestCase('three-tag:nth-child(4n-1)', three),
  new TestCase('two-tag:nth-child( 3n - 1 )', two),
  new TestCase('one-tag:nth-child( +3n - 2 )', one),
  new TestCase('three-tag:nth-child( +3 )', three),
  new TestCase('one-tag:nth-child( -n + 2 )', one),
  new TestCase('two-tag:nth-child( -n + 2 )', two),
  new TestCase('three-tag:nth-child( -n + 2 )', three, false),
  new TestCase('one-tag:nth-child( -n + 1 )', one),
  new TestCase('two-tag:nth-child( -n + 1 )', two, false),
  new TestCase('[first]', one),
  new TestCase('[dne]', one, false),
  new TestCase('[first=test]', one),
  new TestCase('[first="test"]', one),
  new TestCase('[second="gary busey"]', one),
  new TestCase('[second="gary busey"] [second="gary busey"]', one),
  new TestCase('[third|=m]', one),
  new TestCase('[third|=richard]', one),
  new TestCase('[third|=nixon]', one),
  new TestCase('[third|=tricky-dick]', one, false),
  new TestCase('[third$=nixon]', one),
  new TestCase('[third$=dixon]', one, false),
  new TestCase('[third^=dick]', one, false),
  new TestCase('[third^=richard]', one),
  new TestCase('[third*=-m-]', one),
  new TestCase('[third*=radical]', one, false),
  new TestCase('[second~=dne]', one, false),
  new TestCase('[second~=gary]', one),
  new TestCase('[second~=busey]', one),
  new TestCase(':contains(hello)', one, false),
  new TestCase(':contains(world)', one, false),
  new TestCase(':contains(hello)', two),
  new TestCase(':contains(world)', two),
  new TestCase(':root > :any(thing-tag, parent-tag, #asdf) > #one-id', one)
]

export default (lang) => {
  test('select multiple', async (assert) => {
    testLang(assert, lang, tests)
    assert.end()
  })
}