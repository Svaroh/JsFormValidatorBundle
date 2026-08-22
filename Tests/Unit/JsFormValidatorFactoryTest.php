<?php

namespace Svaroh\JsFormValidatorBundle\Tests\Unit;

use Svaroh\JsFormValidatorBundle\Factory\JsFormValidatorFactory;
use Svaroh\JsFormValidatorBundle\Form\Extension\FormExtension;
use Svaroh\JsFormValidatorBundle\Form\Constraint\UniqueEntity as JsUniqueEntity;
use PHPUnit\Framework\TestCase;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity as SymfonyUniqueEntity;
use Symfony\Component\Form\ChoiceList\ArrayChoiceList;
use Symfony\Component\Form\DataTransformerInterface;
use Symfony\Component\Form\Extension\Core\Type\BirthdayType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\FormType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\PercentType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TimeType;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension;
use Symfony\Component\Form\Forms;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class JsFormValidatorFactoryTest extends TestCase
{
    use FactoryTestTrait;
    public function testCreatesModelFromModernSymfonyForm()
    {
        $validator = Validation::createValidator();
        $router = $this->createMock(UrlGeneratorInterface::class);
        $router
            ->expects($this->once())
            ->method('generate')
            ->with('svaroh_js_form_validator.check_unique_entity')
            ->willReturn('/svaroh_js_form_validator/check_unique_entity')
        ;

        $factory = new JsFormValidatorFactory(
            $validator,
            new IdentityTranslator(),
            $router,
            array(
                'js_validation' => true,
                'routing' => array(
                    'check_unique_entity' => 'svaroh_js_form_validator.check_unique_entity',
                ),
            ),
            'validators'
        );

        $formFactory = Forms::createFormFactoryBuilder()
            ->addExtension(new ValidatorExtension($validator))
            ->addTypeExtension(new FormExtension($factory))
            ->getFormFactory()
        ;

        $form = $formFactory
            ->createBuilder(FormType::class, null, array('validation_groups' => array('Default')))
            ->add('name', TextType::class, array('constraints' => array(new NotBlank())))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $config = $factory->createJsConfigModel();

        $this->assertSame('form', $model->id);
        $this->assertArrayHasKey('name', $model->children);
        $this->assertSame(TextType::class, $model->children['name']->type);
        $this->assertArrayHasKey(NotBlank::class, $model->children['name']->data['form']['constraints']);
        $this->assertSame(
            '/svaroh_js_form_validator/check_unique_entity',
            $config->routing['check_unique_entity']
        );
    }

    public function testUniqueEntityConstraintIncludesBoundEntityId()
    {
        $validator = Validation::createValidator();
        $router = $this->createStub(UrlGeneratorInterface::class);
        $factory = new JsFormValidatorFactory(
            $validator,
            new IdentityTranslator(),
            $router,
            array('js_validation' => true),
            'validators'
        );

        $formFactory = Forms::createFormFactoryBuilder()
            ->addExtension(new ValidatorExtension($validator))
            ->addTypeExtension(new FormExtension($factory))
            ->getFormFactory()
        ;

        $form = $formFactory
            ->createBuilder(
                FormType::class,
                new UniqueEntityUser(15, 'john@example.com'),
                array(
                    'data_class' => UniqueEntityUser::class,
                    'constraints' => array(new SymfonyUniqueEntity(fields: array('email'))),
                )
            )
            ->add('email', TextType::class)
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $constraints = $model->data['form']['constraints'][JsUniqueEntity::class];

        $this->assertCount(1, $constraints);
        $this->assertSame(15, $constraints[0]->entityId);
        $this->assertSame(UniqueEntityUser::class, $constraints[0]->entityName);
    }

    public function testConfigModelKeepsMissingRoutesAsNull()
    {
        $router = $this->createStub(UrlGeneratorInterface::class);
        $router
            ->method('generate')
            ->willReturnCallback(static function ($route) {
                if ('missing_route' === $route) {
                    throw new \RuntimeException('Route not found.');
                }

                return '/' . $route;
            })
        ;

        $factory = $this->createFactory(null, $router, array(
            'js_validation' => true,
            'routing' => array(
                'existing' => 'existing_route',
                'missing' => 'missing_route',
            ),
        ));

        $config = $factory->createJsConfigModel();

        $this->assertSame('/existing_route', $config->routing['existing']);
        $this->assertNull($config->routing['missing']);
        $this->assertFalse($config->html5Validation);
        $this->assertSame(
            '<script type="text/javascript">SvarohJsFormValidator.config = {\'routing\':{\'existing\':\'/existing_route\',\'missing\':null},\'html5Validation\':false};</script>',
            $factory->getJsConfigString()
        );
        $this->assertSame(
            array(
                'js_validation' => true,
                'routing' => array(
                    'existing' => 'existing_route',
                    'missing' => 'missing_route',
                ),
            ),
            $factory->getConfig()
        );
        $this->assertNull($factory->getConfig('unknown'));
    }

    /**
     * The HTML5 integration is opt-in, so the browser only takes over the
     * Constraint Validation API when the application asked for it
     *
     * @see https://github.com/formapro/JsFormValidatorBundle/issues/75
     */
    public function testConfigModelExportsTheHtml5ValidationFlag()
    {
        $factory = $this->createFactory(null, null, array(
            'js_validation' => true,
            'html5_validation' => true,
            'routing' => array('check_unique_entity' => 'a_route'),
        ));

        $this->assertTrue($factory->createJsConfigModel()->html5Validation);
        $this->assertSame(
            '<script type="text/javascript">SvarohJsFormValidator.config = {\'routing\':{\'check_unique_entity\':\'/generated-route\'},\'html5Validation\':true};</script>',
            $factory->getJsConfigString()
        );
    }

    public function testQueueCanBeFilteredAndProcessed()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('name', TextType::class)
            ->add('_token', HiddenType::class)
            ->getForm()
        ;
        $entry = $formFactory
            ->createNamedBuilder('collection_entry', TextType::class, null, array('block_name' => 'entry'))
            ->getForm()
        ;

        $factory->addToQueue($form);
        $factory->addToQueue($form->get('name'));
        $factory->addToQueue($form->get('_token'));
        $factory->addToQueue($entry);

        $this->assertTrue($factory->inQueue($form));
        $this->assertArrayHasKey('profile', $factory->getQueue());

        $factory->siftQueue();
        $this->assertSame(array('profile'), array_keys($factory->getQueue()));

        $models = $factory->processQueue();

        $this->assertCount(1, $models);
        $this->assertSame('profile', $models[0]->id);
        $this->assertSame(array(), $factory->getQueue());
    }

    public function testReturnsValidatorJavascriptForQueuedForm()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('name', TextType::class, array('constraints' => array(new NotBlank())))
            ->getForm()
        ;

        $javascript = $factory->getJsValidatorString('profile', false);

        $this->assertStringContainsString('SvarohJsFormValidator.addModel({\'id\':\'profile\'', $javascript);
        $this->assertStringEndsWith(', false);', $javascript);
        $this->assertSame(array(), $factory->getQueue());
    }

    public function testEveryRenderOfTheSameFormIsQueuedOnItsOwn()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        // One form type rendered once per row of a listing
        $first = $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('name', TextType::class, array('constraints' => array(new NotBlank())))
            ->getForm()
        ;
        $second = $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('name', TextType::class, array('constraints' => array(new NotBlank())))
            ->getForm()
        ;

        $this->assertTrue($factory->inQueue($first));
        $this->assertTrue($factory->inQueue($second));
        $this->assertSame(array('profile', 'profile#1'), array_keys($factory->getQueue()));

        $models = $factory->processQueue();

        $this->assertCount(2, $models);
        $this->assertSame('profile', $models[0]->id);
        $this->assertSame('profile', $models[1]->id);
    }

    public function testAllTheRendersOfTheRequestedFormAreInitialized()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $formFactory->createNamedBuilder('profile', FormType::class)->getForm();
        $formFactory->createNamedBuilder('profile', FormType::class)->getForm();
        $formFactory->createNamedBuilder('other', FormType::class)->getForm();

        $javascript = $factory->getJsValidatorString('profile', false);

        $this->assertSame(2, substr_count($javascript, 'SvarohJsFormValidator.addModel({\'id\':\'profile\''));
        $this->assertSame(array('other'), array_keys($factory->getQueue()));
    }

    public function testThrowsWhenRequestedQueuedFormDoesNotExist()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $formFactory->createNamedBuilder('profile', FormType::class)->getForm();

        $this->expectException(\Svaroh\JsFormValidatorBundle\Exception\UndefinedFormException::class);
        $this->expectExceptionMessage("Form 'missing' was not found. Existing forms: profile");

        $factory->getJsValidatorString('missing');
    }

    public function testReturnsEmptyJavascriptForDisabledForm()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class, null, array('js_validation' => false))
            ->getForm()
        ;

        $factory->addToQueue($form);

        $this->assertNull($factory->createJsModel($form));
        $this->assertSame('', $factory->getJsValidatorString());
    }

    public function testRegexMatchOptionIsSerializedIntoTheJsModel()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('name', TextType::class, array('constraints' => array(
                new Assert\Regex(pattern: '/\d/', match: false, message: 'Your name cannot contain a number'),
            )))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $constraints = $model->children['name']->data['form']['constraints'];

        $this->assertArrayHasKey(Assert\Regex::class, $constraints);
        $this->assertFalse($constraints[Assert\Regex::class][0]->match);
        $this->assertStringContainsString("'match':false", $model->toJsString());
    }

    public function testValidationGroupsClosureIsSerializedAsFormId()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class, null, array(
                'validation_groups' => static function () {
                    return array('IgnoredAtRuntime');
                },
            ))
            ->add('name', TextType::class, array('constraints' => array(new NotBlank())))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);

        $this->assertSame('profile', $model->children['name']->data['form']['groups']);
    }

    public function testParentAndOwnValidationMetadataAreSerialized()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class, new MetadataUser(), array(
                'data_class' => MetadataUser::class,
            ))
            ->add('name', TextType::class)
            ->getForm()
        ;

        $model = $factory->createJsModel($form);

        $this->assertArrayHasKey(Assert\NotBlank::class, $model->children['name']->data['parent']['constraints']);
        $this->assertSame(array('Default'), $model->children['name']->data['parent']['groups']);
        $this->assertArrayHasKey('isActive', $model->data['entity']['getters']);
        $this->assertArrayHasKey(Assert\IsTrue::class, $model->data['entity']['getters']['isActive']);
    }

    public function testComparisonConstraintsExportTheirPropertyPaths()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('booking', FormType::class, new ComparedUser(), array(
                'data_class' => ComparedUser::class,
            ))
            ->add('startDate', TextType::class)
            ->add('endDate', TextType::class)
            ->add('guests', IntegerType::class)
            ->getForm()
        ;
        $factory->addToQueue($form);

        $model = $factory->createJsModel($form);

        $greaterThan = $model->children['endDate']->data['parent']['constraints'][Assert\GreaterThan::class][0];
        $this->assertSame('startDate', $greaterThan->propertyPath);
        $this->assertNull($greaterThan->value);

        $range = $model->children['guests']->data['parent']['constraints'][Assert\Range::class][0];
        $this->assertSame('minGuests', $range->minPropertyPath);
        $this->assertSame('maxGuests', $range->maxPropertyPath);

        // The client side reads the compared value from the pointed field, so
        // the paths have to survive into the generated JavaScript model
        $javascript = $factory->getJsValidatorString('booking', false);

        $this->assertStringContainsString("'propertyPath':'startDate'", $javascript);
        $this->assertStringContainsString("'minPropertyPath':'minGuests'", $javascript);
        $this->assertStringContainsString("'maxPropertyPath':'maxGuests'", $javascript);
    }

    public function testExpandedChoicesExposeBooleanArrayTransformers()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class)
            ->add('status', ChoiceType::class, array(
                'choices' => array('Enabled' => 'enabled', 'Disabled' => 'disabled'),
                'expanded' => true,
                'multiple' => false,
            ))
            ->add('tags', ChoiceType::class, array(
                'choices' => array('Public' => 'public', 'Featured' => 'featured'),
                'expanded' => true,
                'multiple' => true,
            ))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);

        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\ChoiceToBooleanArrayTransformer',
            $model->children['status']->transformers[0]['name']
        );
        $this->assertSame(array('enabled', 'disabled'), $model->children['status']->transformers[0]['choiceList']);
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\ChoicesToBooleanArrayTransformer',
            $model->children['tags']->transformers[0]['name']
        );
        $this->assertSame(array('public', 'featured'), $model->children['tags']->transformers[0]['choiceList']);
    }

    public function testProtectedTransformerAndMergeHelpers()
    {
        $factory = new TestableJsFormValidatorFactory(
            Validation::createValidator(),
            new IdentityTranslator(),
            $this->createStub(UrlGeneratorInterface::class),
            array('js_validation' => true),
            'validators'
        );

        $parsed = $factory->exposedParseTransformers(array(new TransformerFixture()));

        $this->assertSame(TransformerFixture::class, $parsed[0]['name']);
        $this->assertSame('scalar-value', $parsed[0]['scalarValue']);
        $this->assertSame(array('left' => 'right'), $parsed[0]['arrayValue']);
        $this->assertNull($parsed[0]['objectValue']);
        $this->assertSame(array('first', 'second'), $parsed[0]['choiceList']);
        $this->assertSame(NestedTransformerFixture::class, $parsed[0]['transformers'][0]['name']);
        $this->assertSame('nested-value', $parsed[0]['transformers'][0]['nestedValue']);

        $this->assertSame(
            array(
                'nested' => array('left' => 1, 'right' => 2),
                'list' => array('a', 'b'),
                'scalar' => 'new',
                'fresh' => array('value'),
            ),
            $factory->exposedMergeDataRecursive(
                array(
                    'nested' => array('left' => 1),
                    'list' => array('a'),
                    'scalar' => 'old',
                ),
                array(
                    'nested' => array('right' => 2),
                    'list' => array('b'),
                    'scalar' => 'new',
                    'fresh' => array('value'),
                )
            )
        );
    }

    public function testLocalizedNumberTransformersExposeTheLocaleConventions()
    {
        if (!extension_loaded('intl')) {
            $this->markTestSkipped('The intl extension is required to read the locale conventions.');
        }

        $default = \Locale::getDefault();
        \Locale::setDefault('it');

        try {
            $factory = $this->createFactory();
            $formFactory = $this->createFormFactory($factory);
            $form = $formFactory
                ->createNamedBuilder('invoice', FormType::class)
                ->add('amount', NumberType::class)
                ->add('quantity', IntegerType::class)
                ->add('items', IntegerType::class, array('grouping' => true))
                ->add('price', MoneyType::class, array('divisor' => 100))
                ->add('discount', PercentType::class, array('scale' => 2))
                ->getForm()
            ;

            $model = $factory->createJsModel($form);
        } finally {
            \Locale::setDefault($default);
        }

        $amount = $model->children['amount']->transformers[0];
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\NumberToLocalizedStringTransformer',
            $amount['name']
        );
        $this->assertSame(',', $amount['decimalSeparator']);
        $this->assertSame('.', $amount['groupingSeparator']);
        $this->assertFalse($amount['grouping']);
        $this->assertNull($amount['scale']);
        $this->assertSame(\NumberFormatter::ROUND_HALFUP, $amount['roundingMode']);
        $this->assertSame('-', $amount['minusSign']);
        $this->assertSame('0', $amount['zeroDigit']);
        $this->assertSame('E', $amount['exponentSymbol']);
        $this->assertSame(3, $amount['groupingSize']);
        $this->assertSame(0, $amount['secondaryGroupingSize']);

        // An integer field without grouping is rendered with the "en" locale
        $quantity = $model->children['quantity']->transformers[0];
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\IntegerToLocalizedStringTransformer',
            $quantity['name']
        );
        $this->assertSame('.', $quantity['decimalSeparator']);
        $this->assertSame(0, $quantity['scale']);
        $this->assertSame(\NumberFormatter::ROUND_DOWN, $quantity['roundingMode']);

        $items = $model->children['items']->transformers[0];
        $this->assertSame(',', $items['decimalSeparator']);
        $this->assertSame('.', $items['groupingSeparator']);
        $this->assertTrue($items['grouping']);

        $price = $model->children['price']->transformers[0];
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\MoneyToLocalizedStringTransformer',
            $price['name']
        );
        $this->assertSame(',', $price['decimalSeparator']);
        $this->assertSame(2, $price['scale']);
        $this->assertSame(100, $price['divisor']);
        $this->assertSame('float', $price['input']);

        $discount = $model->children['discount']->transformers[0];
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\PercentToLocalizedStringTransformer',
            $discount['name']
        );
        $this->assertSame(',', $discount['decimalSeparator']);
        $this->assertSame('.', $discount['groupingSeparator']);
        $this->assertTrue($discount['grouping']);
        $this->assertSame('fractional', $discount['type']);
        $this->assertSame(2, $discount['scale']);
    }

    public function testLocalizedNumberTransformersExposeTheSymbolsOfTheirLocale()
    {
        if (!extension_loaded('intl')) {
            $this->markTestSkipped('The intl extension is required to read the locale conventions.');
        }

        $default = \Locale::getDefault();

        try {
            $factory = $this->createFactory();
            $formFactory = $this->createFormFactory($factory);

            // The minus sign of "sv" is U+2212 and its exponent is "×10^"
            \Locale::setDefault('sv');
            $swedish = $factory
                ->createJsModel($formFactory->createNamedBuilder('a', FormType::class)
                    ->add('amount', NumberType::class)
                    ->getForm())
                ->children['amount']->transformers[0]
            ;

            // "ar" writes the digits of its own script
            \Locale::setDefault('ar');
            $arabic = $factory
                ->createJsModel($formFactory->createNamedBuilder('b', FormType::class)
                    ->add('amount', NumberType::class)
                    ->getForm())
                ->children['amount']->transformers[0]
            ;

            // "hi" groups the leading digits by two
            \Locale::setDefault('hi');
            $hindi = $factory
                ->createJsModel($formFactory->createNamedBuilder('c', FormType::class)
                    ->add('amount', NumberType::class, array('grouping' => true))
                    ->getForm())
                ->children['amount']->transformers[0]
            ;
        } finally {
            \Locale::setDefault($default);
        }

        $this->assertSame("\xE2\x88\x92", $swedish['minusSign']);
        $this->assertNotSame('E', $swedish['exponentSymbol']);

        $this->assertSame("\xD9\xA0", $arabic['zeroDigit']);

        $this->assertSame(3, $hindi['groupingSize']);
        $this->assertSame(2, $hindi['secondaryGroupingSize']);
    }

    public function testTheTrimOptionOfTheElementIsExported()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('invoice', FormType::class)
            ->add('kept', TextType::class, array('trim' => false))
            ->add('trimmed', TextType::class)
            ->getForm()
        ;

        $model = $factory->createJsModel($form);

        $this->assertFalse($model->children['kept']->trim);
        $this->assertTrue($model->children['trimmed']->trim);
    }

    public function testTransformersOfOtherTypesAreNotGivenNumberParams()
    {
        $factory = new TestableJsFormValidatorFactory(
            Validation::createValidator(),
            new IdentityTranslator(),
            $this->createStub(UrlGeneratorInterface::class),
            array('js_validation' => true),
            'validators'
        );

        $parsed = $factory->exposedParseTransformers(array(new TransformerFixture()));

        $this->assertArrayNotHasKey('decimalSeparator', $parsed[0]);
        $this->assertArrayNotHasKey('groupingSeparator', $parsed[0]);
    }

    public function testRelativeRangeBoundsOfADateFieldAreResolvedToADate()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('profile', FormType::class, new RangeUser(), array(
                'data_class' => RangeUser::class,
            ))
            ->add('birthday', DateType::class)
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $constraint = $model->children['birthday']->data['parent']['constraints'][Assert\Range::class][0];

        $this->assertSame(
            (new \DateTimeImmutable('first day of this month - 14 years UTC'))->format('Y-m-d'),
            $constraint->min
        );
        $this->assertSame((new \DateTimeImmutable('today'))->format('Y-m-d'), $constraint->max);
    }

    public function testAbsoluteRangeBoundsOfADateFieldAreNormalizedPerType()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('booking', FormType::class)
            ->add('day', DateType::class, array(
                'constraints' => array(new Assert\Range(min: '2017-06-29', max: '2017-07-31')),
            ))
            ->add('startsAt', DateTimeType::class, array(
                'constraints' => array(new Assert\Range(min: '2017-06-29 10:00', max: '2017-06-29 18:00')),
            ))
            // BirthdayType is resolved through its DateType parent
            ->add('born', BirthdayType::class, array(
                'constraints' => array(new Assert\Range(max: '2017-06-29 18:00')),
            ))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $day = $model->children['day']->data['form']['constraints'][Assert\Range::class][0];
        $startsAt = $model->children['startsAt']->data['form']['constraints'][Assert\Range::class][0];
        $born = $model->children['born']->data['form']['constraints'][Assert\Range::class][0];

        $this->assertSame('2017-06-29', $day->min);
        $this->assertSame('2017-07-31', $day->max);
        $this->assertSame('2017-06-29 10:00:00', $startsAt->min);
        $this->assertSame('2017-06-29 18:00:00', $startsAt->max);
        $this->assertNull($born->min);
        $this->assertSame('2017-06-29', $born->max);
    }

    public function testResolvedRangeBoundsDoNotLeakIntoTheConstraintObject()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $constraint = new Assert\Range(min: 'today', max: 'today + 1 day');
        $form = $formFactory
            ->createNamedBuilder('booking', FormType::class)
            ->add('day', DateType::class, array('constraints' => array($constraint)))
            ->getForm()
        ;

        $exported = $factory
            ->createJsModel($form)
            ->children['day']->data['form']['constraints'][Assert\Range::class][0]
        ;

        $this->assertNotSame($constraint, $exported);
        $this->assertSame('today', $constraint->min);
        $this->assertSame('today + 1 day', $constraint->max);
    }

    public function testRangeBoundsAreKeptForTheFieldsNotComparedAsDates()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('booking', FormType::class)
            ->add('amount', NumberType::class, array(
                'constraints' => array(new Assert\Range(min: 1, max: 5)),
            ))
            // The model data is an integer, so Symfony compares it as a number
            ->add('stamp', DateType::class, array(
                'input' => 'timestamp',
                'constraints' => array(new Assert\Range(min: 'today', max: 'today + 1 day')),
            ))
            // TimeType is not supported, its bound would be resolved to a
            // full date while the submitted value carries a time only
            ->add('startsAt', TimeType::class, array(
                'constraints' => array(new Assert\Range(min: '10:00', max: '18:00')),
            ))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $constraints = array();
        foreach (array('amount', 'stamp', 'startsAt') as $name) {
            $constraints[$name] = $model->children[$name]->data['form']['constraints'][Assert\Range::class][0];
        }

        $this->assertSame(1, $constraints['amount']->min);
        $this->assertSame(5, $constraints['amount']->max);
        $this->assertSame('today', $constraints['stamp']->min);
        $this->assertSame('today + 1 day', $constraints['stamp']->max);
        $this->assertSame('10:00', $constraints['startsAt']->min);
        $this->assertSame('18:00', $constraints['startsAt']->max);
    }

    public function testAnUnparsableRangeBoundIsExportedAsItIs()
    {
        $factory = $this->createFactory();
        $formFactory = $this->createFormFactory($factory);
        $form = $formFactory
            ->createNamedBuilder('booking', FormType::class)
            ->add('day', DateType::class, array(
                'constraints' => array(new Assert\Range(min: 'not a date at all')),
            ))
            ->getForm()
        ;

        $exported = $factory
            ->createJsModel($form)
            ->children['day']->data['form']['constraints'][Assert\Range::class][0]
        ;

        $this->assertSame('not a date at all', $exported->min);
    }


    public function testRepeatedTypeMovesPropertyConstraintsToItsFirstChild()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('user', FormType::class, new RepeatedUser(), array(
                'data_class' => RepeatedUser::class,
            ))
            ->add('password', RepeatedType::class, array('type' => PasswordType::class))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $repeated = $model->children['password'];
        $first = $repeated->children['first'];

        // The repeated element owns no input, so keeping the constraints on it
        // would report every violation a second time
        $this->assertSame(array(), $repeated->data);
        $this->assertArrayNotHasKey('parent', $first->data);
        $this->assertArrayHasKey(Assert\Length::class, $first->data['form']['constraints']);
        $this->assertSame(6, $first->data['form']['constraints'][Assert\Length::class][0]->min);
        $this->assertSame(array('Default'), $first->data['form']['groups']);
        // Symfony maps the violations of a repeated field to its first child
        $this->assertSame(array(), $repeated->children['second']->data);
        // The "values do not match" check is driven by the transformer, which
        // has to stay on the repeated element
        $this->assertSame(
            'Symfony\Component\Form\Extension\Core\DataTransformer\ValueToDuplicatesTransformer',
            $repeated->transformers[0]['name']
        );
        $this->assertSame(array('first', 'second'), $repeated->transformers[0]['keys']);
    }

    public function testRepeatedTypeMergesMovedConstraintsIntoTheConfiguredFirstChild()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('user', FormType::class, new RepeatedUser(), array(
                'data_class' => RepeatedUser::class,
            ))
            ->add('password', RepeatedType::class, array(
                'type' => PasswordType::class,
                'first_name' => 'plain',
                'second_name' => 'confirm',
                'first_options' => array('constraints' => array(new NotBlank())),
            ))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $repeated = $model->children['password'];
        $constraints = $repeated->children['plain']->data['form']['constraints'];

        $this->assertSame(array(), $repeated->data);
        $this->assertArrayHasKey(NotBlank::class, $constraints);
        $this->assertArrayHasKey(Assert\Length::class, $constraints);
        $this->assertSame(array('Default'), $repeated->children['plain']->data['form']['groups']);
        $this->assertSame(array(), $repeated->children['confirm']->data);
    }

    public function testRepeatedTypeKeepsItsDataWhenTheFirstChildIsNotProcessed()
    {
        $validator = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
        ;
        $factory = $this->createFactory($validator);
        $formFactory = $this->createFormFactory($factory, $validator);
        $form = $formFactory
            ->createNamedBuilder('user', FormType::class, new RepeatedUser(), array(
                'data_class' => RepeatedUser::class,
            ))
            ->add('password', RepeatedType::class, array(
                'type' => PasswordType::class,
                'first_options' => array('js_validation' => false),
            ))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $repeated = $model->children['password'];

        $this->assertArrayNotHasKey('first', $repeated->children);
        $this->assertArrayHasKey(Assert\Length::class, $repeated->data['parent']['constraints']);
    }
}

class UniqueEntityUser
{
    public $email;

    private $id;

    public function __construct($id, $email)
    {
        $this->id = $id;
        $this->email = $email;
    }

    public function getId()
    {
        return $this->id;
    }
}

class RangeUser
{
    #[Assert\Range(min: 'first day of this month - 14 years UTC', max: 'today')]
    public $birthday;
}

class MetadataUser
{
    #[Assert\NotBlank(message: 'Name is required.')]
    public $name = '';

    #[Assert\IsTrue(message: 'User must be active.')]
    public function isActive()
    {
        return true;
    }
}

class ComparedUser
{
    public $startDate;

    #[Assert\GreaterThan(propertyPath: 'startDate', message: 'End smaller than start.')]
    public $endDate;

    public $minGuests = 1;

    public $maxGuests = 4;

    #[Assert\Range(minPropertyPath: 'minGuests', maxPropertyPath: 'maxGuests')]
    public $guests;
}

class RepeatedUser
{
    #[Assert\Length(min: 6, minMessage: 'The password is too short.')]
    public $password = '';
}

class TestableJsFormValidatorFactory extends JsFormValidatorFactory
{
    public function exposedParseTransformers(array $transformers)
    {
        return $this->parseTransformers($transformers);
    }

    public function exposedMergeDataRecursive(array $array1, array $array2)
    {
        return $this->mergeDataRecursive($array1, $array2);
    }
}

class TransformerFixture implements DataTransformerInterface
{
    private $scalarValue = 'scalar-value';

    private $arrayValue = array('left' => 'right');

    private $objectValue;

    private $choiceList;

    private $transformers;

    public function __construct()
    {
        $this->objectValue = new \stdClass();
        $this->choiceList = new ArrayChoiceList(array('First' => 'first', 'Second' => 'second'));
        $this->transformers = array(new NestedTransformerFixture());
    }

    public function transform(mixed $value): mixed
    {
        return array(
            $value,
            $this->scalarValue,
            $this->arrayValue,
            $this->objectValue,
            $this->choiceList,
            $this->transformers,
        );
    }

    public function reverseTransform(mixed $value): mixed
    {
        return $value;
    }
}

class NestedTransformerFixture implements DataTransformerInterface
{
    private $nestedValue = 'nested-value';

    public function transform(mixed $value): mixed
    {
        return array($value, $this->nestedValue);
    }

    public function reverseTransform(mixed $value): mixed
    {
        return $value;
    }
}
