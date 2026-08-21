<?php

namespace Svaroh\JsFormValidatorBundle\Model;

/**
 * All the models inherited from this class converted to a similar Javascript model by printing them as a string
 *
 * Class JsModelAbstract
 *
 * @package Svaroh\JsFormValidatorBundle\Model
 */
abstract class JsModelAbstract
{
    /**
     * This function converts the model to the related JavaScript model
     *
     * @return string
     */
    public function toJsString()
    {
        return self::phpValueToJs($this->toArray());
    }

    /**
     * @return string
     */
    public function __toString()
    {
        return $this->toJsString();
    }

    /**
     * Convert php value to the Javascript formatted string
     *
     * @param mixed $value
     *
     * @return string
     */
    public static function phpValueToJs($value)
    {
        // For object which has own __toString method
        if ($value instanceof JsModelAbstract) {
            return $value->toJsString();
        }
        // For object which has own __toString method
        elseif (is_object($value) && method_exists($value, '__toString')) {
            return self::phpValueToJs($value->__toString());
        }
        // For an object or associative array
        elseif (is_object($value) || (is_array($value) && array_values($value) !== $value)) {
            $jsObject = array();
            $properties = is_object($value) ? get_object_vars($value) : $value;
            foreach ($properties as $paramName => $paramValue) {
                $paramName = self::escapeJsString((string) $paramName);
                $jsObject[] = "'$paramName':" . self::phpValueToJs($paramValue);
            }

            return sprintf('{%1$s}', implode(',', $jsObject));
        }
        // For a sequential array
        elseif (is_array($value)) {
            $jsArray = array();
            foreach ($value as $item) {
                $jsArray[] = self::phpValueToJs($item);
            }

            return sprintf('[%1$s]', implode(',', $jsArray));
        }
        // For string
        elseif (is_string($value)) {
            return "'" . self::escapeJsString($value) . "'";
        }
        // For boolean
        elseif (is_bool($value)) {
            return true === $value ? 'true' : 'false';
        }
        // For numbers
        elseif (is_numeric($value)) {
            // "NAN" and "INF" are not JavaScript literals
            if (is_float($value) && !is_finite($value)) {
                if (is_nan($value)) {
                    return 'NaN';
                }

                return $value > 0 ? 'Infinity' : '-Infinity';
            }

            return (string) $value;
        }
        // For null
        elseif (is_null($value)) {
            return 'null';
        }
        // Otherwise
        else {
            return 'undefined';
        }
    }

    /**
     * Escape a string so it is safe inside a single quoted JavaScript literal
     * printed into an inline <script> block
     *
     * @param string $value
     *
     * @return string
     */
    protected static function escapeJsString($value)
    {
        $value = addcslashes($value, '\'\\');

        return strtr(
            $value,
            array(
                "\n" => '\n',
                "\r" => '\r',
                "\t" => '\t',
                "\v" => '\x0B',
                "\f" => '\f',
                "\0" => '\x00',
                // Keep the generated code inside its own <script> block
                '<' => '\u003C',
                '>' => '\u003E',
                '&' => '\u0026',
                // Valid in JSON, but line terminators in JavaScript source
                "\xE2\x80\xA8" => '\u2028',
                "\xE2\x80\xA9" => '\u2029',
            )
        );
    }

    /**
     * @return array
     */
    public function toArray()
    {
        $result = array();
        foreach (get_object_vars($this) as $key => $value) {
            $result[$key] = $value;
        }

        return $result;
    }
}
