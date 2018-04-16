const path = require('path');

const sqlite = require('sqlite');

module.exports = class Bible{
	/**
	 * Create a instance of the Bible database.
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
	 * @returns {Promise<Bible>} Bible instance to allow for chaining.
	 */
	init(){
		return sqlite.open(path.join(this.server.paths.data, 'bible.db'), { Promise })
			.then(driver => driver.migrate({
				migrationsPath: path.join(__dirname, 'schema', 'bible')
			}))
			.then(driver => this.driver = driver)
			.then(() => this);
	}


	/**
	 * Get a random verse from a tranlsation and/or book range.
	 * 
	 * @param {Number} translationId ID of the tranlsation to get verse from.
	 * @param {Number} minBook Inclusive potision of the minimum book to get a verse from.
	 * @param {Number} maxBook Inclusive potision of the maximum book to get a verse from.
	 * 
	 * @returns {Promise<Object>} A random verse.
	 */
	getRandomVerse(translationId = 1, minBook = 1, maxBook = 66){
		return this.driver.get(
			'SELECT * FROM verse WHERE translation = ? AND book >= ? AND book <= ? ORDER BY RANDOM() LIMIT 1;',
			translationId, minBook, maxBook
		);
	}
	

	/**
	 * Get books between min and max position.
	 * 
	 * @param {Number} min Inclusive potision of the minimum book to get.
	 * @param {Number} max Inclusive potision of the maximum book to get.
	 * 
	 * @returns {Promise<Array<Object>>} Array of books.
	 */
	getBooks(min = 1, max = 66){
		return this.driver.all('SELECT * FROM book WHERE position >= ? AND position <= ? ORDER BY position ASC;', min, max);
	}
};