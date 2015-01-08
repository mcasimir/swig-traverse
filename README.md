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
{% traverse node in tree -%}
  <!-- previsited nodes bound to node var -->

{% postvisit -%}
  <!-- postvisited nodes bound to node var -->

{% endtraverse -%}
```

Note. `{% postvisit %}` section is optional:

``` html
{% traverse node in tree -%}
  <!-- previsited nodes bound to node var -->

{% endtraverse -%}
```

You can pass array as tree, in that case it will considered to be a _"children"_ array. Useful
to exclude root from traversing:

```
{% traverse child in node.children -%}
  <!-- do something with child node -->

{% endtraverse -%}
```

### Example

``` html
Description:

{{ node.description }}

Submodules:

<ul>
  {% traverse child in node.children -%}
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

Released under the [MIT license](https://github.com/mcasimir/swig-traverse/blob/master/LICENSE).