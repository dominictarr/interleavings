

//BUG: will fail if cb is async.
exports.para1 = function (items, cb) {
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

exports.para2 = function  (items, cb) {
  var n = 0
  var output = []
  for(var k in items) {
    (function (k) {
      n++
      items[k](function (_, value) {
        output[k] = value
        if(!--n) return cb(null, output)
      })
    })(k)
  }
}


exports.para3 = function  (items, cb) {
  var n = items.length
  var output = []
  for(var k in items)
    (function (k) {
      items[k](function (_, value) {
        output[k] = value
        if(!--n) return cb(null, output)
      })
    })(k)
}


