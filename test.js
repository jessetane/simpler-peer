var SimplerPeer = require('./')
var tape = require('tape')

var p1 = null
var p2 = null

tape('connect', function (t) {
  t.plan(2)

  p1 = new SimplerPeer({ initiator: true })
  p2 = new SimplerPeer()

  p1.on('signal', function (signal) {
    p2.signal(signal)
  })

  p2.on('signal', function (signal) {
    p1.signal(signal)
  })

  p1.on('connect', function () {
    t.pass('p1 connected')
  })

  p2.on('connect', function () {
    t.pass('p2 connected')
  })
})

tape('data', function (t) {
  t.plan(6)

  p1.testChannel = p1.createDataChannel('test-channel')

  p1.testChannel.on('message', function (evt) {
    var data = evt.data
    t.equal(data instanceof ArrayBuffer, true)
    data = new Uint8Array(data)
    t.equal(data[0], 1)
    t.equal(data[1], 127)
    t.equal(data[2], 255)
  })

  p1.testChannel.send('wow')

  p2.on('datachannel', function (channel) {
    t.equal(channel.label, 'test-channel', 'p2 saw channel open')
    p2.testChannel = channel

    p2.testChannel.on('message', function (evt) {
      t.equal(evt.data, 'wow')
      var buffer = new ArrayBuffer(3)
      var view = new Uint8Array(buffer)
      view[0] = 1
      view[1] = 127
      view[2] = 255
      p2.testChannel.send(buffer)
    })
  })
})

tape('close', function (t) {
  t.plan(2)

  p1.on('close', function () {
    t.pass('p1 closed')
  })

  p2.on('close', function () {
    t.pass('p2 closed')
  })

  p1.close()
  p2.close()
})

tape('connect without trickle ice', function (t) {
  t.plan(4)

  p1 = new SimplerPeer({ initiator: true, trickle: false })
  p2 = new SimplerPeer({ trickle: false })

  var p1DidSignal = false
  var p2DidSignal = false

  p1.on('signal', function (signal) {
    t.equal(p1DidSignal, false, 'p1 should only get one signal')
    p1DidSignal = true
    p2.signal(signal)
  })

  p2.on('signal', function (signal) {
    t.equal(p2DidSignal, false, 'p2 should only get one signal')
    p2DidSignal = true
    p1.signal(signal)
  })

  p1.on('connect', function () {
    t.pass('p1 connected')
  })

  p2.on('connect', function () {
    t.pass('p2 connected')
  })
})

tape('close without trickle', function (t) {
  t.plan(2)

  p1.on('close', function () {
    t.pass('p1 closed')
  })

  p2.on('close', function () {
    t.pass('p2 closed')
  })

  p1.close()
  p2.close()
})

tape('renegotiation triggered by addStream', function (t) {
  t.plan(4)

  p1 = new SimplerPeer({ id: 'p1', initiator: true })
  p2 = new SimplerPeer({ id: 'p2' })

  p1.on('signal', function (signal) {
    p2.signal(signal)
  })

  p2.on('signal', function (signal) {
    p1.signal(signal)
  })

  p1.on('connect', function () {
    t.pass('p1 connected')
    connect()
  })

  p2.on('connect', function () {
    t.pass('p2 connected')
    connect()
  })

  var n = 2
  function connect () {
    if (--n !== 0) return

    var ctx = new AudioContext()

    var stream1 = ctx.createMediaStreamDestination().stream
    p1.on('stream', function (stream) {
      t.ok(stream)
      addStream()
    })

    var stream2 = ctx.createMediaStreamDestination().stream
    p2.on('stream', function (stream) {
      t.ok(stream)
      addStream()
    })

    p1.addStream(stream1)
    p2.addStream(stream2)
  }

  var o = 2
  function addStream () {
    if (--o !== 0) return
    p1.close()
    p2.close()
  }
})

tape('renegotiation only uses the latest of multiple offers', function (t) {
  t.plan(3)

  p1 = new SimplerPeer({ initiator: true })
  p2 = new SimplerPeer()

  p1.on('signal', function (signal) {
    p2.signal(signal)
  })

  p2.on('signal', function (signal) {
    p1.signal(signal)
  })

  p1.on('connect', function () {
    t.pass('p1 connected')
    connect()
  })

  p2.on('connect', function () {
    t.pass('p2 connected')
    connect()
  })

  var n = 2
  function connect () {
    if (--n !== 0) return

    var ctx = new AudioContext()

    var stream1 = ctx.createMediaStreamDestination().stream
    p1.on('stream', function (stream) {
      t.ok(stream)
      addStream()
    })

    var stream2 = ctx.createMediaStreamDestination().stream
    p2.on('stream', function (stream) {
      t.fail()
    })

    p1.addStream(stream1)
    p2.addStream(stream2)

    // this will cause p2 to get multiple offers
    // before setting localDescription
    p1.removeStream(stream1)
  }

  function addStream () {
    p1.close()
    p2.close()
  }
})
