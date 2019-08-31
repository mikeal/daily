const JSONStream = require('json-stream')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

class Results {
  constructor () {
    this.data = { byAge: [] }
  }
  increment(...keys) {
    let o = this.data
    while (keys.length) {
      let key = keys.shift()
      let last = !keys.length
      if (last) {
        if (!o[key]) o[key] = 0
        o[key] += 1
      } else {
        if (!o[key]) o[key] = {}
        o = o[key]
      }
    }
  }
  onEvent (event) {
    this.increment('activity', event.type, event.actor)
    if (event.action) {
      this.increment('actions', event.type, event.action, event.actor)
    }
    if (event.age) {
      const byAge = this.data.byAge
      byAge.push([new Date(event.age), event])
    }
    this.data.byAge = this.data.byAge.sort((x, y) => x[0] - y[0]).slice(0, 10)
  }
}

const regression = async (basepath, ts) => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const results = new Results()
  for (let i = 0; i < 24; i++) {
    let filename = `${year}-${month}-${day}-${i}.json.gz`
    console.log(filename)
    const stream = fs.createReadStream(path.join(basepath, filename))
    const reader = stream.pipe(zlib.createUnzip()).pipe(JSONStream())
    for await (let event of reader) {
      results.onEvent(event)
    }
  }
  return results.data
}

module.exports = regression
