<?php

namespace Svaroh\JsFormValidatorBundle\Controller;

use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * These actions call from the client side to check some validations on the server side
 * Class AjaxController
 *
 * @package Svaroh\JsFormValidatorBundle\Controller
 */
class AjaxController
{
    /**
     * @var ManagerRegistry|null
     */
    private $doctrine;

    /**
     * @param ManagerRegistry|null $doctrine
     */
    public function __construct(?ManagerRegistry $doctrine = null)
    {
        $this->doctrine = $doctrine;
    }

    /**
     * This is simplified analog for the UniqueEntity validator
     *
     * @param \Symfony\Component\HttpFoundation\Request $request
     *
     * @return JsonResponse
     */
    public function checkUniqueEntityAction(Request $request)
    {
        if (!$this->doctrine) {
            throw new \LogicException('Doctrine is required to use the UniqueEntity JavaScript validator endpoint.');
        }

        $data = $request->request->all();
        if (!array_key_exists('data', $data) || !is_array($data['data'])) {
            throw new BadRequestHttpException('The "data" request field is required.');
        }

        foreach (array('entityName', 'repositoryMethod') as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || '' === $data[$field]) {
                throw new BadRequestHttpException(sprintf('The "%s" request field is required.', $field));
            }
        }

        $values = $data['data'];
        $ignoreNull = !empty($data['ignoreNull']);

        foreach ($values as $value) {
            // If field(s) has an empty value and it should be ignored
            if ($ignoreNull && ('' === $value || is_null($value))) {
                // Just return a positive result
                return new JsonResponse(true);
            }
        }

        $repository = $this->doctrine->getRepository($data['entityName']);
        if (!is_callable(array($repository, $data['repositoryMethod']))) {
            throw new BadRequestHttpException(sprintf(
                'The "%s" repository method is not callable on "%s".',
                $data['repositoryMethod'],
                $data['entityName']
            ));
        }

        $entity = $repository->{$data['repositoryMethod']}($values);

        return new JsonResponse(empty($entity));
    }
}
