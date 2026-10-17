// Native commands retain their handlers; the shared guard handles cached gestures.
const commandStyles = styles.filter(({b,spec}) => spec.type === 'command'
  && (!b.sub_button_type || b.sub_button_type === 'default') && b.show_name === true);
/* @include signature-shared/src/commands.js */
