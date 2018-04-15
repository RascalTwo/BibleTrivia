const path = require('path');

const sqlite = require('sqlite');

module.exports = class Database{
	constructor(server){
		this.server = server;
		
		this.driver;
	}

	init(){
		return sqlite.open(path.join(this.server.paths.data, 'data.db'), { Promise })
			.then(driver => driver.migrate({
				migrationsPath: path.join(__dirname, 'schema', 'data')
			}))
			.then(driver => this.driver = driver)
			.then(() => this);
	}
};