const attr = {
  first: 'test',
  second: 'gary busey',
  third: 'richard-m-nixon'
}
const one = {
  id: 'one-id',
  class: 'one-class',
  tag: 'one-tag',
  attr: attr,
  parent: null,
  children: []
}
const two = {
  id: 'two-id',
  class: 'two-class',
  tag: 'two-tag',
  attr: attr,
  parent: null,
  children: [],
  contents: 'hello world'
}
const three = {
  id: 'three-id',
  class: 'three-class',
  tag: 'three-tag',
  attr: attr,
  parent: null,
  children: []
}
const parent = {
  id: 'parent-id',
  class: 'parent-class',
  tag: 'parent-tag',
  attr: attr,
  parent: null,
  children: [one, two, three]
}
const root = {
  id: 'root-id',
  class: 'root-class',
  tag: 'root-tag',
  attr: attr,
  parent: null,
  children: [parent]
}

one.parent = parent
two.parent = parent
three.parent = parent
parent.parent = root

class TestCase {
  selector
  success
  testObject
  constructor (selector, testObject, success = true) {
    this.selector = selector
    this.success = success
    this.testObject = testObject
  }
}

const testLang = (assert, lang, tests = []) => {
  tests.forEach(element => {
    if (element.success) {
      assert.ok(lang(element.selector)(element.testObject), element.selector)
    } else {
      assert.ok(!lang(element.selector)(element.testObject), element.selector)
    }
  })
}

export { one, two, three, parent, root, TestCase, testLang }
