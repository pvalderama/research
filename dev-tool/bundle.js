(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
;(function(root, factory) { // eslint-disable-line no-extra-semi
  var deepDiff = factory(root);
  // eslint-disable-next-line no-undef
  if (typeof define === 'function' && define.amd) {
      // AMD
      define('DeepDiff', function() { // eslint-disable-line no-undef
          return deepDiff;
      });
  } else if (typeof exports === 'object') {
      // Node.js
      module.exports = deepDiff;
  } else {
      // Browser globals
      var _deepdiff = root.DeepDiff;
      deepDiff.noConflict = function() {
          if (root.DeepDiff === deepDiff) {
              root.DeepDiff = _deepdiff;
          }
          return deepDiff;
      };
      root.DeepDiff = deepDiff;
  }
}(this, function(root) {
  var validKinds = ['N', 'E', 'A', 'D'];

  // nodejs compatible on server side and in the browser.
  function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }

  function Diff(kind, path) {
    Object.defineProperty(this, 'kind', {
      value: kind,
      enumerable: true
    });
    if (path && path.length) {
      Object.defineProperty(this, 'path', {
        value: path,
        enumerable: true
      });
    }
  }

  function DiffEdit(path, origin, value) {
    DiffEdit.super_.call(this, 'E', path);
    Object.defineProperty(this, 'lhs', {
      value: origin,
      enumerable: true
    });
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffEdit, Diff);

  function DiffNew(path, value) {
    DiffNew.super_.call(this, 'N', path);
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffNew, Diff);

  function DiffDeleted(path, value) {
    DiffDeleted.super_.call(this, 'D', path);
    Object.defineProperty(this, 'lhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffDeleted, Diff);

  function DiffArray(path, index, item) {
    DiffArray.super_.call(this, 'A', path);
    Object.defineProperty(this, 'index', {
      value: index,
      enumerable: true
    });
    Object.defineProperty(this, 'item', {
      value: item,
      enumerable: true
    });
  }
  inherits(DiffArray, Diff);

  function arrayRemove(arr, from, to) {
    var rest = arr.slice((to || from) + 1 || arr.length);
    arr.length = from < 0 ? arr.length + from : from;
    arr.push.apply(arr, rest);
    return arr;
  }

  function realTypeOf(subject) {
    var type = typeof subject;
    if (type !== 'object') {
      return type;
    }

    if (subject === Math) {
      return 'math';
    } else if (subject === null) {
      return 'null';
    } else if (Array.isArray(subject)) {
      return 'array';
    } else if (Object.prototype.toString.call(subject) === '[object Date]') {
      return 'date';
    } else if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
      return 'regexp';
    }
    return 'object';
  }

  // http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  function hashThisString(string) {
    var hash = 0;
    if (string.length === 0) { return hash; }
    for (var i = 0; i < string.length; i++) {
      var char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Gets a hash of the given object in an array order-independent fashion
  // also object key order independent (easier since they can be alphabetized)
  function getOrderIndependentHash(object) {
    var accum = 0;
    var type = realTypeOf(object);

    if (type === 'array') {
      object.forEach(function (item) {
        // Addition is commutative so this is order indep
        accum += getOrderIndependentHash(item);
      });

      var arrayString = '[type: array, hash: ' + accum + ']';
      return accum + hashThisString(arrayString);
    }

    if (type === 'object') {
      for (var key in object) {
        if (object.hasOwnProperty(key)) {
          var keyValueString = '[ type: object, key: ' + key + ', value hash: ' + getOrderIndependentHash(object[key]) + ']';
          accum += hashThisString(keyValueString);
        }
      }

      return accum;
    }

    // Non object, non array...should be good?
    var stringToHash = '[ type: ' + type + ' ; value: ' + object + ']';
    return accum + hashThisString(stringToHash);
  }

  function deepDiff(lhs, rhs, changes, prefilter, path, key, stack, orderIndependent) {
    changes = changes || [];
    path = path || [];
    stack = stack || [];
    var currentPath = path.slice(0);
    if (typeof key !== 'undefined' && key !== null) {
      if (prefilter) {
        if (typeof (prefilter) === 'function' && prefilter(currentPath, key)) {
          return;
        } else if (typeof (prefilter) === 'object') {
          if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
            return;
          }
          if (prefilter.normalize) {
            var alt = prefilter.normalize(currentPath, key, lhs, rhs);
            if (alt) {
              lhs = alt[0];
              rhs = alt[1];
            }
          }
        }
      }
      currentPath.push(key);
    }

    // Use string comparison for regexes
    if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
      lhs = lhs.toString();
      rhs = rhs.toString();
    }

    var ltype = typeof lhs;
    var rtype = typeof rhs;
    var i, j, k, other;

    var ldefined = ltype !== 'undefined' ||
      (stack && (stack.length > 0) && stack[stack.length - 1].lhs &&
        Object.getOwnPropertyDescriptor(stack[stack.length - 1].lhs, key));
    var rdefined = rtype !== 'undefined' ||
      (stack && (stack.length > 0) && stack[stack.length - 1].rhs &&
        Object.getOwnPropertyDescriptor(stack[stack.length - 1].rhs, key));

    if (!ldefined && rdefined) {
      changes.push(new DiffNew(currentPath, rhs));
    } else if (!rdefined && ldefined) {
      changes.push(new DiffDeleted(currentPath, lhs));
    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
      changes.push(new DiffEdit(currentPath, lhs, rhs));
    } else if (realTypeOf(lhs) === 'date' && (lhs - rhs) !== 0) {
      changes.push(new DiffEdit(currentPath, lhs, rhs));
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      for (i = stack.length - 1; i > -1; --i) {
        if (stack[i].lhs === lhs) {
          other = true;
          break;
        }
      }
      if (!other) {
        stack.push({ lhs: lhs, rhs: rhs });
        if (Array.isArray(lhs)) {
          // If order doesn't matter, we need to sort our arrays
          if (orderIndependent) {
            lhs.sort(function (a, b) {
              return getOrderIndependentHash(a) - getOrderIndependentHash(b);
            });

            rhs.sort(function (a, b) {
              return getOrderIndependentHash(a) - getOrderIndependentHash(b);
            });
          }
          i = rhs.length - 1;
          j = lhs.length - 1;
          while (i > j) {
            changes.push(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i--])));
          }
          while (j > i) {
            changes.push(new DiffArray(currentPath, j, new DiffDeleted(undefined, lhs[j--])));
          }
          for (; i >= 0; --i) {
            deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack, orderIndependent);
          }
        } else {
          var akeys = Object.keys(lhs);
          var pkeys = Object.keys(rhs);
          for (i = 0; i < akeys.length; ++i) {
            k = akeys[i];
            other = pkeys.indexOf(k);
            if (other >= 0) {
              deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack, orderIndependent);
              pkeys[other] = null;
            } else {
              deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack, orderIndependent);
            }
          }
          for (i = 0; i < pkeys.length; ++i) {
            k = pkeys[i];
            if (k) {
              deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack, orderIndependent);
            }
          }
        }
        stack.length = stack.length - 1;
      } else if (lhs !== rhs) {
        // lhs is contains a cycle at this element and it differs from rhs
        changes.push(new DiffEdit(currentPath, lhs, rhs));
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes.push(new DiffEdit(currentPath, lhs, rhs));
      }
    }
  }

  function observableDiff(lhs, rhs, observer, prefilter, orderIndependent) {
    var changes = [];
    deepDiff(lhs, rhs, changes, prefilter, null, null, null, orderIndependent);
    if (observer) {
      for (var i = 0; i < changes.length; ++i) {
        observer(changes[i]);
      }
    }
    return changes;
  }

  function orderIndependentDeepDiff(lhs, rhs, changes, prefilter, path, key, stack) {
    return deepDiff(lhs, rhs, changes, prefilter, path, key, stack, true);
  }

  function accumulateDiff(lhs, rhs, prefilter, accum) {
    var observer = (accum) ?
      function (difference) {
        if (difference) {
          accum.push(difference);
        }
      } : undefined;
    var changes = observableDiff(lhs, rhs, observer, prefilter);
    return (accum) ? accum : (changes.length) ? changes : undefined;
  }

  function accumulateOrderIndependentDiff(lhs, rhs, prefilter, accum) {
    var observer = (accum) ?
      function (difference) {
        if (difference) {
          accum.push(difference);
        }
      } : undefined;
    var changes = observableDiff(lhs, rhs, observer, prefilter, true);
    return (accum) ? accum : (changes.length) ? changes : undefined;
  }

  function applyArrayChange(arr, index, change) {
    if (change.path && change.path.length) {
      var it = arr[index],
        i, u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          applyArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          delete it[change.path[i]];
          break;
        case 'E':
        case 'N':
          it[change.path[i]] = change.rhs;
          break;
      }
    } else {
      switch (change.kind) {
        case 'A':
          applyArrayChange(arr[index], change.index, change.item);
          break;
        case 'D':
          arr = arrayRemove(arr, index);
          break;
        case 'E':
        case 'N':
          arr[index] = change.rhs;
          break;
      }
    }
    return arr;
  }

  function applyChange(target, source, change) {
    if (typeof change === 'undefined' && source && ~validKinds.indexOf(source.kind)) {
      change = source;
    }
    if (target && change && change.kind) {
      var it = target,
        i = -1,
        last = change.path ? change.path.length - 1 : 0;
      while (++i < last) {
        if (typeof it[change.path[i]] === 'undefined') {
          it[change.path[i]] = (typeof change.path[i + 1] !== 'undefined' && typeof change.path[i + 1] === 'number') ? [] : {};
        }
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          if (change.path && typeof it[change.path[i]] === 'undefined') {
            it[change.path[i]] = [];
          }
          applyArrayChange(change.path ? it[change.path[i]] : it, change.index, change.item);
          break;
        case 'D':
          delete it[change.path[i]];
          break;
        case 'E':
        case 'N':
          it[change.path[i]] = change.rhs;
          break;
      }
    }
  }

  function revertArrayChange(arr, index, change) {
    if (change.path && change.path.length) {
      // the structure of the object at the index has changed...
      var it = arr[index],
        i, u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          revertArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          it[change.path[i]] = change.lhs;
          break;
        case 'E':
          it[change.path[i]] = change.lhs;
          break;
        case 'N':
          delete it[change.path[i]];
          break;
      }
    } else {
      // the array item is different...
      switch (change.kind) {
        case 'A':
          revertArrayChange(arr[index], change.index, change.item);
          break;
        case 'D':
          arr[index] = change.lhs;
          break;
        case 'E':
          arr[index] = change.lhs;
          break;
        case 'N':
          arr = arrayRemove(arr, index);
          break;
      }
    }
    return arr;
  }

  function revertChange(target, source, change) {
    if (target && source && change && change.kind) {
      var it = target,
        i, u;
      u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        if (typeof it[change.path[i]] === 'undefined') {
          it[change.path[i]] = {};
        }
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          // Array was modified...
          // it will be an array...
          revertArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          // Item was deleted...
          it[change.path[i]] = change.lhs;
          break;
        case 'E':
          // Item was edited...
          it[change.path[i]] = change.lhs;
          break;
        case 'N':
          // Item is new...
          delete it[change.path[i]];
          break;
      }
    }
  }

  function applyDiff(target, source, filter) {
    if (target && source) {
      var onChange = function (change) {
        if (!filter || filter(target, source, change)) {
          applyChange(target, source, change);
        }
      };
      observableDiff(target, source, onChange);
    }
  }

  Object.defineProperties(accumulateDiff, {

    diff: {
      value: accumulateDiff,
      enumerable: true
    },
    orderIndependentDiff: {
      value: accumulateOrderIndependentDiff,
      enumerable: true
    },
    observableDiff: {
      value: observableDiff,
      enumerable: true
    },
    orderIndependentObservableDiff: {
      value: orderIndependentDeepDiff,
      enumerable: true
    },
    orderIndepHash: {
      value: getOrderIndependentHash,
      enumerable: true
    },
    applyDiff: {
      value: applyDiff,
      enumerable: true
    },
    applyChange: {
      value: applyChange,
      enumerable: true
    },
    revertChange: {
      value: revertChange,
      enumerable: true
    },
    isConflict: {
      value: function () {
        return typeof $conflict !== 'undefined';
      },
      enumerable: true
    }
  });

  // hackish...
  accumulateDiff.DeepDiff = accumulateDiff;
  // ...but works with:
  // import DeepDiff from 'deep-diff'
  // import { DeepDiff } from 'deep-diff'
  // const DeepDiff = require('deep-diff');
  // const { DeepDiff } = require('deep-diff');

  root.DeepDiff = accumulateDiff;
  return accumulateDiff;
}));

},{}],2:[function(require,module,exports){
const observableDiff = require("deep-diff").observableDiff;

chrome.devtools.panels.create(
  "Apollo Time-Travel Debugger",
  "time_travel.png",
  "devtools.html",
  function(panel) {
    const output = document.querySelector(".state-output");
    const state = [
      {
        createVote: {
          id: "cjkjzqvgo5os70161ygah8ts6",
          link: {
            votes: [
              {
                id: "cjkcaovoc0t3401404lclq36x",
                user: {
                  id: "cjkca8bq70odq016862m5ucew",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkcxtu7m05q40123mlar3euz",
                user: {
                  id: "cjkcxrn5a052l0181h3qhsdlp",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkd333lo1gfz01462beqxf1n",
                user: {
                  id: "cjkd30gom1fn50107129q3xgw",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkeuujm506co0186mnyv2wtk",
                user: {
                  id: "cjkd7dgrs0ac60165lvmawjce",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkimvj4b1yzq0158pyqe7s8i",
                user: {
                  id: "cjkimupbp2l720182pf4kmxhi",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkin87wg022t0103txw0d7vo",
                user: {
                  id: "cjkd5a81q1xd00146liej0mjf",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkiq32m60ucq0187x38qzatb",
                user: {
                  id: "cjkeuwh8a06ny0155ufzlxfee",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkjzqvgo5os70161ygah8ts6",
                user: {
                  id: "cjkimupbp2l720182pf4kmxhi",
                  __typename: "User"
                },
                __typename: "Vote"
              }
            ],
            __typename: "Link"
          },
          user: {
            id: "cjkimupbp2l720182pf4kmxhi",
            __typename: "User"
          },
          __typename: "Vote"
        }
      },
      {
        createVote: {
          id: "cjkk08fvw5yg40152ayt208vb",
          link: {
            votes: [
              {
                id: "cjkc9m1ve0i9s0173eu1wnop6",
                user: {
                  id: "cjkc64n8r1gsr0187gvdcwwyp",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkcxnb0e03sg01769iztwh2c",
                user: {
                  id: "cjkca8bq70odq016862m5ucew",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkcyezbe0adi01464vq14rqy",
                user: {
                  id: "cjkcxrn5a052l0181h3qhsdlp",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkd5f9gl1ydq01393vsp99bu",
                user: {
                  id: "cjkd5a81q1xd00146liej0mjf",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkd62tg102i601054jwz4l2e",
                user: {
                  id: "cjkd30gom1fn50107129q3xgw",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkimvqk221us0184vr7tz1ue",
                user: {
                  id: "cjkimupbp2l720182pf4kmxhi",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkiqoyf40zxz01262q7f2eho",
                user: {
                  id: "cjkingyta05cg0104n0o987dd",
                  __typename: "User"
                },
                __typename: "Vote"
              },
              {
                id: "cjkk08fvw5yg40152ayt208vb",
                user: {
                  id: "cjkimupbp2l720182pf4kmxhi",
                  __typename: "User"
                },
                __typename: "Vote"
              }
            ],
            __typename: "Link"
          },
          user: {
            id: "cjkimupbp2l720182pf4kmxhi",
            __typename: "User"
          },
          __typename: "Vote"
        }
      }
    ];

    //number items, collapse,
    let lhs = state[0];
    let rhs = state[1];

    observableDiff(lhs, rhs, change => {
      switch (change.kind) {
        case "N":
          output.innerHTML = `<details> 
        <summary> State diff </summary>
        <p>Added: ${change.path[change.path.length - 1]}: <em>${JSON.stringify(
            change.rhs
          )}</em> </p>
          </details>`;
          break;

        case "D":
          output.innerHTML = `<details> 
        <summary> State diff </summary>
        <p>Removed: <del>${
          change.path[change.path.length - 1]
        }: <em>${JSON.stringify(change.lhs)}</em></del>
            </p>
          </details>`;
          break;

        case "E":
          output.innerHTML = `<details> 
        <summary> State diff </summary>
        <p>Changed: <del>${
          change.path[change.path.length - 1]
        }: <em>${JSON.stringify(change.lhs)}</em></del> -> ${
            change.path[change.path.length - 1]
          }: <em>${JSON.stringify(change.rhs)}</em>
            </p>
          </details>`;
          break;
        case "A":
          output.innerHTML = `Change within array`;
          break;
      }
    });
  }
);

},{"deep-diff":1}]},{},[2]);