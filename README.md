# typescript-transform-path-rewrite

Transform generated javascript import/require paths using typescript standard config

## Quick start

### Installation

```bash
npm install --save-dev typescript-transform-path-rewrite
```

### Example tsconfig.json

```jsonc
{
    "compilerOptions": {
        "baseUrl": "src",
        "paths": {
            "@SRC/*": ["*"]
        },
        "plugins": [
            // Transform javascript file
            {
                "transform": "typescript-transform-path-rewrite"
            },
            // Transform .d.ts file
            {
                "transform": "typescript-transform-path-rewrite",
                "afterDeclarations": true
            }
        ]
    }
}
```

The result javascript files will have all `@SRC/*` import transformed to proper paths.

### Run with ts-patch

Use [ts-patch](https://github.com/nonara/ts-patch)'s `tspc` instead of `tsc`

### Run with ts-node

Add `typescript-transform-path-rewrite/register` to `require` property of [ts-node](https://github.com/TypeStrong/ts-node)

```jsonc
{
    "ts-node": {
        "require": ["typescript-transform-path-rewrite/register"]
    }
}
```

Note that `ts-node` does not work well if [tsconfig.json's module](https://www.typescriptlang.org/tsconfig#module) is configured for [ESM](https://nodejs.org/api/esm.html) (for e.g. `es2020` or `node16`). In order to use `ts-node` in that case, we provide a convenivent [loader](https://nodejs.org/api/esm.html#loaders) that work in tandem with `ts-node`, for example

```
node --loader typescript-transform-path-rewrite/loader src/index.ts
```

## ECMAScript Module

The transformer will make sure javascript files that are compiled with [tsconfig.json's module](https://www.typescriptlang.org/tsconfig#module) configured for [ECMAScript Module](https://nodejs.org/api/esm.html) will have full extension (either `.js` or `.mjs`) as required by [Node.js](https://nodejs.org/api/esm.html#mandatory-file-extensions)

## Custom rules

Custom rules can be added using regular expression, for example

```jsonc
{
   "compilerOptions": {
       "baseUrl": "src",
       "paths": {
           "@SRC/*": ["*"]
       },
       "plugins": [
           {
               "transform": "typescript-transform-path-rewrite",
               "alias": [
                    "@SRC/custom/(.+)$": "./my-custom/$1.js"
               ]
           },
       ]
   },
}
```
