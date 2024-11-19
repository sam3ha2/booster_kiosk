import VguangScanner from './VguangScanner.js';

const scanner = new VguangScanner({ mode: 'tx400' });

let is = true;

scanner.on('data', data => {
  if (is) {
    is = false;
    console.log(data);
    scanner.beep(1);
    setTimeout(() => is = true, 800);
  }
});