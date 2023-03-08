FILENAME=$1
PACKAGE_VERSION=$(awk -F\" '/"version":/ {print $4}' package.json)

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -E -i "" "s/(https:\/\/corva-ai\.github\.io\/node-sdk\/docs\/)([^?\/]*)/\1v$PACKAGE_VERSION/g" $FILENAME
else
  sed -E -i "s/(https:\/\/corva-ai\.github\.io\/node-sdk\/docs\/)([^?\/]*)/\1v$PACKAGE_VERSION/g" $FILENAME
fi
