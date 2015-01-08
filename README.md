# swig-traverse

A [Swig](http://paularmstrong.github.io/swig/) plugin providing tags to traverse tree structures.

**swig-traverse** assumes tree nodes to be objects with a `children` property that 
is either `undefined` or an array of child nodes. 

``` js
var tree = {
  // ...
  children: [
  	{
  	  // ...
  	  children: [ 
  	  	// ...
  	  ]
  	}
  ]
};
```

## Install

``` sh
npm i swig-traverse --save-dev
```

## Usage

``` js
var swig = require('swig'),
    swigTraverse = require('swig-traverse');

swigTraverse( swig );
```

``` html
{% traverse child in node -%}
  <!-- previsited nodes bound to child -->
{% postvisit -%} <!-- optional -->
  <!-- postvisited nodes bound to child -->
{% endtraverse -%}
```

### Example

``` html
Description:

{{ node.description }}

Submodules:

<ul>
  {% traverse child in node -%}
    {% if child.type == 'module' %}
      <li><a href="/{{child.path}}.html">{{child.title}}</a>
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

## License

Released under the [MIT license](https://github.com/mcasimir/swig-traverse/LICENSE).