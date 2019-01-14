import fs from 'fs'
import path from 'path'

// @ts-ignore
import spawn from 'await-spawn'
import del from 'del'
import glob from 'glob'
import mkdirp from 'mkdirp'
import yaml from 'js-yaml'

import * as nix from './nix'

// The home directory for environments
let home = path.join(path.dirname(__dirname), 'envs')

/**
 * A computational environment
 */
export default class Environment {

  /**
   * The JSON-LD context that the environment specification
   * should be interpreted within. Allows for versioning of env specs.
   */
  readonly '@context': string = 'https://stenci.la/schema/v1/'

  /**
   * The type of object.
   */
  readonly type: string = 'Environment'

  /**
   * Name of the environment
   */
  name: string

  /**
   * Description of the environment
   */
  description?: string

  /**
   * Names of other environments that this one extends
   */
  extends?: Array<string>

  /**
   * Packages that this environment adds
   */
  adds?: Array<string>

  /**
   * Packages that this environment removes
   */
  removes?: Array<string>

  /**
   * Environment variables
   */
  variables?: { [key: string]: string }

  constructor (name: string, read: boolean = true) {
    if (!name) throw new Error('Environment name not provided.')
    this.name = name
    if (read) this.read()
  }

  /**
   * Get or set the ome directory for environments
   *
   * @param value Value for home directory
   */
  static home (value?: string): string {
    if (value) home = value
    return home
  }

  /**
   * Path to the environment specification files
   */
  path (): string {
    return path.join(Environment.home(), this.name) + '.yaml'
  }

  /**
   * Read this environment from file
   */
  read (): Environment {
    const yml = fs.readFileSync(this.path(), 'utf8')
    const obj = yaml.safeLoad(yml)
    Object.assign(this, obj)
    return this
  }

  /**
   * Write this environment to file
   */
  write (): Environment {
    if (this.adds && this.adds.length === 0) this.adds = undefined
    if (this.removes && this.removes.length === 0) this.removes = undefined

    mkdirp.sync(Environment.home())
    const yml = yaml.safeDump(this, { skipInvalid: true })
    fs.writeFileSync(this.path(), yml)
    return this
  }

  /**
   * Create an environment
   *
   * @param name Name of the environment
   * @param options Optional attributes for the environment e.g. `packages`, `meta`
   * @param force If the environment already exists should it be overitten?
   */
  static async create (name: string, options: {[key: string]: any} = {}, force: boolean = false): Promise<Environment> {
    const env = new Environment(name, false)

    if (!force) {
      if (fs.existsSync(env.path())) throw new Error(`Environment "${name}" already exists, use the 'force' option to overwrite it.`)
    }

    env.extends = options.extends
    env.adds = options.adds
    env.removes = options.removes
    env.variables = options.variables
    return env.build()
  }

  /**
   * Delete an environment
   *
   * @param name Name of the environment
   */
  static delete (name: string) {
    // Delete the environment's files/folders
    const path = new Environment(name, false).path()
    if (!fs.existsSync(path)) throw new Error(`Environment "${name}" does not exist.`)
    del.sync(path, { force: true })
  }

  /**
   * List the environments on this machine
   */
  static async envs (): Promise<Array<any>> {
    const names = glob.sync('*.yaml', { cwd: Environment.home() }).map(file => file.slice(0, -5))
    const envs = []
    for (let name of names) {
      const env = new Environment(name)
      envs.push({
        name,
        description: env.description,
        path: env.path(),
        location: await nix.location(name)
      })
    }
    return envs
  }

  /**
   * Show a description of this environment
   *
   * @param long Should a long description be provided?
   */
  async show (long: boolean = false): Promise<any> {
    this.read()

    const desc: any = Object.assign({}, this, {
      path: this.path(),
      location: await nix.location(this.name),
      packages: await nix.packages(this.name)
    })

    if (long) {
      desc.requisites = await nix.requisites(this.name)
    }

    return desc
  }

  /**
   * List the packages installed in the environment
   */
  pkgs (): Array<string> {
    let pkgs: Array<string> = []
    if (this.extends) {
      for (let env of this.extends) {
        let base: Environment
        try {
          base = new Environment(env)
          pkgs = pkgs.concat(base.pkgs())
        } catch (err) {
          if (err.code === 'ENOENT') {
            throw new Error(`Unable to find base environment "${env}" at "${err.path}"`)
          }
        }
      }
    }
    if (this.adds) {
      pkgs = pkgs.concat(this.adds)
    }
    if (this.removes) {
      for (let pkg of this.removes) {
        let index = pkgs.indexOf(pkg)
        if (index > -1) {
          pkgs.slice(index, 1)
        }
      }
    }
    return pkgs
  }

  /**
   * Add packages to the environment
   *
   * @param pkgs The names of the package to add
   */
  async add (pkgs: Array<string>): Promise<Environment> {
    if (this.removes) {
      for (let index = 0; index < pkgs.length; index++) {
        let pkg = pkgs[index]
        let removesIndex = this.removes.indexOf(pkg)
        if (removesIndex > -1) {
          this.removes.splice(removesIndex, 1)
          pkgs.splice(index, 1)
        }
      }
    }

    if (!this.adds) {
      this.adds = pkgs
    } else {
      for (let pkg of pkgs) {
        if (this.adds.indexOf(pkg) < 0) {
          this.adds.push(pkg)
        }
      }
    }

    return this.build()
  }

  /**
   * Remove packages from the environment
   *
   * @param pkg The names of the package to remove
   */
  async remove (pkgs: Array<string>): Promise<Environment> {
    if (this.adds) {
      for (let index = 0; index < pkgs.length; index++) {
        let pkg = pkgs[index]
        let addsIndex = this.adds.indexOf(pkg)
        if (addsIndex > -1) {
          this.adds.splice(addsIndex, 1)
          pkgs.splice(index, 1)
        }
      }
    }

    if (this.extends) {
      if (!this.removes) {
        this.removes = pkgs
      } else {
        for (let pkg of pkgs) {
          if (this.removes.indexOf(pkg) < 0) {
            this.removes.push(pkg)
          }
        }
      }
    }

    return this.build()
  }

  /**
   * Build this environment
   */
  async build (): Promise<Environment> {
    await nix.install(this.name, this.pkgs(), true)
    return this.write()
  }

  /**
   * Upgrade all packages in the environment
   *
   * @param pkgs A list of packages to upgrade
   */
  async upgrade (pkgs: Array<string>): Promise<Environment> {
    await nix.upgrade(this.name, pkgs)
    return this.write()
  }

  /**
   * Execute a bash command within the environment
   *
   * A 'pure' shell will only hav available the executables that
   * were exlicitly installed into the environment
   *
   * @param command The command to execute
   * @param pure Should the shell that this command is executed in be 'pure'?
   */
  async within (command: string, pure: boolean = false) {
    const location = await nix.location(this.name)
    let path = `${location}/bin:${location}/sbin`
    if (!pure) path += ':' + process.env.PATH
    // Get the path to bash because it may not be available in the PATH of
    // a pure shell
    let bash = await spawn('which', ['bash'])
    await spawn(bash.toString().trim(), ['-c', command], {
      stdio: 'inherit',
      env: {
        PATH: path,
        R_LIBS_SITE: `${location}/library`
      }
    })
  }

  /**
   * Run a Docker container for this environment
   */
  async dockerRun () {
    const location = await nix.location(this.name)
    await spawn('docker', [
      'run', '--interactive', '--tty', '--rm',
      // Prepend the environment path to the PATH variable
      '--env', `PATH=${location}/bin:${location}/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
      // We also need to tell R where to find libraries
      '--env', `R_LIBS_SITE=${location}/library`,
      // Read-only bind mount of the Nix store
      '--volume', '/nix/store:/nix/store:ro',
      // We use Alpine Linux as a base image because it is very small but has some basic
      // shell utilities (lkike ls and uname) that are good for debugging but also sometimes
      // required for things like R
      'alpine'
    ], {
      stdio: 'inherit'
    })
  }

  /**
   * Build a Docker container for this environment
   */
  async dockerBuild () {
    const requisites = await nix.requisites(this.name)
    const dockerignore = `*\n${requisites.map(req => '!' + req).join('\n')}`
    console.log(dockerignore)

    // The Dockerfile does essentially the same as the `docker run` command
    // generated above in `dockerRun`...
    const location = await nix.location(this.name)
    const dockerfile = `
FROM alpine
ENV PATH ${location}/bin:${location}/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV R_LIBS_SITE=${location}/library
COPY /nix/store /nix/store
    `
    console.log(dockerfile)
  }

}
