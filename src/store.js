const Dat = require('dat-node')
const pda = require('pauls-dat-api')

const DIR = '/home/nokome/nixster'
const KEY = '14f58766270b33ebd18377955c82992214956438e15d22dfb1d0844fa888d8ea'

function share () {
  Dat(DIR, {}, (err, dat) => {
    if (err) throw err

    const importer = dat.importFiles({
      count: true,
      ignoreDirs: false,
      watch: true
    })
    importer.on('put', (src, dest) => {
      console.log(`Importing ${src.name} to ${dest.name}`)
    })
    importer.on('count', ({files, bytes}) => {
      console.log(`Importing ${files} files of ${bytes} bytes`)
    })

    dat.join()

    dat.network.on('connection', () => {
      console.log('Connection')
    })
    
    const key = dat.key.toString('hex')
    console.log(`Sharing store at dat://${key}`)
  })
}

function files (path, cb) {
  connect(async dat => {
    const files = await pda.readdir(dat.archive, path, { recursive: true })
    
    console.log('Leaving network')
    dat.leave()
    
    cb(files)
  })
}

function sync () {
  fetch([
    '/db.sqlite3',
    '/envs/'
  ])
}

function fetch (files) {
  connect(async dat => {
    for (let file of files) {
      await pda.download(dat.archive, file)
      console.log(`Downloaded ${file}`)
    }
    dat.leave()
  })
}

function connect (cb) {
  Dat(DIR + '-client', {key: KEY, sparse: true}, (err, dat) => {
    if (err) throw err

    console.log('Joining network')
    dat.join(function (err) {
      if (err) throw err
  
      if (!dat.network.connected || !dat.network.connecting) {
        console.error('No users currently online for that key.')
        process.exit(1)
      }
    })

    cb(dat)
  })
}

module.exports = {
  share, fetch, sync, files
}