import path from 'path'
import stream from 'stream'

import express from 'express'

import Environment, { SessionParameters, Platform } from './Environment'

const app = express()
const expressWs = require('express-ws')(app)

// Serve static assets from ./static
app.use(express.static(path.join(path.dirname(__dirname), 'static')))

// Instantiate shell and set up data handlers
expressWs.app.ws('/shell', async (ws: any, req: any) => {
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
})

app.listen(3000)
console.error('Listening on http://localhost:3000')
