const fs = require('fs')
const zlib = require('zlib')
const min = require('min-gharchive')
const regression = require('./regression')
const markdown = require('./markdown')

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
  let lines = []
  for await (const event of min(dt)) {
    lines.push(JSON.stringify(event))
  }
  fs.writeFileSync(filename, zlib.gzipSync(lines.join('\n')+'\n'))
}


const pull = async () => {
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

const checkRegression = async day => {
  const filename = dataDir + 'reg/' + day + '.json.gz'
  if (await fileExists(filename)) {
  } else {
    day = new Date(day)
    const results = await regression(dataDir + 'min', day)
    fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(results)))
  }
  return filename
}

const reg2markdown = f => f.replace('/data/reg/', '/archive/').replace('json.gz', 'mk')

const regs = async () => {
  let files = await fs.promises.readdir(dataDir + 'min') 
  let days = {}
  for (let file of files) {
    let key = file.slice(0,10)
    if (!days[key]) days[key] = []
    days[key].push(file)
  }
  let regressions = []
  for (let [day, files] of Object.entries(days)) {
    if (files.length === 24) {
      regressions.push(await checkRegression(day))
    }
  }
  let skips = 0
  for (let filename of regressions) {
    let m = reg2markdown(filename)
    if (await fileExists(m)) {
      skips += 1
    } else {
      let reg = JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString())      
      let ts = new Date(filename.slice(filename.length - 18, filename.length - '.json.gz'.length))
      let mk = await markdown(reg, ts)
      console.log('writing', m)
      fs.writeFileSync(m, mk)
    }
  }
}

const ensureLatest = async () => {
  let archive = __dirname + '/../archive'
  let files = (await fs.promises.readdir(archive)).sort()
  let last = files[files.length - 1]
  fs.writeFileSync(__dirname + '/../README.md', fs.readFileSync(archive + '/' + last))
}

const main = async () => {
  await pull()
  await regs()
  await ensureLatest()
}

module.exports = main

