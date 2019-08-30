#!/usr/bin/env node
const min = require('../min-gharchive')
const fs = require('fs')

const noop = () => {}

const onehour = 1000 * 60 * 60

const pullHour = async argv => {
  const dt = argv.datetime ? new Date(argv.datetime) : new Date(Date.now() - onehour)
  let outs
  if (argv.output) {
    outs = fs.createWriteStream(argv.output)
  } else {
    outs = process.stdout
  }
  for await (let event of min(dt)) {
    outs.write(JSON.stringify(event))
    outs.write('\n')
  }
}

const outputOptions = yargs => {
  yargs.option('output', {
    alias: 'o',
    description: 'File to output to.'
  })
}

const yargs = require('yargs')
const args = yargs
  .command('pull-hour [datetime]', 'pull an hour of gharchive', outputOptions, pullHour) 
  .argv

if (!args._.length) {
  yargs.showHelp()
}
