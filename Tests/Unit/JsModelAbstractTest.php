<?php

namespace Svaroh\JsFormValidatorBundle\Tests\Unit;

use Svaroh\JsFormValidatorBundle\Model\JsModelAbstract;
use PHPUnit\Framework\TestCase;

class JsModelAbstractTest extends TestCase
{
    public function testConvertsScalarValuesToJavascriptLiterals()
    {
        $this->assertSame('null', JsModelAbstract::phpValueToJs(null));
        $this->assertSame('true', JsModelAbstract::phpValueToJs(true));
        $this->assertSame('false', JsModelAbstract::phpValueToJs(false));
        $this->assertSame('42', JsModelAbstract::phpValueToJs(42));
        $this->assertSame('13.5', JsModelAbstract::phpValueToJs(13.5));
        $this->assertSame("'42'", JsModelAbstract::phpValueToJs('42'));
        $this->assertSame("'O\\'Reilly\\\\book'", JsModelAbstract::phpValueToJs("O'Reilly\\book"));
    }

    public function testEscapesCharactersThatWouldBreakAnInlineScript()
    {
        $this->assertSame(
            "'\\u003C/script\\u003E\\u003Cimg src=x onerror=alert(1)\\u003E'",
            JsModelAbstract::phpValueToJs('</script><img src=x onerror=alert(1)>')
        );
        $this->assertSame("'a\\u0026b'", JsModelAbstract::phpValueToJs('a&b'));
        $this->assertSame("'line1\\nline2'", JsModelAbstract::phpValueToJs("line1\nline2"));
        $this->assertSame("'line1\\rline2'", JsModelAbstract::phpValueToJs("line1\rline2"));
        $this->assertSame("'a\\u2028b'", JsModelAbstract::phpValueToJs("a\u{2028}b"));
        $this->assertSame("'a\\u2029b'", JsModelAbstract::phpValueToJs("a\u{2029}b"));
        $this->assertSame(
            "{'a\\u003Cb':'c\\u003Ed'}",
            JsModelAbstract::phpValueToJs(array('a<b' => 'c>d'))
        );
    }

    public function testConvertsArraysAndObjectsRecursively()
    {
        $value = array(
            'quote\'key' => array('first', false),
            'nested' => (object) array('path' => 'src\\Model'),
        );

        $this->assertSame(
            "{'quote\\'key':['first',false],'nested':{'path':'src\\\\Model'}}",
            JsModelAbstract::phpValueToJs($value)
        );
        $this->assertSame("[1,'two',null]", JsModelAbstract::phpValueToJs(array(1, 'two', null)));
    }

    public function testConvertsStringableObjectsAndUnsupportedValues()
    {
        $resource = fopen('php://memory', 'rb');

        $this->assertSame("'stringable-value'", JsModelAbstract::phpValueToJs(new StringableFixture()));
        $this->assertSame('undefined', JsModelAbstract::phpValueToJs($resource));

        fclose($resource);
    }

    public function testModelSerializesItsPublicProperties()
    {
        $model = new JsModelFixture();
        $model->name = 'profile';
        $model->enabled = true;
        $model->children = array(new NestedJsModelFixture());

        $array = $model->toArray();

        $this->assertSame('profile', $array['name']);
        $this->assertTrue($array['enabled']);
        $this->assertCount(1, $array['children']);
        $this->assertInstanceOf(NestedJsModelFixture::class, $array['children'][0]);
        $this->assertSame(
            "{'name':'profile','enabled':true,'children':[{'value':'nested'}]}",
            $model->toJsString()
        );
        $this->assertSame($model->toJsString(), (string) $model);
    }
}

class JsModelFixture extends JsModelAbstract
{
    public $name;

    public $enabled;

    public $children = array();
}

class NestedJsModelFixture extends JsModelAbstract
{
    public $value = 'nested';
}

class StringableFixture
{
    public function __toString()
    {
        return 'stringable-value';
    }
}
