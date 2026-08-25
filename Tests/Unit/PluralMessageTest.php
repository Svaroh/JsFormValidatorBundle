<?php

namespace Svaroh\JsFormValidatorBundle\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;
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

    /**
     * The catalogue is given here rather than taken from Symfony's own English
     * source, so that a rewording of a constraint message upstream cannot fail
     * this for a reason that has nothing to do with choosing a form.
     */
    public function testChoosesTheEnglishSingularAndPlural()
    {
        $catalogue = array(
            (new Assert\Length(max: 1))->maxMessage =>
                'It should have {{ limit }} character or less.'
                . '|It should have {{ limit }} characters or less.',
        );

        $singular = $this->parseConstraint(new Assert\Length(max: 1), 'en', $catalogue);
        $plural = $this->parseConstraint(new Assert\Length(max: 10), 'en', $catalogue);

        $this->assertSame('It should have {{ limit }} character or less.', $singular['maxMessage']);
        $this->assertSame('It should have {{ limit }} characters or less.', $plural['maxMessage']);
    }

    /**
     * Length falls back to exactMessage when min and max are equal, and picks
     * its form by that same limit. The naming convention cannot reach this one:
     * there is no "exact" option to read the limit from, so it is the table in
     * the factory that answers for it.
     */
    public function testPluralizesTheExactMessageByTheLimit()
    {
        $catalogue = array(
            (new Assert\Length(min: 1, max: 1))->exactMessage =>
                'It should have exactly {{ limit }} character.'
                . '|It should have exactly {{ limit }} characters.',
        );

        $one = $this->parseConstraint(new Assert\Length(min: 1, max: 1), 'en', $catalogue);
        $many = $this->parseConstraint(new Assert\Length(min: 7, max: 7), 'en', $catalogue);

        $this->assertSame('It should have exactly {{ limit }} character.', $one['exactMessage']);
        $this->assertSame('It should have exactly {{ limit }} characters.', $many['exactMessage']);
    }

    /** Count has an exactMessage of its own, chosen by the same limit. */
    public function testPluralizesTheExactMessageOfACollection()
    {
        $catalogue = array(
            (new Assert\Count(min: 1, max: 1))->exactMessage =>
                'Ця колекція повинна містити рівно {{ limit }} елемент.'
                . '|Ця колекція повинна містити рівно {{ limit }} елемента.'
                . '|Ця колекція повинна містити рівно {{ limit }} елементів.',
        );

        $options = $this->parseConstraint(new Assert\Count(min: 5, max: 5), 'uk', $catalogue);

        $this->assertSame('Ця колекція повинна містити рівно {{ limit }} елементів.', $options['exactMessage']);
    }

    /** Both limits of a Choice are pluralized, each by its own option. */
    public function testPluralizesBothLimitsOfAChoice()
    {
        $reference = new Assert\Choice(choices: array('a'), multiple: true);
        $catalogue = array(
            $reference->minMessage => 'щонайменше {{ limit }} варіант'
                . '|щонайменше {{ limit }} варіанти'
                . '|щонайменше {{ limit }} варіантів',
            $reference->maxMessage => 'щонайбільше {{ limit }} варіант'
                . '|щонайбільше {{ limit }} варіанти'
                . '|щонайбільше {{ limit }} варіантів',
        );

        $options = $this->parseConstraint(
            new Assert\Choice(choices: array('a', 'b', 'c'), multiple: true, min: 3, max: 5),
            'uk',
            $catalogue
        );

        $this->assertSame('щонайменше {{ limit }} варіанти', $options['minMessage']);
        $this->assertSame('щонайбільше {{ limit }} варіантів', $options['maxMessage']);
    }

    /**
     * The one entry of the table that the naming convention could never
     * reproduce: "filenameTooLongMessage" is chosen by "filenameMaxLength".
     */
    public function testPluralizesTheFilenameLengthOfAFile()
    {
        $catalogue = array(
            (new Assert\File())->filenameTooLongMessage =>
                'Назва файлу задовга. Вона має містити {{ filename_max_length }} символ.'
                . '|Назва файлу задовга. Вона має містити {{ filename_max_length }} символи.'
                . '|Назва файлу задовга. Вона має містити {{ filename_max_length }} символів.',
        );

        $options = $this->parseConstraint(new Assert\File(filenameMaxLength: 30), 'uk', $catalogue);

        $this->assertSame(
            'Назва файлу задовга. Вона має містити {{ filename_max_length }} символів.',
            $options['filenameTooLongMessage']
        );
    }

    /** WordCount pluralizes both of its limits as well. */
    public function testPluralizesTheLimitsOfAWordCount()
    {
        if (!extension_loaded('intl')) {
            $this->markTestSkipped('The WordCount constraint requires the intl extension.');
        }

        $catalogue = array(
            (new Assert\WordCount(min: 1))->minMessage => 'щонайменше {{ min }} слово'
                . '|щонайменше {{ min }} слова'
                . '|щонайменше {{ min }} слів',
        );

        $options = $this->parseConstraint(new Assert\WordCount(min: 5), 'uk', $catalogue);

        $this->assertSame('щонайменше {{ min }} слів', $options['minMessage']);
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

    public static function constraintsSymfonyDoesNotPluralize(): array
    {
        $piped = 'Значення має бути {{ limit }} або більше (див. А|Б).';

        return array(
            // A numeric option sits right next to each of these messages, and
            // the limit is 1, so a two-form rule would quietly return the head
            // of the string. Symfony pluralizes neither of them.
            'Range::min' => array(new Assert\Range(min: 1, max: 10), 'minMessage', $piped),
            'Count::divisibleBy' => array(new Assert\Count(divisibleBy: 1), 'divisibleByMessage', $piped),
            'Image::minRatio' => array(new Assert\Image(minRatio: 1.0), 'minRatioMessage', $piped),
        );
    }

    /**
     * The table covers every pluralized message of Symfony's own constraints,
     * so the naming convention is not applied to them at all. It would match
     * options that count nothing, and a translation that happens to carry a
     * literal "|" would be cut at a separator that was never a plural one.
     */
    #[DataProvider('constraintsSymfonyDoesNotPluralize')]
    public function testLeavesAMessageSymfonyDoesNotPluralizeWhole(
        Constraint $constraint,
        string $messageOption,
        string $message
    ) {
        $options = $this->parseConstraint(
            $constraint,
            'uk',
            array($constraint->{$messageOption} => $message)
        );

        $this->assertSame($message, $options[$messageOption]);
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
     * A message that still carries its separators is all the browser shows, and
     * nothing else says why, so the factory reports it where a logger is given.
     * What it reports is the message the catalogue is keyed by, because that is
     * the entry whoever reads the log has to go and finish.
     */
    public function testReportsAMessageWhoseFormCouldNotBeChosen()
    {
        $twoForms = 'один елемент|багато елементів';
        $messageId = (new Assert\Count(min: 1))->minMessage;

        $logger = new CollectingLogger();

        $factory = $this->createFactory('uk', array($messageId => $twoForms));
        $factory->setLogger($logger);

        $this->parseConstraint(new Assert\Count(min: 5), 'uk', array(), $factory);

        $reported = array_values(array_filter(
            $logger->records,
            static fn (array $record): bool => $messageId === $record['context']['message']
        ));

        $this->assertCount(1, $reported);
        $this->assertStringContainsString('Could not choose a plural form', $reported[0]['message']);
        $this->assertStringContainsString($twoForms, $reported[0]['context']['reason']);
        $this->assertInstanceOf(\InvalidArgumentException::class, $reported[0]['context']['exception']);
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
     * The class of the factory is a documented extension point,
     * "svaroh_js_form_validator.factory.class", and translateMessage() has been
     * part of it since long before a plural form was chosen here. An override
     * that knows only its original two arguments keeps working: declaring
     * LegacyFactory below would be a fatal error otherwise, and every message
     * that is not pluralized still goes through it.
     */
    public function testHonoursAnOverriddenTranslateMessage()
    {
        $factory = $this->createFactory(
            'uk',
            array((new Assert\NotBlank())->message => 'Значення не повинно бути порожнім.'),
            LegacyFactory::class
        );

        $options = $this->parseConstraint(new Assert\NotBlank(), 'uk', array(), $factory);

        $this->assertSame('[Значення не повинно бути порожнім.]', $options['message']);
    }

    /**
     * The fallback of a pluralized message runs through translateMessage() too,
     * so an override still sees the messages no form could be chosen for.
     */
    public function testHonoursAnOverriddenTranslateMessageOnTheFallback()
    {
        $twoForms = 'один елемент|багато елементів';

        $factory = $this->createFactory(
            'uk',
            array((new Assert\Count(min: 1))->minMessage => $twoForms)
        , LegacyFactory::class);

        $options = $this->parseConstraint(new Assert\Count(min: 5), 'uk', array(), $factory);

        $this->assertSame('[' . $twoForms . ']', $options['minMessage']);
    }

    /**
     * Builds a factory that translates against the given catalogue.
     *
     * @param array<string, string>             $catalogue
     * @param class-string<JsFormValidatorFactory> $class
     */
    private function createFactory(
        string $locale,
        array $catalogue = array(),
        string $class = JsFormValidatorFactory::class
    ): JsFormValidatorFactory {
        $translator = new Translator($locale);
        $translator->addLoader('array', new ArrayLoader());
        $translator->addResource('array', $catalogue, $locale, 'validators');

        $router = $this->createStub(UrlGeneratorInterface::class);
        $router->method('generate')->willReturn('/generated-route');

        return new $class(
            Validation::createValidator(),
            $translator,
            $router,
            array('js_validation' => true),
            'validators'
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
    private function parseConstraint(
        Constraint $constraint,
        string $locale,
        array $catalogue = array(),
        ?JsFormValidatorFactory $factory = null
    ): array {
        $factory = $factory ?? $this->createFactory($locale, $catalogue);

        $form = Forms::createFormFactoryBuilder()
            ->addExtension(new ValidatorExtension(Validation::createValidator()))
            ->addTypeExtension(new FormExtension($factory))
            ->getFormFactory()
            ->createBuilder(FormType::class, null, array('validation_groups' => array('Default')))
            ->add('field', TextType::class, array('constraints' => array($constraint)))
            ->getForm()
        ;

        $model = $factory->createJsModel($form);
        $parsed = $model->children['field']->data['form']['constraints'][get_class($constraint)][0];

        // A File constraint is exported as a plain option list, because its
        // "maxSize" option is a protected property behind a magic getter that
        // the generic object export cannot see. Every other constraint is
        // exported as itself.
        return is_array($parsed) ? $parsed : get_object_vars($parsed);
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

/**
 * Keeps what it was told, so a test can look at every record rather than at the
 * order they arrived in.
 */
class CollectingLogger extends AbstractLogger
{
    /** @var array<int, array{level: mixed, message: string, context: array}> */
    public array $records = array();

    public function log($level, string|\Stringable $message, array $context = array()): void
    {
        $this->records[] = array(
            'level' => $level,
            'message' => (string) $message,
            'context' => $context,
        );
    }
}

/**
 * A factory of an application's own that overrides translateMessage() with the
 * two arguments it has always taken.
 */
class LegacyFactory extends JsFormValidatorFactory
{
    protected function translateMessage($message, ?array $parameters = null)
    {
        return '[' . parent::translateMessage($message, $parameters) . ']';
    }
}
