// Keep the native temperature text and actions; only separate its unit visually.
// Bubble can replace the label after an asynchronous Jinja response.
const temperatureLabel = layout === 'room' ? root.querySelector('.room-temperature .bubble-sub-button-name-container') : null;
let roomWatch = this._dpRoomTemperatureWatch;
if (roomWatch && (roomWatch.el !== temperatureLabel || roomWatch.root !== root)) {
  roomWatch.observer.disconnect();
  roomWatch.restore();
  delete this._dpRoomTemperatureWatch;
  roomWatch = null;
}
if (temperatureLabel) {
  if (!roomWatch) {
    const update = () => {
      const text = temperatureLabel.textContent;
      const match = text.match(/^(\s*[+\-−]?\d+(?:[.,]\d+)?)(\s*(?:°[CF]|K)\s*)$/);
      if (!match) { attr('data-dp-room-temperature-text','yes'); return; }
      root.removeAttribute('data-dp-room-temperature-text');
      const value = temperatureLabel.querySelector('.dp-room-value');
      const unit = temperatureLabel.querySelector('.dp-room-unit');
      if (value?.textContent === match[1] && unit?.textContent === match[2]) return;
      const v = document.createElement('span'); v.className = 'dp-room-value'; v.textContent = match[1];
      const u = document.createElement('span'); u.className = 'dp-room-unit'; u.textContent = match[2];
      temperatureLabel.replaceChildren(v,u);
    };
    const restore = () => {
      if (temperatureLabel.querySelector('.dp-room-value')) temperatureLabel.textContent = temperatureLabel.textContent;
      root.removeAttribute('data-dp-room-temperature-text');
    };
    const observer = new MutationObserver(update);
    observer.observe(temperatureLabel,{childList:true,characterData:true,subtree:true});
    roomWatch = this._dpRoomTemperatureWatch = {el:temperatureLabel,root,observer,update,restore};
  }
  roomWatch.update();
}
