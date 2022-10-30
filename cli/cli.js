#!/usr/bin/env node

import fs from 'node:fs/promises'
import Api from './api.js'
import { program } from 'commander'

program
  .name('uploadshare')
  .description('The uploadshare.click cli tool for uploading files')
  .addHelpText(
    'after',
    `

To upload a file from the local directory:

$ uploadshare <FILEPATH>
`
  )
  .argument('<filepath>', 'Path to the file to upload')
  .action(async function (filepath) {
    try {
      // read the filepath and check that it exists and is a file
      const stats = await fs.stat(filepath)
      if (!stats.isFile()) {
        throw new Error(`${filepath} is not a file`)
      }

      // call the uploadshare POST endpoint to get an upload url
      const { headers, uploadUrl, downloadUrl } = await Api.createShare({ filepath })

      // upload the file using the presigned uploadUrl
      await Api.upload({ uploadUrl, headers, filepath })

      // print the download url
      console.log(downloadUrl)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })
  .parse()
