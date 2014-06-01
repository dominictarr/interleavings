
var async = require('../')
var pull = require('pull-stream')
var many = require('pull-many')
var assert = require('assert')
//var tape = require('tape')
//
//
//tape('paramap', function (t) {
//
//  async.test(function (async) {
//
//    pull(
//      pull.values([1,2,3,4,5,6,7]),
//      pull.paraMap(function (d, cb) {
//        async(cb) (null, d*10)
//      }),
//      pull.collect(function (err, ary) {
//        console.log(ary)
//        assert.deepEqual(ary, [10,20,30,40,50,60,70])
//        async.done()
//      })
//    )
//
//  }, function (err, results, stats) {
//    t.equal(stats.passes, 100)
//    t.end()
//  })
//
//})
//
//tape('many', function (t) {
//

async.test(function (async) {

    function p (read) {
      return function (abort, cb) {
        read(abort, async(cb))
      }
    }

    pull(
      //pull many must return a result in the same partial order.
      //so if we have a stream of even and a stream of odd numbers
      //then those should be in the same order in the output.
      many([
        pull.values([1,3,5,7]),
        pull.values([2,4,6,8])
      ].map(p)),
      pull.collect(function (err, ary) {
        console.log(ary)
        var odd  = ary.filter(function (e) { return e % 2 })
        var even = ary.filter(function (e) { return !(e % 2) })

        assert.deepEqual(even, [2,4,6,8])
        assert.deepEqual(odd, [1,3,5,7])
        async.done()
      })
    )

  }, function (err, results, stats) {
    console.log(results)
//    assert.equal(stats.passes, 100)
  //  t.end()
  })

//})


