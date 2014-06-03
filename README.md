# interleavings

Test async systems by reordering callbacks 
deterministically but randomly.

# introduction

In node you write async code, and if you want *working* async
code you need to test it too. But how do you test it?
lets say you have something like this:

``` js
//call two async functions in parallel,
//then get a result when they have BOTH finished.
both([
  function A (cb) {
    //notice this calls back syncly - we'll get to that soon.
    cb(null, 1)
  },
  function B (cb) {
    cb(null, 2)
  }
],
function (err, values) {
  //err => null
  //values => [1, 2]
  assert.notOk(err)
  assert.deepEqual(values, [1, 2])
})
```
If each callback is called asyncly, that also means they may be called in any order.
`A` could be called first, or `B` could be called first - this is what "async" means.
Sometimes subtle bugs occur when async things happen in particular orders (aka. "race condition")

So, we need to write test cases that cover at least more than one order,
This is okay when there are only two async calls - there are 2 orderings.
But as the number of parallel calls increases, the possible orderings increases
dramaticall! If there are 5 parallel calls there `120` orderings and
for `7` there are `5040`!!!

In general - `N` parallel async calls give `N!` possible orderings.

It would be easy to miss such a race condition in your testcase!

## a solution

Just try different orderings randomly!
(but deterministically, so if you find an error, you can reproduce it)
You must wrap each callback with the `async` function to randomly
order it. Then, interleavings will run the test many times (default is 100)
and check how many times the test passed.

``` js
interleavings.test(function (async) {
  both([
    function A (cb) {
      //wrap each callback in `async`,
      //it is now randomly ordered.
      async(cb) (null, 1)
    },
    function B (cb) {
      async(cb) (null, 2)
    }
  ],
  function (err, values) {
    //err => null
    //values => [1, 2]
    assert.notOk(err)
    assert.deepEqual(values, [1, 2])
  })
})
```

If it passed every time - your code might work -
so write some more tests to check.
If it fails every time, it's just plain broken.
But if it only fails *sometimes* you have found a race condition!

## determinism

If you want your test to be reproducable it must be deterministic.
This means any IO must be mocked, and you should not use `setTimeout`.
If you use a `nextTick` or `setImmediate` that is probably acceptable.
You _may_ sometimes callback syncly - if the callback is wrapped
by `async(cb)` then *sometimes* it will call it immediately,
so you will still test interleavings where sync calls happen.

### INTLVR=runs

set the number of times to try different interleavings for each test.

### INTLVS=seed

run the test only once - with the given seed.

## License

MIT
