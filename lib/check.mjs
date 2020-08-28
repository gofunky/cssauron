export class Check {
  #bits = []
  #subject = false

  push (...args) {
    this.#bits.push(...args)
  }

  static create (node, subject) {
    return new Check(node, subject)
  }

  constructor (node, subject) {
    for (let i = 0; i < this.#bits.length; i++) {
      if (!this.#bits[i](node)) {
        return false
      }
    }

    if (this.#subject) {
      subject.push(node)
    }

    return true
  }
}
