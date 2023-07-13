#!/usr/bin/env node

import { program } from 'commander'
import upload from './commands/upload.js'

program
  .name('uploadshare')
  .description('The uploadshare.click cli tool for uploading files')
  .addHelpText('after', `
  
  To upload a file from the local directory:
  
  $ uploadshare <FILENAME>
  `)

program
  .command('upload', { isDefault: true })
  .argument('<filepath>', 'Path to the file to upload')
  .action(upload)

program
  .parse()
