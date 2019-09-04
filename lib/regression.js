const JSONStream = require('json-stream')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const read = name => fs.readFileSync(__dirname + '/' + name).toString()

const knownBots = new Set(JSON.parse(read('bots.json')))
const blockedList = new Set(JSON.parse(read('blocked.json')))

const isBot = actor => {
  if (actor.endsWith('[bot]')) return true
  if (actor.endsWith('-bot')) return true
  if (actor.includes('-bot-')) return true
  if (knownBots.has(actor)) return true
  return false
}

class Results {
  constructor () {
    this.data = {}
    this.all = {}
    this.unique = {}
    this.byAge = []
  }

  increment (...keys) {
    let o = this[keys.shift()]
    while (keys.length) {
      const key = keys.shift()
      const last = !keys.length
      if (last) {
        if (!o[key]) o[key] = 0
        o[key] += 1
      } else {
        if (!o[key]) o[key] = {}
        o = o[key]
      }
    }
  }

  add (...keys) {
    let o = this[keys.shift()]
    while (keys.length) {
      const key = keys.shift()
      const last = keys.length === 1
      if (last) {
        const value = keys.shift()
        if (!o[key]) o[key] = new Set()
        o[key].add(value)
      } else {
        if (!o[key]) o[key] = {}
        o = o[key]
      }
    }
  }

  insert (...keys) {
    this.increment('data', ...keys)
    this.add('unique', ...keys)
  }

  onEvent (event) {
    if (blockedList.has(event.actor) || blockedList.has(event.repo)) return
    // TODO: count unique actors and repos
    this.increment('all', 'all-activity')
    this.increment('all', 'activity', event.type)
    this.add('unique', 'repo', event.repo)
    if (isBot(event.actor)) {
      this.insert('activity', 'bot', event.type, event.actor)
      this.add('unique', 'bot', event.actor)
    } else {
      this.insert('activity', 'user', event.type, event.actor)
      this.add('unique', 'user', event.actor)
    }
    this.insert('activity', 'repo', event.type, event.repo)
    if (event.action) {
      this.increment('all', 'actions', event.type, event.action)
      if (isBot(event.actor)) {
        this.insert('actions', 'bot', event.type, event.action, event.actor)
      } else {
        this.insert('actions', 'user', event.type, event.action, event.actor)
      }
      this.insert('actions', 'repo', event.type, event.action, event.repo)
    }
    if (event.age) {
      const byAge = this.byAge
      byAge.push([new Date(event.age), event])
    }
    this.byAge = this.byAge.sort((x, y) => x[0] - y[0]).slice(0, 10)
  }

  _exportData (o) {
    const results = {}
    const key = Object.keys(o)[0]
    if (typeof o[key] === 'number') {
      return Array.from(Object.entries(o)).sort((x, y) => y[1] - x[1]).slice(0, 10)
    } else {
      for (const [key, value] of Object.entries(o)) {
        results[key] = this._exportData(value)
      }
    }
    return results
  }

  _exportUnique (o) {
    const results = {}
    for (const [key, value] of Object.entries(o)) {
      if (value instanceof Set) {
        results[key] = value.size
      } else {
        results[key] = this._exportUnique(value)
      }
    }
    return results
  }

  export () {
    const r = this._exportData(this.data)
    r.all = this.all
    r.unique = this._exportUnique(this.unique)
    return r
  }
}

const regression = async (basepath, ts) => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const results = new Results()
  for (let i = 0; i < 24; i++) {
    const filename = `${year}-${month}-${day}-${i}.json.gz`
    console.log('reading', filename)
    const stream = fs.createReadStream(path.join(basepath, filename))
    const reader = stream.pipe(zlib.createUnzip()).pipe(JSONStream())
    for await (const event of reader) {
      results.onEvent(event)
    }
  }
  return results.export()
}

module.exports = regression
