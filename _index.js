const debug = require('debug')('interleavings')
'use strict';

var RNG = require('rng')

var rng = new RNG.MT(Date.now())

var heap = {}, waiting = []

function empty (o) {
  for(var key in o)
    return false
  return true
}

function first (o) {
  for(var key in o)
    return o[key]
}
var dead = false
function callSomething () {
  queued = false

  var any = 0
  var fn = first(heap)
  if(fn) {
    fn(); queue()
  }
  else {
    process.nextTick(function () {
      if(first(heap)) return
      dead = true
      debug('DRAIN!!!!', heap)
      while(waiting.length)
        waiting.shift()()
    })
  }
}

var queued = false
function queue() {
  if(queued) return
  queued = true

  setImmediate(callSomething)
}

var asyncly = module.exports = function (cb) {

  return function () {
    var args = [].slice.call(arguments)
    var self = this
    var key = ~~(rng.random() * 0xfffffff)
    if(dead)
      throw new Error('may not add a thing after drained')
    var _cb = function () {
      delete heap[key]
      return cb.apply(self, args)
    }

    //sometimes call immediately.
    if(rng.random() < 0.4)
      return _cb()

    heap[key] = _cb

    queue()
  }
}

asyncly.seed = function (n) {
  rng = new RNG.MT(n)
}


asyncly.drain = function (cb) {
  if(empty(heap)) cb()
  else            waiting.push(cb)
}


