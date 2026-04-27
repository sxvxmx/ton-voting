/*
  Polyfills stage-3 Set methods used by the current Tact compiler runtime.
  This keeps Blueprint/Tact commands working on Node versions where these
  methods are not available yet.
*/

(function ensureSetMethods() {
  const define = (name, impl) => {
    if (typeof Set.prototype[name] !== 'function') {
      Object.defineProperty(Set.prototype, name, {
        value: impl,
        configurable: true,
        writable: true,
      });
    }
  };

  define('isSubsetOf', function isSubsetOf(other) {
    for (const value of this) {
      if (!other.has(value)) {
        return false;
      }
    }
    return true;
  });

  define('isSupersetOf', function isSupersetOf(other) {
    for (const value of other) {
      if (!this.has(value)) {
        return false;
      }
    }
    return true;
  });

  define('isDisjointFrom', function isDisjointFrom(other) {
    for (const value of this) {
      if (other.has(value)) {
        return false;
      }
    }
    return true;
  });

  define('union', function union(other) {
    const result = new Set(this);
    for (const value of other) {
      result.add(value);
    }
    return result;
  });

  define('intersection', function intersection(other) {
    const result = new Set();
    for (const value of this) {
      if (other.has(value)) {
        result.add(value);
      }
    }
    return result;
  });

  define('difference', function difference(other) {
    const result = new Set();
    for (const value of this) {
      if (!other.has(value)) {
        result.add(value);
      }
    }
    return result;
  });

  define('symmetricDifference', function symmetricDifference(other) {
    const result = new Set();
    for (const value of this) {
      if (!other.has(value)) {
        result.add(value);
      }
    }
    for (const value of other) {
      if (!this.has(value)) {
        result.add(value);
      }
    }
    return result;
  });
})();
