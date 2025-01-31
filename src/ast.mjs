export default class AST {
  constructor(nodeType, args) {
    const msg = 'AST.ctor()';
    if (nodeType == null) {
      throw new Error(`${msg} nodeType: ${nodeType}?`);
    }
    Object.assign(this, {
      nodeType,
      args,
    });
  }

  static get S_SWITCH() {
    return 'switch';
  }
  static get E_CODE() {
    return 'code';
  }

  static indent(n) {
    let s = '                ';
    while (s.length < n) {
      s = s + s;
    }

    return s.substring(0, n);
  }

  generate(s = 0, opts = {}) {
    const msg = 'AST.generate()';
    let { step = 2 } = opts;
    let { nodeType, args } = this;
    switch (nodeType) {
      case AST.E_CODE:
        return typeof args === 'string' ? args : JSON.stringify(args);
      case AST.S_SWITCH: {
        let [svar, cases] = args;
        let lines = [];
        let keys = Object.keys(cases);
        lines.push(`${AST.indent(s)}switch (${svar}) {`);
        let s1 = s + step;
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          let value = cases[key];
          value = value.generate(s1, opts);
          if (key !== 'default') {
            lines.push(`${AST.indent(s1)}case ${key}: ${value}`);
          } else {
            lines.push(`${AST.indent(s1)}default: ${value}`);
          }
        }
        lines.push(`${AST.indent(s)}}`);
        return lines.join('\n');
      }
      default:
        throw new Error(`${msg} nodeType: ${nodeType}?`);
    }
  }
}
