#!/bin/bash
if [[ $TRAVIS_PULL_REQUEST == 'false' ]]; then
  git config user.name "Travis CI"
  git config user.email "travis@stenci.la"
  git checkout -b updates
  git add .
  git commit -m "Updated at $(date --utc +%FT%TZ)"
  git remote set-url origin git@github.com:stencila/nixpkgs.git
  git push origin updates
fi