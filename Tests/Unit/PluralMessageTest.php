<?php

namespace Svaroh\JsFormValidatorBundle\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Svaroh\JsFormValidatorBundle\Factory\JsFormValidatorFactory;
use Svaroh\JsFormValidatorBundle\Form\Extension\FormExtension;
use Symfony\Component\Form\Extension\Core\Type\FormType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension;
use Symfony\Component\Form\Forms;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Translation\Loader\ArrayLoader;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validation;

/**
 * A pluralized message carries every form of the translation in one string.
 * How many forms there are, and which one a given number takes, is a property
 * of the locale: two forms in English, three in Ukrainian, six in Arabic. The
 * form is chosen where the locale is known, so the browser is handed the one
 * form it has to show.
 */
class PluralMessageTest extends TestCase
{
    /** Symfony's own uk translation of Count::minMessage, all three forms. */
    private const UK_COUNT_MIN =
        'Ця колекція повинна містити {{ limit }} елемент чи більше.'
        . '|Ця колекція повинна містити {{ limit }} елемента чи більше.'
        . '|Ця колекція повинна містити {{ limit }} елементів чи більше.';

    public static function ukrainianLimits(): array
    {
        return array(
            'one' => array(1, 'Ця колекція повинна містити {{ limit }} елемент чи більше.'),
            'few' => array(3, 'Ця колекція повинна містити {{ limit }} елемента чи більше.'),
            'many' => array(5, 'Ця колекція повинна містити {{ limit }} елементів чи більше.'),
            'teens are many' => array(11, 'Ця колекція повинна містити {{ limit }} елементів чи більше.'),
        );
    }

    /**
     * Ukrainian has a third form for 5 and above that a two-form rule cannot
     * reach, which is the case this exists for.
     */
    #[DataProvider('ukrainianLimits')]
    public function testChoosesTheUkrainianFormOfTheLimit(int $min, string $expected)
    {
        $options = $this->parseConstraint(
            new Assert\Count(min: $min),
            'uk',
            array((new Assert\Count(min: 1))->minMessage => self::UK_COUNT_MIN)
        );

        $this->assertSame($expected, $options['minMessage']);
    }

    public function testChoosesTheEnglishSingularAndPlural()
    {
        $singular = $this->parseConstraint(new Assert\Length(max: 1), 'en');
        $plural = $this->parseConstraint(new Assert\Length(max: 10), 'en');

        $this->assertStringContainsString('character or less', $singular['maxMessage']);
        $this->assertStringContainsString('characters or less', $plural['maxMessage']);
        $this->assertStringNotContainsString('|', $singular['maxMessage']);
    }

    /**
     * Length falls back to exactMessage when min and max are equal, and picks
     * its form by that same limit.
     */
    public function testPluralizesTheExactMessageByTheLimit()
    {
        $options = $this->parseConstraint(new Assert\Length(min: 1, max: 1), 'en');

        $this->assertStringContainsString('exactly {{ limit }} character.', $options['exactMessage']);
        $this->assertStringNotContainsString('|', $options['exactMessage']);
    }

    public function testLeavesAMessageWithoutFormsAlone()
    {
        $options = $this->parseConstraint(
            new Assert\NotBlank(),
            'uk',
            array((new Assert\NotBlank())->message => 'Значення не повинно бути порожнім.')
        );

        $this->assertSame('Значення не повинно бути порожнім.', $options['message']);
    }

    /**
     * A translation can offer fewer forms than the locale needs, and then no
     * form can be chosen. Handing the whole message to the browser leaves the
     * old behaviour in place; throwing would take the form down over a
     * translation.
     */
    public function testKeepsTheWholeMessageWhenTheTranslationHasTooFewForms()
    {
        $twoForms = 'один елемент|багато елементів';

        $options = $this->parseConstraint(
            new Assert\Count(min: 5),
            'uk',
            array((new Assert\Count(min: 1))->minMessage => $twoForms)
        );

        $this->assertSame($twoForms, $options['minMessage']);
    }

    /**
     * Symfony's constraints name the option a message is pluralized by after
     * the message itself, so a custom constraint that keeps the convention is
     * covered without being listed anywhere.
     */
    public function testPluralizesACustomConstraintByItsNamingConvention()
    {
        $options = $this->parseConstraint(
            new CustomLimitConstraint(),
            'uk',
            array(CustomLimitConstraint::MESSAGE => self::UK_COUNT_MIN)
        );

        $this->assertSame(
            'Ця колекція повинна містити {{ limit }} елементів чи більше.',
            $options['minMessage']
        );
    }

    /**
     * Runs one constraint through the factory and returns its options as the
     * browser receives them, messages translated.
     *
     * @param array<string, string> $catalogue
     *
     * @return array<string, mixed>
     */
    private function parseConstraint(Constraint $constraint, string $locale, array $catalogue = array()): array
    {
        $translator = new Translator($locale);
        $translator->addLoader('array', new ArrayLoader());
        $translator->addResource('array', $catalogue, $locale, 'validators');

        $validator = Validation::createValidator();
        $router = $this->createStub(UrlGeneratorInterface::class);
        $router->method('generate')->willReturn('/generated-route');

        $factory = new JsFormValidatorFactory(
            $validator,
            $translator,
            $router,
            array('js_validation' => true),
            'validators'
        );

        $form = Forms::createFormFactoryBuilder()
            ->addExtension(new ValidatorExtension($validator))
            ->addTypeExtension(new FormExtension($factory))
            ->getFormFactory()
            ->createBuilder(FormType::class, null, array('validation_groups' => array('Default')))
            ->add('field', TextType::class, array('constraints' => array($constraint)))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $parsed = $model->children['field']->data['form']['constraints'][get_class($constraint)][0];

        return get_object_vars($parsed);
    }
}

/**
 * A constraint of an application's own, pluralized by the convention Symfony's
 * constraints follow rather than by an entry in the factory's list.
 */
class CustomLimitConstraint extends Constraint
{
    public const MESSAGE = 'This collection should contain {{ limit }} element or more.'
        . '|This collection should contain {{ limit }} elements or more.';

    public $min = 5;

    public $minMessage = self::MESSAGE;

    public function getTargets(): string|array
    {
        return self::PROPERTY_CONSTRAINT;
    }
}
