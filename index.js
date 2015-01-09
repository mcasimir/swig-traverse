var compileTraverse = function (compiler, args, content, parents, options, blockName) {
  var yield = function() {
    return compiler(content, parents, options, blockName);
  };

  var uid = (new Date()).getTime();

  return [
    '(function() {',
    '  _ext.swigTraverse.push({iter: \'' + args[0] + '\', tree: ' + args[1] + '});',
    '  __bkpUID = { iter: _ctx[_ext.swigTraverse.current().iter], level: _ctx.level }',

    '  _ext.swigTraverse.traverse(_ext.swigTraverse.current().tree, function(__nodeUID) {',
    '    _ctx[_ext.swigTraverse.current().iter] = __nodeUID;',
    '    _ctx.level++;',
    '    YIELD;',
    '  });',

    '  _ctx[_ext.swigTraverse.current().iter] = __bkpUID.iter;',
    '  _ctx.level  = __bkpUID.level;',
    '  __bkpUID    = undefined;',
    '  _ext.swigTraverse.pop();',
    '})();']
      .join('\n')
      .replace(/UID/g, uid)
      .replace('YIELD', yield());

};

var compilePostvisit = function () {
  var uid = (new Date()).getTime();
  return  [
      '}, function(__nodeUID) { _ctx.level--;',
      '_ctx[_ext.swigTraverse.current().iter] = __nodeUID;'
    ]
    .join('\n')
    .replace(/UID/g, uid);
};

var parseTraverse = function (str, line, parser, types) {
  var firstVar, ready;

  parser.on(types.NUMBER, function (token) {
    var lastState = this.state.length ? this.state[this.state.length - 1] : null;
    if (!ready ||
        (lastState !== types.ARRAYOPEN &&
          lastState !== types.CURLYOPEN &&
          lastState !== types.CURLYCLOSE &&
          lastState !== types.FUNCTION &&
          lastState !== types.FILTER)
        ) {
      throw new Error('Unexpected number "' + token.match + '" on line ' + line + '.');
    }
    return true;
  });

  parser.on(types.VAR, function (token) {
    if (ready && firstVar) {
      return true;
    }

    if (!this.out.length) {
      firstVar = true;
    }

    this.out.push(token.match);
  });

  parser.on(types.COMPARATOR, function (token) {
    if (token.match !== 'in' || !firstVar) {
      throw new Error('Unexpected token "' + token.match + '" on line ' + line + '.');
    }
    ready = true;
    this.filterApplyIdx.push(this.out.length);
  });

  return true;
};

var parsePostvisit = function (str, line, parser, types, stack) {
  parser.on('*', function (token) {
    throw new Error('"postvisit" tag does not accept any tokens. Found "' + token.match + '" on line ' + line + '.');
  });
  return (stack.length && stack[stack.length - 1].name === 'traverse');
};

var traverse = function(node, down, up) {
  if (down && typeof node.forEach !== 'function') {
    down(node);
  }
  var children = typeof node.forEach === 'function' ? node : (node.children || []);
  children.forEach(function(child) {
    traverse(child, down, up);
  });
  if (up && typeof node.forEach !== 'function') {
    up(node);
  }
};

module.exports = function(swig) {
  swig.setExtension('swigTraverse', {
    stack: [],
    traverse: function(node, down, up) {
      return traverse(node, down, up);
    },
    push: function(data) {
      if(typeof data.tree !== 'object'){
        throw new Error("Second argument of `traverse` tag must be an object, `" + (typeof data.tree) + "` given.");
      };
      this.stack.unshift(data);
    },
    pop: function() {
      this.stack.shift();
    },
    current: function() {
      return this.stack[0];
    }
  });
  swig.setTag('traverse', parseTraverse, compileTraverse, true);
  swig.setTag('postvisit', parsePostvisit, compilePostvisit);
};