const { build } = require('electron-builder');
const path = require('path');

// Define build configuration
build({
  config: {
    appId: 'com.tennis.tournamentboard',
    productName: 'Tennis Tournament Board',
    directories: {
      output: path.resolve(__dirname, 'dist')
    },
    win: {
      target: ['portable', 'nsis'],
      // icon: path.resolve(__dirname, 'assets/icon.ico')
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true
    },
    portable: {
      artifactName: 'TennisTournamentBoard-Portable.exe'
    },
    files: [
      '**/*',
      '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
      '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
      '!**/node_modules/*.d.ts',
      '!**/node_modules/.bin',
      '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
      '!.editorconfig',
      '!**/._*',
      '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
      '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
      '!**/{appveyor.yml,.travis.yml,circle.yml}',
      '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
    ]
  }
}).then(() => {
  console.log('Build completed successfully!');
}).catch((error) => {
  console.error('Build failed:', error);
});
