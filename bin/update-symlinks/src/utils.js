const fs = require('fs');

const isSL = path => fs.existsSync(path) && fs.lstatSync(path).isSymbolicLink();

const isDir = path => fs.existsSync(path) && fs.lstatSync(path).isDirectory();

const ln = (from, to) => {
  if (fs.existsSync(to)) {
    if (!isSL(to)) return;

    fs.unlinkSync(to);
  }

  console.log(`Linking: ${to} -> ${from}`);
  fs.symlinkSync(from, to);
};

module.exports = {
  isDir,
  isSL,
  ln,
};
