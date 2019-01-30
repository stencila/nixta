// @ts-ignore
import awaitSpawn from 'await-spawn'

/**
 * Spawn a process
 *
 * A wrapper function around `await-spawn` to provide better error
 * reporting.
 *
 * @param file The executable file to be spawned
 * @param args Arguments
 */
export default async function spawn (file: string, args: Array<string>, options: any = {}) {
  let buffer
  try {
    buffer = await awaitSpawn(file, args, options)
  } catch (error) {
    throw new Error(`Running "${file} ${args.join(' ')}" failed: ${error.code}: ${error.stderr.toString()}`)
  }
  return buffer.toString().trim()
}
