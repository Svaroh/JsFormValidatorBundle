<?php

declare(strict_types=1);

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PercentType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints;

/**
 * The types below render their value with the conventions of the current
 * locale, so this form is served under a locale that separates decimals with
 * a comma.
 */
class LocalizedForm extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            // Keeps the form invalid, so the browser never leaves the page
            ->add('reference', TextType::class, [
                'constraints' => [
                    new Constraints\NotBlank(message: 'Please fill field'),
                ],
            ])
            ->add('amount', NumberType::class, [
                'grouping' => true,
                'invalid_message' => 'Please fill a valid number',
                'constraints' => [
                    new Constraints\Range(
                        min: 1.5,
                        max: 1000.5,
                        notInRangeMessage: 'Amount must be between {{ min }} and {{ max }}'
                    ),
                ],
            ])
            ->add('quantity', IntegerType::class, [
                'grouping' => true,
                'invalid_message' => 'Please fill a valid integer',
                'constraints' => [
                    new Constraints\LessThanOrEqual(value: 2000, message: 'Quantity must not exceed 2000'),
                ],
            ])
            ->add('price', MoneyType::class, [
                'currency' => 'EUR',
                'constraints' => [
                    new Constraints\GreaterThan(value: 10, message: 'Price must be greater than 10'),
                ],
            ])
            ->add('discount', PercentType::class, [
                'scale' => 2,
                'constraints' => [
                    new Constraints\Range(
                        min: 0,
                        max: 1,
                        notInRangeMessage: 'Discount must be between {{ min }} and {{ max }}'
                    ),
                ],
            ])

            ->add('save', SubmitType::class)
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'attr' => ['novalidate' => 'novalidate'],
        ]);
    }
}
