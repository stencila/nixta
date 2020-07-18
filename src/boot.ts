/**
 * Module for installing Nixta native modules
 *
 * The [`pkg`](https://github.com/zeit/pkg) Node.js packager does not
 * package native modules.  i.e `*.node` files. There are various ways to handle this but
 * we found the easiest/safest was to simply copy the directories for the
 * packages with native modules, from the host system, into directory where the
 * binary is installed. This script does that via `nixta.tar.gz` which is
 * packaged in the binary snapshot as an `asset`.
 *
 * See:
 *   - https://github.com/zeit/pkg/issues/329
 *   - https://github.com/JoshuaWise/better-sqlite3/issues/173
 *   - `package.json`
 */
import path from 'path'

import fs from 'fs-extra'
import tar from 'tar'

export const packaged =
  process.hasOwnProperty('pkg') && fs.existsSync(path.join('/', 'snapshot'))

export const home = packaged
  ? path.dirname(process.execPath)
  : path.dirname(__dirname)

if (packaged && !fs.existsSync(path.join(home, 'node_modules'))) {
  tar.x({
    sync: true,
    file: path.join('/', 'snapshot', 'nixta', 'nixta-deps.tgz'),
    C: home
  })
}
