/* The app's own code, loaded outside a browser.

   Whether a word can be found in its sentence is a question only the drills'
   own matcher can answer, so the checks use it rather than a second opinion
   written beside it. There is no shell for the app to start into here, so it
   defines its functions and does nothing else.                              */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const STUB = 'const document={readyState:"loading",addEventListener(){},' +
  'getElementById(){return null},querySelector(){return null},' +
  'querySelectorAll(){return []},documentElement:{}};' +
  'const window={addEventListener(){},matchMedia(){return{matches:false,addEventListener(){}}}};' +
  'const localStorage={getItem(){return null},setItem(){},removeItem(){}};' +
  'const navigator={language:"en"};const speechSynthesis=null;';

const app = new Function(STUB + read('data.js') + read('ai.js') + read('app.js') +
  '; return { findTerm, normalize, isInflectionOf, AI, PARTS_OF_SPEECH };')();

module.exports = {
  app: app,
  rules: require('./card-rules'),
  deck: () => new Function(read('deck-b1.js') + '; return B1_DECK;')(),
  root: root,
  read: read
};
