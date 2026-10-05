const {Element:BaseElement,createDocument,fixtureEvent,CustomEvent}=require('../../shared/test/dom.cjs');

// Numeric command tests await service handlers; other fixtures use sync clicks.
class Element extends BaseElement {
  async click() {
    const event=fixtureEvent('click',this);
    for(const listener of [...(this.listeners.get('click') || [])]) await listener.call(this,event);
    return event;
  }
}
module.exports={
  Element,document:createDocument(Element),CustomEvent,
  MutationObserver:class {observe(){}disconnect(){this.disconnected=true;}},
  CSS:{supports:()=>true},navigator:{language:'en-US'}
};
