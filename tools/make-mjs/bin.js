#! /usr/bin/env node
const path = require('path')
const process = require('process')
const fsx = require('fs-extra')
const proceed = require('@make-mjs/main').main
const places = require('@tools/places')

async function main () {
  const IGNORED_DIRECTORIES = ['.git', 'node_modules']

  const events = proceed({
    dirname: places.packages,
    deep: param => !IGNORED_DIRECTORIES.includes(param.base),
    filter: param => param.base.endsWith('.js')
  })

  for await (const event of events) {
    if (event.type === 'AfterWrite') {
      const { root, dir, name } = path.parse(event.file.path)
      const oldDef = path.join(root, dir, name + '.d.ts')
      const newDef = event.file.path + '.d.ts'
      await fsx.copyFile(oldDef, newDef)
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
