const localeFor = h => h.locale?.language || h.language || globalThis.navigator?.language || 'en';
const formatterFor = (h,options) => {
  const preference = h.locale?.number_format;
  /* @include shared/src/number-locales.js */
  const locale = preference === 'system' ? undefined : locales[preference] ?? localeFor(h);
  return new Intl.NumberFormat(locale,{...options,useGrouping:preference !== 'none'});
};
