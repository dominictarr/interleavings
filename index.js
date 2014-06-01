'use strict';

var RNG = require('rng')

function first (o) {
  for(var k in o)
    return k
}

var create = module.exports = function (seed, cb) {
  var rng = new RNG.MT(seed)
  var l = 10000

  var heap = []
  var result
  var ended
  var queued = false

  function next () {
    if(queued) return
    queued = true
    if(ended) return

    rng.random() < 0.4 ? setImmediate(call) : setTimeout(call)

    function call() {

      queued = false

      var key = first(heap)
      var cb = heap[key]
      delete heap[key]
      if(cb) {
        try { cb() }
        catch (err) { return async.done(err) }
      }
      else return

      setImmediate(next)

    }
  }

  function async (cb) {
    return function () {
      var args = [].slice.call(arguments)
      var self = this
      function _cb () {
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

  process.on('exit', forgot)

  function forgot () {
    console.log('FODGAT', seed)
    async.done(new Error('never called'))
  }

  async.done = function (err, value) {
    if(ended) return
    ended = true
    if(result) {
      result.passed = false
      result.calls ++
      return
    }

    process.removeListener('exit', forgot)

    result = {
      error: err,
      value: value,
      passed: !err,
      calls: 1,
      seed: seed
    }

    cb(null, result)
  }

  return async
}

create.test = function (test, cb) {
  var total = 100
  var n = total, results = []
  for( var i = 0; i < total; i++)
    (function (i) {

      var async = create(i, function (_, result) {
        results[i] = result
        done()
      })

      test(async)

    })(i)

  function done () {
    if(--n) return
    var stats = {
      passes: 0,
      total: results.length,
      failures: 0,
      errors: 0
    }

    results.forEach(function (e) {
      if((!e.error) && e.calls === 1)
        stats.passes ++
      else
        stats.failures ++
      if(e.calls > 1)
        stats.errors ++
    })

    cb(null, results, stats)
  }
}


if(!module.parent) {

  var async = create(Date.now())

  async(function () {
    console.log(1)
  }) ()
  async(function () {
    console.log(2)
  }) ()
  async(function () {
    console.log(3)
  }) ()

}
