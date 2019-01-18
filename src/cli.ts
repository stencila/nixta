#!/usr/bin/env node

/**
 * Module for command line interface (CLI)
 *
 * Parses CLI inputs and generates outputs and messages from
 * calls to functions and methods in other modules.
 */

import { sprintf } from 'sprintf-js'
import chalk from 'chalk'
// @ts-ignore
import ellipsize from 'ellipsize'
import yargs from 'yargs'
import yaml from 'js-yaml'

import Environment from './Environment'
import * as nix from './nix'

const VERSION = require('../package').version

yargs
  .scriptName('nixster')

  // Ensure at least one command
  .demandCommand(1, 'Please provide a command.')
  // Provide suggestions regarding similar commands if no matching command is found
  .recommendCommands()
  // Any command-line argument given that is not demanded, or does not have a corresponding description, will be reported as an error.
  // Unrecognized commands will also be reported as errors.
  .strict()
  // Maximize width of usage instructions
  .wrap(yargs.terminalWidth())

  // Help global option
  .usage('$0 <cmd> [args]')
  .alias('help', 'h')

  // Version global option
  .version(VERSION)
  .alias('version', 'v')
  .describe('version', 'Show version')

  // Environments

  // @ts-ignore
  .command('envs', 'List environments', yargs => {
    outputOptions(yargs)
  }, async (argv: any) => {
    const envs = await Environment.envs()
    output(envs, argv, (envs: any) => {
      const layout = '%-15s %-40s %-80s'
      const header = sprintf(layout, chalk.gray('Ready'), chalk.gray('Name'), chalk.gray('Description')) + '\n'
      return header +
        envs.map((env: any) => {
          const icon = env.built ? chalk.green('✓') : chalk.yellow('⚪')
          const name = chalk.blue(env.name)
          let descr = env.description
          if (!descr) {
            if (env.extends && env.extends.length) {
              descr = `Extends ${env.extends.join(', ')}.`
            }
            if (env.adds && env.adds.length) {
              descr = `Adds ${env.adds.length} packages.`
            }
            if (env.removes && env.removes.length) {
              descr = `Removes ${env.removes.length} packages.`
            }
          }
          descr = ellipsize(descr, 80)
          return sprintf(layout, icon, name, descr)
        }).join('\n')
    })
  })

  // @ts-ignore
  .command('create <name>', 'Create an environment', yargs => {
    yargs
      .positional('name', {
        describe: 'Name of the environment',
        type: 'string'
      })
      .option('extends', {
        describe: 'Extend one or more existing environments',
        alias: 'e',
        type: 'array'
      })
      .option('adds', {
        describe: 'Add packages to environment',
        alias: 'a',
        type: 'array'
      })
      .option('removes', {
        describe: 'Remove packages to environment',
        alias: 'r',
        type: 'array'
      })
      .option('force', {
        describe: 'Force creation if the environment already exists',
        alias: 'f',
        type: 'boolean',
        default: false
      })
  }, async (argv: any) => {
    try {
      const env = await Environment.create(argv.name, {
        packages: argv.packages,
        extends: argv.extends,
        adds: argv.adds,
        removes: argv.removes
      }, argv.force)
      info(`Environment "${env.name}" created at "${env.path()}"`)
    } catch (err) {
      error(err)
    }
  })

  .command('delete <name>', 'Delete an environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment',
        type: 'string'
      })
  }, (argv: any) => {
    try {
      Environment.delete(argv.name)
      info(`Environment "${argv.name}" deleted`)
    } catch (err) {
      error(err)
    }
  })

  .command('show [name]', 'Show an environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment (defaults to current)',
        alias: 'env',
        type: 'string'
      })
      .env('NIXSTER')
      .option('long', {
        describe: 'Show long form description',
        alias: 'l',
        type: 'boolean',
        default: false
      })
    outputOptions(yargs)
  }, async (argv: any) => {
    const desc = await new Environment(argv.name).show(argv.long)
    output(desc, argv)
  })

  .command('pkgs [name]', 'List packages in an environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment (defaults to current)',
        alias: 'env',
        type: 'string'
      })
      .env('NIXSTER')
    outputOptions(yargs)
  }, (argv: any) => {
    const pkgs = new Environment(argv.name).pkgs()
    output(pkgs, argv, (pkgs: any) => {
      return pkgs.map((pkg: any) => {
        return chalk.blue(pkg)
      }).join('\n')
    })
  })

  .command('build [name]', 'Build an environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment to build',
        alias: 'env',
        type: 'string'
      })
      .env('NIXSTER')
  }, async (argv: any) => {
    await new Environment(argv.name).build()
    info(`Environment "${argv.name}" built`)
  })

  .command('within <name>', 'Execute a command within an environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment',
        type: 'string'
      })
      .option('pure', {
        describe: 'Should the environment be pure (no host executables available)?',
        alias: 'p',
        type: 'boolean'
      })
  }, async (argv: any) => {
    try {
      const command = argv._.slice(1).join(' ')
      await new Environment(argv.name).within(command, argv.pure)
    } catch (err) {
      error(err)
    }
  })

  .command('enter <name> [command..]', 'Enter a shell within the environment', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment',
        type: 'string'
      })
      .positional('command', {
        describe: 'An initial command to execute in the shell e.g. `R` or `python`',
        type: 'string'
      })
      .option('pure', {
        describe: 'Should the environment be pure (no host executables available)?',
        alias: 'p',
        type: 'boolean',
        default: true
      })
  }, async (argv: any) => {
    try {
      await new Environment(argv.name).enter(argv.command.join(' '), argv.pure)
    } catch (err) {
      error(err)
    }
  })

  // TODO instead of a sperate command, --docker should be an option for the `build`, `within` and `enter` commands
  .command('dockerize [name] [command]', 'Containerize the environment using Docker', (yargs: any) => {
    yargs
      .positional('name', {
        describe: 'Name of the environment',
        alias: 'env',
        type: 'string'
      })
      .env('NIXSTER')
      .positional('command', {
        describe: 'Command to run',
        type: 'string'
      })
      .option('build', {
        describe: 'Should the image be built?',
        alias: 'b',
        type: 'boolean',
        default: false
      })
  }, async (argv: any) => {
    const env = new Environment(argv.name)
    if (argv.build) await env.dockerBuild()
    else await env.dockerRun(argv.command)
  })

  .command('add <pkgs..>', 'Add packages to the current environment', (yargs: any) => {
    yargs
      .positional('pkgs', {
        description: 'List of packages to add (space separated)',
        type: 'array'
      })
      .option('env', {
        describe: 'The environment to add packages to (defaults to current)',
        alias: ['e', 'to'],
        type: 'string'
      })
      .env('NIXSTER')
  }, async (argv: any) => {
    try {
      const env = new Environment(argv.env)
      const pkgs = argv.pkgs
      try {
        await env.add(pkgs)
        info(`Added packages ${pkgs.map((pkg: any) => `"${pkg}"`).join(',')} to environment ${env.name}`)
      } catch (err) {
        if (err.code === 'ENOMATCH') {
          const pkg = err.pkg
          error(`No package matching "${pkg}"`)
          const term = pkg + '*'
          const list = await nix.search(term)
          if (list.length) {
            info(`Did you mean any of these?`)
            output({ list, term }, { format: 'pretty' }, searchPrettify)
          }
        } else {
          throw err
        }
      }
    } catch (err) {
      error(err)
    }
  })

  .command('remove  <pkgs..>', 'Remove packages from the current environment', (yargs: any) => {
    yargs
      .positional('pkgs', {
        description: 'List of packages to remove (space separated)',
        type: 'array'
      })
      .option('env', {
        describe: 'The environment to remove packages from (defaults to current)',
        alias: ['e', 'from'],
        type: 'string'
      })
      .env('NIXSTER')
  }, async (argv: any) => {
    try {
      const env = new Environment(argv.env)
      const pkgs = argv.pkgs
      await env.remove(pkgs)
      info(`Removed packages ${pkgs.map((pkg: any) => `"${pkg}"`).join(',')} from environment ${env.name}`)
    } catch (err) {
      error(err)
    }
  })

  .command('upgrade [pkgs..]', 'Upgrade packages in the current environment', (yargs: any) => {
    yargs
      .positional('pkgs', {
        description: 'List of packages to upgrade (space separated)',
        type: 'array'
      })
      .option('env', {
        describe: 'The environment to upgrade (defaults to current)',
        alias: 'e',
        type: 'string'
      })
      .env('NIXSTER')
  }, async (argv: any) => {
    try {
      const env = new Environment(argv.env)
      const pkgs = argv.pkgs
      await env.upgrade(pkgs)
      const which = pkgs.length ? pkgs.length : 'all'
      info(`Upgraded ${which} packages in environment ${env.name}`)
    } catch (err) {
      error(err)
    }
  })

  // Database commands

  .command('update [channel..]', 'Update database', (yargs: any) => {
    yargs
      .positional('channels', {
        description: 'List of channels to update (space separated)',
        type: 'array'
      })
  } , async (argv: any) => {
    try {
      await nix.update(argv.channel)
      info(`Updated database`)
    } catch (err) {
      error(err)
    }
  })

  .command('match <pkg>', 'Match in database', (yargs: any) => {
    yargs
      .positional('pkg', {
        describe: 'Package name/version e.g. r, r==3.5.2',
        type: 'string'
      })
    outputOptions(yargs)
  }, async (argv: any) => {
    try {
      const matches = await nix.match(argv.pkg)
      if (matches.length === 0) {
        warn(`No packages matching "${argv.pkg}"`)
      } else {
        output(matches, argv)
      }
    } catch (err) {
      error(err)
    }
  })

  .command('search <term>', 'Search in database', (yargs: any) => {
    yargs
      .positional('term', {
        describe: 'The term to search for',
        type: 'string'
      })
      .option('type', {
        describe: 'The type of package e.g. r-package e.g. python-package',
        alias: 't',
        type: 'string'
      })
    outputOptions(yargs)
  }, async (argv: any) => {
    const term = argv.term
    const type = argv.type || ''
    const list = await nix.search(term, type)
    output({ list, term, type }, argv, searchPrettify)
  })

  .parse()

/**
 * Output a value to standard output using the specified format (if any)
 *
 * For TTY devices the default format is "pretty", or YAML if a
 * prettifier function is not provided. For non-TTY devices (e.g. files)
 * the default format is JSON.
 *
 * @param value The value to be output
 * @param argv The vector of arguments
 * @param prettifier A prettifier function to use for option --format=pretty
 */
function output (value: any, argv: any = {}, prettifier?: (value: any) => string): any {
  if (!(argv.format || argv.json || argv.yaml || argv.pretty)) {
    if (process.stdout.isTTY) return output(value, { format: 'pretty' }, prettifier)
    else return output(value, { format: 'json' })
  }

  let out
  let format = argv.format
  if (format === 'json' || argv.json) {
    out = JSON.stringify(value, null, ' ')
  } else if (format === 'yaml' || argv.yaml) {
    out = yaml.safeDump(value)
  } else if (format === 'pretty' || argv.pretty) {
    if (prettifier) out = prettifier(value)
    else return output(value, { format: 'yaml' })
  } else {
    throw new Error(`Unknown format "${format}"`)
  }

  console.log(out)
}

/**
 * Add output options to a command.
 *
 * The aim of this approach is to have a consistent
 * and convieient way for users to be able to specify
 * the output format across commands.
 *
 * Formats can be specified explicitly e.g.
 *
 *   --format yaml
 *
 * Or using shorcuts e.g.
 *
 *   --yaml or -y
 *
 * See `out()`
 *
 * @param yargs The yargs object to add the options to
 */
function outputOptions (yargs: any) {
  yargs
    .option('format', {
      describe: 'Format to use for outputting result',
      alias: 'f',
      type: 'string'
    })

    .option('pretty', {
      describe: 'Output using pretty formatting',
      alias: 'p',
      type: 'boolean'
    })

    .option('yaml', {
      describe: 'Output as YAML',
      alias: 'y',
      type: 'boolean'
    })

    .option('json', {
      describe: 'Output as JSON',
      alias: 'j',
      type: 'boolean'
    })

    .conflicts('format', 'pretty')
    .conflicts('format', 'yaml')
    .conflicts('format', 'json')
    .conflicts('pretty', 'json')
    .conflicts('pretty', 'yaml')
    .conflicts('json', 'yaml')
}

/**
 * Create a diagnostic message for the user
 *
 * @param message Message to display
 * @param emoji Emjoi to prefix the display
 */
function diag (message: string, emoji: string) {
  if (process.stderr.isTTY && emoji) process.stderr.write(emoji + '  ')
  process.stderr.write(message + '\n')
}

/**
 * Create an information message
 *
 * @param message Message to display
 */
function info (message: string) {
  diag(message, chalk.blue('🛈'))
}

/**
 * Create a warning message
 *
 * @param message Message to display
 */
function warn (message: string) {
  diag(message, chalk.yellow('⚠'))
}

/**
 * Create an error message
 *
 * @param message Message to display
 */
function error (error: Error | string) {
  if (error instanceof Error) error = error.message
  diag(error, chalk.red('💣'))
}

/**
 * Prettify a search result
 *
 * @param result Result from search
 */
function searchPrettify (result: any) {
  const list: Array<any> = result.list
  const term: string = result.term
  return list.map((pkg: any) => {
    let type = pkg.type
    switch (type) {
      case 'node-package':
        type = chalk.green('js')
        break
      case 'perl-package':
        type = chalk.red('pl')
        break
      case 'python-package':
        type = chalk.yellow('py')
        break
      case 'r-package':
        type = chalk.blue('r')
        break
      default:
        type = chalk.red(' ')
    }
    let descr = pkg.description ? pkg.description : ''
    descr = ellipsize(descr, 60)
    descr = chalk.gray(descr.replace(new RegExp(term.replace('*', ''), 'ig'), (match: any) => {
      return chalk.underline(match)
    }))
    return sprintf(
      '%-13s %-30s %-10s %s',
      type,
      pkg.name,
      pkg.version,
      descr
    )
  }).join('\n')
}
