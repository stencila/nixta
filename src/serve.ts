import path from 'path'
import stream from 'stream'
import yargs from 'yargs'

import express from 'express'

import Environment, { SessionParameters, Platform } from './Environment'

const DEFAULT_PORT = 3000

let argv = yargs.scriptName('nixster-serve')
    .help('h')
    .alias('h', 'help')
    .option('port', {
      alias: 'p',
      default: DEFAULT_PORT,
      describe: 'Port to listen on',
      type: 'number'
    })
    .option('address', {
      alias: 'a',
      default: 'localhost',
      describe: 'Host address to listen on',
      type: 'string'
    })
    .argv

const app = express()
const expressWs = require('express-ws')(app)

// Serve static assets from ./static
app.use(express.static(path.join(__dirname, 'static')))

// JSON Body Parsing
const jsonParser = require('body-parser').json()
app.use(jsonParser)

// todo: rename shell to interact
// Instantiate shell and set up data handlers
expressWs.app.ws('/shell', async (ws: any, req: express.Request) => {
  try {
    // Create streams that pipe between the Websocket and
    // the pseudo terminal

    // A pseudo stdin that receives data from the Websocket
    const stdin = new stream.PassThrough()
    ws.on('message', (msg: any) => {
      stdin.write(msg)
    })

    // A pseudo stdout that writes data to the Websocket
    const stdout = new stream.Writable({
      write (chunk: Buffer, encoding: any, callback: any) {
        ws.send(chunk)
        callback()
      }
    })

    let env = new Environment('multi-mega')

    const sessionParameters = new SessionParameters()
    sessionParameters.platform = Platform.DOCKER
    sessionParameters.stdin = stdin
    sessionParameters.stdout = stdout
    await env.enter(sessionParameters)
  } catch (error) {
    console.error(error)
  }
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: any) => {
  console.error(error.stack)
  res.status(500)
  res.render('error', { error })
  next(error)
})

expressWs.app.post('/execute', jsonParser, async (req: any, res: any) => {
  // req: some JSON -> new SessionParameters object to start in env.execute (new execute method)
  if (!req.body) return res.sendStatus(400)

  const env = new Environment(req.body.environmentId)
  const sessionParameters = new SessionParameters()
  sessionParameters.platform = Platform.DOCKER
  sessionParameters.command = req.body.command || ''

  const containerId = await env.execute(sessionParameters)
  res.status(200).json({
    containerId: containerId
  })
})

expressWs.app.post('/stop', async (req: any, res: any) => {
  // req: some JSON -> with container ID that will stop the container
})

app.listen(argv.port, argv.address)
console.info(`Listening on http://${argv.address}:${argv.port}`)
