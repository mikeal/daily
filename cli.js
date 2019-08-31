#!/usr/bin/env node
const regression = require('./lib/regression')
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

const runRegression = async argv => {
  if (!argv.datetime) argv.datetime = new Date(Date.now() - (onehour * 24))
  else argv.datetime = new Date(argv.datetime)
  let results = await regression(argv.input, argv.datetime)
  console.log(results)
}

const outputOptions = yargs => {
  yargs.option('output', {
    alias: 'o',
    description: 'Output file or directory.'
  })
}

const regressionOptions = yargs => {
  outputOptions(yargs)
  yargs.option('input', {
    alias: 'i',
    description: 'Input directory',
    required: true
  })
}

const yargs = require('yargs')
const args = yargs
  .command('pull-hour [datetime]', 'pull an hour of gharchive', outputOptions, pullHour) 
  .command('pull <starttime> <endtime>', 'pull a timerange', outputOptions, pullRange)
  .command('regression [datetime]', 'build regression analysis for a day', regressionOptions, runRegression)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
