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
	 * Convert testament code to minimum and maximum book positions.
	 * 
	 * @param {Number} code Testament code.
	 * 
	 * @returns {Arrray<Number, Number>} Minimum and Maximum book.
	 */
	testamentCodeToMinMax(code){
		return [code === 2 ? 40 : 1, code === 1 ? 39 : 66];
	}


	/**
	 * Get a random verse from a tranlsation and/or book range.
	 * 
	 * @param {Number} translationId ID of the tranlsation to get verse from.
	 * @param {Number} minBook Inclusive potision of the minimum book to get a verse from.
	 * @param {Number} maxBook Inclusive potision of the maximum book to get a verse from.
	 * @param {Array<Number>} excludedBooks An array of book positions to not pick.
	 * 
	 * @returns {Promise<Object>} A random verse.
	 */
	getRandomVerse(translationId = 1, minBook = 1, maxBook = 66, excludedBooks = []){
		let book = Math.floor(Math.random() * (maxBook - minBook + 1)) + minBook;
		while (excludedBooks.includes(book)){
			book = Math.floor(Math.random() * (maxBook - minBook + 1)) + minBook;
		}

		return this.driver.get(
			'SELECT * FROM verse WHERE translation = ? AND book = ? ORDER BY RANDOM() LIMIT 1;',
			translationId, book
		);
	}
	

	/**
	 * Get a verse.
	 * 
	 * @param {Number} translation ID of translation.
	 * @param {Number} book Position of book.
	 * @param {Number} chapter Chapter number.
	 * @param {Number} verse Verse number.
	 * 
	 * @returns {Promise<Object>} The verse
	 */
	getVerse(translation, book, chapter, verse){
		return this.driver.get(
			'SELECT * FROM verse WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?;',
			translation, book, chapter, verse
		);
	}


	/**
	 * Get all translations.
	 * 
	 * @returns {Promise<Array<Object>>} Translations
	 */
	getTranslations(){
		return this.driver.all('SELECT * FROM translation');
	}


	/**
	 * Return a translation by id.
	 * 
	 * @param {Number} id ID of translation to get.
	 * 
	 * @returns {Promise<Object>}
	 */
	getTranslation(id){
		return this.driver.get('SELECT * FROM translation WHERE id = ?', id);
	}

	
	/**
	 * Get books between min and max position.
	 * 
	 * @param {Number} min Inclusive potision of the minimum book to get.
	 * @param {Number} max Inclusive potision of the maximum book to get.
	 * 
	 * @returns {Promise<Array<Object>>} Array of books.
	 */
	getBooks(translationId, min = 1, max = 66){
		return this.driver.all('SELECT * FROM book WHERE position >= ? AND position <= ? ORDER BY position ASC;', min, max)
			.then(books =>  Promise.all(books.map(book => this.driver.get('SELECT MAX(chapter) FROM verse WHERE book = ? AND translation = ?', book.position, translationId).then(result => {
				book.chapterCount = result['MAX(chapter)'];
				return book;
			}))));
	}
};