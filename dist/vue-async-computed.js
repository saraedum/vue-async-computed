var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (global, factory) {
  (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.AsyncComputed = factory();
})(this, function () {
  'use strict';

  function isComputedLazy(item) {
    return item.hasOwnProperty('lazy') && item.lazy;
  }

  function isLazyActive(vm, key) {
    return vm[lazyActivePrefix + key];
  }

  var lazyActivePrefix = 'async_computed$lazy_active$',
      lazyDataPrefix = 'async_computed$lazy_data$';

  function initLazy(data, key) {
    data[lazyActivePrefix + key] = false;
    data[lazyDataPrefix + key] = null;
  }

  function makeLazyComputed(key) {
    return {
      get: function get() {
        this[lazyActivePrefix + key] = true;
        return this[lazyDataPrefix + key];
      },
      set: function set(value) {
        this[lazyDataPrefix + key] = value;
      }
    };
  }

  function silentSetLazy(vm, key, value) {
    vm[lazyDataPrefix + key] = value;
  }
  function silentGetLazy(vm, key) {
    return vm[lazyDataPrefix + key];
  }

  var prefix = '_async_computed$';
  var DidNotUpdate = typeof Symbol === 'function' ? Symbol('did-not-update') : {};

  var AsyncComputed = {
    install: function install(Vue, pluginOptions) {
      pluginOptions = pluginOptions || {};

      Vue.config.optionMergeStrategies.asyncComputed = Vue.config.optionMergeStrategies.computed;

      Vue.mixin({
        beforeCreate: function beforeCreate() {
          var optionData = this.$options.data;
          var asyncComputed = this.$options.asyncComputed || {};
          this.$asyncComputed = {};

          for (var key in this.$options.computed) {
            if (this.$options.computed[key].asynchronous) {
              asyncComputed[key] = this.$options.computed[key];
              delete this.$options.computed[key];
            }
          }

          if (!Object.keys(asyncComputed).length) return;

          this.$options.asyncComputed = asyncComputed;

          if (!this.$options.computed) this.$options.computed = {};

          for (var _key in asyncComputed) {
            var getter = getterFn(_key, this.$options.asyncComputed[_key]);
            this.$options.computed[prefix + _key] = getter;
          }

          this.$options.data = function vueAsyncComputedInjectedDataFn() {
            var data = (typeof optionData === 'function' ? optionData.call(this) : optionData) || {};
            for (var _key2 in asyncComputed) {
              var item = this.$options.asyncComputed[_key2];
              if (isComputedLazy(item)) {
                initLazy(data, _key2);
                this.$options.computed[_key2] = makeLazyComputed(_key2);
              } else {
                data[_key2] = null;
              }
            }
            return data;
          };
        },
        created: function created() {
          var _this = this;

          for (var key in this.$options.asyncComputed || {}) {
            var item = this.$options.asyncComputed[key],
                value = generateDefault.call(this, item, pluginOptions);
            if (isComputedLazy(item)) {
              silentSetLazy(this, key, value);
            } else {
              this[key] = value;
            }
          }

          var _loop = function _loop(_key3) {
            var promiseId = 0;
            var watcher = function watcher(newPromise) {
              var thisPromise = ++promiseId;

              if (newPromise === DidNotUpdate) {
                return;
              }

              if (!newPromise || !newPromise.then) {
                newPromise = Promise.resolve(newPromise);
              }
              setAsyncState(_this.$asyncComputed[_key3], 'updating');

              newPromise.then(function (value) {
                if (thisPromise !== promiseId) return;
                setAsyncState(_this.$asyncComputed[_key3], 'success');
                _this[_key3] = value;
              }).catch(function (err) {
                if (thisPromise !== promiseId) return;

                setAsyncState(_this.$asyncComputed[_key3], 'error');
                _this.$asyncComputed[_key3].exception = err;
                if (pluginOptions.errorHandler === false) return;

                var handler = pluginOptions.errorHandler === undefined ? console.error.bind(console, 'Error evaluating async computed property:') : pluginOptions.errorHandler;

                if (pluginOptions.useRawError) {
                  handler(err);
                } else {
                  handler(err.stack);
                }
              });
            };
            _this.$asyncComputed[_key3] = {
              exception: null,
              update: function update() {
                watcher(getterOnly(_this.$options.asyncComputed[_key3])());
              }
            };
            setAsyncState(_this.$asyncComputed[_key3], 'updating');
            _this.$watch(prefix + _key3, watcher, { immediate: true });
          };

          for (var _key3 in this.$options.asyncComputed || {}) {
            _loop(_key3);
          }
        }
      });
    }
  };

  function setAsyncState(stateObject, state) {
    stateObject.state = state;
    stateObject.updating = state === 'updating';
    stateObject.error = state === 'error';
    stateObject.success = state === 'success';
  }

  function getterOnly(fn) {
    if (typeof fn === 'function') return fn;

    return fn.get;
  }

  function getterFn(key, fn) {
    if (typeof fn === 'function') return fn;

    var getter = fn.get;

    if (fn.hasOwnProperty('watch')) {
      var previousGetter = getter;
      getter = function getter() {
        fn.watch.call(this);
        return previousGetter.call(this);
      };
    }

    if (fn.hasOwnProperty('shouldUpdate')) {
      var _previousGetter = getter;
      getter = function getter() {
        if (fn.shouldUpdate.call(this)) {
          return _previousGetter.call(this);
        }
        return DidNotUpdate;
      };
    }

    if (isComputedLazy(fn)) {
      var nonLazy = getter;
      getter = function lazyGetter() {
        if (isLazyActive(this, key)) {
          return nonLazy.call(this);
        } else {
          return silentGetLazy(this, key);
        }
      };
    }
    return getter;
  }

  function generateDefault(fn, pluginOptions) {
    var defaultValue = null;

    if ('default' in fn) {
      defaultValue = fn.default;
    } else if ('default' in pluginOptions) {
      defaultValue = pluginOptions.default;
    }

    if (typeof defaultValue === 'function') {
      return defaultValue.call(this);
    } else {
      return defaultValue;
    }
  }

  /* istanbul ignore if */
  if (typeof window !== 'undefined' && window.Vue) {
    // Auto install in dist mode
    window.Vue.use(AsyncComputed);
  }

  return AsyncComputed;
});
