class Player {
  constructor(name, email) {
    this.name = name.trim();
    this.email = email.trim();
  }

  hasName() {
    return !!this.name;
  }

  hasEmail() {
    return !!this.email;
  }

  get display() {
    if (this.hasName()) { return this.name; }
    return this.email;
  }

  toString() {
    return `${this.email} - ${this.name}`;
  }
}
