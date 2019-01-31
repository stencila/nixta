import fs from 'fs'
import os from 'os'
import path from 'path'
import stream from 'stream'

import chalk from 'chalk'
import del from 'del'
import glob from 'glob'
import mkdirp from 'mkdirp'
import * as pty from 'node-pty'
import tmp from 'tmp'
import yaml from 'js-yaml'

import {home} from './boot'
import spawn from './spawn'
import * as nix from './nix'

export enum Platform {
  UNIX, WIN, DOCKER
}

/**
 * Parameters of a user session inside an environment
 */
export class SessionParameters {
  /**
   * The platform to run the session within
   */
  platform?: Platform

  /**
   * An initial command to execute in the shell e.g. R or python
   */
  command: string = ''

  /**
   * Should the shell be 'pure'? Only
   */
  pure: boolean = true

  /**
   * Standard input stream
   */
  stdin: stream.Readable = process.stdin

  /**
   * Standard output stream
   */
  stdout: stream.Writable = process.stdout
}

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
   * Path to the environment specification files
   */
  path (): string {
    return path.join(home, 'envs', this.name + '.yaml')
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

    mkdirp.sync(path.join(home, 'envs'))
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
    const names = glob.sync('*.yaml', { cwd: path.join(home, 'envs') }).map(file => file.slice(0, -5))
    const envs = []
    for (let name of names) {
      const env = new Environment(name)
      envs.push(Object.assign({}, env, {
        path: env.path(),
        built: await env.built(),
        location: await nix.location(name)
      }))
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
   *
   * @param docker Also build a Docker container for the environment?
   */
  async build (store?: string, docker: boolean = false): Promise<Environment> {
    await nix.install(this.name, this.pkgs(), true, store)

    if (docker) {
      // TODO: complete implementation of this, using these files...
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

    return this.write()
  }

  /**
   * Has this environment been built?
   */
  async built (): Promise<boolean> {
    try {
      await nix.location(this.name)
      return true
    } catch {
      return false
    }
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
   * Create variables for an environment.
   *
   * This method is used in several other metho
   * e.g. `within`, `enter`
   *
   * A 'pure' environment will only have available the executables that
   * were exlicitly installed into the environment
   *
   * @param pure Should the shell that this command is executed in be 'pure'?
   */
  async vars (pure: boolean = false): Promise<{[key: string]: string}> {
    const location = await nix.location(this.name)

    let PATH = `${location}/bin:${location}/sbin`
    if (!pure) PATH += ':' + process.env.PATH

    const R_LIBS_SITE = `${location}/library`

    return {
      PATH,
      R_LIBS_SITE
    }
  }

  /**
   * Execute a bash command within the environment
   *
   * @param command The command to execute
   * @param pure Should the shell that this command is executed in be 'pure'?
   */
  async within (command: string, pure: boolean = false) {
    if (!this.built()) throw new Error(`Environment "${this.name}" has not be built yet.`)

    // Get the path to bash because it may not be available in
    // the PATH of a pure shell
    let shell = await spawn('which', ['bash'])
    shell = shell.toString().trim()
    await spawn(shell, ['-c', command], {
      stdio: 'inherit',
      env: await this.vars()
    })
  }

  /**
   * Enter the a shell within the environment
   *
   * @param sessionParameters Parameters of the session
   */
  async enter (sessionParameters: SessionParameters) {
    if (!this.built()) throw new Error(`Environment "${this.name}" has not be built yet.`)

    let { command, platform, pure, stdin, stdout } = sessionParameters
    const location = await nix.location(this.name)

    if (platform === undefined) {
      switch (os.platform()) {
        case 'win32':
          platform = Platform.WIN
          break
        default:
          platform = Platform.UNIX
      }
    }

    let shellName
    let shellArgs: Array<string> = []

    switch (platform) {
      case Platform.WIN:
        shellName = 'powershell.exe'
        break
      case Platform.DOCKER:
        shellName = 'docker'
        shellArgs = [
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
        ].concat(
          // Command to execute in the container
          command ? command.split(' ') : 'sh'
        )
        break
      default:
        shellName = 'bash'
        shellArgs = ['--noprofile']
        break
    }

    // Path to the shell executable. We need to do this
    // because the environment may not actually have any shell
    // in it, in which case, when using `pure` a shell won't be available.
    let shellPath = await spawn('which', [shellName])
    shellPath = shellPath.toString().trim()

    if (platform === Platform.UNIX) {
      // Inject Nixster into the environment as an alias so we can use it
      // there without polluting the environment with additional binaries.
      // During development you'll need to use ---pure=false so that
      // node is available to run Nixster. In production, when a user
      // has installed a binary, this shouldn't be necessary
      let nixsterPath = await spawn('which', ['nixster'])
      const tempRcFile = tmp.fileSync()
      fs.writeFileSync(tempRcFile.name, `alias nixster="${nixsterPath.toString().trim()}"\n`)
      shellArgs.push('--rcfile', tempRcFile.name)
    }

    // Environment variables
    let vars = await this.vars(pure)
    vars = Object.assign(vars, {
      // Let Nixster know which environment we're in.
      NIXSTER_ENV: this.name,
      // Customise the bash prompt so that the user know that they are in
      // a Nixster environment and which one.
      PS1: '☆ ' + chalk.green.bold(this.name) + ':' + chalk.blue('\\w') + '$ '
    })

    // Environment variable for Docker
    // The Docker CLI supports a number of environment variables (https://docs.docker.com/engine/reference/commandline/cli/#environment-variables)
    // In particular, `DOCKER_HOST` is used in deployment to specify the Docker daemon being used.
    // We pass all `DOCKER_` env vars on when Docker is the target platform.
    if (platform === Platform.DOCKER) {
      for (let name of Object.keys(process.env).filter(name => name.startsWith('DOCKER_'))) {
        vars[name] = process.env[name] || ''
      }
    }

    const shellProcess = pty.spawn(shellPath, shellArgs, {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      env: vars
    })
    shellProcess.on('data', data => {
      stdout.write(data)
    })

    // To prevent echoing of input set stdin to raw mode (see https://github.com/Microsoft/node-pty/issues/78)
    // https://nodejs.org/api/tty.html: "When in raw mode, input is always available character-by-character,
    // not including modifiers. Additionally, all special processing of characters
    // by the terminal is disabled, including echoing input characters. Note that CTRL+C
    // will no longer cause a SIGINT when in this mode."
    // @ts-ignore
    if (stdin.setRawMode) stdin.setRawMode(true)

    // Write the result through to the shell process
    // Capture Ctrl+D for special handling:
    //   - if in the top level shell process then exit this process
    //   - otherwise, pass on the process e.g. node, Rrm
    const ctrlD = Buffer.from([4])
    stdin.on('data', data => {
      if (data.equals(ctrlD) && shellProcess.process === shellPath) {
        shellProcess.kill('SIGKILL')
        // @ts-ignore
        if (stdout.isTTY) process.exit()
      }
      shellProcess.write(data)
    })

    if (platform === Platform.UNIX && command) shellProcess.write(command + '\r')
  }
}
