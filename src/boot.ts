/**
 * Module for installing Nixster native modules
 *
 * The [`pkg`](https://github.com/zeit/pkg) Node.js packager does not
 * package native modules.  i.e `*.node` files. There are various ways to handle this but
 * we found the easiest/safest was to simply copy the directories for the
 * packages with native modules, from the host system, into directory where the
 * binary is installed. This script does that via `node_modules.tar.gz` which is
 * packaged in the binary snapshot as an `asset`.
 *
 * See:
 *   - https://github.com/zeit/pkg/issues/329
 *   - https://github.com/JoshuaWise/better-sqlite3/issues/173
 *   - `package.json`
 */
import fs from 'fs'
import path from 'path'

import tar from 'tar'
import mkdirp from 'mkdirp'

if (
  (process.mainModule && process.mainModule.id.endsWith('.exe') || process.hasOwnProperty('pkg')) &&
  fs.existsSync(path.join('/', 'snapshot'))
) {
  const modules = path.join(path.dirname(process.execPath), 'node_modules')
  if (!fs.existsSync(modules)) {
    mkdirp.sync(modules)
    tar.x({
      sync: true,
      file: path.join('/', 'snapshot', 'nixster', 'node_modules.tar.gz'),
      strip: 1,
      C: modules
    })
  }
}
