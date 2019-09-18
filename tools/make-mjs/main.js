const path = require('path')
const process = require('process')
const fsx = require('fs-extra')
const proceed = require('@make-mjs/main').main
const { DEFAULT_PARSER_OPTIONS } = require('@make-mjs/code')
const places = require('@tools/places')

async function main () {
  const IGNORED_DIRECTORIES = ['.git', 'node_modules']

  const knownMjsPackagesPromises = (
    await fsx.readdir(places.packages)
  ).map(async basename => {
    const manifest = path.join(places.packages, basename, 'package.json')
    const manifestExists = await fsx.pathExists(manifest)
    if (!manifestExists) return null
    const { name } = await fsx.readJSON(manifest)
    return name
  })

  const knownMjsPackages = (await Promise.all(knownMjsPackagesPromises)).filter(Boolean)

  const events = proceed({
    dirname: places.packages,
    deep: param => !IGNORED_DIRECTORIES.includes(param.base),
    filter: param => param.base.endsWith('.js'),
    codeTransformOptions: {
      parserOptions: DEFAULT_PARSER_OPTIONS,
      isMjsPackage: param => knownMjsPackages.includes(param.packageName)
    }
  })

  for await (const event of events) {
    if (event.type === 'AfterWrite') {
      const { root, dir, name } = path.parse(event.file.path)
      const oldDef = path.join(root, dir, name + '.d.ts')
      const newDef = event.file.path + '.d.ts'
      if (await fsx.pathExists(oldDef)) {
        await fsx.copyFile(oldDef, newDef)
      }
    }
  }

  return 0
}

main().then(
  status => process.exit(status),
  error => {
    console.error(error)
    process.exit(1)
  }
)
