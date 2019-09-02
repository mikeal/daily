#!/usr/bin/env node
const regression = require('./lib/regression')
const markdown = require('./lib/markdown')
const action = require('./lib/action')
const pullHour = require('./lib/pull-hour')
const min = require('min-gharchive')
const fs = require('fs')
const zlib = require('zlib')
const { inspect } = require('util')

const onehour = 1000 * 60 * 60

const pullRange = async argv => {
  let start = new Date(argv.starttime)
  const end = new Date(argv.endtime)
  let output = argv.output
  if (output && !output.endsWith('/')) output += '/'
  while (start < end) {
    argv.datetime = start
    if (output) {
      console.log('pulling ' + start)
      const filename = min.tsToFilename(start)
      argv.output = output + filename
    }
    await pullHour(argv)
    start = new Date(start.getTime() + onehour)
  }
}

const regname = (basepath, ts) => {
  if (!basepath.endsWith('/')) basepath += '/'
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const filename = `${basepath}${year}-${month}-${day}.json.gz`
  return filename
}

const runRegression = async argv => {
  if (!argv.datetime) argv.datetime = new Date(Date.now() - (onehour * 24))
  else argv.datetime = new Date(argv.datetime)
  const results = await regression(argv.input, argv.datetime)
  if (argv.output) {
    const filename = regname(argv.output, argv.datetime)
    fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(results)))    
  } else {
    console.log(inspect(results, { depth: Infinity }))
  }
}

const runMarkdown = async argv => {
  if (!argv.datetime) argv.datetime = new Date(Date.now() - (onehour * 24))
  else argv.datetime = new Date(argv.datetime)
  const filename = regname(argv.input, argv.datetime)
  const reg = JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString())
  // console.log(inspect({all: reg.all, unique: reg.unique}, {depth: Infinity}))
  const mk = await markdown(reg, argv.datetime)
  if (argv.output) {
    fs.writeFileSync(argv.output, mk) 
  } else {
    console.log(mk)
  }
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
    description: 'input directory',
    default: './data/min'
  })
}
const markdownOptions = yargs => {
  outputOptions(yargs)
  yargs.option('input', {
    alias: 'i',
    description: 'input directory',
    default: './data/reg'
  })
}

const yargs = require('yargs')
const args = yargs
  .command('pull-hour [datetime]', 'pull an hour of gharchive', outputOptions, pullHour)
  .command('pull <starttime> <endtime>', 'pull a timerange', outputOptions, pullRange)
  .command('regression [datetime]', 'build regression analysis for a day', regressionOptions, runRegression)
  .command('markdown [datetime]', 'build markdown page for the day', markdownOptions, runMarkdown)
  .command('action', 'run the hourly github action', () => {}, action)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
