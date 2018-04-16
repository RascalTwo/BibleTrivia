const path = require('path');

const sqlite = require('sqlite');

module.exports = class Database{
	/**
	 * Create a instance of the database.
   * 
	 * @param {Server} server Server instance.
	 */
	constructor(server){
		this.server = server;
		
		this.driver;
		
		// Using an object while the database is under construction.
		this.latestGameId = 0;
		this.games = {};
	}

	/**
	 * Initalize the database.
	 * 
	 * @returns {Promise<Database>} Database instance to allow for chaining.
	 */
	init(){
		return sqlite.open(path.join(this.server.paths.data, 'data.db'), { Promise })
			.then(driver => driver.migrate({
				migrationsPath: path.join(__dirname, 'schema', 'data')
			}))
			.then(driver => this.driver = driver)
			.then(() => this);
	}


	/**
	 * Create a new game of translation type between books.
	 * 
	 * @param {Number} translationId ID of the tranlsation to base the game on.
	 * @param {Number} minBook Inclusive potision of the minimum book to get play the game with.
	 * @param {Number} maxBook Inclusive potision of the maximum book to get play the game with.
	 * 
	 * @returns {Promise<Object>} The game as seen by the player.
	 */
	createGame(translationId = 1, minBook = 1, maxBook = 66){
		return this.server.bible.getBooks(minBook, maxBook).then(books => {
			return this.server.bible.getRandomVerse(translationId, minBook, maxBook).then(verse => {
				const game = {
					id: this.latestGameId++,
					lives: 5,
					verse
				};
				this.games[game.id] = game;

				return {
					id: game.id,
					lives: game.lives,
					books,
					verse: verse.text
				};
			});
		});
	}


	/**
	 * Make a guess in a game.
	 * 
	 * @param {Number} gameId ID of game to guess in.
	 * @param {Number} bookPosition Position of book to guess.
	 * 
	 * @returns {Promise<Object>} API Response.
	 */
	guess(gameId, bookPosition){
		if (!this.games[gameId]) return Promise.resolve({
			success: false,
			message: ['Game not found', 'error']
		});

		const game = this.games[gameId];

		if (game.lives < 1) return Promise.resolve({
			success: true,
			data: {
				correct: false,
				book: game.verse.book,
				lives: game.lives
			}
		});
		

		const correct = game.verse.book === bookPosition;

		if (!correct) game.lives--;

		if (game.lives < 1 && !correct) return Promise.resolve({
			success: true,
			data: {
				correct,
				book: game.verse.book,
				lives: game.lives
			}
		});

		return Promise.resolve({
			success: true,
			data: {
				correct,
				lives: game.lives
			}
		});
	}
};