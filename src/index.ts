// --------------------------------------------------------
// NOTICE: if you're looking to use this library, it is
// recommended copy/pasting the ./channels/channel.ts file
// into your local project. Its a single source file.
// --------------------------------------------------------


// tslint:disable

import { channel, Receiver, Sender, select, source } from './channels/index'

const [tx, rx] = channel()
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

setImmediate(async () => {
  for await (const value of rx) {
    console.log(value)
  }
})