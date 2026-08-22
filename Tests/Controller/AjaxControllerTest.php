<?php

namespace Svaroh\JsFormValidatorBundle\Tests\Controller;

use Doctrine\Persistence\ManagerRegistry;
use Doctrine\Persistence\ObjectRepository;
use Svaroh\JsFormValidatorBundle\Controller\AjaxController;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Validator\Exception\NoSuchMetadataException;
use Symfony\Component\Validator\Mapping\ClassMetadata;
use Symfony\Component\Validator\Mapping\Factory\MetadataFactoryInterface;
use Symfony\Component\Validator\Mapping\MetadataInterface;

/**
 * Class AjaxControllerTest
 *
 * @package Svaroh\JsFormValidatorBundle\Controller
 */
class AjaxControllerTest extends TestCase
{
    /**
     * Test action to check UniqueEntity constraint
     */
    public function testCheckUniqueEntityAction()
    {
        $data   = array(
            'entityName'       => InMemoryEntity::class,
            'data'             => array(),
            'ignoreNull'       => '1',
            'repositoryMethod' => 'findBy'
        );
        $repository = new InMemoryRepository();
        $controller = new AjaxController($this->createRegistry($repository), $this->createMetadataFactory());

        // Check a nonexistent email
        $data['data']['email'] = 'test_email';
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertTrue(json_decode($response->getContent()), 'A nonexistent is unique');

        // Check an empty email
        $data['data']['email'] = null;
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertTrue(json_decode($response->getContent()), 'An empty email is unique');

        // Check an existing email
        $data['data']['email'] = 'existing_email';
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertFalse(json_decode($response->getContent()), 'An existing email is NOT unique');

        // Check the identical pair
        $data['data']['email'] = 'existing_email';
        $data['data']['url']   = 'existing_url';
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertFalse(json_decode($response->getContent()), 'A pair of fields is NOT unique');

        // Check the pair with ignore null
        $data['data']['email'] = 'wrong_email';
        $data['data']['url']   = null;
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertTrue(
            json_decode($response->getContent()),
            'A pair of fields is unique where one of them is empty and ignoreNull = true'
        );

        // Check the pair without ignore null, declared by another entity
        $data['entityName'] = StrictInMemoryEntity::class;
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertFalse(
            json_decode($response->getContent()),
            'A pair of fields is NOT unique where one of them is empty and ignoreNull = false'
        );

        // Check the another repository method
        $data['entityName']       = InMemoryEntity::class;
        $data['repositoryMethod'] = 'find';
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertFalse(json_decode($response->getContent()), 'Another repository method works');
    }

    public function testDoctrineIsRequired()
    {
        $this->expectException(\LogicException::class);

        $controller = new AjaxController();
        $controller->checkUniqueEntityAction(new Request(array(), array()));
    }

    public function testValidatorIsRequired()
    {
        $this->expectException(\LogicException::class);

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()));
        $controller->checkUniqueEntityAction(new Request(array(), array()));
    }

    public function testUniqueEntityRequestDataIsRequired()
    {
        $this->expectException(BadRequestHttpException::class);

        $repository = new InMemoryRepository();
        $controller = new AjaxController($this->createRegistry($repository), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), array()));
    }

    public static function provideMissingLookupField()
    {
        return array(
            'no entity name' => array(array('data' => array(), 'repositoryMethod' => 'findBy')),
            'empty entity name' => array(array('data' => array(), 'entityName' => '', 'repositoryMethod' => 'findBy')),
            'no repository method' => array(array('data' => array(), 'entityName' => InMemoryEntity::class)),
            'non string repository method' => array(array(
                'data' => array(),
                'entityName' => InMemoryEntity::class,
                'repositoryMethod' => array('findBy'),
            )),
        );
    }

    #[DataProvider('provideMissingLookupField')]
    public function testUniqueEntityLookupFieldsAreRequired(array $data)
    {
        $this->expectException(BadRequestHttpException::class);

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), $data));
    }

    public function testUnknownRepositoryMethodIsRejected()
    {
        $this->expectException(BadRequestHttpException::class);

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'dropDatabase',
            'ignoreNull'       => '0',
            'data'             => array('email' => 'test_email'),
        )));
    }

    public function testMagicRepositoryMethodIsRejected()
    {
        $this->expectException(BadRequestHttpException::class);

        $controller = new AjaxController($this->createRegistry(new MagicRepository()), $this->createMetadataFactory());

        // is_callable() accepts anything a __call() answers, method_exists() does not
        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findByAnythingAtAll',
            'ignoreNull'       => '0',
            'data'             => array('email' => 'test_email'),
        )));
    }

    public static function provideUncallableRepositoryMethod()
    {
        return array(
            'magic method' => array('__construct'),
            'non public method' => array('secret'),
            'static method' => array('shared'),
        );
    }

    #[DataProvider('provideUncallableRepositoryMethod')]
    public function testOnlyDeclaredPublicRepositoryMethodsAreCallable($method)
    {
        $this->expectException(BadRequestHttpException::class);

        $controller = new AjaxController($this->createRegistry(new MagicRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => $method,
            'ignoreNull'       => '0',
            'data'             => array('email' => 'test_email'),
        )));
    }

    /**
     * A repository method the constraint declares but the repository does not
     * answer is still refused
     */
    public function testDeclaredButUncallableRepositoryMethodIsRejected()
    {
        $this->expectException(BadRequestHttpException::class);

        $metadata = new ClassMetadata(InMemoryEntity::class);
        $metadata->addConstraint(new UniqueEntity(
            fields: array('email'),
            repositoryMethod: 'findByPassword'
        ));

        $controller = new AjaxController(
            $this->createRegistry(new MagicRepository()),
            new InMemoryMetadataFactory(array(InMemoryEntity::class => $metadata))
        );

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findByPassword',
            'data'             => array('email' => 'test_email'),
        )));
    }

    public function testUnknownEntityIsRejectedWithABadRequest()
    {
        $registry = $this->createStub(ManagerRegistry::class);
        $registry
            ->method('getRepository')
            ->willThrowException(new \InvalidArgumentException('Unknown entity.'))
        ;

        $controller = new AjaxController($registry, $this->createMetadataFactory());

        $this->expectException(BadRequestHttpException::class);

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => 'App\\Entity\\Nope',
            'repositoryMethod' => 'findBy',
            'ignoreNull'       => '0',
            'data'             => array('email' => 'test_email'),
        )));
    }

    /**
     * An entity that carries no UniqueEntity constraint is not a question the
     * application asked to answer
     */
    public function testEntityWithoutUniqueEntityConstraintIsRejected()
    {
        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage(AjaxController::UNKNOWN_LOOKUP_MESSAGE);

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => UnconstrainedEntity::class,
            'repositoryMethod' => 'findBy',
            'data'             => array('email' => 'test_email'),
        )));
    }

    /**
     * The repository is never reached when the lookup is not declared
     */
    public function testUndeclaredLookupNeverTouchesDoctrine()
    {
        $registry = $this->createMock(ManagerRegistry::class);
        $registry->expects($this->never())->method('getRepository');

        $controller = new AjaxController($registry, $this->createMetadataFactory());

        $this->expectException(BadRequestHttpException::class);

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => UnconstrainedEntity::class,
            'repositoryMethod' => 'findBy',
            'data'             => array('email' => 'test_email'),
        )));
    }

    public static function provideUndeclaredLookup()
    {
        return array(
            // Doctrine answers findByX for any mapped column, the constraint declares findBy
            'undeclared repository method' => array(array(
                'entityName'       => InMemoryEntity::class,
                'repositoryMethod' => 'findByPassword',
                'data'             => array('email' => 'test_email'),
            )),
            'undeclared field' => array(array(
                'entityName'       => InMemoryEntity::class,
                'repositoryMethod' => 'findBy',
                'data'             => array('password' => 'a_hash'),
            )),
            'declared field with an extra one' => array(array(
                'entityName'       => InMemoryEntity::class,
                'repositoryMethod' => 'findBy',
                'data'             => array('email' => 'test_email', 'password' => 'a_hash'),
            )),
            'partial field combination' => array(array(
                'entityName'       => InMemoryEntity::class,
                'repositoryMethod' => 'findBy',
                'data'             => array('url' => 'existing_url'),
            )),
            'unknown class' => array(array(
                'entityName'       => 'App\\Entity\\Nope',
                'repositoryMethod' => 'findBy',
                'data'             => array('email' => 'test_email'),
            )),
        );
    }

    #[DataProvider('provideUndeclaredLookup')]
    public function testUndeclaredLookupIsRejected(array $data)
    {
        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage(AjaxController::UNKNOWN_LOOKUP_MESSAGE);

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), $data));
    }

    public static function provideNonScalarCriterion()
    {
        return array(
            // An array criterion becomes an additional "IN"/"AND" condition
            'array of values' => array(array('email' => array('a@example.com', 'b@example.com'))),
            'nested array' => array(array('email' => array('like' => '%@example.com'))),
            'empty array' => array(array('email' => array())),
        );
    }

    #[DataProvider('provideNonScalarCriterion')]
    public function testArrayCriterionIsRejected(array $values)
    {
        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage('The "email" criterion must be a scalar value.');

        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findBy',
            'data'             => $values,
        )));
    }

    /**
     * ignoreNull is read from the constraint, not from the request
     */
    public function testIgnoreNullIsNotDrivenByTheRequest()
    {
        $controller = new AjaxController($this->createRegistry(new InMemoryRepository()), $this->createMetadataFactory());

        $response = $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findBy',
            'ignoreNull'       => '0',
            'data'             => array('email' => null),
        )));

        $this->assertTrue(
            json_decode($response->getContent()),
            'The constraint ignores null even when the request asks not to'
        );
    }

    /**
     * The constraint may name the fields whose null values are ignored
     */
    public function testIgnoreNullAsAFieldList()
    {
        $metadata = new ClassMetadata(InMemoryEntity::class);
        $metadata->addConstraint(new UniqueEntity(
            fields: array('email', 'url'),
            ignoreNull: array('email')
        ));

        $controller = new AjaxController(
            $this->createRegistry(new InMemoryRepository()),
            new InMemoryMetadataFactory(array(InMemoryEntity::class => $metadata))
        );

        $data = array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findBy',
            'data'             => array('email' => null, 'url' => 'existing_url'),
        );

        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertTrue(json_decode($response->getContent()), 'A null value of a listed field is ignored');

        $data['data'] = array('email' => 'wrong_email', 'url' => null);
        $response = $controller->checkUniqueEntityAction(new Request(array(), $data));
        $this->assertFalse(json_decode($response->getContent()), 'A null value of an unlisted field is looked up');
    }

    /**
     * The constraint decides which class is queried
     */
    public function testEntityClassOfTheConstraintIsUsed()
    {
        $metadata = new ClassMetadata(InMemoryEntity::class);
        $metadata->addConstraint(new UniqueEntity(
            fields: array('email'),
            entityClass: StrictInMemoryEntity::class
        ));

        $registry = $this->createMock(ManagerRegistry::class);
        $registry
            ->expects($this->once())
            ->method('getRepository')
            ->with(StrictInMemoryEntity::class)
            ->willReturn(new InMemoryRepository())
        ;

        $controller = new AjaxController(
            $registry,
            new InMemoryMetadataFactory(array(InMemoryEntity::class => $metadata))
        );

        $response = $controller->checkUniqueEntityAction(new Request(array(), array(
            'entityName'       => InMemoryEntity::class,
            'repositoryMethod' => 'findBy',
            'data'             => array('email' => 'existing_email'),
        )));

        $this->assertFalse(json_decode($response->getContent()));
    }

    private function createRegistry(ObjectRepository $repository)
    {
        $registry = $this->createStub(ManagerRegistry::class);
        $registry
            ->method('getRepository')
            ->willReturn($repository)
        ;

        return $registry;
    }

    /**
     * The constraints the fixture application declared
     *
     * @return InMemoryMetadataFactory
     */
    private function createMetadataFactory()
    {
        $entity = new ClassMetadata(InMemoryEntity::class);
        $entity->addConstraint(new UniqueEntity(fields: array('email')));
        $entity->addConstraint(new UniqueEntity(fields: array('email', 'url')));
        $entity->addConstraint(new UniqueEntity(
            fields: array('email', 'url'),
            repositoryMethod: 'find',
            ignoreNull: false
        ));

        $strict = new ClassMetadata(StrictInMemoryEntity::class);
        $strict->addConstraint(new UniqueEntity(fields: array('email', 'url'), ignoreNull: false));

        return new InMemoryMetadataFactory(array(
            InMemoryEntity::class       => $entity,
            StrictInMemoryEntity::class => $strict,
            UnconstrainedEntity::class  => new ClassMetadata(UnconstrainedEntity::class),
        ));
    }
}

class InMemoryEntity
{
}

class StrictInMemoryEntity
{
}

class UnconstrainedEntity
{
}

class InMemoryMetadataFactory implements MetadataFactoryInterface
{
    /**
     * @var array<string, MetadataInterface>
     */
    private $metadata;

    /**
     * @param array<string, MetadataInterface> $metadata
     */
    public function __construct(array $metadata)
    {
        $this->metadata = $metadata;
    }

    public function getMetadataFor(mixed $value): MetadataInterface
    {
        $class = is_object($value) ? get_class($value) : $value;

        if (!is_string($class) || !isset($this->metadata[$class])) {
            throw new NoSuchMetadataException(sprintf('No metadata for "%s".', is_string($class) ? $class : gettype($value)));
        }

        return $this->metadata[$class];
    }

    public function hasMetadataFor(mixed $value): bool
    {
        $class = is_object($value) ? get_class($value) : $value;

        return is_string($class) && isset($this->metadata[$class]);
    }
}

class InMemoryRepository implements ObjectRepository
{
    public function find(mixed $id): ?object
    {
        return (object) array('id' => $id);
    }

    public function findAll(): array
    {
        return array();
    }

    public function findBy(array $criteria, ?array $orderBy = null, ?int $limit = null, ?int $offset = null): array
    {
        if (isset($criteria['email']) && 'existing_email' === $criteria['email']) {
            return array((object) $criteria);
        }

        if (array_key_exists('url', $criteria) && null === $criteria['url']) {
            return array((object) $criteria);
        }

        return array();
    }

    public function findOneBy(array $criteria): ?object
    {
        return null;
    }

    /**
     * @return class-string<object>
     */
    public function getClassName(): string
    {
        return InMemoryEntity::class;
    }
}

class MagicRepository extends InMemoryRepository
{
    public static function shared(): array
    {
        return array();
    }

    public function __call(string $name, array $arguments): array
    {
        return array();
    }

    protected function secret(): array
    {
        return array();
    }
}
