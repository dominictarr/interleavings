const debug = require('debug')('interleavings')
'use strict';

var RNG = require('rng')
var path = require('path')

function first (o) {
  for(var k in o)
    return k
}

function chars(n, ch) {
  var s = ''
  while(n--)
    s += ch
  return s
}

//this part handles the callbacks and interleavings.

var create = module.exports = function (seed, cb) {
  var rng = new RNG.MT(seed), all = {}, created = [], called = []
  var l = 10000, pending = 0

  var heap = [], not_called = []
  var result
  var ended
  var queued = false

  function next () {
    if(queued) return
    queued = true
    if(ended) return

    rng.random() < 0.4 ? setImmediate(call) : setTimeout(call, 10)

    function call() {

      queued = false

      var key = first(heap)
      var cb = heap[key]
      delete heap[key]
      if(cb) {
        try { cb() }
        catch (err) { console.error(err); return async.done(err) }
        setImmediate(next)
     }
    }
  }

  function async (cb, name) {
    var m = 'cb was not called\n  created at:'
    var id
    name = name || new Error(m)

    if(name.stack) {
      //name.message = m

      var line = name.stack.split('\n').filter(function (line) {
        return /^\s+at /.test(line)
      })[1].replace(/^\s+at\s/, '')
      name = path.relative(process.cwd(), line)

    }
    all[name] = (all[name] || 0) + 1
    id = name + '(' + all[name] + ')'
    created.push(id)

    not_called.push(id)

    return function () {
      var args = [].slice.call(arguments)
      var self = this
      pending ++
      //debug(chars(pending*2, '-')+'>', id)
      function _cb () {
        called.push(id)
        not_called.splice(not_called.indexOf(name), 1)
        //debug('<'+chars(pending*2, '-'), id)
        pending --
        return cb.apply(self, args)
      }

      if(rng.random() < 0.3)
        try { return _cb() }
        catch (err) { return async.done(err) }

      while (true) {
        var i = rng.range(0, 0xffff)
        if(!heap[i]) {
          heap[i] = _cb
          break;
        }
      }

      next ()

    }
  }

  async.through = function (name) {
    name = name || new Error()
    return function (read) {
      return function (abort, cb) {
        async(read, name+':read')(abort, async(cb, name+':cb'))
      }
    }
  }

  process.on('exit', forgot)
  process.setMaxListeners(Infinity)

  function forgot () {
    not_called.forEach(function (err) {
      console.error(err.stack)
    })
    async.done(new Error('never called'))
  }

  async.done = function (err, value) {
    if(ended) return
    ended = true
    if(result) {
      result.passed = false
      result.calls ++
      result.error = result.error || new Error('called done twice')
      return
    }

    process.removeListener('exit', forgot)

    result = {
      error: err,
      value: value,
      passed: !err,
      calls: 1,
      seed: seed,
      called: called
    }

    debug('created from: count')
    debug(all)
    debug('created order:')
    debug(created)
    debug('called order:')
    debug(called)
    debug('*********************')
    if(cb) cb(err, result)
    else if(err) throw err
    else debug(result)
  }

  return async
}

create.test = require('./tester')

if(!module.parent) {

  var async = create(Date.now())

  async(function () {
    debug(1)
  }) ()
  async(function () {
    debug(2)
  }) ()
  async(function () {
    debug(3)
  }) ()

}
