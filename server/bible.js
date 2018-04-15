const path = require('path');

const sqlite = require('sqlite');

module.exports = class Bible{
	constructor(server){
		this.server = server;
		
		this.driver;
	}

	init(){
		return sqlite.open(path.join(this.server.paths.data, 'bible.db'), { Promise })
			.then(driver => driver.migrate({
				migrationsPath: path.join(__dirname, 'schema', 'bible')
			}))
			.then(driver => this.driver = driver)
			.then(() => this);
	}

	getRandomVerse(translationId = 1){
		return this.driver.get('SELECT * FROM verse WHERE translation = ? AND rowid = abs(random()) % (SELECT max(rowid) FROM verse) + 1;', translationId);
	}
};