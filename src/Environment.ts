import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import stream from 'stream'

import chalk from 'chalk'
import glob from 'globby'
import * as pty from 'node-pty'
import tmp from 'tmp'
import yaml from 'js-yaml'

import { home } from './boot'
import spawn from './spawn'
import * as nix from './nix'

export enum Platform {
  UNIX,
  WIN,
  DOCKER,
}

export enum ContainerStatus {
  RUNNING,
  STOPPED,
}

const DOCKER_DEFAULT_COMMAND = 'sh'
const DOCKER_CONTAINER_ID_SHORT_LENGTH = 12

interface ContainerMount {
  /**
   * The path inside the container
   */
  destination: string

  /**
   * The path on the host
   */
  source: string

  /**
   * Mount options (e.g. rw/ro)
   */
  options: Array<string>
}

/**
 * Convert a ContainerMount to a --volume argument that can be passed to docker
 * @param containerMount
 */
function containerMountToVolumeArg(
  containerMount: ContainerMount
): Array<string> {
  const options = containerMount.options.join(',')

  return [
    '--volume',
    `${containerMount.source}:${containerMount.destination}:${options}`,
  ]
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
  command = ''

  /**
   * Should the shell be 'pure'? Only
   */
  pure = true

  /**
   * Standard input stream
   */
  stdin: stream.Readable = process.stdin

  /**
   * Standard output stream
   */
  stdout: stream.Writable = process.stdout

  /**
   * CPU shares (only applies when using Docker platform). Priority of the container relative to other processes.
   * The default is 1024, a higher number means higher priority for execution (when CPU contention exists).
   */
  cpuShares = 1024

  /**
   * Memory limit (only applies when using Docker platform). Maximum amount of memory a container can use.
   * Should be set in the format <number>[<unit>]). Number is a positive integer. Unit can be one of b, k, m, or g.
   * Minimum is 4M.
   */
  memoryLimit = '0'

  /**
   * The ID of the container to attempt to use for an execution. It may be an empty string in which case the executor
   * will start a new container.
   */
  containerId = ''

  /**
   * Volumes to mount inside a container
   */
  mounts: Array<ContainerMount> = []
}

let ENVIRONS_HOME = path.join(home, 'envs')

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

  constructor(name: string, read = true) {
    if (!name) throw new Error('Environment name not provided.')
    this.name = name
    if (read) this.read()
  }

  /**
   * Get or set the ome directory for environments
   *
   * @param value Value for home directory
   */
  static home(value?: string): string {
    if (value) ENVIRONS_HOME = value
    return ENVIRONS_HOME
  }

  /**
   * Path to the environment specification files
   */
  path(): string {
    return path.join(Environment.home(), this.name + '.yaml')
  }

  /**
   * Read this environment from file
   */
  read(): Environment {
    const yml = fs.readFileSync(this.path(), 'utf8')
    const obj = yaml.safeLoad(yml)
    Object.assign(this, obj)
    return this
  }

  /**
   * Write this environment to file
   */
  write(): Environment {
    if (this.adds && this.adds.length === 0) this.adds = undefined
    if (this.removes && this.removes.length === 0) this.removes = undefined

    fs.ensureDirSync(Environment.home())
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
  static async create(
    name: string,
    options: { [key: string]: any } = {},
    force = false
  ): Promise<Environment> {
    const env = new Environment(name, false)

    if (!force) {
      if (fs.existsSync(env.path()))
        throw new Error(
          `Environment "${name}" already exists, use the 'force' option to overwrite it.`
        )
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
  static delete(name: string) {
    // Delete the environment's files/folders
    const path = new Environment(name, false).path()
    if (!fs.existsSync(path))
      throw new Error(`Environment "${name}" does not exist.`)
    fs.removeSync(path)
  }

  /**
   * List the environments on this machine
   */
  static async envs(): Promise<Array<any>> {
    const names = glob
      .sync('*.yaml', { cwd: Environment.home() })
      .map((file) => file.slice(0, -5))
    const envs = []
    for (const name of names) {
      const env = new Environment(name)
      const built = await env.built()
      envs.push(
        Object.assign({}, env, {
          path: env.path(),
          built: built,
          location: built ? nix.location(name) : '-',
        })
      )
    }
    return envs
  }

  /**
   * Show a description of this environment
   *
   * @param long Should a long description be provided?
   */
  async show(long = false): Promise<any> {
    this.read()

    const desc: any = Object.assign({}, this, {
      path: this.path(),
      location: nix.location(this.name),
      packages: await nix.packages(this.name),
    })

    if (long) {
      desc.requisites = await nix.requisites(this.name)
    }

    return desc
  }

  /**
   * List the packages installed in the environment
   */
  pkgs(): Array<string> {
    let pkgs: Array<string> = []
    if (this.extends) {
      for (const env of this.extends) {
        let base: Environment
        try {
          base = new Environment(env)
          pkgs = pkgs.concat(base.pkgs())
        } catch (err) {
          if (err.code === 'ENOENT') {
            throw new Error(
              `Unable to find base environment "${env}" at "${err.path}"`
            )
          }
        }
      }
    }
    if (this.adds) {
      pkgs = pkgs.concat(this.adds)
    }
    if (this.removes) {
      for (const pkg of this.removes) {
        const index = pkgs.indexOf(pkg)
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
  async add(pkgs: Array<string>): Promise<Environment> {
    if (this.removes) {
      for (let index = 0; index < pkgs.length; index++) {
        const pkg = pkgs[index]
        const removesIndex = this.removes.indexOf(pkg)
        if (removesIndex > -1) {
          this.removes.splice(removesIndex, 1)
          pkgs.splice(index, 1)
        }
      }
    }

    if (!this.adds) {
      this.adds = pkgs
    } else {
      for (const pkg of pkgs) {
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
  async remove(pkgs: Array<string>): Promise<Environment> {
    if (this.adds) {
      for (let index = 0; index < pkgs.length; index++) {
        const pkg = pkgs[index]
        const addsIndex = this.adds.indexOf(pkg)
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
        for (const pkg of pkgs) {
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
  async build(store?: string, docker = false): Promise<Environment> {
    await nix.install(this.name, this.pkgs(), true, store)

    if (docker) {
      // TODO: complete implementation of this, using these files...
      const requisites = await nix.requisites(this.name)
      const dockerignore = `*\n${requisites.map((req) => '!' + req).join('\n')}`
      console.log(dockerignore)

      // The Dockerfile does essentially the same as the `docker run` command
      // generated above in `dockerRun`...
      const location = nix.location(this.name)
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
  async built(): Promise<boolean> {
    try {
      nix.location(this.name)
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
  async upgrade(pkgs: Array<string>): Promise<Environment> {
    await nix.upgrade(this.name, pkgs)
    return this.write()
  }

  /**
   * Create variables for an environment.
   *
   * This method is used in several other methods
   * e.g. `within`, `enter`
   *
   * A 'pure' environment will only have available the executables that
   * were explicitly installed into the environment
   *
   * @param pure Should the shell that this command is executed in be 'pure'?
   */
  async vars(pure = false): Promise<{ [key: string]: string }> {
    const location = nix.location(this.name)

    let PATH = `${location}/bin:${location}/sbin`
    if (!pure) PATH += ':' + process.env.PATH

    const R_LIBS_SITE = `${location}/library`

    return {
      PATH,
      R_LIBS_SITE,
    }
  }

  /**
   * Execute a bash command within the environment
   *
   * @param command The command to execute
   * @param pure Should the shell that this command is executed in be 'pure'?
   */
  async within(command: string, pure = false) {
    if (!this.built())
      throw new Error(`Environment "${this.name}" has not be built yet.`)

    // Get the path to bash because it may not be available in
    // the PATH of a pure shell
    let shell = await spawn('which', ['bash'])
    shell = shell.toString().trim()
    await spawn(shell, ['-c', command], {
      stdio: 'inherit',
      env: await this.vars(),
    })
  }

  /**
   * Get an array suitable for passing to `spawn` to execute a docker command with environment variables for nixta
   *
   * @param sessionParameters SessionParameters that define the container to exec inside and the command to run
   * @param daemonize Should the Docker command be run with the '-d' flag?
   */
  private getDockerExecCommand(
    sessionParameters: SessionParameters,
    daemonize: boolean
  ): Array<string> {
    const nixLocation = nix.location(this.name)
    const shellArgs = [
      'exec',
      '--tty',
      // Prepend the environment path to the PATH variable
      '--env',
      `PATH=${nixLocation}/bin:${nixLocation}/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
      sessionParameters.containerId,
      sessionParameters.command,
    ]

    if (daemonize) shellArgs.splice(1, 0, '-d')

    return shellArgs
  }

  /**
   * Get an array suitable for passing to `spawn` to execute a docker command with default args for nixta
   *
   * @param sessionParameters SessionParameters to use for limiting Docker's resource usage
   * @param daemonize Should the Docker command be run with the '-d' flag?
   */
  private getDockerRunCommand(
    sessionParameters: SessionParameters,
    daemonize = false
  ): Array<string> {
    const { command, cpuShares, memoryLimit } = sessionParameters
    const nixLocation = nix.location(this.name)
    let shellArgs = [
      'run',
      '--interactive',
      '--tty',
      '--rm',
      // Prepend the environment path to the PATH variable
      '--env',
      `PATH=${nixLocation}/bin:${nixLocation}/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
      // We also need to tell R where to find libraries
      '--env',
      `R_LIBS_SITE=${nixLocation}/library`,
      // Read-only bind mount of the Nix store
      '--volume',
      '/nix/store:/nix/store:ro',
      // Apply CPU shares
      `--cpu-shares=${cpuShares}`,
      // Apply memory limit
      `--memory=${memoryLimit}`,
    ]

    sessionParameters.mounts.map((mount: ContainerMount) => {
      const volumeArgs = containerMountToVolumeArg(mount)
      shellArgs = shellArgs.concat(volumeArgs)
    })

    if (daemonize) shellArgs.splice(1, 0, '-d')

    // We use Alpine Linux as a base image because it is very small but has some basic
    // shell utilities (lkike ls and uname) that are good for debugging but also sometimes
    // required for things like R
    shellArgs.push('alpine')

    return shellArgs.concat(
      // Command to execute in the container
      command ? command.split(' ') : DOCKER_DEFAULT_COMMAND
    )
  }

  /**
   * Enter the a shell within the environment
   *
   * @param sessionParameters Parameters of the session
   */
  async enter(sessionParameters: SessionParameters) {
    if (!this.built())
      throw new Error(`Environment "${this.name}" has not be built yet.`)

    let { command, platform, pure, stdin, stdout } = sessionParameters

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
        shellArgs = this.getDockerRunCommand(sessionParameters, false)
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
      // Inject Nixta into the environment as an alias so we can use it
      // there without polluting the environment with additional binaries.
      // During development you'll need to use ---pure=false so that
      // node is available to run Nixta. In production, when a user
      // has installed a binary, this shouldn't be necessary
      let nixtaPath
      try {
        nixtaPath = await spawn('which', ['nixta'])
      } catch (error) {
        // Nixta not on path
      }
      if (nixtaPath) {
        const tempRcFile = tmp.fileSync()
        fs.writeFileSync(
          tempRcFile.name,
          `alias nixta="${nixtaPath.toString().trim()}"\n`
        )
        shellArgs.push('--rcfile', tempRcFile.name)
      }
    }

    // Environment variables
    let vars = await this.vars(pure)
    vars = Object.assign(vars, {
      // Let Nixta know which environment we're in.
      NIXTA_ENV: this.name,
      // Customise the bash prompt so that the user know that they are in
      // a Nixta environment and which one.
      PS1: '☆ ' + chalk.green.bold(this.name) + ':' + chalk.blue('\\w') + '$ ',
    })

    // Environment variable for Docker
    // The Docker CLI supports a number of environment variables (https://docs.docker.com/engine/reference/commandline/cli/#environment-variables)
    // In particular, `DOCKER_HOST` is used in deployment to specify the Docker daemon being used.
    // We pass all `DOCKER_` env vars on when Docker is the target platform.
    if (platform === Platform.DOCKER) {
      for (const name of Object.keys(process.env).filter((name) =>
        name.startsWith('DOCKER_')
      )) {
        vars[name] = process.env[name] || ''
      }
    }

    const shellProcess = this.runInShell(
      shellPath,
      shellArgs,
      vars,
      stdout,
      stdin
    )

    if (platform === Platform.UNIX && command)
      shellProcess.write(command + '\r')
  }

  /**
   * Spawn a new shell with the default setup for nixta, attaching stdout and stdin
   *
   * @param shellPath The command to run
   * @param shellArgs Arguments to pass to the command in `shellpath`
   * @param environmentVariables Environment variables to set in the shell
   * @param stdout Stream
   * @param stdin Stream
   */
  private runInShell(
    shellPath: string,
    shellArgs: Array<string>,
    environmentVariables: { [key: string]: string },
    stdout: stream.Writable,
    stdin: stream.Readable
  ) {
    const shellProcess = pty.spawn(shellPath, shellArgs, {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      env: environmentVariables,
    })
    shellProcess.on('data', (data) => {
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
    stdin.on('data', (data) => {
      if (data.equals(ctrlD) && shellProcess.process === shellPath) {
        shellProcess.kill('SIGKILL')
        // @ts-ignore
        if (stdout.isTTY) process.exit()
      }
      shellProcess.write(data)
    })
    return shellProcess
  }

  /**
   * Attach to a running container.
   *
   * @param sessionParameters The stdout and stdin attributes from here are used to connect to the shell
   */
  async attach(sessionParameters: SessionParameters) {
    if (sessionParameters.platform !== Platform.DOCKER) {
      throw new Error('Attach is only valid for docker')
    }

    if (!this.containerIsRunning(sessionParameters.containerId)) {
      throw new Error(
        `Container ${sessionParameters.containerId} is not running.`
      )
    }
    this.runInShell(
      'docker',
      ['attach', sessionParameters.containerId],
      {},
      sessionParameters.stdout,
      sessionParameters.stdin
    )
  }

  /**
   * Determine if a Docker container is running using 'docker ps'
   *
   * @param containerId The ID of the container, must be truncated version (12 alphanumeric characters).
   */
  async containerIsRunning(containerId: string): Promise<boolean> {
    const containerRegex = new RegExp(/^[^_\W]{12}$/)
    if (containerRegex.exec(containerId) === null) {
      throw new Error(`'${containerId}' is not a valid docker container ID.`)
    }

    // List running containers that match the containerId we are looking for. There should be only one or zero.
    const dockerPsProcess = await spawn('docker', [
      'ps',
      '-q',
      '--filter',
      `id=${containerId}`,
    ])
    const foundContainerId = dockerPsProcess.toString().trim()
    return foundContainerId === containerId // foundContainerId should be either containerId or an empty string
  }

  /**
   * Start a new Docker container and execute a command within it. The container daemonizes and keeps running
   * (until the process it is running stops).
   *
   * Returns the short ID of the container that is running.
   */
  async start(sessionParameters: SessionParameters): Promise<string> {
    if (sessionParameters.platform !== Platform.DOCKER) {
      throw new Error('Start is only valid with the Docker platform.')
    }

    const dockerProcess = await spawn(
      'docker',
      this.getDockerRunCommand(sessionParameters, true)
    )
    return dockerProcess
      .toString()
      .trim()
      .substr(0, DOCKER_CONTAINER_ID_SHORT_LENGTH)
  }

  /**
   * Execute a command in a docker container. Will output the results of the command, or daemonize it in which case an
   * empty string is returned
   *
   * @param sessionParameters Contains the `containerId` and `command` that define where and what to execute
   * @param daemonize run the command in the background (pass -d flag to docker)
   */
  async execute(
    sessionParameters: SessionParameters,
    daemonize = false
  ): Promise<string> {
    if (sessionParameters.platform !== Platform.DOCKER) {
      throw new Error('Execute is only valid with the Docker platform.')
    }

    if (!this.containerIsRunning(sessionParameters.containerId)) {
      throw new Error(
        `Container ${sessionParameters.containerId} is not running`
      )
    }

    const dockerProcess = await spawn(
      'docker',
      this.getDockerExecCommand(sessionParameters, daemonize)
    )
    return dockerProcess.toString().trim()
  }

  /**
   * Stop a running Docker container. Return true if the container was stopped or false if there was an error.
   *
   * @param containerId
   */
  async stopContainer(containerId: string): Promise<boolean> {
    const dockerStopProcess = await spawn('docker', ['stop', containerId])
    return (
      dockerStopProcess
        .toString()
        .trim()
        .substr(0, DOCKER_CONTAINER_ID_SHORT_LENGTH) ===
      containerId.substr(0, DOCKER_CONTAINER_ID_SHORT_LENGTH)
    )
  }

  /**
   * Build a Docker container for this environment
   */
  async dockerBuild() {
    const requisites = await nix.requisites(this.name)
    const dockerignore = `*\n${requisites.map((req) => '!' + req).join('\n')}`
    console.log(dockerignore)

    // The Dockerfile does essentially the same as the `docker run` command
    // generated above in `dockerRun`...
    const location = nix.location(this.name)
    const dockerfile = `
FROM alpine
ENV PATH ${location}/bin:${location}/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV R_LIBS_SITE=${location}/library
COPY /nix/store /nix/store
    `
    console.log(dockerfile)
  }
}
