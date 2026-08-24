<?php

namespace Svaroh\JsFormValidatorBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * This is the class that validates and merges configuration from the app/config files
 */
class Configuration implements ConfigurationInterface
{
    /**
     * @codeCoverageIgnore
     * @return TreeBuilder
     */
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('svaroh_js_form_validator');
        $rootNode = $treeBuilder->getRootNode();

        /** @noinspection PhpUndefinedMethodInspection */
        $rootNode
            ->children()
                ->scalarNode('js_validation')
                    ->defaultValue(true)
                ->end()
                ->booleanNode('html5_validation')
                    ->defaultFalse()
                ->end()
                ->arrayNode('routing')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('check_unique_entity')
                            ->cannotBeEmpty()
                            ->defaultValue('svaroh_js_form_validator.check_unique_entity')
                        ->end()
                    ->end()
                ->end()
            ->end();

        return $treeBuilder;
    }
}
