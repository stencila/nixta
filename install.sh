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
            INSTALL_PATH="$HOME/.local/bin"
            ;;
        'Darwin')
            PLATFORM="macos-x64"
            if [ -z "$1" ]; then
                VERSION=$(curl --silent "https://api.github.com/repos/stencila/nixster/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
            else
                VERSION=$1
            fi
            INSTALL_PATH="/usr/local/bin"
            ;;
    esac

    echo "Downloading Nixster $VERSION"
    curl -Lo /tmp/nixster.tar.gz https://github.com/stencila/nixster/releases/download/$VERSION/nixster-$PLATFORM.tar.gz
    tar xvf /tmp/nixster.tar.gz
    rm -f /tmp/nixster.tar.gz
    
    echo "Installing nixster to $INSTALL_PATH/nixster-$VERSION/nixster"
    mkdir -p $INSTALL_PATH/nixster-$VERSION
    mv -f nixster $INSTALL_PATH/nixster-$VERSION
    # Unpack `node_modules` etc into the $INSTALL_PATH/nixster-$VERSION
    $INSTALL_PATH/nixster-$VERSION/nixster --version
    
    echo "Pointing nixster to $INSTALL_PATH/nixster-$VERSION/nixster"
    ln -sf nixster-$VERSION/nixster $INSTALL_PATH/nixster
else
    echo "Sorry, I don't know how to install on this OS, please see https://github.com/stencila/nixster#install"
fi
