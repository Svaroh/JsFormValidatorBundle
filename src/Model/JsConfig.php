<?php

namespace Svaroh\JsFormValidatorBundle\Model;

/**
 * This model describes the bundle configuration passed to the browser
 *
 * Class JsConfig
 *
 * @package Svaroh\JsFormValidatorBundle\Model
 */
class JsConfig extends JsModelAbstract
{
    /**
     * @var array
     */
    public $routing = array();

    /**
     * Whether the browser cooperates with the Constraint Validation API
     * instead of validating the forms of this bundle on its own
     *
     * @var bool
     */
    public $html5Validation = false;
} 