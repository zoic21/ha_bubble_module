const vm=require('node:vm');

// Form mounting and native Node events; each suite supplies its Bubble Engine.
function editorEnvironment() {
  const registry=new Map(),waiting=new Map(),queue=[];
  class Element extends EventTarget {
    constructor() {super();this.children=[];this.isConnected=false;this.attributes={};}
    append(...children) {this.children.push(...children);}
    attachShadow() {return this.shadowRoot=new Element();}
    setAttribute(key,value) {this.attributes[key]=String(value);}
    getRootNode() {return {host:{_config:this.card}};}
    requestUpdate() {}
  }
  const customElements={
    get:name=>registry.get(name),
    define(name,Class) {
      if(registry.has(name)) throw new Error('Custom element already defined: '+name);
      registry.set(name,Class);
      for(const resolve of waiting.get(name) || []) resolve();
      waiting.delete(name);
    },
    whenDefined(name) {
      if(registry.has(name)) return Promise.resolve();
      return new Promise(resolve=>{
        const list=waiting.get(name) || [];list.push(resolve);waiting.set(name,list);
      });
    }
  };
  const document={createElement(name) {
    const element=new (registry.get(name) || Element)();element.tag=name;return element;
  }};
  const context=vm.createContext({HTMLElement:Element,document,customElements,CustomEvent,queueMicrotask:fn=>queue.push(fn)});
  const evaluate=source=>vm.runInContext(source,context);
  const flush=()=>{while(queue.length) queue.shift()();};
  return {Element,registry,customElements,document,evaluate,flush};
}
module.exports={editorEnvironment};
