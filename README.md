# Bible Trivia

A trivia game that tests your knowlage of where verses are in the Bible.

https://user-images.githubusercontent.com/9403665/129601925-3d74cc16-5327-45b3-8973-fc67ef2f72cb.mp4

https://user-images.githubusercontent.com/9403665/129601939-0019364c-0050-4ecb-ae80-5f1ef8960790.mp4

## Structure

`server.js` is the entrypoint for the entire application.

`server` and `client` contain files and resources for their respective portions.

The front-end is powered by Vue.js while the back-end is powered by Express and SQLite.

## Tests

Server-side tests are ran with `mocha` and `chai` from the `test` directory, while client-side tests are ran by `cypress`, which uses `mocha` and `chai` as it's backend.

### Cypress

Cypress has it's own directory, `cypress`, which contains a number of things, primarly being the tests under `integration`.

### Coverage

The `index.html` file in the `coverage` directory can be opened in a browser to view the covered code of the server by the tests.

## Scripts

- `dev`
	- Start the server in development mode, restarting whenever a server-side file changes.
- `pre-commit`
	- Run `eslint` and `test`.
- `eslint`
	- Run `eslint` through all the files.
- `test`
	- Run all `test-*` scripts.
- `test-server`
	- Test the server with coverage.
- `test-server-quick`
	- Test the server without coverage.

## Databases

Each of the databases contain their schemas and SQL designed in the `server/schema` directory.

Each `.sql` file is a migration-based SQL file, each being prefixed with the version of the database it's for.

The `.xml` file contains the XML data required to reconstruct the tables at http://ondras.zarovi.cz/sql/demo/

### Bible

The `bible.db` file contains all the verses for all translations of the bibles.

It can support an infinate number of translations.

### Data

The database contains games, rounds, guesses, and users.

From all this data, leaderboards should be creatable.