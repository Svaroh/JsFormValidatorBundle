<?php
namespace Svaroh\JsFormValidatorBundle\Form\Extension;

use Svaroh\JsFormValidatorBundle\Factory\JsFormValidatorFactory;
use Svaroh\JsFormValidatorBundle\Form\Subscriber\SubscriberToQueue;
use Symfony\Component\Form\AbstractTypeExtension;
use Symfony\Component\Form\Extension\Core\Type\FormType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Class FormExtension
 *
 * @package Svaroh\JsFormValidatorBundle\Form\Extension
 */
class FormExtension extends AbstractTypeExtension
{
    /**
     * @var JsFormValidatorFactory
     */
    protected $factory;

    /**
     * @param JsFormValidatorFactory $factory
     */
    public function __construct(JsFormValidatorFactory $factory)
    {
        $this->factory = $factory;
    }

    /**
     * @param FormBuilderInterface $builder
     * @param array                $options
     */
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->addEventSubscriber(new SubscriberToQueue($this->factory));
    }

    /**
     * @param OptionsResolver $resolver
     */
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(array('js_validation' => null));
    }

    /**
     * @return iterable<class-string>
     */
    public static function getExtendedTypes(): iterable
    {
        return array(FormType::class);
    }
}
