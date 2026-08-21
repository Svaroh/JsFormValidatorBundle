<?php
namespace Svaroh\JsFormValidatorBundle\Form\Subscriber;

use Svaroh\JsFormValidatorBundle\Factory\JsFormValidatorFactory;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\Form\FormInterface;

/**
 * Class SubscriberToQueue
 *
 * @package Svaroh\JsFormValidatorBundle\Form\Subscriber
 */
class SubscriberToQueue implements EventSubscriberInterface
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
     * @return array
     */
    public static function getSubscribedEvents(): array
    {
        return array(FormEvents::POST_SET_DATA => array('onFormSetData', -10));
    }

    /**
     * @param FormEvent $event
     */
    public function onFormSetData(FormEvent $event): void
    {
        $form         = $event->getForm();
        $globalSwitch = $this->factory->getConfig('js_validation');
        $localSwitch  = $form->getConfig()->getOption('js_validation');

        // If local option is null (not explicitly set), inherit from global
        $enabled = null === $localSwitch ? $globalSwitch : $localSwitch;

        // Add only parent forms which are enabled
        if ($enabled) {
            $parent = $this->getParent($form);
            if (!$this->factory->inQueue($parent)) {
                $this->factory->addToQueue($parent);
            }
        }
    }

    /**
     * @return FormInterface
     */
    protected function getParent(FormInterface $element)
    {
        if (!$element->getParent()) {
            return $element;
        } else {
            return $this->getParent($element->getParent());
        }
    }
}
