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
	 * Make a guess in a game.
	 * 
	 * @param {Number} userId ID of the user making a guess.
	 * @param {Number} gameId ID of game to guess in.
	 * @param {Number} book Position of book to guess.
	 * @param {Number} chapter Chapter number to guess.
	 * 
	 * @returns {Promise<Object>} API Response.
	 */
	makeGuess(userId, gameId, book, chapter){
		return this.getGame(gameId, false).then(response => {
			if (!response.success) return response;

			const game = response.data.game;

			if (game.user.id !== userId) return {
				success: false,
				message: ['You are not the player of this game', 'error']
			};

			if (game.lives <= 0) return {
				success: false,
				message: ['Game has already been lost', 'warn'],
				data: {
					lives: game.lives,
					bcv: game.rounds[game.rounds.length - 1].verse_bcv
				}
			};

			const round = game.rounds[game.rounds.length - 1];
			const [actualBook, actualChapter] = round.verse_bcv.split('-').map(Number);

			const correctBook = actualBook === book;
			const correctChapter = correctBook && actualChapter === chapter;

			const now = Date.now();
			const correct = (game.difficulty.id === 0 && correctBook) || (game.difficulty.id === 1 && correctChapter);

			let gameOver = false;
			if (!correct){
				if (game.difficulty.id === 1){
					if (!correctBook) game.lives--;
					else game.lives -= 0.5;
				}
				else game.lives--;

				if (game.lives < 0) game.lives = 0;

				gameOver = game.lives <= 0;
			}

			return this.driver.run(
				'INSERT INTO guess (round_id, book_pos, chapter, "when") VALUES (?, ?, ?, ?);',
				round.id, book, chapter, now
			).then(result => {
				const guess = {
					id: result.lastID,
					round: round.id,
					book_pos: book,
					chapter,
					when: now
				};

				const minutesTook = parseInt((now - game.rounds[0].picked) / 1000 / 60);

				if (!correct) return {
					success: true,
					message: [(gameOver ? `You got ${game.rounds.length - 1} verses right in ${minutesTook} minutes` : 'Incorrect!'), 'warn'],
					data: {
						correct,
						guess,
						lives: game.lives,
						bcv: gameOver ? round.verse_bcv : undefined
					}
				};

				const [min, max] = this.server.bible.testamentCodeToMinMax(game.testament_code);

				if (game.rounds.length === max - min + 1) return {
					success: true,
					message: [`You won in ${minutesTook} minutes`, 'success'],
					data: {
						correct,
						guess,
						lives: game.lives,
						bcg: round.verse_bcv
					}
				};

				return this.startNewRound(game, now, false).then(round => {
					return {
						success: true,
						message: ['Correct!', 'success'],
						data: {
							correct,
							guess,
							lives: game.lives,
							bcv: round.verse_bcv,
							round
						}
					};
				});
			});
		});
	}


	/**
	 * Start a new round.
	 * 
	 * @param {Object} game Game to start new round with.
	 * @param {Number} picked Time to mark round as picked.
	 * @param {Boolean} includeVerse_bcv If to include 'verse_bcv' on the round.
	 * 
	 * @returns {Promise<Object>} Newly added round.
	 */
	startNewRound(game, picked, includeVerse_bcv){
		const [min, max] = this.server.bible.testamentCodeToMinMax(game.testament_code);

		const excludedBooks = game.rounds.map(round => Number(round.verse_bcv.split('-')[0]));

		return this.server.bible.getRandomVerse(game.translation_id, min, max, excludedBooks).then(verse => {
			const verse_bcv = verse.book + '-' + verse.chapter + '-' + verse.verse;
			return this.driver.run(
				'INSERT INTO round (game_id, verse_bcv, picked) VALUES (?, ?, ?);',
				game.id, verse_bcv, picked
			).then(result => ({
				id: result.lastID,
				game_id: game.id,
				picked,
				verse_bcv: includeVerse_bcv ? verse_bcv : undefined,
				verse_text: verse.text
			}));
		});
	}


	/**
	 * Get a game from the database.
	 * 
	 * @param {Number} id ID of game to get.
	 * @param {Boolean} includeBooks If to also return books of the game.
	 * 
	 * @returns {Promise<Object>} API response with data and books in data.
	 */
	getGame(id, includeBooks){
		return this.driver.get('SELECT * FROM game WHERE id = ?', id).then(game => {
			if (!game) return {
				success: false,
				message: ['Game not found', 'error']
			};

			let roundData;
			return this.driver.get('SELECT * FROM difficulty WHERE id = ?', game.difficulty_id).then(difficulty => {
				game.difficulty = difficulty;
				delete game.difficulty_id;

				return this.driver.get('SELECT * FROM user WHERE id = ?', game.user_id);
			}).then(user => {
				if (!user) user = {
					id: game.user_id,
					isSession: true
				};

				game.user = user;
				delete game.user_id;

				return this.driver.all('SELECT * FROM round WHERE game_id = ? ORDER BY picked ASC;', game.id);
			}).then(rounds => {
				roundData = rounds.reduce((data, round) => {
					round.guesses = [];
					data.ids.push(round.id);
					data.bcvs.push(round.verse_bcv.split('-').map(Number));
					data.map[round.id] = round;
					return data;
				}, {
					ids: [],
					bcvs: [],
					map: {}
				});

				return this.driver.all(
					`SELECT * FROM guess WHERE round_id IN (${roundData.ids.map(() => '?').join(', ')}) ORDER BY 'when' ASC;`,
					roundData.ids
				).then(guesses => guesses.forEach(guess => roundData.map[guess.round_id].guesses.push(guess)));
			}).then(() => {
				return Promise.all(roundData.bcvs.map(bcv => this.server.bible.getVerse(game.translation_id, ...bcv)))
					.then(verses => verses.reduce((map, verse) => {
						map[verse.book + '-' + verse.chapter + '-' + verse.verse] = verse.text;
						return map;
					}, {}));
			}).then(verseMap => {
				game.lives = 5;
				game.rounds = [];
				for (const roundId in roundData.map){
					const round = roundData.map[roundId];
					const [book, chapter] = round.verse_bcv.split('-').map(Number);

					game.lives -= round.guesses.reduce((incorrect, guess) => {
						const rightBook = guess.book_pos === book;
						const rightChapter = rightBook && guess.chapter === chapter;
						if (game.difficulty.id === 0){
							if (rightBook) return incorrect;
							return incorrect + 1;
						}
						else if (game.difficulty.id === 1){
							if (rightChapter) return incorrect;
							if (rightBook) return incorrect + 0.5;
							return incorrect + 1;
						}
					}, 0);

					if (game.lives < 0) game.lives = 0;

					round.verse_text = verseMap[round.verse_bcv];
					game.rounds.push(round);
				}

				const [min, max] = this.server.bible.testamentCodeToMinMax(game.testament_code);
				return includeBooks ? this.server.bible.getBooks(min, max) : Promise.resolve(undefined);
			}).then(books => ({
				success: true,
				data: { game, books }
			}));
		});
	}


	/**
	 * Start a new game.
	 * 
	 * @param {Number} userId ID of user starting game.
	 * @param {Number} testamentCode Code of testament to use.
	 * @param {Number} difficultyId ID of difficulty of game.
	 * 
	 * @returns {Promise<Object>} API response.
	 */
	startGame(userId, translationId, testamentCode, difficultyId){
		const now = Date.now();

		return this.driver.run(
			'INSERT INTO game (user_id, translation_id, testament_code, difficulty_id) VALUES (?, ?, ?, ?);',
			userId, translationId, testamentCode, difficultyId
		).then(result => this.getGame(result.lastID, true))
			.then(result => result.data)
			.then(data => this.startNewRound(data.game, now, false).then(round => {
				data.game.rounds.push(round);

				return {
					success: true,
					message: ['Started new game', 'success'],
					data
				};
			}));
	}
};