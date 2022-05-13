

function phpObjectParser(objStr: string): Promise<any> {
  let idx: number = 0
  let ridx: number = 0
  let refStack: any[] = []


  return new Promise((resolve, reject) => {

    function readLength() {
      const delimiter = objStr.indexOf(':', idx)
      const raw_value = objStr.substring(idx, delimiter);

      idx = delimiter + 2;
      return parseInt(raw_value, 10);
    }

    function readInt(): number {
      const delimiter = objStr.indexOf(';', idx)
      const raw_value = objStr.substring(idx, delimiter);

      idx = delimiter + 1;
      return parseInt(raw_value, 10);
    }

    function parseAsInt() {
      const val: number = readInt();
      refStack[ridx++] = val;
      return val;
    }

    function parseAsFloat(): number {
      const delimiter: number = objStr.indexOf(';', idx)
      const raw_value: string = objStr.substring(idx, delimiter)

      const value: number = parseFloat(raw_value);
      idx = delimiter + 1;
      refStack[ridx++] = value;
      return value;
    }

    function parseAsBoolean(): boolean {
      const delimiter = objStr.indexOf(';', idx)
      const raw_value = objStr.substring(idx, delimiter)
      const val = "1" === raw_value

      idx = delimiter + 1;
      refStack[ridx++] = val;
      return val;
    }

    function readString(expect: string = '"') {
      const stringLength = readLength()
      let bytesLength: number = 0
      let utfLength: number = 0
      let charCode: number

      while (bytesLength < stringLength) {
        charCode = objStr.charCodeAt(idx + utfLength++);
        if (charCode <= 0x007F) {
          bytesLength++;
        } else if (charCode > 0x07FF) {
          bytesLength += 3;
        } else {
          bytesLength += 2;
        }
      }

      // catch non-compliant utf8 encodings
      if (objStr.charAt(idx + utfLength) !== expect) {
        utfLength += objStr.indexOf('"', idx + utfLength) - idx - utfLength;
      }

      const value: string = objStr.substring(idx, idx + utfLength);

      idx += utfLength + 2;
      return value;
    }

    function parseAsString(): string {
      const value = readString();
      refStack[ridx++] = value;
      return value;
    }

    function readType(): string {
      const type = objStr.charAt(idx);

      idx += 2;
      return type;
    }

    function readKey(): number | string | undefined {
      var type = readType();
      switch (type) {
        case 'i': return readInt();
        case 's': return readString();
        default:
          reject(`Unknown key type '${type}' at position ${idx - 2}`);
      } //end switch
    }

    function parseAsArray(): Array<any> | { [key: string | number]: any } {
      const arrayLength = readLength()
      let tmpArray: any[] = []
      let tmpObj: { [key: string | number]: any } = {}
      let _isObj: boolean = false

      let lref = ridx++
      refStack[lref] = tmpArray


      for (let index = 0; index < arrayLength; index++) {
        const key = readKey()
        const value = parseNext()

        if (typeof key == "undefined") reject("Object key null")

        if (!_isObj || typeof key != "number" || key == index) tmpArray.push(value)
        else {
          if (!_isObj) {
            // na primeira vez que executa converte o array em objeto}
            for (let index = 0; index < tmpArray.length; index++) tmpObj[index] = tmpArray[index];
            _isObj = true
          }
          // adiciona ao objeto temporario
          tmpObj[key || index] = value
        }
      }

      refStack[lref] = _isObj ? tmpArray : tmpObj

      idx++;
      return _isObj ? tmpArray : tmpObj
    } //end parseAsArray


    function fixPropertyName(parsedName:string, baseClassName) {
      var class_name
        , prop_name
        , pos;
      if ("\u0000" === parsedName.charAt(0)) {
        // "<NUL>*<NUL>property"
        // "<NUL>class<NUL>property"
        pos = parsedName.indexOf("\u0000", 1);
        if (pos > 0) {
          class_name = parsedName.substring(1, pos);
          prop_name = parsedName.substr(pos + 1);

          if ("*" === class_name) {
            // protected
            return prop_name;
          } else if (baseClassName === class_name) {
            // own private
            return prop_name;
          } else {
            // private of a descendant
            return class_name + "::" + prop_name;

            // On the one hand, we need to prefix property name with
            // class name, because parent and child classes both may
            // have private property with same name. We don't want
            // just to overwrite it and lose something.
            //
            // On the other hand, property name can be "foo::bar"
            //
            //     $obj = new stdClass();
            //     $obj->{"foo::bar"} = 42;
            //     // any user-defined class can do this by default
            //
            // and such property also can overwrite something.
            //
            // So, we can to lose something in any way.
          }
        } else {
          var msg = 'Expected two <NUL> characters in non-public ' +
            "property name '" + parsedName + "' at position " +
            (idx - parsedName.length - 2);
          throw new Error(msg);
        }
      } else {
        // public "property"
        return parsedName;
      }
    }
    function parseAsObject() {
      var len
        , obj = {}
        , lref = ridx++
        // HACK last char after closing quote is ':',
        // but not ';' as for normal string
        , clazzname = readString()
        , key
        , val
        , i;

      refStack[lref] = obj;
      len = readLength();
      try {
        for (i = 0; i < len; i++) {
          key = fixPropertyName(readKey(), clazzname);
          val = parseNext();
          obj[key] = val;
        }
      } catch (e) {
        // decorate exception with current state
        e.state = obj;
        throw e;
      }
      idx++;
      return obj;
    } //end parseAsObject

    function parseAsCustom() {
      var clazzname = readString()
        , content = readString('}');
      return {
        "__PHP_Incomplete_Class_Name": clazzname,
        "serialized": content
      };
    } //end parseAsCustom
    function parseAsRefValue() {
      var ref = readInt()
        // php's ref counter is 1-based; our stack is 0-based.
        , val = refStack[ref - 1];
      refStack[ridx++] = val;
      return val;
    } //end parseAsRefValue
    function parseAsRef() {
      var ref = readInt();
      // php's ref counter is 1-based; our stack is 0-based.
      return refStack[ref - 1];
    } //end parseAsRef
    function parseAsNull() {
      var val = null;
      refStack[ridx++] = val;
      return val;
    }; //end parseAsNull

    function parseNext() {
      var type = readType();
      switch (type) {
        case 'i': return parseAsInt();
        case 'd': return parseAsFloat();
        case 'b': return parseAsBoolean();
        case 's': return parseAsString();
        case 'a': return parseAsArray();
        case 'O': return parseAsObject();
        case 'C': return parseAsCustom();

        // link to object, which is a value - affects refStack
        case 'r': return parseAsRefValue();

        // PHP's reference - DOES NOT affect refStack
        case 'R': return parseAsRef();

        case 'N': return parseAsNull();
        default:
          var msg = "Unknown type '" + type + "' at position " + (idx - 2);
          throw new Error(msg);
      } //end switch
    }; //end parseNext
    const result = parseNext() 
    resolve(result)
  })
}

phpObjectParser('a:20:{s:10:"store_name";s:11:"Lauro Store";s:6:"social";a:7:{s:2:"fb";s:0:"";s:7:"twitter";s:0:"";s:9:"pinterest";s:0:"";s:8:"linkedin";s:0:"";s:7:"youtube";s:0:"";s:9:"instagram";s:0:"";s:6:"flickr";s:0:"";}s:7:"payment";a:2:{s:6:"paypal";a:1:{i:0;s:5:"email";}s:4:"bank";a:0:{}}s:5:"phone";s:0:"";s:10:"show_email";s:2:"no";s:7:"address";a:6:{s:8:"street_1";s:0:"";s:8:"street_2";s:0:"";s:4:"city";s:0:"";s:3:"zip";s:0:"";s:7:"country";s:2:"BR";s:5:"state";s:2:"SP";}s:8:"location";s:0:"";s:6:"banner";i:6109;s:4:"icon";i:0;s:8:"gravatar";i:0;s:14:"show_more_ptab";s:3:"yes";s:9:"store_ppp";i:10;s:10:"enable_tnc";s:3:"off";s:9:"store_tnc";s:0:"";s:23:"show_min_order_discount";s:2:"no";s:9:"store_seo";a:0:{}s:24:"dokan_store_time_enabled";s:2:"no";s:23:"dokan_store_open_notice";s:0:"";s:24:"dokan_store_close_notice";s:0:"";s:10:"seller_qty";s:1:"5";}').then((res) => console.log({res}))

console.log()