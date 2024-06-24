import { DBG } from './defines.mjs';

export default class Sankey {
  constructor(opts={}) {
    let {
      links=[],
    } = opts;

    Object.assign(this, {
      links: [...links],
    });

    let nodeMap = {};
    Object.defineProperty(this, "nodeMap", {value:nodeMap});

    // organize links by source/target
    let linkMap = {};
    Object.defineProperty(this, "linkMap", {value:linkMap});
    this.links.forEach(link=>{
      let { source, target } = link;
      let key = `${source}|${target}`;
      linkMap[key] = link;
      nodeMap[source] = (nodeMap[source] || 0)+1;
      nodeMap[target] = (nodeMap[target] || 0)+1;
    });
  }

  get nodes() {
    let { nodeMap } = this;
    let nodes = Object.keys(nodeMap).map(n=>({id:n}));
    return nodes;
  }

  addLink({source, target, value=0}) {
    const msg = 'Sankey.addLink()';
    const dbg = DBG.SANKEY;
    let { links, linkMap, nodeMap } = this;
    if (source == null) {
      throw new Error(`${msg} source? [${source}]`);
    }
    nodeMap[source] = (nodeMap[source] || 0)+1;
    if (target == null) {
      throw new Error(`${msg} target? [${target}]`);
    }
    if (isNaN(value)) {
      throw new Error(`${msg} value? [${value}]`);
    }
    nodeMap[target] = (nodeMap[target] || 0)+1;

    let key = `${source}|${target}`;
    let link = linkMap[key];
    if (link == null) {
      link = linkMap[key] = {source, target, value:0};
      links.push(link);
    }
    link.value += value;
  }

}
