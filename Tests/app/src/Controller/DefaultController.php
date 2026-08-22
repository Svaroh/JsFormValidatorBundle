<?php

namespace App\Controller;

use App\Form\LocalizedForm;
use App\Form\TestForm;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class DefaultController extends AbstractController
{
    #[Route('/', name: 'default_index')]
    public function index(Request $request): Response
    {
        $testForm = $this->createForm(TestForm::class);

        return $this->render('default/index.html.twig', [
            'testForm' => $testForm->createView(),
        ]);
    }

    #[Route('/{_locale}/localized', name: 'localized_index')]
    public function localized(Request $request): Response
    {
        $localizedForm = $this->createForm(LocalizedForm::class);

        return $this->render('default/localized.html.twig', [
            'localizedForm' => $localizedForm->createView(),
        ]);
    }
}
