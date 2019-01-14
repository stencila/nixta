{ system ? builtins.currentSystem, pkg ? null }:
let
  pkgs = import ./nix/pkgs/top-level/all-packages.nix;
in
  pkgs { inherit system; inherit pkg; }
