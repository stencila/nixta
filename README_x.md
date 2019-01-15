

### Environments

```yaml
packages:
  - R
variables:
  - R_SITE_LIB: /library
```



### Create an environment

The `create` command lets you create a new environment

```bash
nixta create <name> [extends <env1,env2,...>] [adds <pkg1,pkg2,...>] [removes <pkg3,pkg4,...>]
```

For example, 

```bash
nixta create myenv extends r adds r-ggplot2,r-rfishbase
```


```yaml
extends:
  - r
adds:
  - r-ggplot2
  - r-rfishbase
```

### Delete an environment

```bash
nixta delete <name>
```

For example, 

```bash
nixta delete myenv
```


