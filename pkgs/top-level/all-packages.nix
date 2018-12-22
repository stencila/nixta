{ system ? builtins.currentSystem, pkg ? null }:

let
  nixVersion = "18.09";
  nixUrl = "https://github.com/NixOS/nixpkgs/archive/${nixVersion}.tar.gz";
  pinPkgs = import (fetchTarball nixUrl) { inherit system; };
  callPackage = pkgs.lib.callPackageWith (pkgs // pkgs.xlibs // self);

  pkgs = pinPkgs;

  languagesModules = {
  };

  customPkgs = {
  };

  self = pkgs // languagesModules // customPkgs;

in self
