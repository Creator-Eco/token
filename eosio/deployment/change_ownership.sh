#!/usr/bin/env bash

pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

# Change the private key that controls 'owner' and 'active' roles of bridge and bbs accounts.
# Of course cleos must have access to the private key that currently controls the account (with owner privileges).
# Use `cleos wallet import --private-key PRIVATE_KEY` to use it.
kleos set account permission $bridge_account active $NEW_OWNER_PUB_KEY -p $bridge_account@owner
kleos set account permission $bridge_account owner $NEW_OWNER_PUB_KEY -p $bridge_account@owner

kleos set account permission $bbs_account active $NEW_OWNER_PUB_KEY -p $bbs_account@owner
kleos set account permission $bbs_account owner $NEW_OWNER_PUB_KEY -p $bbs_account@owner

kleos set account permission $reporter_account active $NEW_OWNER_PUB_KEY -p $reporter_account@owner
kleos set account permission $reporter_account owner $NEW_OWNER_PUB_KEY -p $reporter_account@owner

popd
