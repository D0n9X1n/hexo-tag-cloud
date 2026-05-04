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
  // `hexo` is the global injected by hexo at runtime when this plugin is
  // loaded. It's an undeclared global from a strict eslint perspective —
  // declare it readonly so plugin source files don't trip `no-undef`.
  'globals': {
    'hexo': 'readonly',
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
    'tests/e2e/playwright-report/',
    'tests/e2e/test-results/',
    'feature-crew/',
  ],
  'overrides': [
    {
      // TEMPORARY (sub-project A): the current index.js pre-dates our lint
      // config; it has a dead `var Hexo = require("hexo")` import and an
      // unused `post` callback arg. We don't edit index.js in A (no
      // behavior change is the spec contract). Sub-project B's refactor
      // removes the dead code AND deletes this override; B's
      // tests/server/lint-config.test.js asserts the override is gone.
      'files': ['index.js'],
      'rules': {
        'no-unused-vars': ['error', {
          'args': 'none',
          'varsIgnorePattern': '^Hexo$',
        }],
      },
    },
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
