//@ts-check

/** @type{import('vscode-framework/build/config').UserConfig} */
const config = {
  prependIds: false,
  target: {web: true,desktop: true},
  // maybe future refactorings will change this
  consoleStatements: false
};

module.exports = config;
