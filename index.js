var inherits = require('util').inherits;

/*==============================
=            Errors            =
==============================*/

function errorMessage(file, line, message) {
  return ['[swig-traverse]', message, 'in file:', file, 'on line:', line].join(' ');
}

function quote(str) {
  return '`' + str + '`';
}

function UnexpectedTokenError(token, file, line) {
  Error.call(this);
  Error.captureStackTrace(this, UnexpectedTokenError);
  this.name = 'UnexpectedTokenError';
  this.message = errorMessage(file, line, ['Unexpected token', quote(token.match)].join(' '));
}

inherits(UnexpectedTokenError, Error);

function ComparatorMissingError(file, line) {
  Error.call(this);
  Error.captureStackTrace(this, ComparatorMissingError);
  this.name = 'ComparatorMissingError';
  this.message = errorMessage(file, line, ['Ivalid traverse tag without `in` keyword'].join(' '));
}

inherits(ComparatorMissingError, Error);

/*================================
=            Previsit            =
================================*/

var parseTraverse = function (str, line, parser, types, stack, opts) {
  var firstVarParsed, comparatorParsed;

  parser.on('*', function(token) {
    if (firstVarParsed) { 
      // Appends anything second param
      if (this.out.length === 1) {
        this.out.push(token.match);
      } else {
        this.out[this.out.length - 1] += token.match;
      }
      return false;
    }

    if ([types.WHITESPACE, types.VAR].indexOf(token.type) === -1) {
      throw new UnexpectedTokenError(token, opts.filename, line);
    }

    // Ignores whitespaces
    return false;
  });

  parser.on(types.VAR, function (token) {
    if (!firstVarParsed) {
      firstVarParsed = true;
      this.out.push(token.match);  
    } else {
      this.out[this.out.length - 1] += '_ctx.' + token.match;
    }
    return false;
  });

  parser.on(types.COMPARATOR, function (token) {
    if (token.match !== 'in') {
      throw new UnexpectedTokenError(token, opts.filename, line);
    }
    comparatorParsed = true;
    this.filterApplyIdx.push(this.out.length);
  });

  parser.on('end', function () {
    if (!comparatorParsed) {
      throw new ComparatorMissingError(this.filename, line);
    }
    return true;
  });
  return true;
};

var compileTraverse = function (compiler, args, content, parents, options, blockName) {
  var yieldToContents = function() {
    return compiler(content, parents, options, blockName);
  };

  var uid = (new Date()).getTime();
  var compiled = [
    '(function() {',
    '  _ext.swigTraverse.push({iter: \'' + args[0] + '\', tree: ' + args[1] + '});',
    '  __bkpUID = { iter: _ctx[_ext.swigTraverse.current().iter], level: _ctx.level }',
    '  _ctx.level = 0;',
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
      .replace('YIELD', yieldToContents());

  return compiled;
};

/*=================================
=            Postvisit            =
=================================*/

var parsePostvisit = function (str, line, parser, types, stack, opts) {
  parser.on('*', function (token) {
    throw new UnexpectedTokenError(token, opts.filename, line);
  });
  return (stack.length && stack[stack.length - 1].name === 'traverse');
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

/*===============================
=            Exports            =
===============================*/

module.exports = function(swig) {
  swig.setExtension('swigTraverse', {
    stack: [],
    traverse: function(node, down, up) {
        var self = this;
        if (down && typeof node.forEach !== 'function') {
          down(node);
        }
        var children = typeof node.forEach === 'function' ? node : (node.children || []);
        children.forEach(function(child) {
          self.traverse(child, down, up);
        });
        if (up && typeof node.forEach !== 'function') {
          up(node);
        }
      },
    push: function(data) {
      if(typeof data.tree !== 'object'){
        throw new Error('Second argument of `traverse` tag must be an object, `' + (typeof data.tree) + '` given.');
      }
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