#!/usr/bin/env bash

# Script for creating CLI demo

# Include the demoing code
. demo-magic.sh
clear

# Set some options
DEMO_PROMPT=$BLUE"$ "
DEMO_CMD_COLOR=$GREEN

# Alias to cuurent version of CLI in this repo
alias nixster="npx ts-node src/cli.ts"

# Run the demo!

p "# First we'll change into one of the R example projects"
pe "cd tests/fixtures/r-spatial"

p "# And take a look at the files in it"
pe "ls"
sleep 1

p "# The 'main.R' file is what Dockter will execute within a container"
p "# It reads in some spatial data and plots it"
pe "cat main.R"
sleep 1

