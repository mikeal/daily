#!/usr/bin/env node
const min = require('../min-gharchive')
const fs = require('fs')
const zlib = require('zlib')

const noop = () => {}

const onehour = 1000 * 60 * 60

const pullHour = async argv => {
  const dt = argv.datetime ? new Date(argv.datetime) : new Date(Date.now() - onehour)
  let outs
  if (argv.output) {
    outs = zlib.createGzip().pipe(fs.createWriteStream(argv.output))
  } else {
    outs = process.stdout
  }
  for await (let event of min(dt)) {
    outs.write(JSON.stringify(event))
    outs.write('\n')
  }
}

const pullRange = async argv => {
  let start = new Date(argv.starttime)
  const end = new Date(argv.endtime)
  let output = argv.output
  if (output && !output.endsWith('/')) output += '/'
  while (start < end) {
    argv.datetime = start
    if (output) {
      console.log('pulling ' + start)
      let filename = min.tsToFilename(start)
      argv.output = output + filename
    }
    await pullHour(argv)
    start = new Date(start.getTime() + onehour)
  }
}

const outputOptions = yargs => {
  yargs.option('output', {
    alias: 'o',
    description: 'Output file or directory.'
  })
}

const yargs = require('yargs')
const args = yargs
  .command('pull-hour [datetime]', 'pull an hour of gharchive', outputOptions, pullHour) 
  .command('pull <starttime> <endtime>', 'pull a timerange', outputOptions, pullRange)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
