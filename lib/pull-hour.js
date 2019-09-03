const min = require('min-gharchive')
const zlib = require('zlib')
const fs = require('fs')

const pullHour = async argv => {
  const dt = argv.datetime ? new Date(argv.datetime) : new Date(Date.now() - onehour)
  let outs
  if (argv.output) {
    outs = zlib.createGzip()
    outs.pipe(fs.createWriteStream(argv.output))
  } else {
    outs = process.stdout
  }
  for await (const event of min(dt)) {
    outs.write(JSON.stringify(event))
    outs.write('\n')
  }
  outs.end()
}

module.exports = pullHour
