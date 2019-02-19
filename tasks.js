export async function clean() {
  await shell('shx rm -rf ./bin')
  await shell('shx rm -rf ./index.js')
  await shell('shx rm -rf ./test.js')
  await shell('shx rm -rf ./package-lock.json')
  await shell('shx rm -rf ./node_modules')
  
}

export async function start() {
  await shell('tsc-bundle ./src/tsconfig.json --outFile ./index.js')
  await Promise.all([
    shell(`tsc-bundle ./src/tsconfig.json --outFile ./index.js --watch > /dev/null`),
    shell('fsrun ./index.js [node index.js]')
  ])
}

export async function test() {
  await shell('tsc-bundle ./spec/tsconfig.json --outFile ./test.js')
  await shell('mocha ./test.js')
}

export async function lint() {
  await shell('tslint ./src/index.ts')
}

export async function build() {
  await shell('tsc-bundle ./src/tsconfig.json')
  await shell(`shx rm   -rf ./bin`)
  await shell(`shx mkdir -p ./bin`)
  await shell(`shx cp ./index.js     ./bin/index.js`)
  await shell(`shx cp ./package.json ./bin/package.json`)
  await shell(`shx cp ./readme.md    ./bin/readme.md`)
  await shell(`shx cp ./license.md   ./bin/license.md`)
}
