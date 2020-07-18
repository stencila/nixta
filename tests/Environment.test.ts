import path from 'path'

// In these tests we try to use packages that are relatively small
// e.g. 'hello', 'cowsay', 'jq'
// so that they don't take a long time under CI

// Increase timeout (in milliseconds) to allow for Nix builds
jest.setTimeout(30 * 60 * 1000)

import Environment from '../src/Environment'
Environment.home(path.join(__dirname, 'fixtures', 'envs'))

test.skip('add', async () => {
  const env = new Environment('empty')

  expect(env.adds).toBeUndefined()
  expect(env.pkgs()).toEqual([])

  await env.add(['hello'])
  expect(env.adds).toEqual(['hello'])
  expect(env.pkgs()).toEqual(['hello'])

  await env.add(['hello', 'cowsay', 'jq'])
  expect(env.adds).toEqual(['hello', 'cowsay', 'jq'])
  expect(env.pkgs()).toEqual(['hello', 'cowsay', 'jq'])
})

test.skip('remove', async () => {
  const env = new Environment('empty')

  await env.add(['hello', 'cowsay', 'jq'])
  expect(env.adds).toEqual(['hello', 'cowsay', 'jq'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['hello', 'cowsay', 'jq'])

  await env.remove(['hello'])
  expect(env.adds).toEqual(['cowsay', 'jq'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['cowsay', 'jq'])

  await env.remove(['jq'])
  expect(env.adds).toEqual(['cowsay'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['cowsay'])

  await env.remove(['jq'])
  expect(env.adds).toEqual(['cowsay'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['cowsay'])

  await env.remove(['cowsay'])
  expect(env.adds).toBeUndefined()
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual([])
})
