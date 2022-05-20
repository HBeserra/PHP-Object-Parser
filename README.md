# PHP Object Deserializer
Convert serialized PHP data to a javascript.


# This fork
As the origin by [bd808](https://github.com/bd808/php-unserialize-js) was written in pure javascript I decided to rewrite using typescript.


### Example 

**PHP:**
```
$array = array(
  "foo" => "bar",
  "foobar" => "baz"
);
echo serialize($array);
```

**JS/TS**
```
import phpObjectDeserializer from "php-obj-deserializer";

const php_str = 'a:2:{s:3:\"foo\";s:3:\"bar\";s:6:\"foobar\";s:3:\"baz\";}'

phpObjectDeserializer(php_str)
  .then(console.log)
  .catch(console.error)
```

**Result:**
```
{ 
  foo:    'bar',
  foobar: 'baz' 
}
```

#### CommonJS

```
var phpObjDeserializer = require("php-obj-deserializer")

var php_str = 'a:2:{s:3:\"foo\";s:3:\"bar\";s:6:\"foobar\";s:3:\"baz\";}'

phpObjDeserializer.default()
  .then(console.log)
  .catch(console.error)
```

## Anatomy of a PHP serialize()'ed value:
|Type|Anatomy|--|
|--|--|--|
|**String**|`s:size:value;`|String values are always in double quotes|
|**Integer**|`i:value;`|
|**Boolean**|`b:value;`|does not store `true` or `false`, does store `1` or `0`|
|**Null**|`N;`|
|**Array**|`a:size:{key;value;...}`| `key` and `value` repeat for all elements. Array keys are **always** integers or strings|
|**Object**|`O:strlen(object_name):object_name:object_size:{s:strlen(property_name):property_name:property_definition;...}`| `strlen` of property name, `property_name` and `property_definition` repeat for all properties in the object|

**PHP Serialization Function Implementation Notes by the comunity:**

    "null => 'value'" equates to 's:0:"";s:5:"value";'
    "true => 'value'" equates to 'i:1;s:5:"value";'
    "false => 'value'" equates to 'i:0;s:5:"value";'
  
    "array(whatever the contents) => 'value'" equates to an "illegal offset type" warning because you can't use an array as a key; however, if you use a variable containing an array as a key, it will equate to 's:5:"Array";s:5:"value";', and attempting to use an object as a key will result in the same behavior as using an array will.

## Sources

- [php manual of serialize function](https://www.php.net/manual/pt_BR/function.serialize.php)
- [bd808](https://github.com/bd808/php-unserialize-js)
