<?php

namespace Svaroh\JsFormValidatorBundle\Controller;

use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Validator\Mapping\Factory\MetadataFactoryInterface;

/**
 * These actions call from the client side to check some validations on the server side
 * Class AjaxController
 *
 * @package Svaroh\JsFormValidatorBundle\Controller
 */
class AjaxController
{
    /**
     * The request never selects the lookup on its own: it may only replay a
     * UniqueEntity constraint the application already registered
     */
    const UNKNOWN_LOOKUP_MESSAGE = 'The requested lookup is not covered by any UniqueEntity constraint.';

    /**
     * @var ManagerRegistry|null
     */
    private $doctrine;

    /**
     * @var MetadataFactoryInterface|null
     */
    private $metadataFactory;

    /**
     * @param ManagerRegistry|null          $doctrine
     * @param MetadataFactoryInterface|null $metadataFactory
     */
    public function __construct(?ManagerRegistry $doctrine = null, ?MetadataFactoryInterface $metadataFactory = null)
    {
        $this->doctrine        = $doctrine;
        $this->metadataFactory = $metadataFactory;
    }

    /**
     * This is simplified analog for the UniqueEntity validator
     *
     * The request carries no authority of its own. It names an entity, a field
     * combination and a repository method, and the action answers only when the
     * validation metadata of that entity declares exactly that UniqueEntity
     * lookup; everything else is a bad request.
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

        if (!$this->metadataFactory) {
            throw new \LogicException('The validator is required to use the UniqueEntity JavaScript validator endpoint.');
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

        // An array value would widen the criteria into an additional condition
        foreach ($values as $field => $value) {
            if (null !== $value && !is_scalar($value)) {
                throw new BadRequestHttpException(sprintf(
                    'The "%s" criterion must be a scalar value.',
                    is_string($field) ? $field : (string)$field
                ));
            }
        }

        $constraint = $this->findUniqueEntityConstraint(
            $data['entityName'],
            array_keys($values),
            $data['repositoryMethod']
        );

        if (null === $constraint) {
            throw new BadRequestHttpException(self::UNKNOWN_LOOKUP_MESSAGE);
        }

        foreach ($values as $field => $value) {
            // If field(s) has an empty value and it should be ignored
            if (('' === $value || is_null($value)) && $this->ignoresNull($constraint, $field)) {
                // Just return a positive result
                return new JsonResponse(true);
            }
        }

        $entityName = $constraint->entityClass ? $constraint->entityClass : $data['entityName'];

        try {
            $repository = $this->doctrine->getRepository($entityName);
        } catch (\Throwable $e) {
            throw new BadRequestHttpException(
                sprintf('The "%s" entity is not managed by Doctrine.', $entityName),
                $e
            );
        }

        // The constraint names the method, but it still has to be a real one:
        // method_exists() ignores the methods a repository answers through
        // __call(), which is_callable() would have accepted
        if (!$this->isCallableRepositoryMethod($repository, $constraint->repositoryMethod)) {
            throw new BadRequestHttpException(sprintf(
                'The "%s" repository method is not callable on "%s".',
                $constraint->repositoryMethod,
                $entityName
            ));
        }

        $matches = $this->toList($repository->{$constraint->repositoryMethod}($values));

        if (!$matches) {
            return new JsonResponse(true);
        }

        return new JsonResponse($this->holdsOnlyTheEditedRecord($matches, $entityName, $data));
    }

    /**
     * The repository method a UniqueEntity constraint declares answers with a
     * list, but a custom one may answer with a single entity or with nothing
     *
     * @param mixed $result
     *
     * @return array
     */
    private function toList($result)
    {
        if (null === $result) {
            return array();
        }

        if (is_array($result)) {
            return $result;
        }

        if ($result instanceof \Traversable) {
            return iterator_to_array($result);
        }

        return array($result);
    }

    /**
     * Whether every record holding the value is the record the form is editing
     *
     * A form that edits a record submits the value that record already holds,
     * so the record matches itself. Symfony's own validator knows the object it
     * is validating and skips it; here the identifier of that object travels
     * with the request, which means a caller can ask for an answer that ignores
     * one record of its choosing. The answer is a hint either way - the
     * validator refuses the submit itself, whatever this route said - and the
     * route stays the existence oracle documented in 3_9.
     *
     * @param array  $matches
     * @param string $entityName
     * @param array  $data
     *
     * @return bool
     */
    private function holdsOnlyTheEditedRecord(array $matches, $entityName, array $data)
    {
        if (!isset($data['entityId']) || !is_scalar($data['entityId']) || '' === $data['entityId']) {
            return false;
        }

        foreach ($matches as $match) {
            $identifier = $this->identifierOf($match, $entityName);

            if (null === $identifier || (string)$identifier !== (string)$data['entityId']) {
                return false;
            }
        }

        return true;
    }

    /**
     * The single identifier value of a record, or null when it has none the
     * identifier in the request could be compared with: a composite key, or an
     * object no manager and no getId() can answer for
     *
     * @param mixed  $entity
     * @param string $entityName
     *
     * @return mixed|null
     */
    private function identifierOf($entity, $entityName)
    {
        if (!is_object($entity)) {
            return null;
        }

        $values = array();

        try {
            $manager = $this->doctrine->getManagerForClass($entityName);
            if ($manager) {
                $values = $manager->getClassMetadata($entityName)->getIdentifierValues($entity);
            }
        } catch (\Throwable $e) {
            $values = array();
        }

        if (1 === count($values)) {
            $value = reset($values);

            return is_scalar($value) ? $value : null;
        }

        // A composite key cannot be matched against the single value the
        // browser sends, so the record is never taken for the edited one
        if ($values) {
            return null;
        }

        return method_exists($entity, 'getId') && is_scalar($entity->getId()) ? $entity->getId() : null;
    }

    /**
     * Looks up the UniqueEntity constraint the request claims to replay
     *
     * The lookup matches on the whole field combination and on the repository
     * method, so the request can neither reach a field the application did not
     * declare unique nor pick the method that reads it
     *
     * @param string $entityName
     * @param array  $fields
     * @param string $repositoryMethod
     *
     * @return UniqueEntity|null
     */
    private function findUniqueEntityConstraint($entityName, array $fields, $repositoryMethod)
    {
        try {
            $metadata = $this->metadataFactory->getMetadataFor($entityName);
        } catch (\Throwable $e) {
            // An unmapped or nonexistent class is answered like any other
            // lookup the application did not declare
            return null;
        }

        sort($fields);

        foreach ($metadata->getConstraints() as $constraint) {
            if (!$constraint instanceof UniqueEntity || $repositoryMethod !== $constraint->repositoryMethod) {
                continue;
            }

            $declaredFields = (array)$constraint->fields;
            sort($declaredFields);

            if ($declaredFields === $fields) {
                return $constraint;
            }
        }

        return null;
    }

    /**
     * Whether the constraint lets an empty value skip the lookup
     *
     * Symfony accepts a boolean or the list of fields the option applies to
     *
     * @param UniqueEntity     $constraint
     * @param string|int|null  $field
     *
     * @return bool
     */
    private function ignoresNull(UniqueEntity $constraint, $field)
    {
        $ignoreNull = $constraint->ignoreNull;

        if (is_bool($ignoreNull)) {
            return $ignoreNull;
        }

        return in_array($field, (array)$ignoreNull, true);
    }

    /**
     * A repository method the request may drive: declared, public, not static
     * and not a magic method
     *
     * @param object $repository
     * @param string $method
     *
     * @return bool
     */
    private function isCallableRepositoryMethod($repository, $method)
    {
        if (str_starts_with($method, '__') || !method_exists($repository, $method)) {
            return false;
        }

        $reflection = new \ReflectionMethod($repository, $method);

        return $reflection->isPublic() && !$reflection->isStatic();
    }
}
