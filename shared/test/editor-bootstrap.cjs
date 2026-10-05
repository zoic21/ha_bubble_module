// Register the editor by executing the complete shipped module on an
// unsupported, detached card. This works with minified distributions and
// exercises the actual registration path without relying on comment markers.
function editorBootstrap(definition) {
  return '(function(hass,onTeardown,renderTemplate){return `' + definition.code
    + '`;}).call({config:{card_type:"unsupported"},card:null},{states:{}},()=>{},value=>value);';
}

module.exports = {editorBootstrap};
