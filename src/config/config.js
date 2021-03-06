const basePath = window.location.origin +
  window.location.pathname.match(/^\/[\w-]*\/?/)[0];
const buildPath = window.location.origin +
  window.location.pathname.match(/^(\/[\w-]*)*\/\/?/)[0];
const shogun2Path = basePath + 'rest/projectapps/';
const shogunBootPath = basePath + 'applications/';
let staticPath = basePath + 'resources/appContext.json';
let localePath =  basePath + 'resources/i18n/{{lng}}.json';
const appMode = typeof(APP_MODE) != 'undefined' ? APP_MODE : '';
const nodeEnv = typeof(process.env.NODE_ENV) != 'undefined' ? process.env.NODE_ENV : undefined;

if (nodeEnv && nodeEnv.indexOf('production') > -1) {
  localePath = buildPath + 'resources/i18n/{{lng}}.json';
}

let appContextPath;
let layerPath;
if (appMode.indexOf('shogun2') > -1) {
  appContextPath = shogun2Path;
  layerPath = basePath + 'rest/layers';
}
if (appMode.indexOf('static') > -1) {
  appContextPath = staticPath;
}
if (appMode.indexOf('boot') > -1) {
  appContextPath = shogunBootPath;
  layerPath = basePath + 'layers';
}

export default {
  appContextPath,
  layerPath,
  locale: localePath,
  getBasePath: function (){
    return basePath;
  },
  printAction: `${basePath}print/print`,
  printCreateUrlAction: `${basePath}print/createUrl.action`,
  printUrlAction: `${basePath}print/doPrint.action`,
  printGetResultAction: `${basePath}print/getPrintResult.action`
};
