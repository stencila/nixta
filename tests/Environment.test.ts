import path from 'path'

import Environment from '../src/Environment'
Environment.home(path.join(__dirname, 'fixtures', 'envs'))

test('add', async () => {
  const env = new Environment('empty')

  expect(env.adds).toBeUndefined()
  expect(env.pkgs()).toEqual([])
  
  await env.add(['nodejs'])
  expect(env.adds).toEqual(['nodejs'])
  expect(env.pkgs()).toEqual(['nodejs'])

  await env.add(['nodejs', 'python', 'r'])
  expect(env.adds).toEqual(['nodejs', 'python', 'r'])
  expect(env.pkgs()).toEqual(['nodejs', 'python', 'r'])
})

test('remove', async () => {
  const env = new Environment('empty')
  
  await env.add(['nodejs', 'python', 'r'])
  expect(env.adds).toEqual(['nodejs', 'python', 'r'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['nodejs', 'python', 'r'])

  await env.remove(['nodejs'])
  expect(env.adds).toEqual(['python', 'r'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['python', 'r'])

  await env.remove(['r'])
  expect(env.adds).toEqual(['python'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['python'])

  await env.remove(['r'])
  expect(env.adds).toEqual(['python'])
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual(['python'])

  await env.remove(['python'])
  expect(env.adds).toBeUndefined()
  expect(env.removes).toBeUndefined()
  expect(env.pkgs()).toEqual([])
})
