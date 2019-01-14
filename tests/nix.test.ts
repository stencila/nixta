import { semver } from '../src/nix'

test('semver', async () => {
  expect(semver('1')).toEqual('00001.00000.00000')
  expect(semver('1.2')).toEqual('00001.00002.00000')
  expect(semver('1.2.3')).toEqual('00001.00002.00003')
  expect(semver('1.2.3-beta1')).toEqual('00001.00002.00003-beta1')
})
