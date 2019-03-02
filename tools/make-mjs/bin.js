#! /usr/bin/env node
const path = require('path')
const process = require('process')
const { rename, stat } = require('fs-extra')
const { traverse } = require('fs-tree-utils')
const places = require('@tools/places')

async function main () {
  const list = await traverse(
    path.join(places.packages),
    {
      deep: x => !['node_modules', '.git'].includes(x.item)
    }
  )

  const renamingPromises = list
    .filter(x => x.stats.isFile())
    .map(({ path: oldPath }) => ({
      oldPath,
      ...path.parse(oldPath)
    }))
    .filter(x => x.ext === '.js')
    .map(({ oldPath, dir, name }) => ({
      oldPath,
      newPath: path.join(dir, name + '.mjs'),
      tsPath: path.join(dir, name + '.ts')
    }))
    .map(async param => {
      const { oldPath, newPath, tsPath } = param

      const statResult = await stat(tsPath).then(
        stats => ({ stats }),
        error => ({ error })
      )

      if ('stats' in statResult) {
        if (!statResult.stats.isFile()) return param
        await rename(oldPath, newPath)
        return param
      }

      const { error } = statResult

      if (typeof error === 'object' && error.code === 'ENOENT') {
        return param
      }

      throw statResult.error
    })

  await Promise.all(renamingPromises)

  return 0
}

main().then(
  status => process.exit(status),
  error => {
    console.error(error)
    process.exit(1)
  }
)
