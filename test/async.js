'use strict';

//lets make a simple async callback framework...

var asyncly = require('../')
var deepEqual = require('deep-equal')

//asyncly = function (cb) { return cb }



//BUG: will fail if cb is async.
function para1 (items, cb) {
  var n = items.length
  var output = []
  for(var k in items) {
    items[k](function (_, value) {
      output[k] = value
      if(!--n) return cb(null, output)
    })
  }
}


//BUG: may fail with sync callbacks
//count up when calling something,
//and count down until 0.
//if the first cb is sync, it will cb too early.
function para2 (asyncly, items, cb) {
  var n = 0
  var output = []
  for(var k in items) {
    (function (k) {
      n++
      items[k](asyncly(function (_, value) {
        output[k] = value
        if(!--n) return cb(null, output)
      }))
    })(k)
  }
}

var tape = require('tape')

function async_test (async, para, cb) {
  var result = {ended: false}
  var done = 1
  para([
    function (cb) {
      async(cb) (null, 1)
    },
    function (cb) {
      async(cb) (null, 2)
    },
    function (cb) {
      async(cb) (null, 3)
    }
  ], function (err, ary) {
    if(--done) console.log('TWICE!')
    cb(deepEqual(ary, [1, 2, 3]) ? null : new Error('failed'),  ary)
  })

}

//for(var i = 1; i < 1000; i ++)

asyncly.times = function (n, fn, cb) {
  var results = []

  ;(function next(i) {
    var result = {seed: i, callbacks: 0}
    asyncly.seed(i)
    fn.call(asyncly, function (err, value) {
      if(results[i]) {
        result.passed = false
        return result.callbacks++
      }

      result.error = err
      result.value = value
      result.passed = !err
      result.callbacks = 1
      results[i] = result

      
        if (i < n)
          next(++i)
        else
          done()
    })
  }(1))

  function done () {
    //make sure all cbs we started are finished.
    //this will error if any have fired twice.
    asyncly.drain(function (err) {
      console.log('drain')

      var stats = {
        total: results.length,
        passes: 0,
        failures: 0,
        twice: 0
      }

      var passed =
        results.forEach(function (e) {
          if(!e.error && e.callbacks === 1) {
            stats.passes ++
          } else {
            stats.failures ++
            if(e.callbacks > 1)
              stats.twice ++
          }
        })

      cb(null, results, stats)
    })
  }
}

//for(var i = 1; i < 1000; i ++)
//  async(para2, i)

tape('run tests deterministically - para1', function (t) {
  asyncly.times(100, async_test.bind(null, para1), function (err, results, stats) {
    console.log(stats)
    //rerun the tests and get the same result.
    asyncly.times(100, async_test.bind(null, para1), function (err, _results, _stats) {
      t.deepEqual(_results, results)
      //this test is deterministic, so we should get exactly 159 passes.
      t.equal(stats.passes, 12)
      t.end()
    })
  })
})

return
tape('run tests deterministically - para2', function (t) {
  function test2 (asyncly, cb) { async_test(asyncly, para2, cb) }
  asyncly.times(100, test2, function (err, results, stats) {
    console.log(stats)
    //rerun the tests and get the same result.
    asyncly.times(100, test2, function (err, _results, _stats) {
      t.deepEqual(_stats, stats)
//      t.deepEqual(_results, results)
      //this test is deterministic, so we should get exactly 159 passes.
//      t.equal(stats.passes, 159)
      t.end()
    })
  })
})

