'use strict';

var RNG = require('rng')
var path = require('path')
var infer = require('infer-partial-order')

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
      //console.log(chars(pending*2, '-')+'>', id)
      function _cb () {
        called.push(id)
        not_called.splice(not_called.indexOf(name), 1)
        //console.log('<'+chars(pending*2, '-'), id)
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
        read(abort, async(cb, name))
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

    console.log('created from: count')
    console.log(all)
    console.log('created order:')
    console.log(created)
    console.log('called order:')
    console.log(called)
    console.log('*********************')
    if(cb) cb(err, result)
    else if(err) throw err
    else console.log(result)
  }

  return async
}

create.test = function (test, cb) {
  function run (seed, cb) {
    var async = create(seed, cb)
    test(async)
  }

  var seed = +process.env.INTLVS
  if(!isNaN(seed)) {
    return run(seed, function (err, result) {
      if(cb) return cb(err, result)
      else if(err) {
        //DO NOT allow anything to swallow this error.
        console.error(err.stack)
        process.exit(1)
      }
      else console.log(result || 'passed')
    })
  }

  var total = process.env.INTLVR || 100
  var n = total, results = []

  for( var i = 0; i < total; i++)
    (function (i) {

      run(i, function (err, result) {
        if(err) result.error = err
        results[i] = result
        done()
      })

    })(i)

  function done () {
    if(--n) return

    var stats = {
      passes: 0,
      total: results.length,
      failures: 0,
      errors: 0
    }
    var err = null, seed

    //collect the most common error messages
    var messages = {}
    var called = []

    results.forEach(function (e) {
      var error = e.error
      if((!e.error) && e.calls === 1)
        stats.passes ++
      else {
        if(seed == null) seed = e.seed
        if(err == null)  err = e.error
        stats.failures ++
      }
      var outcome = error ? error.message : 'passed'
      if(!messages[outcome])
        messages[outcome] = {error: err, count: 1, called: [e.called]}
      else {
        messages[outcome].count ++
        messages[outcome].called.push(e.called)
      }

      if(e.calls > 1)
        stats.errors ++
    })

    var outcomes = Object.keys(messages)
                .sort(function (a, b) {
                  return messages[b].count - messages[a].count
                }).slice(0, 5)

    var worstErrors = outcomes.map(function (key) {
                return messages[key]
              })

    console.log(worstErrors)

    console.log(infer(messages[outcomes[0]].called, true))

    if(stats.failures) {
      var message =
        '(interleavings: failed ' + stats.failures
      + ' out of ' + stats.total
      + ', first failing seed: ' + seed + ')'

      if(!err) err = new Error(message)
      err.message = err.message + '\n  ' + message
    }
    if(cb) cb(err, results, stats)
    else if(err) {
      //DO NOT allow anything to swallow this error.
      console.error(err.stack)
      process.exit(1)
    }
    else console.log(stats)
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
