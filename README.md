# Bible Trivia

A trivia game that tests your knowledge of where verses are in the Bible.

**Link to project:** https://BibleTrivia.rascaltwo.repl.co

https://user-images.githubusercontent.com/9403665/129601925-3d74cc16-5327-45b3-8973-fc67ef2f72cb.mp4

https://user-images.githubusercontent.com/9403665/129601939-0019364c-0050-4ecb-ae80-5f1ef8960790.mp4

## How It's Made

**Tech Used:** HTML, CSS, JavaScript, Node.js, Vue.js, Express, SQLite

With an Express server using SQLite databases for both games and the Bible texts, then a Vue.js-powered single page application frontend to render the starting menu, and gameplay screens.

The Bible textual data was downloaded & parsed from the [dborza/bible-tools](https://github.com/dborza/bible-tools) GitHub repository, and then imported into the SQLite database.

Testing is done both with Mocha with Coverage for the backend, and Cypress for the frontend.

## Optimizations

On the backend the most impactful optimization made was the database-ification of the raw `.xml` Bible files, allowing for the same data to be quickly queried to generate new game rounds.

The inclusion of initially-needed data in the rendered `index.html`, reducing the number of API requests for the user to begin interacting with the game to zero - of course aside from the usage of a frontend framework such as Vue.js, allowing the game to be built as a single page application and all the state to be efficiently managed.

While I didn't have enough time to implement it, the next features would have been user authentication, and a leaderboard to track the top scores accordingly.

## Lessons Learned

Sourcing and transforming the needed Bible data was a lesson, in addition to the usage of Vue.js and the built-in transitions and animations it provides.

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