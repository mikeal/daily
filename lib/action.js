const fs = require('fs')
const zlib = require('zlib')
const regression = require('./regression')
const markdown = require('./markdown')
const languages = require('./languages')

const onehour = 1000 * 60 * 60
const now = Date.now() - (onehour * 3) // set back 3 hours

const fileString = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const name = `${year}-${month}-${day}.json.gz`
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

const checkRegression = async day => {
  const filename = dataDir + 'reg/' + fileString(day)
  console.error({filename})
  if (await fileExists(filename)) {
    // noop
  } else {
    day = new Date(day)
    const results = await regression(day)
    fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(results)))
  }
  return filename
}

const reg2markdown = f => f.replace('/data/reg/', '/archive/').replace('json.gz', 'mk')

const regs = async () => {
  let dt = new Date(now - (onehour * 24))
  let filename = await checkRegression(dt)
  const m = reg2markdown(filename)
  if (await fileExists(m)) {
    console.error('skipping markdown for ', filename)
  } else {
    const reg = JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString())
    const ts = new Date(filename.slice(filename.length - 18, filename.length - '.json.gz'.length))
    const mk = await markdown(reg, ts)
    console.log('writing', m)
    fs.writeFileSync(m, mk)
  }
}

const ensureLatest = async () => {
  const archive = __dirname + '/../archive'
  const files = (await fs.promises.readdir(archive)).sort()
  const last = files[files.length - 1]
  fs.writeFileSync(__dirname + '/../README.md', fs.readFileSync(archive + '/' + last))
}

const main = async () => {
  await regs()
  await ensureLatest()
}

module.exports = main
