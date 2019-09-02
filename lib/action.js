const fs = require('fs')
const zlib = require('zlib')
const min = require('min-gharchive')

const onehour = 1000 * 60 * 60
const now = Date.now() - onehour // pull the previous hour

const fileString = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const hour = ts.getUTCHours()
  const name = `${year}-${month}-${day}-${hour}.json.gz`
  return name
}

const hours = function * (str) {
  for (let i = 0; i < 24; i++) {
    yield str + '-' + i
  }
}

const fileExists = async path => {
  try {
    await fs.promises.stat(path)
    return true
  } catch (e) {
    if (e.errno !== -2) throw e
  }
  return false
}

const dataDir = __dirname + '/../data/'

const pullHour = async (dt, filename) => {
  let outs = zlib.createGzip().pipe(fs.createWriteStream(filename))
  for await (const event of min(dt)) {
    outs.write(JSON.stringify(event))
    outs.write('\n')
  }
  outs.end()
}


const main = async () => {
  let start = now - ((onehour * 24) * 2)
  let skips = 0
  while (start < now) {
    const dt = new Date(start)
    const filename = dataDir + 'min/' + fileString(dt)
    if (await fileExists(filename)) {
      skips += 1
    } else {
      console.log('fetching', fileString(dt))
      await pullHour(dt, filename)
    }
    start += onehour
  }
  console.log('skipped', skips)
}

module.exports = main

