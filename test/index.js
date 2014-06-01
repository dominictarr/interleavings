var assert = require('assert')
var async = require('../')
var tape = require('tape')

var para = require('./fixtures/para')


function simpleAsync (para, async) {
  para([
    function (cb) {
      async(cb)(null, 1)
    },
    function (cb) {
      async(cb)(null, 2)
    },
    function (cb) {
      async(cb)(null, 3)
    },
  ],
  function (err, results) {
    assert.deepEqual(results, [1, 2, 3])
    async.done(err, results)
  })

}

tape('simple-failures', function (t) {

  async.test(function (async) {
      simpleAsync(para.para1, async)
    },
    function (err, results, stats) {

      t.ok(stats.failures > 0)
      t.ok(stats.passes < 100)

      async.test(function (async) {
        simpleAsync(para.para1, async)
      }, function (err, _results, _stats) {

        t.deepEqual(_stats, stats)
        t.deepEqual(_results, results)
        t.end()
      })

    })
})

tape('calls-twice', function (t) {

  async.test(function (async) {
      simpleAsync(para.para2, async)
    },
    function (err, results, stats) {

      t.ok(stats.failures > 0)
      t.ok(stats.passes < 100)

      async.test(function (async) {
        simpleAsync(para.para2, async)
      }, function (err, _results, _stats) {
        console.log(_stats)
        t.deepEqual(_stats, stats)
        t.deepEqual(_results, results)
        t.end()
      })

    })

})

tape('calls-correctly', function (t) {

  async.test(function (async) {
      simpleAsync(para.para3, async)
    },
    function (err, results, stats) {

      t.equal(stats.passes, 100)
      t.equal(stats.failures, 0)

      async.test(function (async) {
        simpleAsync(para.para3, async)
      }, function (err, _results, _stats) {
        t.deepEqual(_stats, stats)
        t.deepEqual(_results, results)
        t.end()
      })
    })
})

