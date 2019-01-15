# Under the hood

This document provides an "under the hood" look into the workings of Nixster. It's intendended for contributors and interested users.

## Nix



### Normalising package names

One of the things that Nixster needs is a mapping between package names and Nix attribute paths. This allows Nixster to add or remove Nix packages from environments based on their `environ.yaml` file. Sometimes there is consistency between names and attribute paths. For example, the package known on CRAN as `babynames`, has the Nix name `r-babynames-0.3.0` and the attribute name `rPackages.babynames`. Other times there is less consistentcy. For example, the package known on PyPi as `buildbot-grid-view` has the name `python3.7-buildbot-grid-view-1.4.0` and attribute path `python37Packages.buildbot-plugins.grid-view`.

Nixster creates two new columns `name` and `version` by parsing the Nix package name an normalizing it to only contain lowercase letters (`a-z`), digits (`0-9`) and dashes (`-`). To do this, the `nix_name` is parsed

`python-buildbot-grid-view` will install the package with Nix attributue path `python37Packages.buildbot-plugins.grid-view`


```bash
nix-env --query --file "<nixpkgs>" --attr python37Packages --available --attr-path --drv-path --out-path
```

Which produces a list of 

```bash
python37Packages.behave                              behave-1.2.6                                                                        /nix/store/y758394y7f23ba30m0n1h52w6hakjg5k-behave-1.2.6.drv                                                                        /nix/store/8jz1c7bwrl8kch6xag7j93lwg0rf4j77-behave-1.2.6
python37Packages.boost                               boost-1.67_0                                                                        /nix/store/6w3r1wq9snvhx1yvyh4waw8avyjdxffa-boost-1.67_0.drv                                                                        dev=/nix/store/9p5pj3v6mrwhhjj8ynjw6qb5avn354pj-boost-1.67_0-dev;/nix/store/p7ldzl2pbfa6l5pab3n1iq223q53jf4x-boost-1.67_0
python37Packages.bugseverywhere                      bugseverywhere-1.1.1                                                                /nix/store/wg2l5y71pgjb2925f0rzp7868cc7xc8r-bugseverywhere-1.1.1.drv                                                                /nix/store/i2bln8h615b94wlddjwqmgy1wxblnf3m-bugseverywhere-1.1.1
python37Packages.caffe                               caffe-1.0                                                                           /nix/store/0x7n1xyrjxlijl9557fpzfk5zc1j6d8y-caffe-1.0.drv                                                                           bin=/nix/store/rj09zb3sxy6n2v9wv3dkg929cjmjymwh-caffe-1.0-bin;/nix/store/n5wxs3hqv5vfgc7858x77x5mk3bqsa4b-caffe-1.0
```

```bash
nix-env --query --file "<nixpkgs>" --attr python37Packages --available --meta --json | head -n 30
```

```bash
{
  "python37Packages.behave": {
    "name": "behave-1.2.6",
    "system": "x86_64-linux",
    "meta": {
      "available": true,
      "description": "behaviour-driven development, Python style",
      "homepage": "https://github.com/behave/behave",
      "isBuildPythonPackage": [
        {
          "kernel": {
            "_type": "kernel",
            "execFormat": {
              "_type": "exec-format",
              "name": "elf"
            },
            "families": {},
            "name": "linux"
          }
        },
        {
          "kernel": {
            "families": {
              "darwin": {
                "_type": "exec-format",
                "name": "darwin"
              }
            }
          }
        }
```