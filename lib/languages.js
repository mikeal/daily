const fs = require('fs')
const csv = require('csv-parser')
const { stringify } = require('csv-string')

const dbfile = __dirname + '/../data/languages.csv'

const { graphql } = require('@octokit/graphql')
const { inspect } = require('util')

const sleep = i => new Promise(resolve => setTimeout(resolve, i))

const sum = (x, y) => x + y

const query = async repos => {
  const qs = repos.map(r => `repo:${r}`).join(' ')
  const response = await graphql(
    `{ 
      search(query: "${qs} fork:true", type: REPOSITORY, first: 100) {
        repositoryCount
        nodes {
          ... on Repository {
            nameWithOwner
            languages (first: 100) {
              edges {
                node {
                  name
                }
                size
              }
            }
          }
        }
      }
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }
    }
    `,
    {
      headers: {
        authorization: `token ${process.env.GHTOKEN || process.env.GITHUB_TOKEN}`
      }
    }
  )

  const { remaining, cost, resetAt } = response.rateLimit
  if ((remaining - cost) < 0) {
    console.log('sleeping')
    await sleep(((new Date(resetAt)).getTime() - Date.now()) + 1000)
  }
  // console.log(response.rateLimit)
  let results = {}
  
  let nodes = response.search.nodes
  for (let node of nodes) {
    let total = node.languages.edges.map(e => e.size).reduce(sum, 0)
    let value = {}
    for (let edge of node.languages.edges) {
      value[edge.node.name] = parseFloat((edge.size / total).toFixed(2))
      if (!value[edge.node.name]) delete value[edge.node.name]
    }
    results[node.nameWithOwner] = value
  }
  // console.log(inspect(nodes, { depth: Infinity }))
  return results
}


class Languages {
  constructor () {
    this.loaded = this.load()
    this.db = {}
    this.pending = {}
  }
 
  async load () {
    /* 
     * it occurs to me that a better way to do this
     * given the usage and the size of the data,
     * is to never load it into memory and to simply
     * accept a list of repos to add, and a list of
     * repos to query. Instead of an in-memory object or 
     * map/set just do a full scan before adding and 
     * only support retrieval in bulk.
     */
    const reader = fs.createReadStream(dbfile).pipe(csv())
    for await (let entry of reader) {
      this.db[entry.REPO] = entry.LANG
    }
  }
  async get (keys) {
    await this.loaded
    let results = {}
    for (let key of keys) {
      let value = this.pending[key] || this.db[key] || null
      let lang = {}
      for (let entry of value.split('/')) {
        let [k, v] = entry.split(':')
        v = parseInt(v)
        lang[k] = v
      }
      results[key] = lang
    }
    return results 
  }
  async add (repos) {
    await this.loaded
    let _repos = []
    for (let repo of new Set(repos)) {
      if (!this.db[repo] && !this.pending[repo]) _repos.push(repo)
    }
    while (_repos.length) {
      let bulk = _repos.splice(0, 100)
      let results = await query(bulk)
      for (let [key, value] of Object.entries(results)) {
        // console.log({key, value})
        this.pending[key] = value
      }
      console.log(_repos.length, 'remaining')
    }
  }
  async save () {
    await this.loaded
    const pending = Array.from(Object.entries(this.pending)).map(p => {
      p = p.slice()
      p[1] = Array.from(Object.entries((p[1]))).map(x => `${x[0]}:${x[1]}`).join('/')
      return p
    })
    let str = stringify(pending)
    // str = str.slice(0, str.length - 2)
    const fd = fs.openSync(dbfile, 'a')
    fs.writeSync(fd, str)
    fs.closeSync(fd)
    this.db = Object.assign(this.db, this.pending)
    this.pending = {}
  }
}

module.exports = () => new Languages()

const run = async () => {
  let l = new Languages()
  console.log(await l.get(['mikeal/bent', 'request/caseless']))
}
// run()
