import cssauron from '../lib'
import single from './single'
import classList from './classlist'
import multiple from './multiple'
import subject from './subject'

const language = cssauron({
  id: 'id',
  class: 'class',
  tag: 'tag',
  attr: 'attr[attr]',
  parent: 'parent',
  children: 'children',
  contents: 'contents || ""'
}, (type, pattern, data) => {
  if (type === 'tag') {
    return String(pattern).toLowerCase() === String(data).toLowerCase()
  } else {
    return pattern === data
  }
})

single(language)
classList(language)
multiple(language)
subject(language)
