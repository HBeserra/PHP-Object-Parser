# PhP Object Deserializer
Convert serialized PHP data to a javascript object

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

const php_str = "a:2:{s:3:\"foo\";s:3:\"bar\";s:6:\"foobar\";s:3:\"baz\";}"

phpObjectParser(php_str)
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