# cssauron

[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/gofunky/cssauron/build/master?style=for-the-badge)](https://github.com/gofunky/cssauron/actions)
[![Codecov](https://img.shields.io/codecov/c/github/gofunky/cssauron?style=for-the-badge)](https://codecov.io/gh/gofunky/cssauron)
[![Renovate Status](https://img.shields.io/badge/renovate-enabled-green?style=for-the-badge&logo=renovatebot&color=1a1f6c)](https://app.renovatebot.com/dashboard#github/gofunky/cssauron)
[![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/@gofunky%2Fcssauron?style=for-the-badge)](https://libraries.io/npm/@gofunky%2Fcssauron)
[![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/@gofunky/cssauron?style=for-the-badge)](https://snyk.io/test/github/gofunky/cssauron)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-purple.svg?style=for-the-badge)](https://standardjs.com)
[![CodeFactor](https://www.codefactor.io/repository/github/gofunky/cssauron/badge?style=for-the-badge)](https://www.codefactor.io/repository/github/gofunky/cssauron)
[![node-current](https://img.shields.io/node/v/@gofunky/cssauron?style=for-the-badge)](https://www.npmjs.com/package/@gofunky/cssauron)
[![NPM version](https://img.shields.io/npm/v/@gofunky/cssauron.svg?style=for-the-badge)](https://www.npmjs.com/package/@gofunky/cssauron)
[![NPM Downloads](https://img.shields.io/npm/dm/@gofunky/cssauron?style=for-the-badge&color=ff69b4)](https://www.npmjs.com/package/@gofunky/cssauron)
[![GitHub License](https://img.shields.io/github/license/gofunky/cssauron.svg?style=for-the-badge)](https://github.com/gofunky/cssauron/blob/master/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/gofunky/cssauron.svg?style=for-the-badge&color=9cf)](https://github.com/gofunky/cssauron/commits/master)

build a matching function in CSS for any nested object structure without eval

## Usage

### Import

#### Common JS

From version `v2.0.0`, cssauron will only support ES6 modules.
In order to import cssauron with NodeJS versions prior v12, you may use [esm](https://github.com/standard-things/esm).

#### Import default

```js
import cssauron from '@gofunky/cssauron'

const language = cssauron({
  tag: 'tagName',
  contents: 'innerText',
  id: 'id',
  class: 'className',
  parent: 'parentNode',
  children: 'childNodes',
  attr: 'getAttribute(attr)'
})

const selector = language('body > #header .logo')
const element = document.getElementsByClassName('logo')[0]

if(selector(element)) {
  // element matches selector
} else {
  // element does not match selector
}
```

#### Import as class

```js
import { CSSAuron } from '@gofunky/cssauron'

const language = new CSSAuron({})
const selector = language.parse('body > #header .logo')
```

### Constructor options

`options` are an object hash of lookup type to string attribute or `function(node)` lookups for queried
nodes. You only need to provide the configuration necessary for the selectors you're planning on creating.
(If you're not going to use `#id` lookups, there's no need to provide the `id` lookup in your options.)

* `tag`: Extract tag information from a node for `div` style selectors.
* `contents`: Extract text information from a node, for `:contains(xxx)` selectors.
* `id`: Extract id for `#my_sweet_id` selectors.
* `class`: `.class_name`
* `parent`: Used to traverse up from the current node, for composite selectors `body #wrapper`, `body > #wrapper`.
* `children`: Used to traverse from a parent to its children for sibling selectors `div + span`, `a ~ p`.
* `attr`: Used to extract attribute information, for `[attr=thing]` style selectors.

### `language('some selector')` -> match function

Compiles a matching function.

### `match(node)` -> false | node | [subjects, ...]

Returns `false` if the provided node does not match the selector.
Returns `true` if the provided node *does* match.
The exact return value is determined by the selector, based on the 
[CSS4 subject selector spec](http://dev.w3.org/csswg/selectors4/#subject):
If only a single node matches, only this node is returned.
If multiple subjects match, a deduplicated array of those subjects is returned.

For example, given the following HTML:

```html
<div id="gary-busey">
    <p>
        <span class="jake-busey">
        </span>
    </p>
</div>
```

Checking the following selectors against the `span.jake-busey` element yield:

 - `#gary-busey`: `false`, no match.
 - `#gary-busey *`: `span.jake-busey`, a single match.
 - `!#gary-busey *`: `div#gary-busey`, a single match using the `!` subject selector.
 - `#gary-busey *, p span`: `span.jake-busey`, a single match, though both selectors match.
 - `#gary-busey !* !*, !p > !span`: `[p, span.jake-busey]`, two matches.

## Supported pseudo-classes 

 - `:first-child`
 - `:last-child`
 - `:nth-child`
 - `:empty`
 - `:root`
 - `:contains(text)`
 - `:any(selector, selector, selector)`

## Supported attribute lookups

 - `[attr=value]`: Exact match
 - `[attr]`: Attribute exists and is not false-y.
 - `[attr$=value]`: Attribute ends with value
 - `[attr^=value]`: Attribute starts with value
 - `[attr*=value]`: Attribute contains value
 - `[attr~=value]`: Attribute, split by whitespace, contains value.
 - `[attr|=value]`: Attribute, split by `-`, contains value.
