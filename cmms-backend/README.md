# nestjs-ipfs-example

Simple Nest.js app that uses IPFS.

## Installation

```bash
$ yarn install

# Build the application:
$ yarn build

# Run existing database migrations
$ yarn typeorm migration:generate src/migrations/InitSchema -d src/data-source.ts
$ yarn typeorm migration:run -d src/data-source.ts