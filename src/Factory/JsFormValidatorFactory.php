<?php
namespace Svaroh\JsFormValidatorBundle\Factory;

use Svaroh\JsFormValidatorBundle\Exception\UndefinedFormException;
use Svaroh\JsFormValidatorBundle\Form\Constraint\UniqueEntity;
use Svaroh\JsFormValidatorBundle\Model\JsConfig;
use Svaroh\JsFormValidatorBundle\Model\JsFormElement;
use Symfony\Component\Form\ChoiceList\ChoiceListInterface;
use Symfony\Component\Form\DataTransformerInterface;
use Symfony\Component\Form\Extension\Core\DataTransformer\NumberToLocalizedStringTransformer;
use Symfony\Component\Form\Extension\Core\DataTransformer\PercentToLocalizedStringTransformer;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\FormInterface;
use Symfony\Contracts\Translation\TranslatorInterface;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\Constraints\Range;
use Symfony\Component\Validator\Mapping\ClassMetadataInterface;
use Symfony\Component\Validator\Mapping\GetterMetadata;
use Symfony\Component\Validator\Mapping\MetadataInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * This factory uses to parse a form to a tree of JsFormElement's
 *
 * Class JsFormValidatorFactory
 *
 * @package Svaroh\JsFormValidatorBundle\Factory
 */
class JsFormValidatorFactory
{
    /**
     * @var ValidatorInterface
     */
    protected $validator;

    /**
     * @var TranslatorInterface
     */
    protected $translator;

    /**
     * @var \Symfony\Component\Routing\Generator\UrlGeneratorInterface
     */
    protected $router;

    /**
     * @var array
     */
    protected $config = array();

    /**
     * @var FormInterface[]
     */
    protected $queue = array();

    /**
     * @var FormInterface|null
     */
    protected $currentElement = null;

    /**
     * @var string
     */
    protected $transDomain;

    /**
     * @param ValidatorInterface    $validator
     * @param TranslatorInterface   $translator
     * @param \Symfony\Component\Routing\Generator\UrlGeneratorInterface $router
     * @param array                 $config
     * @param string                $domain
     */
    public function __construct(
        ValidatorInterface $validator,
        TranslatorInterface $translator,
        $router,
        $config,
        $domain
    ) {
        $this->validator   = $validator;
        $this->translator  = $translator;
        $this->router      = $router;
        $this->config      = $config;
        $this->transDomain = $domain;
    }

    /**
     * Gets metadata from system using the entity class name
     *
     * @param string $className
     *
     * @return MetadataInterface
     * @codeCoverageIgnore
     */
    protected function getMetadataFor($className)
    {
        return $this->validator->getMetadataFor($className);
    }

    /**
     * Translate a single message
     *
     * @param string $message
     *
     * @return string
     * @codeCoverageIgnore
     */
    protected function translateMessage($message, ?array $parameters = null)
    {
        return $this->translator->trans($message, $parameters ?? array(), $this->transDomain);
    }

    /**
     * Generate an URL from the route
     *
     * @param string $route
     *
     * @return string
     * @codeCoverageIgnore
     */
    protected function generateUrl($route)
    {
        return $this->router->generate($route);
    }

    /**
     * Get Config
     *
     * @param null|string $name
     *
     * @return mixed
     */
    public function getConfig($name = null)
    {
        if ($name) {
            return isset($this->config[$name]) ? $this->config[$name] : null;
        } else {
            return $this->config;
        }
    }

    public function createJsConfigModel()
    {
        $result = array('routing' => array());
        if (!empty($this->config['routing'])) {
            foreach ($this->config['routing'] as $param => $value) {
                try {
                    $result['routing'][$param] = $this->generateUrl($value);
                } catch (\Exception $e) {
                    $result['routing'][$param] = null;
                }
            }
        }
        $model                  = new JsConfig;
        $model->routing         = $result['routing'];
        $model->html5Validation = !empty($this->config['html5_validation']);

        return $model;
    }

    /**
     * Returns the current queue
     *
     * @return FormInterface[]
     */
    public function getQueue()
    {
        return $this->queue;
    }

    /**
     * Add a new form to processing queue
     *
     * @param FormInterface $form
     *
     * @return void
     */
    public function addToQueue(FormInterface $form)
    {
        if ($this->inQueue($form)) {
            return;
        }

        $this->queue[$this->createQueueKey($form)] = $form;
    }

    /**
     * One form type can be rendered several times on a single page, e.g. once
     * per row of a listing. Every one of those forms is a form of its own and
     * needs a model of its own, so a repeated name gets an own queue key
     * instead of replacing the form which is already queued
     *
     * @param FormInterface $form
     *
     * @return string
     */
    protected function createQueueKey(FormInterface $form)
    {
        $name = $form->getName();
        if (!isset($this->queue[$name])) {
            return $name;
        }

        $index = 1;
        while (isset($this->queue[$name . '#' . $index])) {
            $index++;
        }

        return $name . '#' . $index;
    }

    /**
     * Check if form is already in queue
     *
     * @param FormInterface $form
     *
     * @return bool
     */
    public function inQueue(FormInterface $form)
    {
        return in_array($form, $this->queue, true);
    }

    /**
     * Removes from the queue elements which are not parent forms and should not be processes
     *
     * @return $this
     */
    public function siftQueue()
    {
        foreach ($this->queue as $key => $form) {
            $blockName = $form->getConfig()->getOption('block_name');
            if ('_token' == $form->getName() || 'entry' == $blockName || $form->getParent()) {
                unset($this->queue[$key]);
            }
        }

        return $this;
    }

    /**
     * @return JsFormElement[]
     */
    public function processQueue()
    {
        $result = array();
        foreach ($this->queue as $form) {
            if (null !== ($model = $this->createJsModel($form))) {
                $result[] = $model;
            }
        };

        $this->queue = array();

        return $result;
    }

    /**
     * The main function that creates nested model
     *
     * @param FormInterface $form
     *
     * @return null|JsFormElement
     */
    public function createJsModel(FormInterface $form)
    {
        $this->currentElement = $form;

        $conf = $form->getConfig();
        // If field is explicitly disabled, skip it
        // null means "inherit" which is treated as enabled (same as true)
        if (false === $conf->getOption('js_validation')) {
            return null;
        }

        $model                 = new JsFormElement;
        $model->id             = $this->getElementId($form);
        $model->name           = $form->getName();
        $model->type           = get_class($conf->getType()->getInnerType());
        $model->invalidMessage = $this->translateMessage(
            $conf->getOption('invalid_message'),
            $conf->getOption('invalid_message_parameters')
        );
        $model->trim           = (bool)$conf->getOption('trim', true);
        $model->transformers   = $this->normalizeViewTransformers(
            $form,
            $this->parseTransformers($conf->getViewTransformers())
        );
        $model->bubbling       = $conf->getOption('error_bubbling');
        $model->data           = $this->getValidationData($form);
        $model->children       = $this->processChildren($form);

        $this->moveRepeatedValidationData($form, $model);

        $prototype = $form->getConfig()->getAttribute('prototype');
        if ($prototype) {
            $model->prototype = $this->createJsModel($prototype);
        }

        // Return self id to add it as child to the parent model
        return $model;
    }

    /**
     * Create the JsFormElement for all the children of specified element
     *
     * @param FormInterface $form
     *
     * @return array
     */
    protected function processChildren(FormInterface $form)
    {
        $result = array();
        // If this field has children - process them
        foreach ($form as $name => $child) {
            if ($this->isProcessableElement($child)) {
                $childModel = $this->createJsModel($child);
                if (null !== $childModel) {
                    $result[$name] = $childModel;
                }
            }
        }

        return $result;
    }

    /**
     * A "repeated" field owns no widget: it holds a single value that
     * ValueToDuplicatesTransformer spreads over two children, and its row
     * renders the rows of those children only. The constraints of the
     * underlying property are collected for the repeated element itself, where
     * no input can carry them, so they are moved down to the child that
     * Symfony reports the violations on - RepeatedTypeValidatorExtension
     * defaults the "error_mapping" option of the type to
     * array('.' => $options['first_name']).
     *
     * They are moved, not copied: leaving them on the repeated element would
     * report every violation twice, once for the element and once for the
     * child. They also land in the "form" section, because from now on they
     * belong to the input itself and not to a property of the parent form.
     *
     * @param FormInterface $form
     * @param JsFormElement $model
     *
     * @return void
     */
    protected function moveRepeatedValidationData(FormInterface $form, JsFormElement $model)
    {
        $config = $form->getConfig();
        if (empty($model->data) || !($config->getType()->getInnerType() instanceof RepeatedType)) {
            return;
        }

        $firstName = $config->getOption('first_name');
        // The child is missing when it is not processable, e.g. a hidden type
        // or a field whose validation was explicitly disabled
        if (!isset($model->children[$firstName])) {
            return;
        }

        $child  = $model->children[$firstName];
        $target = isset($child->data['form'])
            ? $child->data['form']
            : array('groups' => $this->getValidationGroups($form));

        foreach ($model->data as $data) {
            unset($data['groups']);
            $target = $this->mergeDataRecursive($target, $data);
        }

        $child->data['form'] = $target;
        $model->data         = array();
    }

    /**
     * Generate an Id for the element by merging the current element name
     * with all the parents names
     *
     * @param FormInterface $form
     *
     * @return string
     */
    protected function getElementId(FormInterface $form)
    {
        $parent = $form->getParent();
        if (null !== $parent) {
            return $this->getElementId($parent) . '_' . $form->getName();
        } else {
            return $form->getName();
        }
    }

    /**
     * @param FormInterface $form
     *
     * @return array
     */
    protected function getValidationData(FormInterface $form)
    {
        // If parent has metadata
        $parent = $form->getParent();
        if ($parent && null !== $parent->getConfig()->getDataClass()) {
            $classMetadata = $this->getMetadataFor($parent->getConfig()->getDataClass());
            if ($classMetadata instanceof ClassMetadataInterface && $classMetadata->hasPropertyMetadata($form->getName())) {
                $metadata = $classMetadata->getPropertyMetadata($form->getName());
                foreach ($metadata as $item) {
                    $constraints = $item instanceof GetterMetadata ? array() : $item->getConstraints();
                    $getters = $item instanceof GetterMetadata ? array($item) : array();
                    $this->composeValidationData(
                        $parentData,
                        $constraints,
                        $getters
                    );
                }
            }
        }
        // If has own metadata
        if (null !== $form->getConfig()->getDataClass()) {
            $metadata = $this->getMetadataFor($form->getConfig()->getDataClass());
            $this->composeValidationData(
                $ownData,
                $metadata->getConstraints(),
                $this->getGetterMetadata($metadata)
            );
        }
        // If has constraints in a form element
        $this->composeValidationData(
            $formData,
            (array)$form->getConfig()->getOption('constraints'),
            array()
        );

        $result = array();
        $groups = $this->getValidationGroups($form);

        if (!empty($parentData)) {
            $parentData['groups'] = $this->getValidationGroups($parent);
            $result['parent']     = $parentData;
        }
        if (!empty($ownData)) {
            $ownData['groups'] = $groups;
            $result['entity']  = $ownData;
        }
        if (!empty($formData)) {
            $formData['groups'] = $groups;
            $result['form']     = $formData;
        }

        return $result;
    }

    /**
     * @return GetterMetadata[]
     */
    protected function getGetterMetadata(MetadataInterface $metadata)
    {
        if (!$metadata instanceof ClassMetadataInterface) {
            return array();
        }

        $getters = array();
        foreach ($metadata->getConstrainedProperties() as $property) {
            foreach ($metadata->getPropertyMetadata($property) as $item) {
                if ($item instanceof GetterMetadata) {
                    $getters[] = $item;
                }
            }
        }

        return $getters;
    }

    protected function mergeDataRecursive(array $array1, array $array2)
    {
        foreach ($array2 as $key => $value) {
            if (empty($array1[$key])) {
                $array1[$key] = $value;
            } elseif (is_array($value)) {
                if ((array_keys($value) !== range(0, count($value) - 1))) {
                    $array1[$key] = $this->mergeDataRecursive($array1[$key], $value);
                } else {
                    $array1[$key] = array_merge($array1[$key], $value);
                }
            } else {
                $array1[$key] = $value;
            }
        }

        return $array1;
    }

    /**
     * @param array            $container
     * @param Constraint[]     $constraints
     * @param GetterMetadata[] $getters
     *
     * @return void
     */
    public function composeValidationData(&$container, $constraints, $getters)
    {
        if (null == $container) {
            $container = array();
        }
        if ($getters) {
            if (!isset($container['getters'])) {
                $container['getters'] = array();
            }
            $container['getters'] = array_merge($container['getters'], $this->parseGetters($getters));
        }
        if ($constraints) {
            if (!isset($container['constraints'])) {
                $container['constraints'] = array();
            }
            $container['constraints'] = array_merge($container['constraints'], $this->parseConstraints($constraints));
        }
    }

    /**
     * Get validation groups for the specified form
     *
     * @param FormInterface $form
     *
     * @return array|string
     */
    protected function getValidationGroups(FormInterface $form)
    {
        $result = array('Default');
        $groups = $form->getConfig()->getOption('validation_groups');

        if (empty($groups)) {
            // Try to get groups from a parent
            if ($form->getParent()) {
                $result = $this->getValidationGroups($form->getParent());
            }
        } elseif (is_array($groups)) {
            // If groups is an array - return groups as is
            $result = $groups;
        } elseif ($groups instanceof \Closure) {
            // If groups is a Closure - return the form class name to look for javascript
            $result = $this->getElementId($form);
        }

        return $result;
    }

    /**
     * Not all elements should be processed by thy factory (e.g. buttons, hidden inputs etc)
     *
     * @param mixed $element
     *
     * @return bool
     */
    protected function isProcessableElement($element)
    {
        return ($element instanceof FormInterface)
            && !($element->getConfig()->getType()->getInnerType() instanceof HiddenType);
    }

    /**
     * Gets view transformers from the given form.
     * Merges in an extra Choice(s)ToBooleanArrayTransformer transformer in case of expanded choice.
     *
     * @param FormInterface $form
     * @param array $viewTransformers
     *
     * @return array
     */
    protected function normalizeViewTransformers(FormInterface $form, array $viewTransformers)
    {
        $config = $form->getConfig();

        // Choice(s)ToBooleanArrayTransformer was deprecated in SF2.7 in favor of CheckboxListMapper and RadioListMapper
        if ($config->getType()->getInnerType() instanceof ChoiceType && $config->getOption('expanded')) {
            $namespace = 'Symfony\Component\Form\Extension\Core\DataTransformer\\';
            $transformer = $config->getOption('multiple')
                ? array('name' => $namespace . 'ChoicesToBooleanArrayTransformer')
                : array('name' => $namespace . 'ChoiceToBooleanArrayTransformer');
            $transformer['choiceList'] = array_values($config->getOption('choices'));
            array_unshift($viewTransformers, $transformer);
        }

        return $viewTransformers;
    }

    /**
     * Convert transformers objects to data arrays
     *
     * @param array $transformers
     *
     * @return array
     */
    protected function parseTransformers(array $transformers)
    {
        $result = array();
        foreach ($transformers as $trans) {
            $item = array();

            $reflect    = new \ReflectionClass($trans);
            $properties = $reflect->getProperties();
            foreach ($properties as $prop) {
                $item[$prop->getName()] = $this->getTransformerParam($trans, $prop->getName());
            }

            $item = array_merge($item, $this->parseLocalizedNumberParams($trans));
            $item['name'] = get_class($trans);

            $result[] = $item;
        }
        return $result;
    }

    /**
     * The number, integer, money and percent types render their value through
     * the ICU number formatter, so it follows the conventions of the current
     * locale (e.g. "1.234,5" for "it"). The formatting rules are exported to
     * let JavaScript reverse them instead of duplicating the locale data.
     *
     * @param DataTransformerInterface $transformer
     *
     * @return array
     */
    protected function parseLocalizedNumberParams(DataTransformerInterface $transformer)
    {
        if ($transformer instanceof NumberToLocalizedStringTransformer) {
            $declaringClass = NumberToLocalizedStringTransformer::class;
        } elseif ($transformer instanceof PercentToLocalizedStringTransformer) {
            $declaringClass = PercentToLocalizedStringTransformer::class;
        } else {
            return array();
        }

        try {
            $formatter = (new \ReflectionMethod($transformer, 'getNumberFormatter'))->invoke($transformer);

            $result = array(
                'decimalSeparator'      => $formatter->getSymbol(\NumberFormatter::DECIMAL_SEPARATOR_SYMBOL),
                'groupingSeparator'     => $formatter->getSymbol(\NumberFormatter::GROUPING_SEPARATOR_SYMBOL),
                'grouping'              => (bool)$formatter->getAttribute(\NumberFormatter::GROUPING_USED),
                // Locales such as "sv" write the minus as U+2212 and the
                // exponent as "×10^", and "ar" writes digits of its own script
                'minusSign'             => $formatter->getSymbol(\NumberFormatter::MINUS_SIGN_SYMBOL),
                'zeroDigit'             => $formatter->getSymbol(\NumberFormatter::ZERO_DIGIT_SYMBOL),
                'exponentSymbol'        => $formatter->getSymbol(\NumberFormatter::EXPONENTIAL_SYMBOL),
                // "hi" and the other locales of the Indian subcontinent group
                // the leading digits by two, not by three
                'groupingSize'          => (int)$formatter->getAttribute(\NumberFormatter::GROUPING_SIZE),
                'secondaryGroupingSize' => (int)$formatter->getAttribute(\NumberFormatter::SECONDARY_GROUPING_SIZE),
            );
        } catch (\Throwable $e) {
            // Without a usable intl formatter the JavaScript defaults are used
            return array();
        }

        // Both properties may be declared private in a parent class, where
        // ReflectionClass::getProperties() does not reach them
        $result['scale']        = $this->readTransformerProperty($transformer, $declaringClass, 'scale');
        $result['roundingMode'] = $this->readTransformerProperty($transformer, $declaringClass, 'roundingMode');

        return $result;
    }

    /**
     * Reads a property declared by the given class from a transformer instance
     *
     * @param DataTransformerInterface $transformer
     * @param string                   $declaringClass
     * @param string                   $paramName
     *
     * @return mixed
     */
    protected function readTransformerProperty(DataTransformerInterface $transformer, $declaringClass, $paramName)
    {
        try {
            $property = new \ReflectionProperty($declaringClass, $paramName);
        } catch (\ReflectionException $e) {
            return null;
        }

        return $property->isInitialized($transformer) ? $property->getValue($transformer) : null;
    }

    /**
     * Get the specified non-public transformer property
     *
     * @param DataTransformerInterface $transformer
     * @param string                   $paramName
     *
     * @return mixed
     */
    protected function getTransformerParam(DataTransformerInterface $transformer, $paramName)
    {
        $reflection = new \ReflectionProperty($transformer, $paramName);

        if (!$reflection->isInitialized($transformer)) {
            return null;
        }

        $value  = $reflection->getValue($transformer);
        $result = null;

        if ('transformers' === $paramName && is_array($value)) {
            $result = $this->parseTransformers($value);
        } elseif (is_scalar($value) || is_array($value)) {
            $result = $value;
        } elseif ($value instanceof ChoiceListInterface) {
            $result = array_values($value->getChoices());
        }

        return $result;
    }

    /**
     * Converts list of the GetterMetadata objects to a data array
     *
     * @param GetterMetadata[] $getters
     *
     * @return array
     */
    protected function parseGetters(array $getters)
    {
        $result = array();
        foreach ($getters as $getter) {
            $result[$getter->getName()] = $this->parseConstraints((array)$getter->getConstraints());
        }

        return $result;
    }

    /**
     * Converts list of constraints objects to a data array
     *
     * @param array $constraints
     *
     * @return array
     */
    protected function parseConstraints(array $constraints)
    {
        $result = array();
        foreach ($constraints as $item) {
            // Translate messages if need and add to result
            foreach ($item as $propName => $propValue) {
                if (false !== strpos(strtolower($propName), 'message')) {
                    $item->{$propName} = $this->translateMessage($propValue);
                }
            }

            if ($item instanceof \Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity) {
                $item = new UniqueEntity(
                    $item,
                    $this->currentElement->getConfig()->getDataClass(),
                    $this->currentElement->getConfig()->getData()
                );
            }

            if ($item instanceof Range) {
                $item = $this->resolveRangeDateBounds($item);
            }

            $result[get_class($item)][] = $item;
        }

        return $result;
    }

    /**
     * When the validated value is a \DateTimeInterface, Symfony's RangeValidator
     * converts a string bound to a date, which accepts every relative format the
     * PHP parser knows ("today", "first day of this month - 14 years UTC").
     * That parser cannot be reproduced in a browser, so the bound is resolved
     * here and exported as a concrete date string the JavaScript side compares
     * as a date. A relative bound is therefore frozen at the moment the form is
     * rendered.
     *
     * @param Range $constraint
     *
     * @return Range
     */
    protected function resolveRangeDateBounds(Range $constraint)
    {
        if (null === $this->currentElement) {
            return $constraint;
        }

        $format = $this->getDateBoundFormat($this->currentElement);
        if (null === $format) {
            return $constraint;
        }

        $min = $this->resolveDateBound($constraint->min, $format);
        $max = $this->resolveDateBound($constraint->max, $format);

        if ($min === $constraint->min && $max === $constraint->max) {
            return $constraint;
        }

        // The constraint object belongs to the shared class metadata, so the
        // resolved bounds must not leak into the server side validation
        $constraint      = clone $constraint;
        $constraint->min = $min;
        $constraint->max = $max;

        return $constraint;
    }

    /**
     * Returns the date format the given element exports its bounds in, or null
     * when its value is not compared as a date. Only the types whose value
     * reaches JavaScript as an ISO date string are supported: TimeType is not,
     * because Symfony compares its value against a bound resolved to the
     * current day, and neither is an element whose "input" option makes the
     * model data a string, a timestamp or an array.
     *
     * @param FormInterface $form
     *
     * @return string|null
     */
    protected function getDateBoundFormat(FormInterface $form)
    {
        $config = $form->getConfig();
        $input  = $config->getOption('input');

        if (!in_array($input, array('datetime', 'datetime_immutable', 'date_point'), true)) {
            return null;
        }

        // BirthdayType and the custom types are resolved through their parents
        for ($type = $config->getType(); null !== $type; $type = $type->getParent()) {
            $innerType = $type->getInnerType();

            if ($innerType instanceof DateTimeType) {
                return 'Y-m-d H:i:s';
            }
            if ($innerType instanceof DateType) {
                return 'Y-m-d';
            }
        }

        return null;
    }

    /**
     * Converts a single string bound to a date, non string bounds are kept as
     * they are because Symfony compares them as numbers
     *
     * @param mixed  $bound
     * @param string $format
     *
     * @return mixed
     */
    protected function resolveDateBound($bound, $format)
    {
        if (!is_string($bound) || '' === $bound) {
            return $bound;
        }

        try {
            $date = new \DateTimeImmutable($bound);
        } catch (\Exception $e) {
            // Symfony throws a ConstraintDefinitionException for such a bound,
            // let the server side report it instead of breaking the rendering
            return $bound;
        }

        return $date->format($format);
    }

    /**
     * Keys of all the queued forms with the given name, in the order they were
     * queued
     *
     * @param string $formName
     *
     * @return array
     */
    protected function findQueueKeys($formName)
    {
        $result = array();
        foreach ($this->queue as $key => $form) {
            if ($formName === $form->getName()) {
                $result[] = $key;
            }
        }

        return $result;
    }

    /**
     * Names of the queued forms, without the repeated ones
     *
     * @return array
     */
    protected function getQueuedFormNames()
    {
        $names = array();
        foreach ($this->queue as $form) {
            $names[$form->getName()] = true;
        }

        return array_keys($names);
    }

    public function getJsConfigString()
    {
        return '<script type="text/javascript">SvarohJsFormValidator.config = ' . $this->createJsConfigModel() . ';</script>';
    }

    /**
     * @param string $formName
     * @param bool   $onLoad
     *
     * @throws \Svaroh\JsFormValidatorBundle\Exception\UndefinedFormException
     * @return string
     */
    public function getJsValidatorString($formName = null, $onLoad = true)
    {
        $onLoad = $onLoad ? 'true' : 'false';
        $this->siftQueue();

        $models = array();
        // Process just the specified form
        if ($formName) {
            $keys = $this->findQueueKeys($formName);
            if (!$keys) {
                $list = implode(', ', $this->getQueuedFormNames());
                throw new UndefinedFormException("Form '$formName' was not found. Existing forms: $list");
            }
            // Each render of that form gets a model of its own
            foreach ($keys as $key) {
                $models[] = $this->createJsModel($this->queue[$key]);
                unset($this->queue[$key]);
            }
        } else { // Or process whole queue
            $models = $this->processQueue();
        }
        // If there are no forms to validate
        if (!array_filter($models)) {
            return '';
        }

        $result = array();
        foreach ($models as $model) {
            $result[] = "SvarohJsFormValidator.addModel({$model}, {$onLoad});";
        }

        return implode("\n", $result);
    }
}
