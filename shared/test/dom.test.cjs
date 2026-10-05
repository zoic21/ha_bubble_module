const assert=require('node:assert/strict');
const {test}=require('node:test');
const {Element,createDocument,CustomEvent}=require('./dom.cjs');

test('moving a node preserves order and never duplicates it between parents',()=>{
  const first=new Element(),second=new Element(),a=new Element(),b=new Element();
  first.append(a,b);first.append(a);
  assert.deepEqual(first.children,[b,a]);
  second.append(a);assert.deepEqual(first.children,[b]);assert.equal(a.parentElement,second);
  assert.equal(first.contains(a),false);a.remove();a.remove();
  assert.equal(a.parentElement,null);assert.deepEqual(second.children,[]);
});
test('text nodes and fragment insertion retain content and detach old children',()=>{
  const document=createDocument(),parent=new Element(),child=new Element(),fragment=document.createDocumentFragment();
  fragment.append('before',child,'after');parent.append(fragment);
  assert.equal(fragment.childNodes.length,0);assert.deepEqual(parent.children,[child]);
  assert.equal(parent.childNodes.length,3);assert.equal(parent.textContent,'beforeafter');
  assert.equal(child.parentElement,parent);
  const text=parent.childNodes[0];parent.textContent='replacement';
  assert.equal(child.parentElement,null);assert.equal(text.parentNode,null);
  assert.equal(parent.children.length,0);assert.equal(parent.textContent,'replacement');
  parent.replaceChildren(child);assert.equal(parent.textContent,'');assert.equal(child.parentElement,parent);
});
test('class attributes, className and classList stay synchronized',()=>{
  const element=new Element();element.className='old shared';element.classList.remove('old');element.classList.add('new');
  assert.equal(element.getAttribute('class'),'shared new');
  element.setAttribute('class','replacement');assert.equal(element.classList.contains('new'),false);
  assert.equal(element.classList.toggle('active',true),true);assert.equal(element.className,'replacement active');
  assert.equal(element.classList.toggle('active'),false);
  element.removeAttribute('class');assert.equal(element.className,'');assert.equal(element.classList.contains('replacement'),false);
});
test('selectors find descendants in DOM order and reject unsupported syntax',()=>{
  const root=new Element('ha-card'),room=new Element(),label=new Element('span'),other=new Element('span');
  room.className='room-temperature';label.className='bubble-sub-button-name-container';other.className=label.className;
  root.append(room,other);room.append(label);
  assert.equal(root.querySelector('.room-temperature .bubble-sub-button-name-container'),label);
  assert.deepEqual(root.querySelectorAll('ha-card span.bubble-sub-button-name-container'),[label,other]);
  assert.equal(label.closest('.room-temperature'),room);assert.equal(root.querySelector('ha-card'),null);
  assert.equal(label.closest('.missing'),null);
  assert.throws(()=>root.querySelector('[data-test]'),/Unsupported unit-test selector/);
});
test('shallow clones retain presentation without children or event listeners',()=>{
  const source=new Element('ha-icon'),parent=new Element();source.setAttribute('icon','mdi:home');source.className='bubble-action';
  source.style.setProperty('--accent','#123456');source.style.fontSize='12px';source.dataset.entity='sensor.demo';source.hidden=true;
  source.append('value',new Element());source.addEventListener('click',()=>{throw new Error('cloned listener');});parent.append(source);
  const next=source.cloneNode(false);assert.equal(next.tagName,'HA-ICON');assert.equal(next.getAttribute('icon'),'mdi:home');
  assert.equal(next.classList.contains('bubble-action'),true);assert.equal(next.dataset.entity,'sensor.demo');
  assert.equal(next.style.getPropertyValue('--accent'),'#123456');assert.equal(next.style.fontSize,'12px');assert.equal(next.hidden,true);
  assert.equal(next.childNodes.length,0);assert.equal(next.listeners.size,0);
  next.append(...source.childNodes);source.replaceWith(next);
  assert.equal(source.parentElement,null);assert.equal(source.childNodes.length,0);assert.equal(next.parentElement,parent);
  assert.equal(next.textContent,'value');next.click();
});
test('listeners are independent, removable and synchronous exceptions fail the caller',()=>{
  const element=new Element(),calls=[];
  const first=event=>{calls.push('first');event.stopPropagation();};
  const second=event=>{calls.push('second');event.preventDefault();};
  element.addEventListener('click',first);element.addEventListener('click',first);element.addEventListener('click',second);
  const click=element.click();assert.deepEqual(calls,['first','second']);assert.equal(click.target,element);
  assert.equal(click.stopped,true);assert.equal(click.prevented,true);
  element.removeEventListener('click',first);element.removeEventListener('click',second);assert.equal(element.listeners.size,0);
  const outbound=new CustomEvent('hass-action',{detail:{entityId:'sensor.demo'},bubbles:true});
  assert.equal(element.dispatchEvent(outbound),true);assert.equal(element.events.at(-1),outbound);
  element.addEventListener('click',()=>{throw new Error('fixture error');});assert.throws(()=>element.click(),/fixture error/);
});
