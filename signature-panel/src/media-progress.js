if (mediaLayout === 'aligned' && configured.media_progress === true) {
  const duration = mediaAttributes?.media_duration;
  const position = mediaAttributes?.media_position;
  const frame = hasMedia && Number.isFinite(duration) && duration > 0
    && Number.isFinite(position) && position >= 0 && root.querySelector('.bubble-container');

  if (frame) {
    if (!runtime.mediaProgress) {
      const node = document.createElement('div');
      const elapsed = document.createElement('span');
      const track = document.createElement('div');
      const total = document.createElement('span');
      node.className = 'dp-media-progress';
      node.setAttribute('role','progressbar');
      node.setAttribute('aria-label','Progression de la lecture');
      node.setAttribute('aria-valuemin','0');
      track.className = 'dp-media-progress-track';
      node.append(elapsed,track,total);

      const format = seconds => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds / 60) % 60;
        const tail = String(seconds % 60).padStart(2,'0');
        return hours ? hours + ':' + String(minutes).padStart(2,'0') + ':' + tail : minutes + ':' + tail;
      };
      let timer, start, length, updatedAt;
      const stop = () => {
        clearInterval(timer);
        timer = undefined;
      };
      const paint = () => {
        const ticking = Number.isFinite(updatedAt);
        const seconds = Math.min(length,start + (ticking ? Math.max(0,Date.now() - updatedAt) / 1000 : 0));
        const current = Math.floor(seconds), end = Math.floor(length);
        if (node.getAttribute('aria-valuenow') !== String(current)
          || node.getAttribute('aria-valuemax') !== String(end)) {
          elapsed.textContent = format(current);
          total.textContent = format(end);
          node.setAttribute('aria-valuenow',current);
          node.setAttribute('aria-valuemax',end);
          node.setAttribute('aria-valuetext',elapsed.textContent + ' / ' + total.textContent);
          track.style.setProperty('--dp-media-played',(current / Math.max(1,end) * 100) + '%');
        }
        if (ticking && seconds < length && node.isConnected) timer ??= setInterval(paint,1000);
        else stop();
      };
      const remove = () => {
        stop();
        node.remove();
      };
      const dispose = runtime.dispose;
      runtime.dispose = () => {
        remove();
        dispose();
      };
      runtime.mediaProgress = {
        remove,
        update(parent,position,duration,timestamp) {
          if (node.parentElement !== parent) parent.append(node);
          start = position;
          length = duration;
          updatedAt = timestamp;
          paint();
        }
      };
    }
    const timestamp = mediaEntity.state === 'playing' ? Date.parse(mediaAttributes.media_position_updated_at) : NaN;
    runtime.mediaProgress.update(frame,position,duration,timestamp);
  } else runtime.mediaProgress?.remove();
} else runtime.mediaProgress?.remove();
