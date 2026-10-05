const localeFor = h => h.locale?.language || h.language || globalThis.navigator?.language || 'en';
const numberLocaleFor = h => {
  const preference = h.locale?.number_format;
  /* @include shared/src/number-locales.js */
  return preference === 'system' ? undefined : locales[preference] ?? localeFor(h);
};
const formatterFor = (h,options) => new Intl.NumberFormat(numberLocaleFor(h),
  {...options,useGrouping:h.locale?.number_format !== 'none'});
