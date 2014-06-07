var create = require('./')
var infer = require('infer-partial-order')

module.exports = function (test, cb) {
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
        messages[outcome] = [e]
      else {
        messages[outcome].push(e)
      }

      if(e.calls > 1)
        stats.errors ++
    })

    var outcomes = Object.keys(messages)
                .sort(function (a, b) {
                  if(a === 'passed') return -1
                  if(b === 'passed') return 1
                  return messages[b].length - messages[a].length
                }).slice(0, 5)

    console.log(outcomes)

    function min(ary, get) {
      var m = Infinity, _m, v
      ary.forEach(function (_v) {
        if((_m = get(_v)) < m) {
          v = _v; m = _m
        }
      })
      return v
    }

    function max(ary, get) {
      var m = -Infinity, _m, v
      ary.forEach(function (_v) {
        if((_m = get(_v)) > m) {
          v = _v; m = _m
        }
      })
      return v
    }

    var worstErrors = outcomes.map(function (key) {
          return {
            outcome: key,
            average: messages[key].reduce(function (a, b) {
              return a + b.called.length
            }, 0) / messages[key].length,
            min: (function () {
              var v = min(messages[key], function (b) {
                return b.called.length
              })
              return {seed: v.seed, length: v.called.length, called: v.called}
            })()
          }
        })

    console.log(JSON.stringify(worstErrors, null, 2))

    console.log(
      infer(messages[outcomes[0]]
        .map(function (e) { return e.called })
        , true))

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

