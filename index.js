/**
@license MIT

Copyright (c) 2014 Maurizio Casimirri (https://github.com/mcasimir)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@module swigTraverse
@description

Swig plugin to traverse tree structures.

swigTraverse assumes tree nodes to be objects with a children property that 
is either `undefined` or an array of child nodes. 

@usage

``` js
var swig = require('swig'),
    swigTraverse = require('swig-traverse');
swigTraverse( swig );
// ...
```

``` html
{% traverse child in node -%}
  <!-- ... -->
{% postvisit -%} <!-- optional -->
  <!-- ... -->
{% endtraverse -%}
```

@example

``` html
<h2>Description</h2>
{{ node.description | marked }}

<h2>Submodules</h2>
<ul>
  {% traverse child in node -%}
    {% if child.type == 'module' %}
      <li><a href="/{{child.path}}.html">{{child.fullname}}</a>
        <ul>
    {% endif -%}
  {% postvisit -%}
    {% if child.type == 'module' %}
        </ul>
      </li>
    {% endif -%}
  {% endtraverse -%}
</ul>
```
*/

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
  if (down) {
    down(node);
  }
  var children = node.children || [];
  children.forEach(function(child) {
    traverse(child, down, up);
  });
  if (up) {
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