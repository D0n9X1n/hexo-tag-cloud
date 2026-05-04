#!/usr/bin/env node
'use strict';

/* c8 ignore start */
require('../lib/installer/cli').runCli({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
}).then(function (code) { process.exit(code); }).catch(function (err) {
  process.stderr.write('hexo-tag-cloud: unexpected error: ' + err.stack + '\n');
  process.exit(1);
});
/* c8 ignore stop */
