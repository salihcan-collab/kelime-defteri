/* The app's own code, loaded outside a browser.

   Whether a word can be found in its sentence is a question only the drills'
   own matcher can answer, so the checks use it rather than a second opinion
   written beside it. readyState 'loading' means the app hangs its boot on
   DOMContentLoaded, which never fires here: its functions are defined and
   nothing runs.                                                             */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const STUB = 'const document={readyState:"loading",addEventListener(){},' +
  'querySelector(){return null},querySelectorAll(){return []},documentElement:{}};' +
  'const window={addEventListener(){},matchMedia(){return{matches:false,addEventListener(){}}}};' +
  'const localStorage={getItem(){return null},setItem(){},removeItem(){}};' +
  'const navigator={language:"en"};const speechSynthesis=null;';

const app = new Function(STUB + read('ai.js') + read('app.js') +
  '; return { findTerm, normalize, isInflectionOf, AI };')();

module.exports = {
  app: app,
  rules: require('./card-rules'),
  deck: () => new Function(read('deck-b1.js') + '; return B1_DECK;')(),
  root: root,
  read: read
};
