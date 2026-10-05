// Limited DOM fixture for unit tests. Browser behavior belongs to Playwright.
class Node {
  constructor(nodeType) { this.nodeType=nodeType;this.parentNode=null;this.childNodes=[]; }
  get parentElement() { return this.parentNode?.nodeType===1 ? this.parentNode : null; }
  get children() { return this.childNodes.filter(node=>node.nodeType===1); }
  get firstElementChild() { return this.children[0] ?? null; }
  get textContent() { return this.childNodes.map(node=>node.textContent).join(''); }
  set textContent(value) {
    this.replaceChildren();
    if(value!=null && String(value)!=='') this.append(new Text(String(value)));
  }
  append(...nodes) {
    for(let node of nodes) {
      if(typeof node==='string') node=new Text(node);
      if(node.nodeType===11) { this.append(...node.childNodes);continue; }
      Node.prototype.remove.call(node);node.parentNode=this;this.childNodes.push(node);
    }
  }
  appendChild(node) { this.append(node);return node; }
  replaceChildren(...nodes) {
    for(const child of this.childNodes) child.parentNode=null;
    this.childNodes=[];this.append(...nodes);
  }
  contains(node) { return this===node || this.childNodes.some(child=>child.contains(node)); }
  remove() {
    if(this.parentNode) {
      const siblings=this.parentNode.childNodes;
      siblings.splice(siblings.indexOf(this),1);this.parentNode=null;
    }
  }
  replaceWith(node) {
    const parent=this.parentNode;
    if(!parent || node===this) return;
    Node.prototype.remove.call(node);
    parent.childNodes.splice(parent.childNodes.indexOf(this),1,node);
    node.parentNode=parent;this.parentNode=null;
  }
}
class Text extends Node {
  constructor(value) { super(3);this.textContent=value; }
  get textContent() { return this.data; }
  set textContent(value) { this.data=String(value); }
  cloneNode() { return new Text(this.data); }
}
class Fragment extends Node { constructor() { super(11); } }

function selectorParts(selector) {
  const parts=selector.trim().split(/\s+/);
  if(!parts.every(part=>/^(?:[a-z][\w-]*)?(?:\.[\w-]+)*$/i.test(part) && part)) {
    throw new Error('Unsupported unit-test selector: '+selector);
  }
  return parts;
}
function matchesPart(element,part) {
  const [tag,...classes]=part.split('.');
  return (!tag || element.tagName.toLowerCase()===tag.toLowerCase()) && classes.every(cls=>element.classList.contains(cls));
}
function matchesSelector(element,parts) {
  if(!matchesPart(element,parts.at(-1))) return false;
  let ancestor=element.parentElement;
  for(let i=parts.length-2;i>=0;i--) {
    while(ancestor && !matchesPart(ancestor,parts[i])) ancestor=ancestor.parentElement;
    if(!ancestor) return false;
    ancestor=ancestor.parentElement;
  }
  return true;
}
function fixtureEvent(type,target,extra={}) {
  return {type,target,stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;this.defaultPrevented=true;},...extra};
}
class CustomEvent {
  constructor(type,options={}) { Object.assign(this,fixtureEvent(type,null),{detail:null,bubbles:false,composed:false},options); }
}
class Element extends Node {
  constructor(tag='div') {
    super(1);this.tagName=tag.toUpperCase();this.attrs=new Map();this.dataset={};
    this.listeners=new Map();this.events=[];this.hidden=false;this.classes=new Set();
    const update=()=>this.attrs.set('class',[...this.classes].join(' '));
    this.classList={
      contains:cls=>this.classes.has(cls),
      add:(...classes)=>{classes.forEach(cls=>this.classes.add(cls));update();},
      remove:(...classes)=>{classes.forEach(cls=>this.classes.delete(cls));update();},
      toggle:(cls,force)=>{
        const on=force===undefined ? !this.classes.has(cls) : !!force;
        if(on) this.classes.add(cls);else this.classes.delete(cls);
        update();return on;
      }
    };
    this.style={
      setProperty:(key,value)=>{this.style[key]=String(value);},
      getPropertyValue:key=>this.style[key] ?? '',
      removeProperty:key=>{const old=this.style[key] ?? '';delete this.style[key];return old;}
    };
  }
  get attributes() { return [...this.attrs].map(([name,value])=>({name,value})); }
  get className() { return this.getAttribute('class') ?? ''; }
  set className(value) { this.setAttribute('class',value); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name,value) {
    this.attrs.set(name,String(value));
    if(name==='class') this.classes=new Set(String(value).split(/\s+/).filter(Boolean));
  }
  removeAttribute(name) { this.attrs.delete(name);if(name==='class') this.classes.clear(); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const parts=selectorParts(selector),found=[];
    const visit=node=>{
      for(const child of node.children) {
        if(matchesSelector(child,parts)) found.push(child);
        visit(child);
      }
    };
    visit(this);return found;
  }
  closest(selector) {
    const parts=selectorParts(selector);
    for(let node=this;node;node=node.parentElement) if(matchesSelector(node,parts)) return node;
    return null;
  }
  cloneNode(deep=false) {
    const clone=new this.constructor(this.tagName);
    for(const [key,value] of this.attrs) clone.setAttribute(key,value);
    Object.assign(clone.dataset,this.dataset);clone.hidden=this.hidden;
    for(const [key,value] of Object.entries(this.style)) if(typeof value!=='function') clone.style[key]=value;
    if(deep) clone.append(...this.childNodes.map(node=>node.cloneNode(true)));
    return clone;
  }
  addEventListener(type,listener) {
    const list=this.listeners.get(type) || [];
    if(!list.includes(listener)) list.push(listener);
    this.listeners.set(type,list);
  }
  removeEventListener(type,listener) {
    const list=(this.listeners.get(type) || []).filter(value=>value!==listener);
    if(list.length) this.listeners.set(type,list);else this.listeners.delete(type);
  }
  dispatchEvent(event) {
    this.events.push(event);
    for(const listener of [...(this.listeners.get(event.type) || [])]) listener.call(this,event);
    return !event.defaultPrevented;
  }
  event(type,extra={}) {
    const event=fixtureEvent(type,this,extra);
    for(const listener of [...(this.listeners.get(type) || [])]) listener.call(this,event);
    return event;
  }
  click() { return this.event('click'); }
}
function createDocument(ElementClass=Element) {
  return {
    createElement:tag=>new ElementClass(tag),createElementNS:(_,tag)=>new ElementClass(tag),
    createTextNode:text=>new Text(text),createDocumentFragment:()=>new Fragment()
  };
}
module.exports={Element,createDocument,fixtureEvent,CustomEvent};
