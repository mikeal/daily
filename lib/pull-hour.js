const pullHour = async argv => {
  const dt = argv.datetime ? new Date(argv.datetime) : new Date(Date.now() - onehour)
  let outs
  if (argv.output) {
    outs = zlib.createGzip().pipe(fs.createWriteStream(argv.output))
  } else {
    outs = process.stdout
  }
  for await (const event of min(dt)) {
    outs.write(JSON.stringify(event))
    outs.write('\n')
  }
}

module.exports = pullHour
