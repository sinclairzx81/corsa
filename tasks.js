export async function clean() {
  await shell('shx rm -rf public')
  await shell('shx rm -rf node_modules')
}

export async function start() {
  await shell('tsc-bundle src/tsconfig.json --outFile public/bin/index.js')
  await Promise.all([
    shell('tsc-bundle ./src/tsconfig.json --outFile public/bin/index.js --watch > /dev/null'),
    shell('smoke-run public/bin -- node public/bin/index.js')
  ])
}

export async function test() {
  await shell('tsc-bundle ./spec/tsconfig.json --outFile ./public/spec/index.js')
  await shell('mocha public/spec/index.js')
}

export async function pack() {
  await shell('shx rm   -rf ./public/pack')
  await shell('shx mkdir -p ./public/pack')
  await shell('tsc --project ./src/tsconfig.json --outDir ./public/pack')
  await shell('shx cp package.json public/pack')
  await shell('shx cp readme.md    public/pack')
  await shell('shx cp license      public/pack')
  await shell('cd public/pack && npm pack')
}
