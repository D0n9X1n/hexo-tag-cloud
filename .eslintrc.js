module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es6': true,
    'node': true,
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 2020,
  },
  // `lib/tagcanvas.js` is a vendored third-party file; we never lint it.
  // Generated dirs (coverage/, fixture node_modules/public, e2e reports)
  // are similarly out of scope.
  'ignorePatterns': [
    'demo/',
    'lib/tagcanvas.js',
    'coverage/',
    'tests/fixtures/hexo-site/node_modules/',
    'tests/fixtures/hexo-site/public/',
    'tests/server/__snapshots__/',
    'tests/e2e/playwright-report/',
    'tests/e2e/test-results/',
  ],
  'overrides': [
    {
      'files': ['build/**/*.js', 'tests/**/*.js'],
      'env': {
        'browser': false,
        'commonjs': true,
        'es6': true,
        'node': true,
      },
    },
  ],
};
