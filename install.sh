#!/usr/bin/env bash

# A script to download and install the latest version

OS=$(uname)
if [[ "$OS" == "Linux" || "$OS" == "Darwin" ]]; then
    case "$OS" in
        'Linux')
            PLATFORM="linux-x64"
            if [ -z "$1" ]; then
                VERSION=$(curl --silent "https://api.github.com/repos/stencila/nixster/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
            else
                VERSION=$1
            fi
            INSTALL_PATH="$HOME/.local/bin/"
            ;;
        'Darwin')
            PLATFORM="macos-x64"
            if [ -z "$1" ]; then
                VERSION=$(curl --silent "https://api.github.com/repos/stencila/nixster/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
            else
                VERSION=$1
            fi
            INSTALL_PATH="/usr/local/bin/"
            ;;
    esac
    curl -Lo /tmp/nixster.tar.gz https://github.com/stencila/nixster/releases/download/$VERSION/nixster-$PLATFORM.tar.gz
    tar xvf /tmp/nixster.tar.gz
    mkdir -p $INSTALL_PATH
    mv -f nixster $INSTALL_PATH
    rm -f /tmp/nixster.tar.gz
else
    echo "Sorry, I don't know how to install on this OS, please see https://github.com/stencila/nixster#install"
fi
